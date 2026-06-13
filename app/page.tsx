"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Boxes,
  BrainCircuit,
  Clock3,
  GitBranch,
  Play,
  Route,
  Sparkles,
  Target,
  Warehouse,
} from "lucide-react";

type Location = {
  id: number;
  aisle: number;
  rack: number;
  shelf: number;
  grid_x: number;
  grid_y: number;
  zone: "produce" | "dairy" | "pantry" | "personal" | "homecare" | "frozen";
};

type InventoryItem = {
  sku: {
    id: string;
    name: string;
    category: string;
    fragility_score: number;
    weight_grams: number;
  };
  location: Location;
  stock_count: number;
};

type RouteStop = {
  sku_id: string;
  name: string;
  quantity: number;
  grid_x: number;
  grid_y: number;
  fragility_score: number;
  picker_id: number;
  step: number;
};

type PickerRoute = {
  picker_id: number;
  distance: number;
  stops: RouteStop[];
};

type SimulationResponse = {
  state: "pending" | "routing" | "picking" | "dispatched";
  parsed_items: Array<{
    sku_id: string;
    quantity: number;
    fragility_score: number;
    confidence: number;
  }>;
  missing_items: string[];
  fifo_route: PickerRoute;
  optimized_routes: PickerRoute[];
  metrics: {
    fifo_distance: number;
    optimized_distance: number;
    reduction_percent: number;
    nlp_bleu_score: number;
    cv_f1_score: number;
    dispatch_seconds: number;
  };
  anomalies: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    message: string;
    location: Location;
    f1_score: number;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    lift: number;
    skus: string[];
    rationale: string;
  }>;
  inventory: InventoryItem[];
};

const sample: SimulationResponse = {
  state: "dispatched",
  parsed_items: [
    { sku_id: "SKU-001", quantity: 2, fragility_score: 7, confidence: 0.93 },
    { sku_id: "SKU-006", quantity: 1, fragility_score: 4, confidence: 0.93 },
    { sku_id: "SKU-011", quantity: 1, fragility_score: 1, confidence: 0.87 },
    { sku_id: "SKU-027", quantity: 1, fragility_score: 6, confidence: 0.93 },
    { sku_id: "SKU-010", quantity: 1, fragility_score: 10, confidence: 0.93 },
  ],
  missing_items: [],
  fifo_route: {
    picker_id: 1,
    distance: 52,
    stops: [
      { sku_id: "SKU-001", name: "Bananas", quantity: 2, grid_x: 2, grid_y: 3, fragility_score: 7, picker_id: 1, step: 1 },
      { sku_id: "SKU-006", name: "Whole Milk", quantity: 1, grid_x: 4, grid_y: 3, fragility_score: 4, picker_id: 1, step: 2 },
      { sku_id: "SKU-011", name: "Basmati Rice", quantity: 1, grid_x: 6, grid_y: 3, fragility_score: 1, picker_id: 1, step: 3 },
      { sku_id: "SKU-027", name: "Glass Cleaner", quantity: 1, grid_x: 12, grid_y: 5, fragility_score: 6, picker_id: 1, step: 4 },
      { sku_id: "SKU-010", name: "Eggs 12 Pack", quantity: 1, grid_x: 4, grid_y: 11, fragility_score: 10, picker_id: 1, step: 5 },
    ],
  },
  optimized_routes: [
    {
      picker_id: 1,
      distance: 18,
      stops: [
        { sku_id: "SKU-001", name: "Bananas", quantity: 2, grid_x: 2, grid_y: 3, fragility_score: 7, picker_id: 1, step: 1 },
        { sku_id: "SKU-006", name: "Whole Milk", quantity: 1, grid_x: 4, grid_y: 3, fragility_score: 4, picker_id: 1, step: 2 },
      ],
    },
    {
      picker_id: 2,
      distance: 18,
      stops: [
        { sku_id: "SKU-011", name: "Basmati Rice", quantity: 1, grid_x: 6, grid_y: 3, fragility_score: 1, picker_id: 2, step: 1 },
      ],
    },
    {
      picker_id: 3,
      distance: 28,
      stops: [
        { sku_id: "SKU-027", name: "Glass Cleaner", quantity: 1, grid_x: 12, grid_y: 5, fragility_score: 6, picker_id: 3, step: 1 },
        { sku_id: "SKU-010", name: "Eggs 12 Pack", quantity: 1, grid_x: 4, grid_y: 11, fragility_score: 10, picker_id: 3, step: 2 },
      ],
    },
  ],
  metrics: {
    fifo_distance: 52,
    optimized_distance: 28,
    reduction_percent: 46.2,
    nlp_bleu_score: 0.88,
    cv_f1_score: 0.93,
    dispatch_seconds: 196,
  },
  anomalies: [
    {
      id: "ANM-103",
      severity: "high",
      message: "Homecare chemical detected adjacent to produce staging lane.",
      location: { id: 27, aisle: 6, rack: 2, shelf: 4, grid_x: 12, grid_y: 5, zone: "homecare" },
      f1_score: 0.94,
    },
    {
      id: "ANM-118",
      severity: "medium",
      message: "Frozen bay door open longer than target dwell window.",
      location: { id: 32, aisle: 7, rack: 2, shelf: 1, grid_x: 14, grid_y: 4, zone: "frozen" },
      f1_score: 0.91,
    },
  ],
  recommendations: [
    {
      id: "REC-01",
      title: "Co-locate breakfast bundle",
      lift: 1.42,
      skus: ["SKU-006", "SKU-016", "SKU-010"],
      rationale: "Milk, cereal, and eggs co-occur in morning baskets and should move closer to dispatch.",
    },
    {
      id: "REC-02",
      title: "Separate chemical adjacency",
      lift: 1.18,
      skus: ["SKU-027", "SKU-047", "SKU-001"],
      rationale: "Cleaning products should be moved one aisle farther from high-velocity produce.",
    },
  ],
  inventory: [],
};

