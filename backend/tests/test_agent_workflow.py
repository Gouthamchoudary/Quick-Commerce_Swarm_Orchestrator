from app.agent_workflow import SIMULATION_GRAPH, run_agent_simulation


def test_langgraph_simulation_returns_routes_and_parsed_items() -> None:
    response = run_agent_simulation("2 bananas, 1 milk, and 3 eggs", picker_count=2)

    quantities = {item.sku_id: item.quantity for item in response.parsed_items}
    assert quantities["SKU-001"] == 2
    assert quantities["SKU-006"] == 1
    assert quantities["SKU-010"] == 3
    assert len(response.optimized_routes) == 2
    assert response.metrics.fifo_distance > 0


def test_graph_declares_all_orchestration_nodes() -> None:
    node_names = set(SIMULATION_GRAPH.get_graph().nodes)
    assert {"parse_order", "validate_stock", "plan_routes", "build_response"} <= node_names
