"""LangChain extraction and LangGraph orchestration for a picking simulation.

The workflow remains usable without an LLM key. In that mode, its LangChain
Runnable invokes the existing deterministic parser. It can also use Ollama's
local llama3.2 model or an OpenAI model for structured extraction.
"""

from __future__ import annotations

import os
from typing import TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from .data import ANOMALIES, INVENTORY, SKU_INDEX
from .models import ParsedOrderItem, PickerRoute, SimulationMetrics, SimulationResponse
from .services import fifo_route, optimized_routes, parse_instruction


class RequestedItem(BaseModel):
    """One SKU selected by the model from the supplied dark-store catalog."""

    sku_id: str = Field(description="Exact SKU id from the catalog, such as SKU-001")
    quantity: int = Field(default=1, ge=1, description="Requested quantity")


class StructuredOrder(BaseModel):
    items: list[RequestedItem] = Field(description="All items requested by the shopper")


class SimulationWorkflowState(TypedDict, total=False):
    instruction: str
    picker_count: int
    parsed_items: list[ParsedOrderItem]
    missing_items: list[str]
    fifo_route: PickerRoute
    optimized_routes: list[PickerRoute]
    metrics: SimulationMetrics
    response: SimulationResponse


CATALOG = "\n".join(f"{item.sku.id}: {item.sku.name}" for item in INVENTORY)


def _to_parsed_items(order: StructuredOrder) -> list[ParsedOrderItem]:
    """Validate LLM SKU choices against the catalog before route planning."""
    quantities: dict[str, int] = {}
    for item in order.items:
        if item.sku_id in SKU_INDEX:
            quantities[item.sku_id] = quantities.get(item.sku_id, 0) + item.quantity

    if not quantities:
        return []

    return [
        ParsedOrderItem(
            sku_id=sku_id,
            quantity=quantity,
            fragility_score=SKU_INDEX[sku_id].sku.fragility_score,
            confidence=0.96,
        )
        for sku_id, quantity in quantities.items()
    ]


def _local_parser(instruction: str) -> list[ParsedOrderItem]:
    return parse_instruction(instruction)


def _structured_chain(model):
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Extract the shopping order. Select only exact SKU ids from this catalog. "
                "Ignore unrelated conversation text.\n\nCatalog:\n{catalog}",
            ),
            ("human", "Order instruction: {instruction}"),
        ]
    )
    return (
        RunnableLambda(lambda instruction: {"instruction": instruction, "catalog": CATALOG})
        | prompt
        | model.with_structured_output(StructuredOrder)
        | RunnableLambda(_to_parsed_items)
    )


def _build_order_parser():
    """Return the selected LangChain extraction chain with a local fallback."""
    provider = os.getenv("ORDER_PARSER_PROVIDER", "local").lower()
    if provider == "local":
        return RunnableLambda(_local_parser)

    try:
        if provider == "ollama":
            from langchain_ollama import ChatOllama

            model = ChatOllama(
                model=os.getenv("OLLAMA_MODEL", "llama3.2"),
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                temperature=0,
            )
        elif provider == "groq" and os.getenv("GROQ_API_KEY"):
            from langchain_groq import ChatGroq

            model = ChatGroq(
                model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                temperature=0,
            )
        elif provider == "openai" and os.getenv("OPENAI_API_KEY"):
            from langchain_openai import ChatOpenAI

            model = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)
        else:
            return RunnableLambda(_local_parser)

        llm_chain = _structured_chain(model)
        return llm_chain.with_fallbacks([RunnableLambda(_local_parser)])
    except Exception:
        # Missing provider packages/configuration must not break warehouse dispatch.
        return RunnableLambda(_local_parser)


def get_parser_status() -> dict[str, str]:
    """Describe configured AI behavior without exposing provider secrets."""
    provider = os.getenv("ORDER_PARSER_PROVIDER", "local").lower()
    has_key = {
        "groq": bool(os.getenv("GROQ_API_KEY")),
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "ollama": bool(os.getenv("OLLAMA_MODEL")),
    }.get(provider, True)
    if provider == "local" or not has_key:
        return {"provider": "local", "mode": "deterministic fallback"}
    model = os.getenv(
        {"groq": "GROQ_MODEL", "openai": "OPENAI_MODEL", "ollama": "OLLAMA_MODEL"}[provider],
        "llama3.2" if provider == "ollama" else "llama-3.1-8b-instant",
    )
    return {"provider": provider, "mode": f"structured LLM ({model})"}


ORDER_PARSER_CHAIN = _build_order_parser()


def parse_order_node(state: SimulationWorkflowState) -> dict[str, object]:
    """LangGraph node: turn free-form text into catalog-backed order items."""
    parsed = ORDER_PARSER_CHAIN.invoke(state["instruction"])
    # Preserve existing behavior if an LLM produces no valid catalog matches.
    return {"parsed_items": parsed or parse_instruction(state["instruction"])}


def validate_stock_node(state: SimulationWorkflowState) -> dict[str, object]:
    missing = [
        item.sku_id
        for item in state["parsed_items"]
        if SKU_INDEX[item.sku_id].stock_count < item.quantity
    ]
    return {"missing_items": missing}


def plan_routes_node(state: SimulationWorkflowState) -> dict[str, object]:
    parsed = state["parsed_items"]
    picker_count = state["picker_count"]
    baseline = fifo_route(parsed)
    optimized = optimized_routes(parsed, picker_count)
    optimized_distance = max(route.distance for route in optimized)
    reduction = 0.0
    if baseline.distance:
        reduction = max(0.0, (baseline.distance - optimized_distance) / baseline.distance * 100)

    metrics = SimulationMetrics(
        fifo_distance=baseline.distance,
        optimized_distance=optimized_distance,
        reduction_percent=round(reduction, 1),
        parser_confidence=round(sum(item.confidence for item in parsed) / len(parsed), 2),
        active_alerts=len(ANOMALIES),
        dispatch_seconds=max(35, optimized_distance * 7),
    )
    return {"fifo_route": baseline, "optimized_routes": optimized, "metrics": metrics}


def build_response_node(state: SimulationWorkflowState) -> dict[str, object]:
    from .data import ANOMALIES, RECOMMENDATIONS

    return {
        "response": SimulationResponse(
            state="dispatched" if not state["missing_items"] else "routing",
            parsed_items=state["parsed_items"],
            missing_items=state["missing_items"],
            fifo_route=state["fifo_route"],
            optimized_routes=state["optimized_routes"],
            metrics=state["metrics"],
            anomalies=ANOMALIES,
            recommendations=RECOMMENDATIONS,
            inventory=INVENTORY,
        )
    }


def build_simulation_graph():
    workflow = StateGraph(SimulationWorkflowState)
    workflow.add_node("parse_order", parse_order_node)
    workflow.add_node("validate_stock", validate_stock_node)
    workflow.add_node("plan_routes", plan_routes_node)
    workflow.add_node("build_response", build_response_node)
    workflow.add_edge(START, "parse_order")
    workflow.add_edge("parse_order", "validate_stock")
    workflow.add_edge("validate_stock", "plan_routes")
    workflow.add_edge("plan_routes", "build_response")
    workflow.add_edge("build_response", END)
    return workflow.compile()


SIMULATION_GRAPH = build_simulation_graph()


def run_agent_simulation(instruction: str, picker_count: int) -> SimulationResponse:
    """Run the complete LangGraph workflow and return its typed API response."""
    result = SIMULATION_GRAPH.invoke({"instruction": instruction, "picker_count": picker_count})
    return result["response"]
