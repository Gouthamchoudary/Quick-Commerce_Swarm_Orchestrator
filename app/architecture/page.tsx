"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, MessageSquare, Database, Compass, AlertCircle, Send, CheckCircle2, ArrowRight } from "lucide-react";

type NodeId = "intake" | "nlp" | "stock" | "route" | "anomaly" | "dispatch";

type ArchNode = {
  id: NodeId;
  label: string;
  num: number;
  icon: React.ReactNode;
  agentRole: string;
  tech: string;
  inputs: string;
  outputs: string;
  explanation: string;
};

const nodes: ArchNode[] = [
  {
    id: "intake",
    label: "Order Intake",
    num: 1,
    icon: <Send size={20} />,
    agentRole: "System Gatekeeper",
    tech: "FastAPI REST Endpoint",
    inputs: "Raw customer string via request payload.",
    outputs: "Initiates LangGraph transaction state with transaction UUID.",
    explanation: "Captures incoming text strings from customer checkouts. Initializes the base shared state dictionary (order ID, timestamp, status) that travels across the multi-agent graph.",
  },
  {
    id: "nlp",
    label: "NLP Parser",
    num: 2,
    icon: <MessageSquare size={20} />,
    agentRole: "Llama-3 Interpreter Agent",
    tech: "Llama-3-8B Fine-tuned (vLLM)",
    inputs: "Shared state customer order note.",
    outputs: "Extracted SKU list, counts, and fragility parameters.",
    explanation: "Leverages a fine-tuned open-source LLM to interpret natural language instructions. It updates the graph state with parsed entities and assigns fragility scores to prevent stacking accidents.",
  },
  {
    id: "stock",
    label: "Stock Checker",
    num: 3,
    icon: <Database size={20} />,
    agentRole: "Inventory Ledger Validator",
    tech: "PostgreSQL Database Engine",
    inputs: "Parsed SKU list and quantities.",
    outputs: "Stock availability status, warehouse shelf coordinates.",
    explanation: "Queries the 3NF Postgres inventory database to confirm items are physically on shelves. If items are out of stock, it triggers a state transition back to customer notification; otherwise, it resolves item locations.",
  },
  {
    id: "route",
    label: "Swarm Router",
    num: 4,
    icon: <Compass size={20} />,
    agentRole: "Logistics Coordinator Agent",
    tech: "Ray RLlib + Google OR-Tools",
    inputs: "Aisle shelf coordinates, active pickers count.",
    outputs: "Mathematically optimal picking routes and picker allocation.",
    explanation: "Calculates the absolute shortest path for multiple picking carts simultaneously. Combines classical TSP solvers with dynamic collision avoidance, aiming for a minimum 40% walking time reduction.",
  },
  {
    id: "anomaly",
    label: "Shelf Monitor",
    num: 5,
    icon: <AlertCircle size={20} />,
    agentRole: "CV Anomaly Sentinel",
    tech: "YOLOv8 dense object detection",
    inputs: "Shelf imagery coordinates for requested SKU shelves.",
    outputs: "Anomaly status alerts (chemical proximity, wrong slotting).",
    explanation: "Triggers a quick visual confirmation scan using static warehouse cameras. If it notices a misplaced item (e.g. soap near fruit), it logs a warning anomaly in the DB while letting the picker proceed safely.",
  },
  {
    id: "dispatch",
    label: "Swarm Dispatch",
    num: 6,
    icon: <CheckCircle2 size={20} />,
    agentRole: "Workflow Completer",
    tech: "WebSocket/SSE push service",
    inputs: "Optimized route arrays per picker ID.",
    outputs: "Active simulation trigger and dashboard update.",
    explanation: "Pushes the completed agent calculations down to the active physical pickers. Updates the database state from 'picking' to 'dispatched' and triggers the animated visual routes on the frontend.",
  },
];

