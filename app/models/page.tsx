"use client";

import { useState } from "react";
import { BrainCircuit, Database, GitBranch, Route, ShieldCheck, Sparkles } from "lucide-react";

type SystemId = "parser" | "workflow" | "routing" | "rules";

const systems: Array<{
  id: SystemId;
  title: string;
  icon: React.ReactNode;
  label: string;
  summary: string;
  inputs: string;
  outputs: string;
  details: string[];
}> = [
  {
    id: "parser",
    title: "Order extraction",
    icon: <BrainCircuit size={18} />,
    label: "LangChain + structured output",
    summary: "Converts a natural-language shopping instruction into validated SKU and quantity records.",
    inputs: "Customer instruction + seeded SKU catalog",
    outputs: "Parsed SKU IDs, quantities, fragility scores, confidence",
    details: [
      "Uses a deterministic alias parser by default, so the demo works without an API key.",
      "Can switch to Groq-hosted Llama, Ollama, or OpenAI through environment variables.",
      "Rejects model output that does not map to a known catalog SKU.",
    ],
  },
  {
    id: "workflow",
    title: "Workflow orchestration",
    icon: <GitBranch size={18} />,
    label: "LangGraph state machine",
    summary: "Runs the simulation through explicit, testable state transitions instead of hidden agent behavior.",
    inputs: "Instruction and picker count",
    outputs: "Typed simulation response",
    details: [
      "Four nodes: parse order, validate stock, plan routes, and build response.",
      "Each node writes a defined part of the shared workflow state.",
      "The API response is assembled only after all required steps complete.",
    ],
  },
  {
    id: "routing",
    title: "Multi-picker route planner",
    icon: <Route size={18} />,
    label: "Deterministic greedy heuristic",
    summary: "Compares request-order picking with a distance- and fragility-aware allocation across available pickers.",
    inputs: "Shelf coordinates, fragility, picker count",
    outputs: "FIFO baseline, picker routes, critical-path distance",
    details: [
      "Uses Manhattan distance on the seeded dark-store grid.",
      "Allocates stops to control the longest picker route, not a trained RL policy.",
      "Makes the distance trade-off visible and reproducible for each order.",
    ],
  },
  {
    id: "rules",
    title: "Operations rules",
    icon: <ShieldCheck size={18} />,
    label: "Seeded safety and placement checks",
    summary: "Surfaces warehouse-layout alerts and placement suggestions from explicit business rules and seeded data.",
    inputs: "Inventory layout and configured warehouse rules",
    outputs: "Safety alerts and placement suggestions",
    details: [
      "Includes chemical-adjacency and frozen-dwell checks.",
      "Placement suggestions are curated operational hypotheses, not trained recommendations.",
      "A future CV or recommendation model can replace individual rule nodes without changing the workflow contract.",
    ],
  },
];

export default function ModelsPage() {
  const [activeId, setActiveId] = useState<SystemId>("parser");
  const active = systems.find((system) => system.id === activeId)!;

  return (
    <main className="app-shell" style={{ padding: "28px 0 36px" }}>
      <section className="masthead" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Implemented systems</p>
        <h1>Small, explicit, and runnable.</h1>
        <p className="subhead">
          This project uses an optional LLM where language interpretation helps, and deterministic code where correctness and repeatability matter more.
        </p>
      </section>

      <div className="models-tabs" style={{ margin: "0 0 20px" }}>
        {systems.map((system) => (
          <button key={system.id} className={`model-tab-btn ${activeId === system.id ? "active" : ""}`} onClick={() => setActiveId(system.id)}>
            {system.icon}<span>{system.title}</span>
          </button>
        ))}
      </div>

      <section className="model-showcase" style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: 20 }}>
        <article className="erd-card model-details-card" style={{ background: "var(--panel)", padding: 28 }}>
          <span className="model-meta-tag">{active.label}</span>
          <h2 style={{ color: "var(--ink)", margin: 0 }}>{active.title}</h2>
          <p className="model-desc">{active.summary}</p>
          <div className="model-metrics-grid">
            <div className="model-metric-card"><span>Input</span><strong style={{ fontSize: "1rem", color: "var(--ink)" }}>{active.inputs}</strong></div>
            <div className="model-metric-card"><span>Output</span><strong style={{ fontSize: "1rem", color: "var(--ink)" }}>{active.outputs}</strong></div>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>What the code does</p>
            <ul style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
              {active.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </div>
        </article>

        <aside className="erd-card" style={{ padding: 24, background: "var(--ink)", color: "#fff" }}>
          <Sparkles size={22} style={{ color: "var(--mint)" }} />
          <h2 style={{ marginTop: 16 }}>LLM is optional.</h2>
          <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
            Hosted Groq Llama extraction is the recommended upgrade for a lightweight laptop. The same LangGraph workflow runs with the deterministic fallback when no provider is configured.
          </p>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <Database size={16} style={{ color: "var(--mint)" }} />
            <p style={{ color: "#cbd5e1", lineHeight: 1.55, marginTop: 10 }}>
              The SQL schema is a normalized PostgreSQL-ready design. The current demo uses seeded in-memory data rather than claiming a live database connection.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
