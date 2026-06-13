"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Route, Eye, TrendingUp, Cpu, BookOpen, Sparkles, Terminal } from "lucide-react";

type SubsystemId = "nlp" | "routing" | "cv" | "recsys";

type ModelSubsystem = {
  id: SubsystemId;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  modelType: string;
  dataset: string;
  targetMetric: string;
  targetValue: string;
  points: string[];
};

const subsystems: ModelSubsystem[] = [
  {
    id: "nlp",
    name: "NLP Order Parser",
    icon: <MessageSquare size={18} />,
    tagline: "Translating messy human speech into structured database inputs.",
    description: "Dark stores receive orders via text messages, transcripts, and chat apps. This subsystem parses those unstructured instructions into structured line item arrays specifying SKU identifiers and quantities, mapping them directly to database schemas.",
    modelType: "Llama-3 8B fine-tuned via PEFT/LoRA (Seq2Seq translation)",
    dataset: "Custom Synthesized Q-Commerce Voice/Text Order dataset",
    targetMetric: "BLEU Score",
    targetValue: "> 0.85",
    points: [
      "Translates complex colloquialisms ('grab a couple of milks and a dozen eggs') to discrete integers.",
      "Automatically matches spelling anomalies and abbreviations ('bananas', 'nana', 'banns').",
      "Injects mathematically critical fragility parameters to protect products during picking.",
      "Optimized for low-latency sub-100ms CPU inference via GGML/Int8 quantization.",
    ],
  },
  {
    id: "routing",
    name: "Swarm Routing Engine",
    icon: <Route size={18} />,
    tagline: "Synchronized multi-agent pathing in high-density grids.",
    description: "Once orders are validated, this engine solves the Multi-Agent Traveling Salesperson Problem (TSP) with dynamic congestion avoidance. It schedules multiple picker carts simultaneously, allocating stops logically based on position and fragility.",
    modelType: "Ray RLlib (Proximal Policy Optimization) + Google OR-Tools",
    dataset: "Simulated Warehouse Grid Maps with dynamic picker trajectories",
    targetMetric: "Pick Time Reduction",
    targetValue: "40%+",
    points: [
      "Divides an order's items dynamically between active pickers based on spatial proximity.",
      "Sequences pickup steps so that heavy items (e.g. rice) are picked before fragile ones (e.g. strawberries).",
      "Avoids aisle collisions in real-time by recalculating agent routes dynamically.",
      "Minimizes total critical path travel distance across the entire active picker swarm.",
    ],
  },
  {
    id: "cv",
    name: "Computer Vision Eye",
    icon: <Eye size={18} />,
    tagline: "Real-time shelf anomaly and misplaced item detection.",
    description: "Dark stores move fast, and products often end up on the wrong shelves. This system processes mock video streams from warehouse cameras to identify inventory misalignments, triggering automated alert queries.",
    modelType: "YOLOv8 Object Detection / Faster R-CNN Variant",
    dataset: "Kaggle SKU-110K (Dense retail objects dataset)",
    targetMetric: "F1 Score",
    targetValue: "> 0.90",
    points: [
      "Detects densely packed shelves containing up to 100+ objects per image frame.",
      "Identifies hazard violations, such as storing harsh chemical dish soap adjacent to fresh produce.",
      "Alerts operators when shelves are empty or stock counts fall below visual thresholds.",
      "Runs on edge-device processors, minimizing dark store networking demands.",
    ],
  },
  {
    id: "recsys",
    name: "Predictive Stocker",
    icon: <TrendingUp size={18} />,
    tagline: "Overnight shelf restructures based on item co-occurrence.",
    description: "Using shopping transaction histories, this recommendation model identifies item association rules and temporal order patterns. It suggests physical stock relocations (co-location restructures) to minimize travel base lines.",
    modelType: "XGBoost Classifier + Collaborative Filtering (Apriori Algorithm)",
    dataset: "Kaggle Instacart Market Basket Analysis (3M+ orders)",
    targetMetric: "Basket Lift Ratio",
    targetValue: "1.2x - 1.5x",
    points: [
      "Learns temporal shopping spikes (e.g., breakfast items in morning baskets, ice cream at night).",
      "Calculates Lift scores to suggest moving high-affinity items closer to the dispatch exit.",
      "Suggests overnight restructures to reduce picker walking footprints by up to 15%.",
      "Generates continuous feedback loops, adapting to seasonal demands and product promotions.",
    ],
  },
];

