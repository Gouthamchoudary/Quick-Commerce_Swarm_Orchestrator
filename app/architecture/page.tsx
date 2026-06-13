"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, MessageSquare, Database, Compass, AlertCircle, Send, CheckCircle2 } from "lucide-react";

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
    icon: <Send size={18} />,
    agentRole: "System Gatekeeper",
    tech: "FastAPI REST Endpoint",
    inputs: "Raw customer string via request payload.",
    outputs: "Initiates LangGraph state with transaction UUID.",
    explanation: "Captures incoming text strings from customer checkouts. Initializes the shared state dictionary (order ID, status) that travels across the multi-agent graph.",
  },
  {
    id: "nlp",
    label: "NLP Parser",
    num: 2,
    icon: <MessageSquare size={18} />,
    agentRole: "Llama-3 Interpreter Agent",
    tech: "Llama-3-8B Fine-tuned (vLLM)",
    inputs: "Shared state customer order note.",
    outputs: "Extracted SKU list, counts, and fragility parameters.",
    explanation: "Leverages a fine-tuned open-source LLM to interpret natural language instructions. It updates the state with parsed entities and fragility scores.",
  },
  {
    id: "stock",
    label: "Stock Checker",
    num: 3,
    icon: <Database size={18} />,
    agentRole: "Inventory Ledger Validator",
    tech: "PostgreSQL Database Engine",
    inputs: "Parsed SKU list and quantities.",
    outputs: "Stock availability status, shelf coordinates.",
    explanation: "Queries the 3NF Postgres inventory database to confirm items are physically on shelves. If out of stock, branches back to customer notification.",
  },
  {
    id: "route",
    label: "Swarm Router",
    num: 4,
    icon: <Compass size={18} />,
    agentRole: "Logistics Coordinator Agent",
    tech: "Ray RLlib + Google OR-Tools",
    inputs: "Aisle shelf coordinates, active pickers count.",
    outputs: "Optimal picking routes and picker allocation.",
    explanation: "Calculates the shortest path for multiple picking carts simultaneously. Combines classical TSP solvers with dynamic collision avoidance.",
  },
  {
    id: "anomaly",
    label: "Shelf Monitor",
    num: 5,
    icon: <AlertCircle size={18} />,
    agentRole: "CV Anomaly Sentinel",
    tech: "YOLOv8 dense object detection",
    inputs: "Shelf imagery coordinates for requested SKU shelves.",
    outputs: "Anomaly status alerts (chemical proximity, wrong slotting).",
    explanation: "Triggers a quick visual confirmation scan using static warehouse cameras. If it notices misplaced items, it logs a warning in the DB.",
  },
  {
    id: "dispatch",
    label: "Swarm Dispatch",
    num: 6,
    icon: <CheckCircle2 size={18} />,
    agentRole: "Workflow Completer",
    tech: "WebSocket/SSE push service",
    inputs: "Optimized route arrays per picker ID.",
    outputs: "Active simulation trigger and dashboard update.",
    explanation: "Pushes the completed agent calculations down to the active physical pickers. Updates the database state from 'picking' to 'dispatched'.",
  },
];

