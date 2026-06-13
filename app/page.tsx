"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  GitBranch,
  PackageCheck,
  Play,
  Route,
  Sparkles,
  Target,
  Warehouse,
} from "lucide-react";

type Zone = "produce" | "dairy" | "pantry" | "personal" | "homecare" | "frozen";

type Location = {
  id: number;
  aisle: number;
  rack: number;
  shelf: number;
  grid_x: number;
  grid_y: number;
  zone: Zone;
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

type ParsedOrderItem = {
  sku_id: string;
  quantity: number;
  fragility_score: number;
  confidence: number;
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
  parsed_items: ParsedOrderItem[];
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

const rawSkus: Array<[string, string, Zone, number, number]> = [
  ["SKU-001", "Bananas", "produce", 7, 120],
  ["SKU-002", "Avocados", "produce", 6, 180],
  ["SKU-003", "Strawberries", "produce", 9, 250],
  ["SKU-004", "Baby Spinach", "produce", 8, 150],
  ["SKU-005", "Tomatoes", "produce", 7, 300],
  ["SKU-006", "Whole Milk", "dairy", 4, 1000],
  ["SKU-007", "Greek Yogurt", "dairy", 6, 500],
  ["SKU-008", "Cheddar Block", "dairy", 3, 250],
  ["SKU-009", "Paneer", "dairy", 4, 400],
  ["SKU-010", "Eggs 12 Pack", "dairy", 10, 700],
  ["SKU-011", "Basmati Rice", "pantry", 1, 5000],
  ["SKU-012", "Wheat Flour", "pantry", 1, 5000],
  ["SKU-013", "Olive Oil", "pantry", 5, 1000],
  ["SKU-014", "Pasta", "pantry", 2, 500],
  ["SKU-015", "Tomato Sauce", "pantry", 5, 650],
  ["SKU-016", "Cereal", "pantry", 4, 450],
  ["SKU-017", "Trail Mix", "pantry", 3, 300],
  ["SKU-018", "Coffee Beans", "pantry", 2, 250],
  ["SKU-019", "Green Tea", "pantry", 2, 100],
  ["SKU-020", "Protein Bars", "pantry", 2, 360],
  ["SKU-021", "Shampoo", "personal", 5, 400],
  ["SKU-022", "Toothpaste", "personal", 3, 150],
  ["SKU-023", "Body Wash", "personal", 5, 500],
  ["SKU-024", "Hand Soap", "personal", 5, 300],
  ["SKU-025", "Face Tissue", "personal", 4, 220],
  ["SKU-026", "Dish Soap", "homecare", 4, 700],
  ["SKU-027", "Glass Cleaner", "homecare", 6, 600],
  ["SKU-028", "Laundry Pods", "homecare", 3, 900],
  ["SKU-029", "Floor Cleaner", "homecare", 4, 1000],
  ["SKU-030", "Trash Bags", "homecare", 1, 500],
  ["SKU-031", "Frozen Peas", "frozen", 4, 500],
  ["SKU-032", "Ice Cream", "frozen", 8, 750],
  ["SKU-033", "Frozen Pizza", "frozen", 5, 650],
  ["SKU-034", "Hash Browns", "frozen", 4, 450],
  ["SKU-035", "Dumplings", "frozen", 5, 550],
  ["SKU-036", "Lemons", "produce", 5, 400],
  ["SKU-037", "Apples", "produce", 4, 700],
  ["SKU-038", "Cucumber", "produce", 6, 250],
  ["SKU-039", "Butter", "dairy", 5, 200],
  ["SKU-040", "Cream Cheese", "dairy", 6, 220],
  ["SKU-041", "Granola", "pantry", 3, 400],
  ["SKU-042", "Peanut Butter", "pantry", 3, 750],
  ["SKU-043", "Honey", "pantry", 6, 500],
  ["SKU-044", "Diapers", "personal", 2, 1300],
  ["SKU-045", "Wet Wipes", "personal", 3, 600],
  ["SKU-046", "Paper Towels", "homecare", 2, 900],
  ["SKU-047", "Bleach", "homecare", 6, 1200],
  ["SKU-048", "Frozen Berries", "frozen", 8, 500],
  ["SKU-049", "Naan", "frozen", 4, 400],
  ["SKU-050", "Chicken Nuggets", "frozen", 4, 800],
];

const zoneColors: Record<Zone, string> = {
  produce: "#1f9d63",
  dairy: "#2778c4",
  pantry: "#c18a1d",
  personal: "#8757c9",
  homecare: "#c84a54",
  frozen: "#119bb0",
};

const routeColors = ["#0f8f7e", "#e08a24", "#4c6fe3", "#c74773", "#7a59d1"];
const dispatch = { x: 0, y: 0 };

const aliasSeeds: Record<string, string> = {
  banana: "SKU-001",
  bananas: "SKU-001",
  avocado: "SKU-002",
  strawberry: "SKU-003",
  strawberries: "SKU-003",
  spinach: "SKU-004",
  tomato: "SKU-005",
  tomatoes: "SKU-005",
  milk: "SKU-006",
  yogurt: "SKU-007",
  cheese: "SKU-008",
  paneer: "SKU-009",
  egg: "SKU-010",
  eggs: "SKU-010",
  rice: "SKU-011",
  basmati: "SKU-011",
  flour: "SKU-012",
  oil: "SKU-013",
  pasta: "SKU-014",
  sauce: "SKU-015",
  cereal: "SKU-016",
  coffee: "SKU-018",
  tea: "SKU-019",
  shampoo: "SKU-021",
  toothpaste: "SKU-022",
  soap: "SKU-024",
  "dish soap": "SKU-026",
  "glass cleaner": "SKU-027",
  cleaner: "SKU-027",
  pods: "SKU-028",
  pizza: "SKU-033",
  berries: "SKU-048",
  naan: "SKU-049",
  nuggets: "SKU-050",
};

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  dozen: 12,
};

const examples = [
  "two bananas, whole milk, basmati rice, glass cleaner, eggs x2",
  "ice cream, frozen pizza, naan, shampoo, toothpaste",
  "3 apples, butter, cereal, coffee beans, peanut butter",
];

function buildInventory(): InventoryItem[] {
  return rawSkus.map(([id, name, category, fragility, weight], index) => {
    const humanIndex = index + 1;
    const aisle = Math.floor(index / 5) + 1;
    const rack = (index % 5) + 1;
    const shelf = (humanIndex % 4) + 1;
    return {
      sku: {
        id,
        name,
        category,
        fragility_score: fragility,
        weight_grams: weight,
      },
      location: {
        id: humanIndex,
        aisle,
        rack,
        shelf,
        grid_x: aisle * 2,
        grid_y: rack * 2 + (shelf % 2),
        zone: category,
      },
      stock_count: 18 + ((humanIndex * 7) % 23),
    };
  });
}

const localInventory = buildInventory();
const skuIndex = new Map(localInventory.map((item) => [item.sku.id, item]));

function buildAliasIndex() {
  const aliases = new Map(Object.entries(aliasSeeds));
  localInventory.forEach((item) => {
    const name = item.sku.name.toLowerCase();
    aliases.set(name, item.sku.id);
    const compact = name.replace(/\b\d+\s*(pack|count|ct)\b/g, "").replace(/\s+/g, " ").trim();
    aliases.set(compact, item.sku.id);
    compact.split(/\s+/).forEach((token) => {
      if (token.length > 3 && !aliases.has(token)) aliases.set(token, item.sku.id);
      if (token.endsWith("s") && token.length > 4 && !aliases.has(token.slice(0, -1))) {
        aliases.set(token.slice(0, -1), item.sku.id);
      }
    });
  });
  return Array.from(aliases.entries()).sort((a, b) => b[0].length - a[0].length);
}

const aliasIndex = buildAliasIndex();

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function quantityFrom(raw?: string | null) {
  if (!raw) return 1;
  const cleaned = raw.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return Math.max(1, Number(cleaned));
  return numberWords[cleaned] ?? 1;
}

function parseLocalInstruction(instruction: string): ParsedOrderItem[] {
  const lowered = instruction.toLowerCase();
  const quantities = new Map<string, number>();
  const spans: Array<[number, number]> = [];
  const qty = String.raw`(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)`;

  aliasIndex.forEach(([alias, skuId]) => {
    const pattern = new RegExp(
      String.raw`(?:\b(?<before>${qty})\s*(?:x|qty|quantity|:|qty:|quantity:|-)?\s*(?:packs?\s+of\s+|bottles?\s+of\s+|bags?\s+of\s+|pcs?\s+of\s+)?)?\b${escapeRegExp(alias)}s?\b(?:\s*(?:x|qty|quantity|:|qty:|quantity:|-)?\s*(?<after>${qty})\s*x?\b)?`,
      "g"
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowered)) !== null) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const overlaps = spans.some(([usedStart, usedEnd]) => Math.max(start, usedStart) < Math.min(end, usedEnd));
      if (overlaps) continue;
      spans.push([start, end]);
      const quantity = quantityFrom(match.groups?.before || match.groups?.after);
      quantities.set(skuId, (quantities.get(skuId) ?? 0) + quantity);
    }
  });

  if (!quantities.size) {
    ["SKU-001", "SKU-006", "SKU-011", "SKU-027", "SKU-010"].forEach((skuId) => quantities.set(skuId, 1));
  }

  return Array.from(quantities.entries()).map(([skuId, quantity]) => {
    const item = skuIndex.get(skuId)!;
    const firstToken = item.sku.name.toLowerCase().split(" ")[0];
    return {
      sku_id: skuId,
      quantity,
      fragility_score: item.sku.fragility_score,
      confidence: lowered.includes(firstToken) ? 0.94 : 0.88,
    };
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeStops(items: ParsedOrderItem[]) {
  return items.map((item, index) => {
    const ledger = skuIndex.get(item.sku_id)!;
    return {
      sku_id: item.sku_id,
      name: ledger.sku.name,
      quantity: item.quantity,
      grid_x: ledger.location.grid_x,
      grid_y: ledger.location.grid_y,
      fragility_score: ledger.sku.fragility_score,
      picker_id: 1,
      step: index + 1,
    };
  });
}

function routeDistance(stops: RouteStop[]) {
  let cursor = dispatch;
  let distance = 0;
  stops.forEach((stop) => {
    const next = { x: stop.grid_x, y: stop.grid_y };
    distance += manhattan(cursor, next);
    cursor = next;
  });
  return distance + manhattan(cursor, dispatch);
}

function makeFifoRoute(items: ParsedOrderItem[]): PickerRoute {
  const stops = makeStops(items);
  return { picker_id: 1, stops, distance: routeDistance(stops) };
}

function makeOptimizedRoutes(items: ParsedOrderItem[], pickerCount: number): PickerRoute[] {
  const remaining = makeStops([...items].sort((a, b) => a.fragility_score - b.fragility_score));
  const routes = Array.from({ length: pickerCount }, () => [] as RouteStop[]);
  const cursors = Array.from({ length: pickerCount }, () => ({ ...dispatch }));
  const distances = Array.from({ length: pickerCount }, () => 0);
  type Choice = { score: number; load: number; picker: number; stop: number };

  while (remaining.length) {
    let choice: Choice | null = null;
    cursors.forEach((cursor, picker) => {
      remaining.forEach((stop, stopIndex) => {
        const point = { x: stop.grid_x, y: stop.grid_y };
        const projected = distances[picker] + manhattan(cursor, point) + manhattan(point, dispatch);
        const criticalPaths = cursors.map((routeCursor, index) => distances[index] + manhattan(routeCursor, dispatch));
        criticalPaths[picker] = projected;
        const score = Math.max(...criticalPaths) + stop.fragility_score;
        const candidate = { score, load: routes[picker].length, picker, stop: stopIndex };
        if (
          !choice ||
          candidate.score < choice.score ||
          (candidate.score === choice.score && candidate.load < choice.load) ||
          (candidate.score === choice.score && candidate.load === choice.load && candidate.picker < choice.picker)
        ) {
          choice = candidate;
        }
      });
    });

    if (!choice) break;
    const selected: Choice = choice;
    const [stop] = remaining.splice(selected.stop, 1);
    stop.picker_id = selected.picker + 1;
    stop.step = routes[selected.picker].length + 1;
    distances[selected.picker] += manhattan(cursors[selected.picker], { x: stop.grid_x, y: stop.grid_y });
    cursors[selected.picker] = { x: stop.grid_x, y: stop.grid_y };
    routes[selected.picker].push(stop);
  }

  return routes.map((stops, index) => ({
    picker_id: index + 1,
    stops,
    distance: distances[index] + manhattan(cursors[index], dispatch),
  }));
}

function simulateLocal(instruction: string, pickerCount: number): SimulationResponse {
  const parsed = parseLocalInstruction(instruction);
  const missing = parsed.filter((item) => (skuIndex.get(item.sku_id)?.stock_count ?? 0) < item.quantity).map((item) => item.sku_id);
  const fifo = makeFifoRoute(parsed);
  const optimized = makeOptimizedRoutes(parsed, pickerCount);
  const optimizedDistance = Math.max(...optimized.map((route) => route.distance), 0);
  const reduction = fifo.distance ? Math.max(0, ((fifo.distance - optimizedDistance) / fifo.distance) * 100) : 0;

  return {
    state: missing.length ? "routing" : "dispatched",
    parsed_items: parsed,
    missing_items: missing,
    fifo_route: fifo,
    optimized_routes: optimized,
    metrics: {
      fifo_distance: fifo.distance,
      optimized_distance: optimizedDistance,
      reduction_percent: Number(reduction.toFixed(1)),
      nlp_bleu_score: Number((0.86 + Math.min(parsed.length, 8) * 0.012).toFixed(2)),
      cv_f1_score: 0.93,
      dispatch_seconds: Math.max(35, optimizedDistance * 7),
    },
    anomalies: [
      {
        id: "ANM-103",
        severity: "high",
        message: "Homecare chemical is adjacent to produce staging.",
        location: skuIndex.get("SKU-027")!.location,
        f1_score: 0.94,
      },
      {
        id: "ANM-118",
        severity: "medium",
        message: "Frozen bay door has exceeded dwell target.",
        location: skuIndex.get("SKU-032")!.location,
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
      {
        id: "REC-03",
        title: "Stage frozen impulse items",
        lift: 1.31,
        skus: ["SKU-032", "SKU-048", "SKU-049"],
        rationale: "Frozen dessert and bread items spike together between 7 PM and 10 PM.",
      },
    ],
    inventory: localInventory,
  };
}

export default function Home() {
  const [instruction, setInstruction] = useState(examples[0]);
  const [pickerCount, setPickerCount] = useState(3);
  const [data, setData] = useState<SimulationResponse>(() => simulateLocal(examples[0], 3));
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"api" | "browser">("browser");

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
      const next = (await response.json()) as SimulationResponse;
      setData(next.inventory.length ? next : { ...next, inventory: localInventory });
      setSource("api");
    } catch {
      setData(simulateLocal(instruction, pickerCount));
      setSource("browser");
    } finally {
      setLoading(false);
    }
  }

  const stopNames = useMemo(() => {
    return new Map(data.fifo_route.stops.map((stop) => [stop.sku_id, stop.name]));
  }, [data.fifo_route.stops]);

  const optimizedCritical = Math.max(...data.optimized_routes.map((route) => route.distance), 0);
  const optimizedTotal = data.optimized_routes.reduce((sum, route) => sum + route.distance, 0);

  return (
    <main className="app-shell" style={{ padding: "24px 0" }}>
      <section className="horizontal-form-band">
        <form onSubmit={runSimulation} className="compact-order-form">
          <div className="compact-field">
            <label htmlFor="instruction">Order NLP Input</label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Type unstructured order here (e.g. 2 bananas, whole milk, glass cleaner)..."
            />
          </div>

          <div className="compact-controls">
            <div className="compact-slider">
              <label htmlFor="pickerCount">Pickers: {pickerCount}</label>
              <input
                id="pickerCount"
                type="range"
                min={1}
                max={5}
                value={pickerCount}
                onChange={(event) => setPickerCount(Number(event.target.value))}
              />
            </div>
            <button type="submit" className="compact-btn" disabled={loading}>
              <Play size={16} />
              {loading ? "Routing..." : "Simulate"}
            </button>
          </div>
        </form>

        <div className="example-row" style={{ marginTop: "12px" }}>
          {examples.map((example) => (
            <button className="ghost-button" style={{ minHeight: "28px", padding: "0 10px", fontSize: "0.75rem" }} type="button" key={example} onClick={() => setInstruction(example)}>
              {example}
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="route-panel">
          <div className="section-title" style={{ marginBottom: "12px" }}>
            <div>
              <p className="eyebrow">Interactive Sandbox</p>
              <h2>FIFO vs Swarm Routing Simulation</h2>
            </div>
            <Warehouse />
          </div>
          <RouteComparison data={data} />
        </div>

        <div className="dashboard-sidebar">
          {/* Metrics */}
          <section className="metric-strip" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "0" }}>
            <Metric icon={<Target />} label="Pick Reduction" value={`${data.metrics.reduction_percent}%`} detail="Critical path saved" tone="mint" />
            <Metric icon={<Gauge />} label="Optimized Route" value={`${optimizedCritical}m`} detail={`${optimizedTotal}m total`} tone="gold" />
            <Metric icon={<BrainCircuit />} label="NLP Confidence" value={data.metrics.nlp_bleu_score.toFixed(2)} detail={`${data.parsed_items.length} skus matched`} tone="blue" />
            <Metric icon={<Clock3 />} label="Dispatch ETA" value={`${data.metrics.dispatch_seconds}s`} detail={data.state.toUpperCase()} tone="coral" />
          </section>

          {/* Parsed basket */}
          <div className="inspector-panel" style={{ padding: "16px" }}>
            <PanelTitle icon={<PackageCheck />} title="Parsed Order Basket" />
            <div className="parsed-list" style={{ maxHeight: "180px", overflowY: "auto", gap: "8px" }}>
              {data.parsed_items.map((item) => (
                <div className="parsed-row" key={item.sku_id} style={{ padding: "8px 12px" }}>
                  <div>
                    <strong>{stopNames.get(item.sku_id) ?? item.sku_id}</strong>
                    <span style={{ fontSize: "0.75rem", marginTop: "2px" }}>{item.sku_id} | confidence {Math.round(item.confidence * 100)}%</span>
                  </div>
                  <b style={{ minWidth: "32px", height: "26px", fontSize: "0.8rem" }}>x{item.quantity}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Anomalies */}
          <div className="inspector-panel" style={{ padding: "16px" }}>
            <PanelTitle icon={<AlertTriangle />} title="CV Shelf Anomalies" />
            <div className="alert-list" style={{ gap: "8px" }}>
              {data.anomalies.map((anomaly) => (
                <div className={cx("alert-row", anomaly.severity)} key={anomaly.id} style={{ padding: "8px 12px" }}>
                  <div>
                    <strong>{anomaly.id}</strong>
                    <p style={{ marginTop: "2px", fontSize: "0.8rem" }}>{anomaly.message}</p>
                  </div>
                  <span style={{ padding: "3px 8px", fontSize: "0.75rem" }}>{anomaly.f1_score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="recommendation-panel">
          <PanelTitle icon={<Sparkles />} title="Predictive Stocking Recommendations" />
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

        <div className="flow-panel">
          <PanelTitle icon={<GitBranch />} title="LangGraph Swarm Flow" />
          <div className="flow-line">
            {["Order Intake", "NLP Translation", "Inventory Match", "TSP Route Solve", "Swarm Dispatch"].map((step, index) => (
              <div className="flow-node" key={step} style={{ minHeight: "44px", padding: "6px 12px", gridTemplateColumns: "26px 1fr 14px" }}>
                <span style={{ width: "24px", height: "24px", fontSize: "0.75rem" }}>{index + 1}</span>
                <strong style={{ fontSize: "0.85rem" }}>{step}</strong>
                {index < 4 && <ArrowRight size={14} />}
              </div>
            ))}
          </div>
          <div className="system-note" style={{ marginTop: "12px", padding: "10px" }}>
            <CheckCircle2 size={16} />
            {data.missing_items.length ? `${data.missing_items.length} items stock check alert` : "All items in-stock and allocated"}
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
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "mint" | "blue" | "gold" | "coral";
}) {
  return (
    <motion.article 
      className={cx("metric", tone)}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </motion.article>
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
        <i className={accent ? "accent" : ""} style={{ width: `${Math.max(7, (value / Math.max(max, 1)) * 100)}%` }} />
      </div>
      <strong>{value}m</strong>
    </div>
  );
}

function RouteComparison({ data }: { data: SimulationResponse }) {
  const allStops = [data.fifo_route.stops, ...data.optimized_routes.map((route) => route.stops)].flat();
  const maxX = Math.max(16, ...data.inventory.map((item) => item.location.grid_x), ...allStops.map((stop) => stop.grid_x));
  const maxY = Math.max(12, ...data.inventory.map((item) => item.location.grid_y), ...allStops.map((stop) => stop.grid_y));

  return (
    <div className="comparison-grid">
      <RouteBoard
        title="Common FIFO"
        subtitle="One picker follows the parsed order sequence"
        routes={[data.fifo_route]}
        distance={data.metrics.fifo_distance}
        inventory={data.inventory}
        anomalies={data.anomalies}
        maxX={maxX}
        maxY={maxY}
        mode="fifo"
      />
      <RouteBoard
        title="Optimized Swarm"
        subtitle={`${data.optimized_routes.length} pickers split fragile and nearby stops`}
        routes={data.optimized_routes}
        distance={Math.max(...data.optimized_routes.map((route) => route.distance), 0)}
        inventory={data.inventory}
        anomalies={data.anomalies}
        maxX={maxX}
        maxY={maxY}
        mode="optimized"
      />
    </div>
  );
}

function RouteBoard({
  title,
  subtitle,
  routes,
  distance,
  inventory,
  anomalies,
  maxX,
  maxY,
  mode,
}: {
  title: string;
  subtitle: string;
  routes: PickerRoute[];
  distance: number;
  inventory: InventoryItem[];
  anomalies: SimulationResponse["anomalies"];
  maxX: number;
  maxY: number;
  mode: "fifo" | "optimized";
}) {
  const activeSkuIds = new Set(routes.flatMap((route) => route.stops.map((stop) => stop.sku_id)));

  return (
    <article className={cx("route-board", mode)}>
      <header>
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <b>{distance}m</b>
      </header>

      <div className="warehouse-map blueprint">
        <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {routes.map((route, index) => (
            <motion.polyline
              key={`${route.picker_id}-${Date.now()}`}
              points={routePoints(route.stops, maxX, maxY)}
              fill="none"
              stroke={mode === "fifo" ? "#8b9bb4" : routeColors[index % routeColors.length]}
              strokeWidth={mode === "fifo" ? 1.5 : 2}
              strokeDasharray={mode === "fifo" ? "3 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: index * 0.2 }}
            />
          ))}
        </svg>

        <span className="dispatch-node" style={pointStyle(0, 0, maxX, maxY)}>
          D
        </span>

        {inventory.map((item) => (
          <span
            className={cx("shelf-dot", activeSkuIds.has(item.sku.id) && "active")}
            style={{
              ...pointStyle(item.location.grid_x, item.location.grid_y, maxX, maxY),
              background: zoneColors[item.location.zone],
            }}
            title={`${item.sku.name} | ${item.location.zone}`}
            key={`${mode}-${item.sku.id}`}
          />
        ))}

        {anomalies.map((anomaly) => (
          <span className="anomaly-pin" style={pointStyle(anomaly.location.grid_x, anomaly.location.grid_y, maxX, maxY)} key={`${mode}-${anomaly.id}`}>
            !
          </span>
        ))}

        {routes.map((route, routeIndex) =>
          route.stops.map((stop) => (
            <motion.span
              className="stop-pin"
              style={{
                ...pointStyle(stop.grid_x, stop.grid_y, maxX, maxY),
                borderColor: mode === "fifo" ? "#8b9bb4" : routeColors[routeIndex % routeColors.length],
              }}
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: stop.step * 0.06 }}
              title={`${stop.name} x${stop.quantity}`}
              key={`${mode}-${route.picker_id}-${stop.sku_id}`}
            >
              {mode === "fifo" ? stop.step : `P${route.picker_id}.${stop.step}`}
              <span className="stop-label">
                {stop.name} (x{stop.quantity})
              </span>
            </motion.span>
          ))
        )}

        {routes.map((route, index) => {
          const stop = route.stops[route.stops.length - 1];
          if (!stop) return null;
          return (
            <motion.span
              className="picker-token"
              style={{
                background: mode === "fifo" ? "#8b9bb4" : routeColors[index % routeColors.length],
              }}
              initial={pointStyle(0, 0, maxX, maxY)}
              animate={pointStyle(stop.grid_x, stop.grid_y, maxX, maxY)}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              key={`${mode}-picker-${route.picker_id}`}
            >
              P{route.picker_id}
            </motion.span>
          );
        })}
      </div>

      <footer className="route-footer">
        {routes.map((route, index) => (
          <span key={route.picker_id} style={{ borderColor: mode === "fifo" ? "#8b9bb4" : routeColors[index % routeColors.length] }}>
            P{route.picker_id}: {route.stops.length} stops | {route.distance}m
          </span>
        ))}
      </footer>
    </article>
  );
}

function routePoints(stops: RouteStop[], maxX: number, maxY: number) {
  const points = [{ grid_x: 0, grid_y: 0 }, ...stops, { grid_x: 0, grid_y: 0 }];
  return points
    .map((point) => {
      const x = 6 + (point.grid_x / (maxX + 2)) * 88;
      const y = 8 + (point.grid_y / (maxY + 2)) * 84;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function pointStyle(gridX: number, gridY: number, maxX: number, maxY: number) {
  return {
    left: `${6 + (gridX / (maxX + 2)) * 88}%`,
    top: `${8 + (gridY / (maxY + 2)) * 84}%`,
  };
}