const rawSkus: Record<string, { name: string; category: string; fragility: number }> = {
  "SKU-001": { name: "Bananas", category: "produce", fragility: 7 },
  "SKU-006": { name: "Whole Milk", category: "dairy", fragility: 4 },
  "SKU-010": { name: "Eggs 12 Pack", category: "dairy", fragility: 10 },
  "SKU-011": { name: "Basmati Rice", category: "pantry", fragility: 1 },
  "SKU-013": { name: "Olive Oil", category: "pantry", fragility: 5 },
  "SKU-016": { name: "Cereal", category: "pantry", fragility: 4 },
  "SKU-022": { name: "Toothpaste", category: "personal", fragility: 3 },
  "SKU-027": { name: "Glass Cleaner", category: "homecare", fragility: 6 },
  "SKU-032": { name: "Ice Cream", category: "frozen", fragility: 8 },
  "SKU-033": { name: "Frozen Pizza", category: "frozen", fragility: 5 },
};

const keywordsMap: Array<[string, string]> = [
  ["bananas", "SKU-001"],
  ["banana", "SKU-001"],
  ["whole milk", "SKU-006"],
  ["milk", "SKU-006"],
  ["eggs", "SKU-010"],
  ["egg", "SKU-010"],
  ["basmati rice", "SKU-011"],
  ["rice", "SKU-011"],
  ["olive oil", "SKU-013"],
  ["oil", "SKU-013"],
  ["cereal", "SKU-016"],
  ["toothpaste", "SKU-022"],
  ["glass cleaner", "SKU-027"],
  ["cleaner", "SKU-027"],
  ["ice cream", "SKU-032"],
  ["frozen pizza", "SKU-033"],
  ["pizza", "SKU-033"],
];