export default function ArchitecturePage() {
  const [activeNode, setActiveNode] = useState<NodeId>("intake");

  const selectedNode = nodes.find((n) => n.id === activeNode)!;

  return (
    <main className="app-shell" style={{ padding: "16px 0 32px" }}>
      <section className="masthead" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow">System Architecture</p>
          <h1 style={{ fontSize: "2.5rem" }}>Multi-Agent Orchestration</h1>
          <p className="subhead" style={{ marginTop: "8px", fontSize: "0.95rem" }}>
            The orchestrator coordinates decoupled AI systems using <strong>LangGraph</strong>, passing state variables across transaction nodes.
          </p>
        </div>
      </section>

      <div className="architecture-container">
        {/* Interactive SVG Flow Chart */}
        <div className="erd-card graph-display-panel" style={{ background: "var(--panel)" }}>
          <div className="panel-title" style={{ margin: "0 0 16px", width: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <GitBranch size={16} />
              <h2>LangGraph Multi-Agent Network</h2>
            </div>
            <span className="erd-tag" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>Live State Visualizer</span>
          </div>

          <div className="graph-canvas">
            {/* SVG Connecting Lines with arrow indicators */}
            <svg className="graph-svg" viewBox="0 0 900 300">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 8 5 L 0 8 z" fill="rgba(15, 23, 42, 0.15)" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--mint)" />
                </marker>
              </defs>
              {/* Draw paths between adjacent nodes */}
              <line x1="110" y1="150" x2="215" y2="150" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="265" y1="150" x2="370" y2="150" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="420" y1="150" x2="525" y2="150" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="575" y1="150" x2="680" y2="150" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="730" y1="150" x2="835" y2="150" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Glowing active path based on selection */}
              {activeNode === "intake" && (
                <line x1="110" y1="150" x2="215" y2="150" stroke="var(--mint)" strokeWidth="3" markerEnd="url(#arrow-active)" />
              )}
              {activeNode === "nlp" && (
                <>
                  <line x1="110" y1="150" x2="215" y2="150" stroke="var(--mint)" strokeWidth="2" />
                  <line x1="265" y1="150" x2="370" y2="150" stroke="var(--mint)" strokeWidth="3" markerEnd="url(#arrow-active)" />
                </>
              )}
              {activeNode === "stock" && (
                <>
                  <line x1="265" y1="150" x2="370" y2="150" stroke="var(--mint)" strokeWidth="2" />
                  <line x1="420" y1="150" x2="525" y2="150" stroke="var(--mint)" strokeWidth="3" markerEnd="url(#arrow-active)" />
                </>
              )}
              {activeNode === "route" && (
                <>
                  <line x1="420" y1="150" x2="525" y2="150" stroke="var(--mint)" strokeWidth="2" />
                  <line x1="575" y1="150" x2="680" y2="150" stroke="var(--mint)" strokeWidth="3" markerEnd="url(#arrow-active)" />
                </>
              )}
              {activeNode === "anomaly" && (
                <>
                  <line x1="575" y1="150" x2="680" y2="150" stroke="var(--mint)" strokeWidth="2" />
                  <line x1="730" y1="150" x2="835" y2="150" stroke="var(--mint)" strokeWidth="3" markerEnd="url(#arrow-active)" />
                </>
              )}
            </svg>

            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => setActiveNode(node.id)}
                className={`graph-node ${activeNode === node.id ? "active" : ""}`}
                style={{ cursor: "pointer" }}
              >
                <span className="graph-node-num">State {node.num}</span>
                <div style={{ color: activeNode === node.id ? "var(--mint)" : "var(--muted)" }}>{node.icon}</div>
                <span className="graph-node-name">{node.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side-by-side details and summarizing panels */}
        <div className="schema-grid" style={{ marginTop: 0 }}>
          {/* Detailed Inspector Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="erd-card"
              style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", height: "100%", margin: 0, background: "var(--panel)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", paddingBottom: "12px" }}>
                <div>
                  <span className="erd-tag" style={{ color: "var(--mint)", borderColor: "rgba(13, 148, 136, 0.15)", background: "rgba(13, 148, 136, 0.05)", fontSize: "0.7rem", padding: "1px 5px" }}>{selectedNode.tech}</span>
                  <h3 style={{ color: "var(--ink)", marginTop: "6px", fontSize: "1.25rem", fontWeight: 800 }}>
                    {selectedNode.label} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.85rem" }}>({selectedNode.agentRole})</span>
                  </h3>
                </div>
                <div className="logo-icon-wrapper" style={{ width: "38px", height: "38px" }}>
                  {selectedNode.icon}
                </div>
              </div>

              <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: "1.5" }}>{selectedNode.explanation}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                <div className="model-metric-card" style={{ padding: "10px", background: "rgba(0,0,0,0.01)" }}>
                  <span style={{ fontSize: "0.7rem" }}>Input State Schema</span>
                  <p style={{ color: "var(--ink)", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem", marginTop: "4px", lineHeight: "1.4" }}>
                    {selectedNode.inputs}
                  </p>
                </div>
                <div className="model-metric-card" style={{ padding: "10px", background: "rgba(0,0,0,0.01)" }}>
                  <span style={{ fontSize: "0.7rem" }}>Output State Updates</span>
                  <p style={{ color: "var(--mint)", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem", marginTop: "4px", lineHeight: "1.4" }}>
                    {selectedNode.outputs}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* System Architecture Explanation Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <article className="arch-card" style={{ flex: 1 }}>
              <h4 style={{ fontSize: "0.9rem" }}>
                <GitBranch size={15} />
                <span>Decoupled Orchestration</span>
              </h4>
              <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                LangGraph coordinates modular nodes (LLM parser, Postgres ledger, RL pathing) so subsystems can be refined independently.
              </p>
            </article>
            <article className="arch-card" style={{ flex: 1 }}>
              <h4 style={{ fontSize: "0.9rem" }}>
                <Database size={15} />
                <span>Shared State Memory</span>
              </h4>
              <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                Agents read and write properties directly in a centralized state dict, guaranteeing consistency and auditing recovery.
              </p>
            </article>
            <article className="arch-card" style={{ flex: 1 }}>
              <h4 style={{ fontSize: "0.9rem" }}>
                <CheckCircle2 size={15} />
                <span>Auto-Recovery Branches</span>
              </h4>
              <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                短-stock conditions branch the routing workflow back to users immediately, preventing picker cart deadlocks.
              </p>
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}