export default function ArchitecturePage() {
  const [activeNode, setActiveNode] = useState<NodeId>("intake");
  const selectedNode = nodes.find((n) => n.id === activeNode)!;

  return (
    <main className="app-shell" style={{ padding: "12px 0 20px", height: "calc(100vh - 84px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: "20px", flex: 1, overflow: "hidden", minHeight: "500px" }}>
        
        {/* Left Column: Title & Subsystems explanation */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "var(--panel)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "20px",
            overflowY: "auto",
            boxShadow: "var(--shadow)"
          }}
        >
          <div>
            <p className="eyebrow" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>System Architecture</p>
            <h1 style={{ fontSize: "1.75rem", lineHeight: 1.1 }}>Orchestration</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "6px", lineHeight: 1.4 }}>
              The orchestrator coordinates decoupled AI systems using <strong>LangGraph</strong>, passing state variables across transaction nodes.
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "4px 0" }} />

          {/* Explanation cards stacked vertically */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <article className="arch-card" style={{ padding: "10px 12px" }}>
              <h4 style={{ fontSize: "0.85rem", margin: 0 }}>
                <GitBranch size={14} />
                <span>Decoupled Orchestration</span>
              </h4>
              <p style={{ fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>
                LangGraph coordinates modular nodes (LLM parser, Postgres ledger, RL pathing) so subsystems can be refined independently.
              </p>
            </article>
            <article className="arch-card" style={{ padding: "10px 12px" }}>
              <h4 style={{ fontSize: "0.85rem", margin: 0 }}>
                <Database size={14} />
                <span>Shared State Memory</span>
              </h4>
              <p style={{ fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>
                Agents read and write properties directly in a centralized state dict, guaranteeing consistency and auditing recovery.
              </p>
            </article>
            <article className="arch-card" style={{ padding: "10px 12px" }}>
              <h4 style={{ fontSize: "0.85rem", margin: 0 }}>
                <CheckCircle2 size={14} />
                <span>Auto-Recovery Branches</span>
              </h4>
              <p style={{ fontSize: "0.75rem", marginTop: "4px", margin: 0 }}>
                Out-of-stock conditions branch the routing workflow back to users immediately, preventing picker cart deadlocks.
              </p>
            </article>
          </div>
        </div>

        {/* Right Column: Interactive Diagram + Detailed Inspector Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%", overflow: "hidden" }}>
          
          {/* Top Panel: LangGraph Multi-Agent Network diagram */}
          <div className="erd-card graph-display-panel" style={{ background: "var(--panel)", padding: "16px 20px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div className="panel-title" style={{ margin: "0 0 10px", width: "100%", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GitBranch size={16} />
                <h2 style={{ fontSize: "1.1rem" }}>LangGraph Multi-Agent Network</h2>
              </div>
              <span className="erd-tag" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>Live State Visualizer</span>
            </div>

            <div className="graph-canvas" style={{ flex: 1, height: "160px" }}>
              <svg className="graph-svg" viewBox="0 0 900 180">
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

                {/* Connecting Paths */}
                <line
                  x1="108"
                  y1="90"
                  x2="192"
                  y2="90"
                  stroke={["nlp", "stock", "route", "anomaly", "dispatch"].includes(activeNode) ? "var(--mint)" : "rgba(15, 23, 42, 0.12)"}
                  strokeWidth={["nlp", "stock", "route", "anomaly", "dispatch"].includes(activeNode) ? "3" : "2"}
                  markerEnd={["nlp", "stock", "route", "anomaly", "dispatch"].includes(activeNode) ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                />
                <line
                  x1="258"
                  y1="90"
                  x2="342"
                  y2="90"
                  stroke={["stock", "route", "anomaly", "dispatch"].includes(activeNode) ? "var(--mint)" : "rgba(15, 23, 42, 0.12)"}
                  strokeWidth={["stock", "route", "anomaly", "dispatch"].includes(activeNode) ? "3" : "2"}
                  markerEnd={["stock", "route", "anomaly", "dispatch"].includes(activeNode) ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                />
                <line
                  x1="408"
                  y1="90"
                  x2="492"
                  y2="90"
                  stroke={["route", "anomaly", "dispatch"].includes(activeNode) ? "var(--mint)" : "rgba(15, 23, 42, 0.12)"}
                  strokeWidth={["route", "anomaly", "dispatch"].includes(activeNode) ? "3" : "2"}
                  markerEnd={["route", "anomaly", "dispatch"].includes(activeNode) ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                />
                <line
                  x1="558"
                  y1="90"
                  x2="642"
                  y2="90"
                  stroke={["anomaly", "dispatch"].includes(activeNode) ? "var(--mint)" : "rgba(15, 23, 42, 0.12)"}
                  strokeWidth={["anomaly", "dispatch"].includes(activeNode) ? "3" : "2"}
                  markerEnd={["anomaly", "dispatch"].includes(activeNode) ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                />
                <line
                  x1="708"
                  y1="90"
                  x2="792"
                  y2="90"
                  stroke={activeNode === "dispatch" ? "var(--mint)" : "rgba(15, 23, 42, 0.12)"}
                  strokeWidth={activeNode === "dispatch" ? "3" : "2"}
                  markerEnd={activeNode === "dispatch" ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                />

                {/* SVG Nodes */}
                {nodes.map((node, index) => {
                  const cx = 75 + index * 150;
                  const cy = 90;
                  const isActive = activeNode === node.id;

                  return (
                    <g
                      key={node.id}
                      className={`svg-node-group ${isActive ? "active" : ""}`}
                      onClick={() => setActiveNode(node.id)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r="30"
                        className={`svg-node-circle ${isActive ? "active" : ""}`}
                      />

                      <text
                        x={cx}
                        y={cy - 40}
                        textAnchor="middle"
                        className="svg-node-num"
                      >
                        State {node.num}
                      </text>

                      <foreignObject
                        x={cx - 15}
                        y={cy - 15}
                        width="30"
                        height="30"
                        style={{ pointerEvents: "none" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            color: isActive ? "var(--mint)" : "var(--muted)",
                            transition: "color 0.2s",
                          }}
                        >
                          {node.icon}
                        </div>
                      </foreignObject>

                      <text
                        x={cx}
                        y={cy + 48}
                        textAnchor="middle"
                        className="svg-node-name"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Bottom Panel: Detailed Inspector Card */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="erd-card"
                style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px", height: "100%", margin: 0, background: "var(--panel)", overflowY: "auto" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>
                  <div>
                    <span className="erd-tag" style={{ color: "var(--mint)", borderColor: "rgba(13, 148, 136, 0.15)", background: "rgba(13, 148, 136, 0.05)", fontSize: "0.65rem", padding: "1px 5px" }}>{selectedNode.tech}</span>
                    <h3 style={{ color: "var(--ink)", marginTop: "4px", fontSize: "1.1rem", fontWeight: 800 }}>
                      {selectedNode.label} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.8rem" }}>({selectedNode.agentRole})</span>
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: "1.4", margin: 0 }}>{selectedNode.explanation}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                  <div className="model-metric-card" style={{ padding: "10px", background: "rgba(0,0,0,0.01)" }}>
                    <span style={{ fontSize: "0.65rem" }}>Input State Schema</span>
                    <p style={{ color: "var(--ink)", fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", marginTop: "4px", lineHeight: "1.3", margin: 0 }}>
                      {selectedNode.inputs}
                    </p>
                  </div>
                  <div className="model-metric-card" style={{ padding: "10px", background: "rgba(0,0,0,0.01)" }}>
                    <span style={{ fontSize: "0.65rem" }}>Output State Updates</span>
                    <p style={{ color: "var(--mint)", fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", marginTop: "4px", lineHeight: "1.3", margin: 0 }}>
                      {selectedNode.outputs}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </main>
  );
}
