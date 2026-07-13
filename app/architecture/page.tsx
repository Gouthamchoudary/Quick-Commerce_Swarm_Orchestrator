"use client";

import { useState } from "react";
import { CheckCircle2, Database, GitBranch, MessageSquare, Route } from "lucide-react";

type Stage = {
  id: "parse" | "validate" | "route" | "respond";
  title: string;
  tech: string;
  icon: React.ReactNode;
  reads: string;
  writes: string;
  explanation: string;
};

const stages: Stage[] = [
  { id: "parse", title: "Parse order", tech: "LangChain runnable", icon: <MessageSquare size={18} />, reads: "instruction", writes: "parsed_items", explanation: "Uses the configured structured LLM provider when available, then validates every returned SKU against the catalog. A deterministic parser is the safe fallback." },
  { id: "validate", title: "Validate stock", tech: "Inventory rule", icon: <Database size={18} />, reads: "parsed_items", writes: "missing_items", explanation: "Compares requested quantities with seeded inventory. The schema page shows the PostgreSQL-ready model for persisting this inventory later." },
  { id: "route", title: "Plan routes", tech: "Route heuristic", icon: <Route size={18} />, reads: "parsed_items, picker_count", writes: "fifo_route, optimized_routes, metrics", explanation: "Builds a FIFO baseline, then assigns stops across pickers using distance and fragility-aware deterministic logic." },
  { id: "respond", title: "Build response", tech: "Typed FastAPI output", icon: <CheckCircle2 size={18} />, reads: "workflow state", writes: "SimulationResponse", explanation: "Combines routes, seeded safety rules, placement suggestions, and inventory into the API response consumed by the dashboard." },
];

export default function ArchitecturePage() {
  const [activeId, setActiveId] = useState<Stage["id"]>("parse");
  const active = stages.find((stage) => stage.id === activeId)!;

  return (
    <main className="app-shell" style={{ padding: "28px 0 36px" }}>
      <section className="masthead" style={{ marginBottom: 26 }}>
        <p className="eyebrow">LangGraph workflow</p>
        <h1>One visible state machine.</h1>
        <p className="subhead">The application uses four explicit nodes. They are orchestration stages, not fictional autonomous agents.</p>
      </section>

      <section className="erd-card" style={{ padding: 24, background: "var(--panel)" }}>
        <div className="workflow-stage-grid">
          {stages.map((stage, index) => (
            <button key={stage.id} onClick={() => setActiveId(stage.id)} className="arch-card" style={{ textAlign: "left", cursor: "pointer", borderColor: activeId === stage.id ? "var(--mint)" : "var(--glass-border)", background: activeId === stage.id ? "rgba(13,148,136,0.06)" : "var(--panel)" }}>
              <span className="eyebrow">0{index + 1}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--mint)", marginTop: 8 }}>{stage.icon}<strong style={{ color: "var(--ink)" }}>{stage.title}</strong></div>
              <p style={{ margin: "8px 0 0", fontSize: "0.75rem" }}>{stage.tech}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="model-showcase" style={{ marginTop: 20, gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20 }}>
        <article className="erd-card" style={{ padding: 28, background: "var(--panel)" }}>
          <span className="model-meta-tag">{active.tech}</span>
          <h2 style={{ color: "var(--ink)", marginTop: 14 }}>{active.title}</h2>
          <p className="model-desc">{active.explanation}</p>
          <div className="model-metrics-grid">
            <div className="model-metric-card"><span>Reads from state</span><strong style={{ fontSize: "1rem", color: "var(--ink)" }}>{active.reads}</strong></div>
            <div className="model-metric-card"><span>Writes to state</span><strong style={{ fontSize: "1rem", color: "var(--ink)" }}>{active.writes}</strong></div>
          </div>
        </article>
        <aside className="erd-card" style={{ padding: 24, background: "var(--ink)", color: "#fff" }}>
          <GitBranch size={22} style={{ color: "var(--mint)" }} />
          <h2 style={{ marginTop: 14 }}>Why LangGraph?</h2>
          <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>It makes the execution path inspectable, typed, and easy to test. An LLM can improve order extraction without owning stock validation or routing decisions.</p>
        </aside>
      </section>
    </main>
  );
}
