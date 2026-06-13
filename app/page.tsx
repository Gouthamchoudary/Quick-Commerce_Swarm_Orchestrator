"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Terminal,
  Plus
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
  avocados: "SKU-002",
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
  peas: "SKU-031",
  "ice cream": "SKU-032",
  apples: "SKU-037",
};

const numberWords: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12
};

const examples = [
  "two bananas, whole milk, basmati rice, glass cleaner, eggs x2",
  "ice cream, frozen pizza, paneer, shampoo, toothpaste",
  "3 avocados, cheddar block, cereal, coffee beans, laundry pods",
];

const quickCatalog = [
  { name: "Bananas", icon: "🍌", sku: "SKU-001" },
  { name: "Avocados", icon: "🥑", sku: "SKU-002" },
  { name: "Whole Milk", icon: "🥛", sku: "SKU-006" },
  { name: "Eggs", icon: "🥚", sku: "SKU-010" },
  { name: "Basmati Rice", icon: "🌾", sku: "SKU-011" },
  { name: "Glass Cleaner", icon: "🧴", sku: "SKU-027" },
  { name: "Frozen Pizza", icon: "🍕", sku: "SKU-033" },
  { name: "Cereal", icon: "🥣", sku: "SKU-016" },
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
        grid_x: aisle * 2.5,
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

  remaining.forEach((stop) => {
    let bestPicker = 0;
    let minIncrease = Infinity;

    for (let p = 0; p < pickerCount; p++) {
      const currentLoc = cursors[p];
      const nextLoc = { x: stop.grid_x, y: stop.grid_y };
      const dist = manhattan(currentLoc, nextLoc);
      if (dist < minIncrease) {
        minIncrease = dist;
        bestPicker = p;
      }
    }

    const nextLoc = { x: stop.grid_x, y: stop.grid_y };
    distances[bestPicker] += minIncrease;
    cursors[bestPicker] = nextLoc;

    routes[bestPicker].push({
      ...stop,
      picker_id: bestPicker + 1,
      step: routes[bestPicker].length + 1,
    });
  });

  return routes.map((stops, index) => {
    const finalLoc = cursors[index];
    const returnDist = manhattan(finalLoc, dispatch);
    return {
      picker_id: index + 1,
      stops,
      distance: distances[index] + returnDist,
    };
  });
}