const routeColors = ["#0f766e", "#d97706", "#2563eb", "#be123c", "#7c3aed"];
const zones = {
  produce: "#31a354",
  dairy: "#0284c7",
  pantry: "#ca8a04",
  personal: "#9333ea",
  homecare: "#dc2626",
  frozen: "#0891b2",
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [instruction, setInstruction] = useState(
    "2 bananas, 1 milk, 1 basmati rice, 1 glass cleaner, and eggs carefully"
  );
  const [pickerCount, setPickerCount] = useState(3);
  const [data, setData] = useState<SimulationResponse>(sample);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"api" | "demo">("demo");

  async function runSimulation(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, picker_count: pickerCount }),
      });
      if (!response.ok) throw new Error("API unavailable");
      setData(await response.json());
      setSource("api");
    } catch {
      setData(sample);
      setSource("demo");
    } finally {
      setLoading(false);
    }
  }

  const routeStops = useMemo(
    () => data.optimized_routes.flatMap((route) => route.stops),
    [data.optimized_routes]
  );

  const maxX = Math.max(16, ...routeStops.map((stop) => stop.grid_x), ...data.anomalies.map((item) => item.location.grid_x));
  const maxY = Math.max(12, ...routeStops.map((stop) => stop.grid_y), ...data.anomalies.map((item) => item.location.grid_y));

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Single-store swarm sandbox</p>
          <h1>Q-Commerce Swarm Orchestrator</h1>
        </div>
        <div className="status-pill">
          <span className={cx("status-dot", source === "api" && "online")} />
          {source === "api" ? "FastAPI live" : "Demo model"}
        </div>
      </section>

      <section className="command-strip">
        <form onSubmit={runSimulation} className="order-form">
          <label htmlFor="instruction">Customer instruction</label>
          <div className="order-controls">
            <input
              id="instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
            <div className="picker-control">
              <span>Pickers</span>
              <input
                aria-label="Picker count"
                type="number"
                min={1}
                max={5}
                value={pickerCount}
                onChange={(event) => setPickerCount(Number(event.target.value))}
              />
            </div>
            <button type="submit" disabled={loading}>
              <Play size={18} />
              {loading ? "Routing" : "Simulate"}
            </button>
          </div>
        </form>
      </section>

      <section className="metrics-grid">
        <Metric icon={<Target />} label="Pick time reduction" value={`${data.metrics.reduction_percent}%`} target="Target 40%+" tone="green" />
        <Metric icon={<BrainCircuit />} label="NLP BLEU score" value={data.metrics.nlp_bleu_score.toFixed(2)} target="Target > 0.85" tone="blue" />
        <Metric icon={<Activity />} label="CV F1 score" value={data.metrics.cv_f1_score.toFixed(2)} target="Target > 0.90" tone="amber" />
        <Metric icon={<Clock3 />} label="Dispatch estimate" value={`${data.metrics.dispatch_seconds}s`} target={`${data.state} state`} tone="rose" />
      </section>

      <section className="workspace">
        <div className="warehouse-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Routing engine</p>
              <h2>Optimized swarm path</h2>
            </div>
            <Warehouse size={24} />
          </div>
          <WarehouseMap data={data} maxX={maxX} maxY={maxY} />
        </div>

        <aside className="side-rail">
          <PanelTitle icon={<Route />} title="Route delta" />
          <div className="delta-bars">
            <Bar label="FIFO" value={data.metrics.fifo_distance} max={Math.max(data.metrics.fifo_distance, data.metrics.optimized_distance)} />
            <Bar label="Optimized" value={data.metrics.optimized_distance} max={Math.max(data.metrics.fifo_distance, data.metrics.optimized_distance)} accent />
          </div>

          <PanelTitle icon={<Boxes />} title="Parsed picks" />
          <div className="pick-list">
            {data.parsed_items.map((item) => {
              const stop = data.fifo_route.stops.find((candidate) => candidate.sku_id === item.sku_id);
              return (
                <div className="pick-row" key={item.sku_id}>
                  <span>{stop?.name ?? item.sku_id}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              );
            })}
          </div>

          <PanelTitle icon={<AlertTriangle />} title="Anomaly queue" />
          <div className="alert-list">
            {data.anomalies.map((anomaly) => (
              <div className="alert-row" key={anomaly.id}>
                <div>
                  <strong>{anomaly.id}</strong>
                  <p>{anomaly.message}</p>
                </div>
                <span>{anomaly.f1_score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="lower-grid">
        <div className="recommendations">
          <PanelTitle icon={<Sparkles />} title="Predictive stocker" />
          <div className="rec-grid">
            {data.recommendations.map((rec) => (
              <article className="rec-card" key={rec.id}>
                <div>
                  <span>{rec.id}</span>
                  <strong>{rec.title}</strong>
                </div>
                <p>{rec.rationale}</p>
                <footer>
                  <span>{rec.skus.join(" + ")}</span>
                  <b>{rec.lift.toFixed(2)}x</b>
                </footer>
              </article>
            ))}
          </div>
        </div>

        <div className="agent-flow">
          <PanelTitle icon={<GitBranch />} title="LangGraph-style orchestration" />
          <div className="flow">
            {["Order", "NLP", "Stock", "Route", "Dispatch"].map((step, index) => (
              <div className="flow-node" key={step}>
                <span>{index + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  target,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
  tone: "green" | "blue" | "amber" | "rose";
}) {
  return (
    <article className={cx("metric", tone)}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{target}</p>
    </article>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h3>{title}</h3>
    </div>
  );
}

function Bar({ label, value, max, accent }: { label: string; value: number; max: number; accent?: boolean }) {
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.max(8, (value / max) * 100)}%` }} className={accent ? "accent" : ""} />
      </div>
      <strong>{value}m</strong>
    </div>
  );
}

function WarehouseMap({ data, maxX, maxY }: { data: SimulationResponse; maxX: number; maxY: number }) {
  const laneRows = Array.from({ length: 6 }, (_, index) => index + 1);
  return (
    <div className="map-wrap">
      <div className="map-grid">
        {laneRows.map((row) => (
          <span className="lane" style={{ top: `${(row / 7) * 100}%` }} key={row} />
        ))}
        <span className="dispatch">Dispatch</span>

        {data.anomalies.map((anomaly) => (
          <span
            className="anomaly-pin"
            style={{
              left: `${(anomaly.location.grid_x / (maxX + 2)) * 100}%`,
              top: `${(anomaly.location.grid_y / (maxY + 2)) * 100}%`,
            }}
            key={anomaly.id}
            title={anomaly.message}
          >
            !
          </span>
        ))}

        {data.optimized_routes.map((route, routeIndex) =>
          route.stops.map((stop) => (
            <motion.div
              className="stop-pin"
              style={{
                left: `${(stop.grid_x / (maxX + 2)) * 100}%`,
                top: `${(stop.grid_y / (maxY + 2)) * 100}%`,
                borderColor: routeColors[routeIndex % routeColors.length],
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: stop.step * 0.08 }}
              key={`${stop.sku_id}-${route.picker_id}`}
            >
              {stop.step}
            </motion.div>
          ))
        )}

        {data.optimized_routes.map((route, routeIndex) => {
          const last = route.stops[route.stops.length - 1];
          const x = last ? last.grid_x : 1;
          const y = last ? last.grid_y : 1;
          return (
            <motion.div
              className="picker"
              style={{
                background: routeColors[routeIndex % routeColors.length],
              }}
              initial={{ left: "3%", top: "7%" }}
              animate={{
                left: `${(x / (maxX + 2)) * 100}%`,
                top: `${(y / (maxY + 2)) * 100}%`,
              }}
              transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              key={route.picker_id}
            >
              P{route.picker_id}
            </motion.div>
          );
        })}

        {Object.entries(zones).map(([zone, color], index) => (
          <span className="zone-chip" style={{ borderColor: color, color, left: `${5 + index * 15}%` }} key={zone}>
            {zone}
          </span>
        ))}
      </div>
    </div>
  );
}