const numberWords: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12
};

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState<SubsystemId>("nlp");
  const [playgroundInput, setPlaygroundInput] = useState(
    "Get me two bananas, whole milk, a dozen eggs, and olive oil please"
  );

  const activeSubsystem = subsystems.find((sub) => sub.id === activeTab)!;

  const parsedItems = useMemo(() => {
    const text = playgroundInput.toLowerCase();
    const results: Array<{ sku_id: string; name: string; quantity: number; fragility: number; confidence: number }> = [];
    const matchedIndices: Array<[number, number]> = [];

    const qtyRegex = `(?:\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)`;

    keywordsMap.forEach(([word, skuId]) => {
      const pattern = new RegExp(
        `(?:\\b(?<before>${qtyRegex})\\s*(?:x|qty|quantity|:|qty:|quantity:|-)?\\s*)?\\b${word}s?\\b(?:\\s*(?:x|qty|quantity|:|qty:|quantity:|-)?\\s*(?<after>${qtyRegex})\\s*x?\\b)?`,
        "g"
      );

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        const hasOverlap = matchedIndices.some(
          ([mStart, mEnd]) => Math.max(start, mStart) < Math.min(end, mEnd)
        );
        if (hasOverlap) continue;

        matchedIndices.push([start, end]);

        const qtyStr = match.groups?.before || match.groups?.after || "";
        let quantity = 1;
        if (qtyStr) {
          const trimmed = qtyStr.trim();
          if (/^\d+$/.test(trimmed)) {
            quantity = parseInt(trimmed, 10);
          } else {
            quantity = numberWords[trimmed] ?? 1;
          }
        }

        const details = rawSkus[skuId];
        results.push({
          sku_id: skuId,
          name: details.name,
          quantity,
          fragility: details.fragility,
          confidence: text.includes(details.name.toLowerCase().split(" ")[0]) ? 0.94 : 0.88,
        });
      }
    });

    return results;
  }, [playgroundInput]);

  return (
    <main className="app-shell" style={{ padding: "12px 0 20px", height: "calc(100vh - 84px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Page Header (Compacted) */}
      <section className="masthead" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <p className="eyebrow" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>Machine Learning Core</p>
          <h1 style={{ fontSize: "1.75rem", lineHeight: 1.1 }}>AI Subsystems</h1>
        </div>
      </section>

      {/* Tabs list (Compacted) */}
      <div className="models-tabs" style={{ margin: "4px 0 16px", paddingBottom: "6px", display: "flex", gap: "8px", flexShrink: 0 }}>
        {subsystems.map((sub) => (
          <button
            key={sub.id}
            className={`model-tab-btn ${activeTab === sub.id ? "active" : ""}`}
            onClick={() => setActiveTab(sub.id)}
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            {sub.icon}
            <span>{sub.name}</span>
          </button>
        ))}
      </div>

      {/* Side-by-side details and playground, fitting full remaining height */}
      <div className="model-showcase" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flex: 1, overflow: "hidden" }}>
        
        {/* Left Card: Subsystem technical description details */}
        <div
          className="erd-card model-details-card"
          style={{
            padding: "20px",
            background: "var(--panel)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflowY: "auto",
            height: "100%"
          }}
        >
          <div className="model-title-block" style={{ gap: "4px" }}>
            <span className="model-meta-tag" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{activeSubsystem.modelType}</span>
            <h2 style={{ fontSize: "1.3rem", color: "var(--ink)", fontWeight: 800, margin: "4px 0 2px" }}>{activeSubsystem.name}</h2>
            <p className="eyebrow" style={{ color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontWeight: 500, fontSize: "0.85rem", margin: 0 }}>
              {activeSubsystem.tagline}
            </p>
          </div>

          <p className="model-desc" style={{ fontSize: "0.85rem", lineHeight: "1.4", margin: 0 }}>{activeSubsystem.description}</p>

          <div className="model-metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div className="model-metric-card" style={{ padding: "10px", background: "rgba(0,0,0,0.01)" }}>
              <span style={{ fontSize: "0.65rem" }}>Dataset Used</span>
              <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>
                {activeSubsystem.id === "nlp" ? "Synthesized" : activeSubsystem.id === "cv" ? "SKU-110K" : activeSubsystem.id === "recsys" ? "Instacart" : "Simulated"}
              </strong>
              <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "2px", margin: 0 }}>{activeSubsystem.dataset}</p>
            </div>
            <div className="model-metric-card" style={{ padding: "10px", background: "rgba(0,0,0,0.01)" }}>
              <span style={{ fontSize: "0.65rem" }}>{activeSubsystem.targetMetric} Target</span>
              <strong className="text-mint" style={{ fontSize: "1rem" }}>{activeSubsystem.targetValue}</strong>
              <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "2px", margin: 0 }}>Performance threshold</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div className="panel-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <BookOpen size={14} style={{ color: "var(--mint)" }} />
              <h4 style={{ color: "var(--ink)", fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>Key Pipelines & Objectives</h4>
            </div>
            <ul style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: "1.4", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
              {activeSubsystem.points.map((p, index) => (
                <li key={index}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Card: Subsystem interactive playground */}
        <div
          className="erd-card playground-card"
          style={{
            padding: "20px",
            background: "var(--panel)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
          }}
        >
          {activeTab === "nlp" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div className="panel-title" style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <Sparkles size={16} style={{ color: "var(--mint)" }} />
                <h2 style={{ fontSize: "1.1rem" }}>NLP Interpreter Playground</h2>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: "1.3", margin: "0 0 10px", flexShrink: 0 }}>
                Type unstructured instructions to test entity extraction in real-time.
              </p>

              <div className="nlp-playground" style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflow: "hidden" }}>
                <div className="nlp-input-wrapper" style={{ gap: "4px", flexShrink: 0 }}>
                  <label htmlFor="nlpPlaygroundInput" style={{ fontSize: "0.65rem", fontWeight: 700 }}>Unstructured Order Input</label>
                  <textarea
                    id="nlpPlaygroundInput"
                    className="nlp-textarea"
                    value={playgroundInput}
                    onChange={(e) => setPlaygroundInput(e.target.value)}
                    placeholder="E.g., I want 2 whole milks, a dozen eggs, and bananas..."
                    style={{ minHeight: "50px", padding: "8px 10px", fontSize: "0.8rem" }}
                  />
                </div>

                <div className="nlp-parsed-output" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "12px", gap: "8px" }}>
                  <span className="nlp-output-header" style={{ fontSize: "0.65rem" }}>Tokenizer Entity Extraction</span>
                  
                  {parsedItems.length === 0 ? (
                    <div style={{ color: "var(--coral)", fontSize: "0.75rem" }}>No matching catalog SKUs detected.</div>
                  ) : (
                    <div className="nlp-token-list" style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {parsedItems.map((item) => (
                        <span key={item.sku_id} className="nlp-token detected" style={{ padding: "2px 6px", fontSize: "0.72rem" }}>
                          <strong>{item.name}</strong>
                          <span style={{ opacity: 0.6 }}>x{item.quantity}</span>
                          <span style={{ fontSize: "0.6rem", padding: "1px 2px", background: "rgba(0,0,0,0.03)", borderRadius: "2px", color: "var(--muted)" }}>
                            Fragility: {item.fragility}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="nlp-output-header" style={{ marginTop: "4px", fontSize: "0.65rem" }}>Compiled SQL-Ready Parameters (JSON)</span>
                  <pre className="nlp-json-block" style={{ margin: 0, padding: "8px", fontSize: "0.7rem", flex: 1, overflowY: "auto" }}>
                    <code>{JSON.stringify(parsedItems.map(item => ({
                      sku_id: item.sku_id,
                      quantity: item.quantity,
                      fragility_score: item.fragility,
                      confidence: item.confidence
                    })), null, 2)}</code>
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center", textAlign: "center", gap: "12px", color: "var(--muted)", padding: "20px 0" }}>
              <div className="logo-icon-wrapper" style={{ width: "48px", height: "48px", borderRadius: "50%" }}>
                <Terminal size={20} />
              </div>
              <div>
                <h3 style={{ color: "var(--ink)", marginBottom: "4px", fontSize: "1rem" }}>Subsystem Core Active</h3>
                <p style={{ maxWidth: "260px", fontSize: "0.78rem", lineHeight: "1.3", margin: 0 }}>
                  This subsystem runs actively inside our simulation dashboard. Switch to the <strong>Simulation Dashboard</strong> page to interact with its live performance outputs.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