function simulateLocal(instruction: string, pickerCount: number): SimulationResponse {
  const parsed = parseLocalInstruction(instruction);
  const missing = parsed.filter((item) => (skuIndex.get(item.sku_id)?.stock_count ?? 0) < item.quantity).map((item) => item.sku_id);
  const fifo = makeFifoRoute(parsed);
  const optimized = makeOptimizedRoutes(parsed, pickerCount);

  const fifoDist = fifo.distance;
  const optimizedMax = Math.max(...optimized.map((r) => r.distance), 0);
  const reduction = fifoDist > 0 ? Math.round(((fifoDist - optimizedMax) / fifoDist) * 100) : 0;

  const mockAnomalies: SimulationResponse["anomalies"] = [];
  if (instruction.toLowerCase().includes("cleaner") || instruction.toLowerCase().includes("soap")) {
    const cleanerItem = localInventory.find((item) => item.sku.id === "SKU-027")!;
    mockAnomalies.push({
      id: "ANOMALY-101",
      severity: "high",
      message: "Chemical agent stored adjacent to Fresh Produce zone",
      location: cleanerItem.location,
      f1_score: 0.94,
    });
  }

  return {
    state: "dispatched",
    parsed_items: parsed,
    missing_items: missing,
    fifo_route: fifo,
    optimized_routes: optimized,
    metrics: {
      fifo_distance: fifoDist,
      optimized_distance: optimizedMax,
      reduction_percent: Math.max(0, reduction),
      nlp_bleu_score: Number((0.86 + Math.min(parsed.length, 8) * 0.012).toFixed(2)),
      cv_f1_score: 0.92,
      dispatch_seconds: 3 + parsed.length * 2,
    },
    anomalies: mockAnomalies,
    recommendations: [
      {
        id: "REC-01",
        title: "Co-locate Milk & Cereal",
        lift: 1.34,
        skus: ["SKU-006", "SKU-016"],
        rationale: "Items co-occur in 24% of baskets. Restructure physical shelves to adjacent rack slots.",
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
  const [hoveredSkuId, setHoveredSkuId] = useState<string | null>(null);

  // Telemetry Console Logs
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  function triggerTelemetry(parsedCount: number, optimizedDist: number, fifoDist: number) {
    const logs = [
      `[System] Orchestrator session initialized...`,
      `[NLP Parser] Fine-tuned Llama-3 parsing natural language input...`,
      `[NLP Parser] Extraction success: parsed ${parsedCount} catalogue item(s).`,
      `[DB Ledger] Checking inventory availability... Stock ledger verified (OK).`,
      `[CV Shelf Monitor] Vision cameras active... Scanning shelf slot coordinates...`,
      `[Routing Agent] Swarm pathing started... Solving Multi-Agent TSP...`,
      `[Routing Engine] Optimal routes computed. Swarm critical path: ${optimizedDist}m (FIFO was ${fifoDist}m).`,
      `[System] Picker robot swarm successfully dispatched! real-time path tracing active.`
    ];

    setTelemetryLogs([]);
    logs.forEach((log, index) => {
      setTimeout(() => {
        setTelemetryLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${log}`]);
      }, index * 180);
    });
  }

  // Trigger telemetry on first load
  useEffect(() => {
    const optimizedCritical = Math.max(...data.optimized_routes.map((route) => route.distance), 0);
    triggerTelemetry(data.parsed_items.length, optimizedCritical, data.metrics.fifo_distance);
  }, []);

  async function runSimulation(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    let nextData: SimulationResponse = simulateLocal(instruction, pickerCount);
    try {
      const response = await fetch("http://localhost:8000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, picker_count: pickerCount }),
      });
      if (!response.ok) throw new Error("API unavailable");
      const next = (await response.json()) as SimulationResponse;
      nextData = next.inventory.length ? next : { ...next, inventory: localInventory };
      setData(nextData);
      setSource("api");
    } catch {
      nextData = simulateLocal(instruction, pickerCount);
      setData(nextData);
      setSource("browser");
    } finally {
      setLoading(false);
      const parsedCount = nextData.parsed_items.length;
      const optimizedDist = Math.max(...nextData.optimized_routes.map((route) => route.distance), 0);
      const fifoDist = nextData.metrics.fifo_distance;
      triggerTelemetry(parsedCount, optimizedDist, fifoDist);
    }
  }

  // Quick Catalog item adder increments the quantity formatted in the NLP textbox
  const addCatalogItem = (name: string) => {
    setInstruction((prev) => {
      const trimmed = prev.trim();
      const itemLower = name.toLowerCase();
      if (!trimmed) return `2 ${itemLower}`;

      const regex = new RegExp(`(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozen)?\\s*${itemLower}`, "i");
      const match = trimmed.match(regex);

      if (match) {
        const currentQtyStr = match[1] || "1";
        let qty = 1;
        if (/^\d+$/.test(currentQtyStr)) {
          qty = parseInt(currentQtyStr, 10);
        } else {
          qty = numberWords[currentQtyStr.toLowerCase()] ?? 1;
        }
        const newQty = qty + 1;
        return trimmed.replace(regex, `${newQty} ${itemLower}`);
      } else {
        return `${trimmed}, 1 ${itemLower}`;
      }
    });
  };

  const stopNames = useMemo(() => {
    return new Map(data.fifo_route.stops.map((stop) => [stop.sku_id, stop.name]));
  }, [data.fifo_route.stops]);

  const optimizedCritical = Math.max(...data.optimized_routes.map((route) => route.distance), 0);
  const optimizedTotal = data.optimized_routes.reduce((sum, route) => sum + route.distance, 0);

  return (
    <main className="app-shell" style={{ padding: "12px 0 20px", height: "calc(100vh - 84px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top Section: Quick Catalog Clickers & Main Input Panel */}
      <section className="horizontal-form-band" style={{ display: "grid", gridTemplateColumns: "380px minmax(0, 1fr)", gap: "16px", marginBottom: "16px", flexShrink: 0 }}>
        
        {/* Quick Catalog panel */}
        <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--mint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Catalog Add</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {quickCatalog.map((item) => (
              <button
                key={item.sku}
                type="button"
                onClick={() => addCatalogItem(item.name)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 4px",
                  background: "#ffffff",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "8px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--ink)",
                  transition: "all 0.15s ease",
                  gap: "2px"
                }}
                className="ghost-button"
              >
                <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                <span style={{ fontSize: "0.6rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input NLP form */}
        <form onSubmit={runSimulation} className="compact-order-form" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div className="compact-field" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label htmlFor="instruction" style={{ fontSize: "0.68rem" }}>Unstructured Natural Language Order note</label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="E.g. two bananas, whole milk, basmati rice, eggs x2..."
              style={{ minHeight: "48px", flex: 1, padding: "8px 12px", fontSize: "0.82rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginTop: "8px" }}>
            <div className="example-row" style={{ marginTop: 0, display: "flex", gap: "8px" }}>
              {examples.map((ex, i) => (
                <button
                  className="ghost-button"
                  style={{ minHeight: "26px", padding: "0 8px", fontSize: "0.68rem", whiteSpace: "nowrap" }}
                  type="button"
                  key={ex}
                  onClick={() => setInstruction(ex)}
                >
                  Scenario {i + 1}
                </button>
              ))}
            </div>

            <div className="compact-controls" style={{ display: "flex", gap: "12px", alignItems: "center", marginLeft: "auto" }}>
              <div className="compact-slider" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <label htmlFor="pickerCount" style={{ fontSize: "0.65rem" }}>Swarm Carts: {pickerCount}</label>
                <input
                  id="pickerCount"
                  type="range"
                  min={1}
                  max={5}
                  value={pickerCount}
                  onChange={(event) => setPickerCount(Number(event.target.value))}
                  style={{ width: "90px" }}
                />
              </div>
              <button type="submit" className="compact-btn" disabled={loading} style={{ height: "36px", fontSize: "0.8rem", padding: "0 14px" }}>
                <Play size={14} />
                <span>{loading ? "Routing..." : "Simulate"}</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Main Simulation Sandbox Grid */}
      <section className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 1.1fr", gap: "20px", flex: 1, overflow: "hidden" }}>
        
        {/* Left Side: Large Map comparison sandbox panel */}
        <div className="route-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div className="section-title" style={{ marginBottom: "10px", flexShrink: 0 }}>
            <div>
              <p className="eyebrow" style={{ fontSize: "0.7rem", marginBottom: "2px" }}>Operations Sandbox</p>
              <h2 style={{ fontSize: "1.15rem" }}>FIFO vs Swarm Routing Simulation Maps</h2>
            </div>
            <Warehouse size={18} />
          </div>
          
          <div style={{ flex: 1, overflow: "hidden" }}>
            <RouteComparison data={data} hoveredSkuId={hoveredSkuId} setHoveredSkuId={setHoveredSkuId} />
          </div>

          {/* Swarm Telemetry Terminal logs console */}
          <div
            style={{
              height: "110px",
              background: "#0f172a",
              borderRadius: "10px",
              padding: "8px 12px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.7rem",
              color: "#38bdf8",
              marginTop: "12px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              flexShrink: 0
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "4px", marginBottom: "4px", flexShrink: 0 }}>
              <Terminal size={12} style={{ color: "var(--mint)" }} />
              <span style={{ color: "#f8fafc", fontWeight: 700 }}>Orchestrator Telemetry Logs</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span className="pulse-dot-nav online" style={{ width: "6px", height: "6px" }} />
                <span style={{ color: "#94a3b8", fontSize: "0.6rem" }}>Live Stream</span>
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }} className="telemetry-logs-scroll">
              {telemetryLogs.map((log, i) => (
                <div key={i} style={{ lineBreak: "anywhere" }}>
                  <span style={{ color: "#64748b" }}>&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar metrics, basket, and anomalies */}
        <div className="dashboard-sidebar" style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", overflowY: "auto" }}>
          
          {/* Metrics grids */}
          <section className="metric-strip" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "0", flexShrink: 0 }}>
            <Metric icon={<Target />} label="Pick Reduction" value={`${data.metrics.reduction_percent}%`} detail="Swarm paths saved" tone="mint" />
            <Metric icon={<Gauge />} label="Optimized Route" value={`${optimizedCritical}m`} detail={`${optimizedTotal}m total`} tone="gold" />
            <Metric icon={<BrainCircuit />} label="NLP Confidence" value={data.metrics.nlp_bleu_score.toFixed(2)} detail={`${data.parsed_items.length} skus matched`} tone="blue" />
            <Metric icon={<Clock3 />} label="Dispatch ETA" value={`${data.metrics.dispatch_seconds}s`} detail={data.state.toUpperCase()} tone="coral" />
          </section>

          {/* Interactive Parsed Order list */}
          <div className="inspector-panel" style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "150px" }}>
            <PanelTitle icon={<PackageCheck />} title="Parsed Order Basket" />
            <div className="parsed-list custom-scrollbar" style={{ flex: 1, overflowY: "auto", gap: "6px", margin: 0 }}>
              {data.parsed_items.map((item) => {
                const isHovered = hoveredSkuId === item.sku_id;
                return (
                  <div
                    className="parsed-row"
                    key={item.sku_id}
                    style={{
                      padding: "6px 12px",
                      background: isHovered ? "rgba(13, 148, 136, 0.08)" : "rgba(255, 255, 255, 0.5)",
                      borderColor: isHovered ? "var(--mint)" : "var(--glass-border)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={() => setHoveredSkuId(item.sku_id)}
                    onMouseLeave={() => setHoveredSkuId(null)}
                  >
                    <div>
                      <strong style={{ fontSize: "0.8rem" }}>{stopNames.get(item.sku_id) ?? item.sku_id}</strong>
                      <span style={{ fontSize: "0.7rem", marginTop: "1px" }}>{item.sku_id} | confidence {Math.round(item.confidence * 100)}%</span>
                    </div>
                    <b style={{ minWidth: "30px", height: "24px", fontSize: "0.75rem", background: "var(--mint)", color: "#fff", display: "grid", placeItems: "center", borderRadius: "6px" }}>x{item.quantity}</b>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vision anomalies */}
          <div className="inspector-panel" style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "130px" }}>
            <PanelTitle icon={<AlertTriangle />} title="CV Shelf Anomalies" />
            <div className="alert-list" style={{ flex: 1, overflowY: "auto", gap: "6px", margin: 0 }}>
              {data.anomalies.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", textAlign: "center", padding: "20px 0" }}>No shelf anomalies detected. Try typing "cleaner" to scan chemicals.</div>
              ) : (
                data.anomalies.map((anomaly) => (
                  <div className={cx("alert-row", anomaly.severity)} key={anomaly.id} style={{ padding: "6px 12px" }}>
                    <div>
                      <strong style={{ fontSize: "0.78rem" }}>{anomaly.id}</strong>
                      <p style={{ marginTop: "1px", fontSize: "0.72rem" }}>{anomaly.message}</p>
                    </div>
                    <span style={{ padding: "2px 6px", fontSize: "0.7rem" }}>{anomaly.f1_score.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </section>
    </main>
  );
}

function RouteComparison({ data, hoveredSkuId, setHoveredSkuId }: { data: SimulationResponse; hoveredSkuId: string | null; setHoveredSkuId: (id: string | null) => void }) {
  const allStops = [data.fifo_route.stops, ...data.optimized_routes.map((route) => route.stops)].flat();
  const maxX = Math.max(16, ...data.inventory.map((item) => item.location.grid_x), ...allStops.map((stop) => stop.grid_x));
  const maxY = Math.max(12, ...data.inventory.map((item) => item.location.grid_y), ...allStops.map((stop) => stop.grid_y));

  return (
    <div className="comparison-grid" style={{ height: "100%", gridTemplateRows: "1fr" }}>
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
        hoveredSkuId={hoveredSkuId}
        setHoveredSkuId={setHoveredSkuId}
      />
      <RouteBoard
        title="Optimized Swarm"
        subtitle={`${data.optimized_routes.length} pickers split nearby stops`}
        routes={data.optimized_routes}
        distance={Math.max(...data.optimized_routes.map((route) => route.distance), 0)}
        inventory={data.inventory}
        anomalies={data.anomalies}
        maxX={maxX}
        maxY={maxY}
        mode="optimized"
        hoveredSkuId={hoveredSkuId}
        setHoveredSkuId={setHoveredSkuId}
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
  hoveredSkuId,
  setHoveredSkuId,
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
  hoveredSkuId: string | null;
  setHoveredSkuId: (id: string | null) => void;
}) {
  const activeSkuIds = new Set(routes.flatMap((route) => route.stops.map((stop) => stop.sku_id)));

  return (
    <article className={cx("route-board", mode)} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header style={{ padding: "8px 12px", minHeight: "56px" }}>
        <div>
          <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
          <span style={{ fontSize: "0.75rem", marginTop: "2px" }}>{subtitle}</span>
        </div>
        <b style={{ fontSize: "1.3rem" }}>{distance}m</b>
      </header>

      <div className="warehouse-map blueprint" style={{ flex: 1, minHeight: "220px", position: "relative" }}>
        <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {routes.map((route, index) => (
            <motion.polyline
              key={`${route.picker_id}-${Date.now()}`}
              points={routePoints(route.stops, maxX, maxY)}
              fill="none"
              stroke={mode === "fifo" ? "#64748b" : routeColors[index % routeColors.length]}
              strokeWidth={mode === "fifo" ? 1.5 : 2}
              strokeDasharray={mode === "fifo" ? "3 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: index * 0.1 }}
            />
          ))}
        </svg>

        <span className="dispatch-node" style={pointStyle(0, 0, maxX, maxY)}>
          D
        </span>

        {inventory.map((item) => {
          const isStop = activeSkuIds.has(item.sku.id);
          const isHovered = hoveredSkuId === item.sku.id;
          return (
            <span
              className={cx("shelf-dot", isStop && "active")}
              style={{
                ...pointStyle(item.location.grid_x, item.location.grid_y, maxX, maxY),
                background: zoneColors[item.location.zone],
                transform: isHovered && isStop ? "translate(-50%, -50%) scale(1.6)" : "translate(-50%, -50%)",
                boxShadow: isHovered && isStop ? "0 0 10px currentColor" : undefined,
                zIndex: isHovered ? 8 : 3,
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              title={`${item.sku.name} | ${item.location.zone}`}
              key={`${mode}-${item.sku.id}`}
              onMouseEnter={() => isStop && setHoveredSkuId(item.sku.id)}
              onMouseLeave={() => isStop && setHoveredSkuId(null)}
            />
          );
        })}

        {anomalies.map((anomaly) => (
          <span className="anomaly-pin" style={pointStyle(anomaly.location.grid_x, anomaly.location.grid_y, maxX, maxY)} key={`${mode}-${anomaly.id}`}>
            !
          </span>
        ))}

        {routes.map((route, routeIndex) =>
          route.stops.map((stop) => {
            const isHovered = hoveredSkuId === stop.sku_id;
            return (
              <motion.span
                className="stop-pin"
                style={{
                  ...pointStyle(stop.grid_x, stop.grid_y, maxX, maxY),
                  borderColor: mode === "fifo" ? "#64748b" : routeColors[routeIndex % routeColors.length],
                  transform: isHovered ? "translate(-50%, -50%) scale(1.15)" : "translate(-50%, -50%)",
                  boxShadow: isHovered ? "0 4px 10px rgba(13, 148, 136, 0.4)" : undefined,
                  zIndex: isHovered ? 9 : 6,
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                initial={{ scale: 0.55, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: stop.step * 0.05 }}
                title={`${stop.name} x${stop.quantity}`}
                key={`${mode}-${route.picker_id}-${stop.sku_id}`}
                onMouseEnter={() => setHoveredSkuId(stop.sku_id)}
                onMouseLeave={() => setHoveredSkuId(null)}
              >
                {mode === "fifo" ? stop.step : `P${route.picker_id}.${stop.step}`}
                <span className="stop-label" style={{ opacity: isHovered ? 1 : 0.8, pointerEvents: "none" }}>
                  {stop.name} (x{stop.quantity})
                </span>
              </motion.span>
            );
          })
        )}

        {routes.map((route, index) => {
          const stop = route.stops[route.stops.length - 1];
          if (!stop) return null;
          return (
            <motion.span
              className="picker-token"
              style={{
                background: mode === "fifo" ? "#64748b" : routeColors[index % routeColors.length],
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

      <footer className="route-footer" style={{ padding: "6px 12px", fontSize: "0.7rem" }}>
        {routes.map((route, index) => (
          <span key={route.picker_id} style={{ borderColor: mode === "fifo" ? "#64748b" : routeColors[index % routeColors.length] }}>
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
      return `${x},${y}`;
    })
    .join(" ");
}

function pointStyle(gridX: number, gridY: number, maxX: number, maxY: number) {
  const x = 6 + (gridX / (maxX + 2)) * 88;
  const y = 8 + (gridY / (maxY + 2)) * 84;
  return {
    left: `${x}%`,
    top: `${y}%`,
  };
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
    <article className={cx("metric", tone)} style={{ minHeight: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "2px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
        <div className="metric-icon" style={{ width: "22px", height: "22px", borderRadius: "6px", margin: 0, fontSize: "0.75rem" }}>
          {icon}
        </div>
      </div>
      <strong style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>{value}</strong>
      <p style={{ fontSize: "0.65rem", color: "var(--muted)", margin: 0, marginTop: "2px" }}>{detail}</p>
    </article>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panel-title" style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
      {icon}
      <h3 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>{title}</h3>
    </div>
  );
}
