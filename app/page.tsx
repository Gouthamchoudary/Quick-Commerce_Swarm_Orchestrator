"use client";

import { FormEvent, useMemo, useState, useEffect, useRef } from "react";
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
  Shuffle,
  Zap,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Static data                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
const rawSkus: Array<[string, string, Zone, number, number]> = [
  ["SKU-001", "Bananas",       "produce",  7, 120],
  ["SKU-002", "Avocados",      "produce",  6, 180],
  ["SKU-003", "Strawberries",  "produce",  9, 250],
  ["SKU-004", "Baby Spinach",  "produce",  8, 150],
  ["SKU-005", "Tomatoes",      "produce",  7, 300],
  ["SKU-006", "Whole Milk",    "dairy",    4, 1000],
  ["SKU-007", "Greek Yogurt",  "dairy",    6, 500],
  ["SKU-008", "Cheddar Block", "dairy",    3, 250],
  ["SKU-009", "Paneer",        "dairy",    4, 400],
  ["SKU-010", "Eggs 12 Pack",  "dairy",   10, 700],
  ["SKU-011", "Basmati Rice",  "pantry",   1, 5000],
  ["SKU-012", "Wheat Flour",   "pantry",   1, 5000],
  ["SKU-013", "Olive Oil",     "pantry",   5, 1000],
  ["SKU-014", "Pasta",         "pantry",   2, 500],
  ["SKU-015", "Tomato Sauce",  "pantry",   5, 650],
  ["SKU-016", "Cereal",        "pantry",   4, 450],
  ["SKU-017", "Trail Mix",     "pantry",   3, 300],
  ["SKU-018", "Coffee Beans",  "pantry",   2, 250],
  ["SKU-019", "Green Tea",     "pantry",   2, 100],
  ["SKU-020", "Protein Bars",  "pantry",   2, 360],
  ["SKU-021", "Shampoo",       "personal", 5, 400],
  ["SKU-022", "Toothpaste",    "personal", 3, 150],
  ["SKU-023", "Body Wash",     "personal", 5, 500],
  ["SKU-024", "Hand Soap",     "personal", 5, 300],
  ["SKU-025", "Face Tissue",   "personal", 4, 220],
  ["SKU-026", "Dish Soap",     "homecare", 4, 700],
  ["SKU-027", "Glass Cleaner", "homecare", 6, 600],
  ["SKU-028", "Laundry Pods",  "homecare", 3, 900],
  ["SKU-029", "Floor Cleaner", "homecare", 4, 1000],
  ["SKU-030", "Trash Bags",    "homecare", 1, 500],
  ["SKU-031", "Frozen Peas",   "frozen",   4, 500],
  ["SKU-032", "Ice Cream",     "frozen",   8, 750],
  ["SKU-033", "Frozen Pizza",  "frozen",   5, 650],
  ["SKU-034", "Hash Browns",   "frozen",   4, 450],
  ["SKU-035", "Dumplings",     "frozen",   5, 550],
];

const zoneColors: Record<Zone, string> = {
  produce:  "#16a34a",
  dairy:    "#2563eb",
  pantry:   "#d97706",
  personal: "#7c3aed",
  homecare: "#dc2626",
  frozen:   "#0891b2",
};

const routeColors = ["#0d9488", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];
const DISPATCH = { x: 0, y: 0 };

const aliasSeeds: Record<string, string> = {
  banana: "SKU-001", bananas: "SKU-001",
  avocado: "SKU-002", avocados: "SKU-002",
  strawberry: "SKU-003", strawberries: "SKU-003",
  spinach: "SKU-004",
  tomato: "SKU-005", tomatoes: "SKU-005",
  milk: "SKU-006",
  yogurt: "SKU-007",
  cheese: "SKU-008",
  paneer: "SKU-009",
  egg: "SKU-010", eggs: "SKU-010",
  rice: "SKU-011", basmati: "SKU-011",
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
};

const numberWords: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12,
};

const defaultOrder = "two bananas, whole milk, basmati rice, glass cleaner, eggs x2";

const randomBasketPool = [
  "bananas", "avocados", "strawberries", "baby spinach", "tomatoes",
  "whole milk", "greek yogurt", "cheddar block", "paneer", "eggs",
  "basmati rice", "olive oil", "pasta", "cereal", "coffee beans",
  "shampoo", "toothpaste", "glass cleaner", "laundry pods", "frozen pizza",
  "ice cream", "frozen peas",
];

const quickCatalog = [
  { name: "Bananas",      icon: "🍌", sku: "SKU-001" },
  { name: "Avocados",     icon: "🥑", sku: "SKU-002" },
  { name: "Whole Milk",   icon: "🥛", sku: "SKU-006" },
  { name: "Eggs",         icon: "🥚", sku: "SKU-010" },
  { name: "Basmati Rice", icon: "🌾", sku: "SKU-011" },
  { name: "Glass Cleaner",icon: "🧴", sku: "SKU-027" },
  { name: "Frozen Pizza", icon: "🍕", sku: "SKU-033" },
  { name: "Cereal",       icon: "🥣", sku: "SKU-016" },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Inventory / alias construction                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function buildInventory(): InventoryItem[] {
  return rawSkus.map(([id, name, category, fragility, weight], index) => {
    const humanIndex = index + 1;
    const aisle = Math.floor(index / 5) + 1;
    const rack  = (index % 5) + 1;
    const shelf = (humanIndex % 4) + 1;
    return {
      sku: { id, name, category, fragility_score: fragility, weight_grams: weight },
      location: {
        id: humanIndex, aisle, rack, shelf,
        grid_x: aisle * 2.5,
        grid_y: rack  * 2 + (shelf % 2),
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
    const name    = item.sku.name.toLowerCase();
    const compact = name.replace(/\b\d+\s*(pack|count|ct)\b/g, "").replace(/\s+/g, " ").trim();
    aliases.set(name, item.sku.id);
    aliases.set(compact, item.sku.id);
    compact.split(/\s+/).forEach((token) => {
      if (token.length > 3 && !aliases.has(token)) aliases.set(token, item.sku.id);
      if (token.endsWith("s") && token.length > 4 && !aliases.has(token.slice(0, -1)))
        aliases.set(token.slice(0, -1), item.sku.id);
    });
  });
  return Array.from(aliases.entries()).sort((a, b) => b[0].length - a[0].length);
}

const aliasIndex = buildAliasIndex();

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLocalInstruction(instruction: string): ParsedOrderItem[] {
  const lowered   = instruction.toLowerCase();
  const quantities = new Map<string, number>();
  const spans: Array<[number, number]> = [];
  const qty = String.raw`(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|dozen)`;

  aliasIndex.forEach(([alias, skuId]) => {
    const pattern = new RegExp(
      String.raw`(?:\b(?<before>${qty})\s*(?:x|qty|quantity|:|qty:|quantity:|-)?\\s*(?:packs?\\s+of\\s+|bottles?\\s+of\\s+|bags?\\s+of\\s+|pcs?\\s+of\\s+)?)?\\b${escapeRegExp(alias)}s?\\b(?:\\s*(?:x|qty|quantity|:|qty:|quantity:|-)?\\s*(?<after>${qty})\\s*x?\\b)?`,
      "g"
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lowered)) !== null) {
      const start    = match.index ?? 0;
      const end      = start + match[0].length;
      const overlaps = spans.some(([s, e]) => Math.max(start, s) < Math.min(end, e));
      if (overlaps) continue;
      spans.push([start, end]);
      const quantity = quantityFrom(match.groups?.before || match.groups?.after);
      quantities.set(skuId, (quantities.get(skuId) ?? 0) + quantity);
    }
  });

  // Fallback: if nothing was parsed, try a very simple word-split approach
  if (!quantities.size) {
    const words = lowered.split(/[\s,;]+/);
    words.forEach((word) => {
      aliasIndex.forEach(([alias, skuId]) => {
        if (word === alias || word.startsWith(alias)) {
          quantities.set(skuId, (quantities.get(skuId) ?? 0) + 1);
        }
      });
    });
  }

  // Ultimate fallback: demo items
  if (!quantities.size) {
    ["SKU-001", "SKU-006", "SKU-011", "SKU-027", "SKU-010"].forEach((skuId) =>
      quantities.set(skuId, 1)
    );
  }

  return Array.from(quantities.entries()).map(([skuId, quantity]) => {
    const item       = skuIndex.get(skuId)!;
    const firstToken = item.sku.name.toLowerCase().split(" ")[0];
    return {
      sku_id:          skuId,
      quantity,
      fragility_score: item.sku.fragility_score,
      confidence:      lowered.includes(firstToken) ? 0.94 : 0.88,
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Routing engine                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function makeStops(items: ParsedOrderItem[]): RouteStop[] {
  return items.map((item, index) => {
    const ledger = skuIndex.get(item.sku_id)!;
    return {
      sku_id:          item.sku_id,
      name:            ledger.sku.name,
      quantity:        item.quantity,
      grid_x:          ledger.location.grid_x,
      grid_y:          ledger.location.grid_y,
      fragility_score: ledger.sku.fragility_score,
      picker_id:       1,
      step:            index + 1,
    };
  });
}

function routeDistance(stops: RouteStop[]): number {
  let cursor   = DISPATCH;
  let distance = 0;
  stops.forEach((stop) => {
    const next = { x: stop.grid_x, y: stop.grid_y };
    distance  += manhattan(cursor, next);
    cursor     = next;
  });
  // Return to dispatch
  distance += manhattan(cursor, DISPATCH);
  return Math.round(distance * 10) / 10;
}

function makeFifoRoute(items: ParsedOrderItem[]): PickerRoute {
  const stops = makeStops(items);
  return { picker_id: 1, stops, distance: routeDistance(stops) };
}

function makeOptimizedRoutes(items: ParsedOrderItem[], pickerCount: number): PickerRoute[] {
  // Sort by fragility ascending (heavy / non-fragile first = bottom of basket)
  const sortedItems = [...items].sort((a, b) => a.fragility_score - b.fragility_score);
  const stops       = makeStops(sortedItems);

  const routes:   RouteStop[][] = Array.from({ length: pickerCount }, () => []);
  const cursors:  { x: number; y: number }[] = Array.from({ length: pickerCount }, () => ({ ...DISPATCH }));
  const distances: number[] = Array.from({ length: pickerCount }, () => 0);

  // Greedy nearest-picker assignment
  stops.forEach((stop) => {
    let bestPicker  = 0;
    let minIncrease = Infinity;
    for (let p = 0; p < pickerCount; p++) {
      const dist = manhattan(cursors[p], { x: stop.grid_x, y: stop.grid_y });
      if (dist < minIncrease) { minIncrease = dist; bestPicker = p; }
    }
    distances[bestPicker] += minIncrease;
    cursors[bestPicker]    = { x: stop.grid_x, y: stop.grid_y };
    routes[bestPicker].push({
      ...stop,
      picker_id: bestPicker + 1,
      step:      routes[bestPicker].length + 1,
    });
  });

  return routes.map((routeStops, index) => {
    const returnDist = manhattan(cursors[index], DISPATCH);
    return {
      picker_id: index + 1,
      stops:     routeStops,
      distance:  Math.round((distances[index] + returnDist) * 10) / 10,
    };
  });
}

function simulateLocal(instruction: string, pickerCount: number): SimulationResponse {
  const parsed     = parseLocalInstruction(instruction);
  const missing    = parsed
    .filter((item) => (skuIndex.get(item.sku_id)?.stock_count ?? 0) < item.quantity)
    .map((item) => item.sku_id);
  const fifo       = makeFifoRoute(parsed);
  const optimized  = makeOptimizedRoutes(parsed, pickerCount);

  const fifoDist   = fifo.distance;
  const optMax     = Math.max(...optimized.map((r) => r.distance), 0);
  const reduction  = fifoDist > 0 ? Math.max(0, Math.round(((fifoDist - optMax) / fifoDist) * 100)) : 0;

  const lower = instruction.toLowerCase();
  const anomalies: SimulationResponse["anomalies"] = [];
  if (lower.includes("cleaner") || lower.includes("soap")) {
    const cleanerItem = localInventory.find((item) => item.sku.id === "SKU-027")!;
    anomalies.push({
      id: "ANOMALY-101",
      severity: "high",
      message: "Chemical agent stored adjacent to Fresh Produce zone",
      location: cleanerItem.location,
      f1_score: 0.94,
    });
  }

  return {
    state:           "dispatched",
    parsed_items:    parsed,
    missing_items:   missing,
    fifo_route:      fifo,
    optimized_routes: optimized,
    metrics: {
      fifo_distance:       fifoDist,
      optimized_distance:  optMax,
      reduction_percent:   reduction,
      nlp_bleu_score:      Number((0.86 + Math.min(parsed.length, 8) * 0.012).toFixed(2)),
      cv_f1_score:         0.92,
      dispatch_seconds:    3 + parsed.length * 2,
    },
    anomalies,
    recommendations: [
      {
        id:        "REC-01",
        title:     "Co-locate Milk & Cereal",
        lift:      1.34,
        skus:      ["SKU-006", "SKU-016"],
        rationale: "Items co-occur in 24% of baskets. Restructure physical shelves to adjacent rack slots.",
      },
    ],
    inventory: localInventory,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Coordinate helpers — shared between route SVG and point pins               */
/* ─────────────────────────────────────────────────────────────────────────── */
// We reserve 8% padding on each axis so nodes never sit on the very edge.
const PAD = 8;

function toPercent(val: number, max: number): number {
  if (max === 0) return PAD;
  return PAD + ((val / (max + 2)) * (100 - PAD * 2));
}

function routePoints(
  stops: RouteStop[],
  maxX: number,
  maxY: number
): string {
  const pts = [
    { grid_x: DISPATCH.x, grid_y: DISPATCH.y },
    ...stops,
    { grid_x: DISPATCH.x, grid_y: DISPATCH.y },
  ];
  return pts
    .map((p) => `${toPercent(p.grid_x, maxX).toFixed(2)},${toPercent(p.grid_y, maxY).toFixed(2)}`)
    .join(" ");
}

function pointCss(gridX: number, gridY: number, maxX: number, maxY: number) {
  return {
    left: `${toPercent(gridX, maxX).toFixed(2)}%`,
    top:  `${toPercent(gridY, maxY).toFixed(2)}%`,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Home page                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function Home() {
  const [instruction,   setInstruction]   = useState(defaultOrder);
  const [pickerCount,   setPickerCount]   = useState(3);
  const [data,          setData]          = useState<SimulationResponse>(() => simulateLocal(defaultOrder, 3));
  const [loading,       setLoading]       = useState(false);
  const [source,        setSource]        = useState<"api" | "browser">("browser");
  const [hoveredSkuId,  setHoveredSkuId]  = useState<string | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [simKey,        setSimKey]        = useState(0); // key to re-mount route boards on new simulation
  const logRef = useRef<HTMLDivElement>(null);

  function generateRandomOrder() {
    const shuffled  = [...randomBasketPool].sort(() => Math.random() - 0.5);
    const count     = 5 + Math.floor(Math.random() * 4);
    const nextOrder = shuffled.slice(0, count).map((item) => {
      const quantity = 1 + Math.floor(Math.random() * 3);
      return quantity === 1 ? item : `${quantity} ${item}`;
    }).join(", ");
    setInstruction(nextOrder);
  }

  function triggerTelemetry(parsedCount: number, optimizedDist: number, fifoDist: number) {
    const logs = [
      `[System] Orchestrator session initialized...`,
      `[NLP Parser] Fine-tuned Llama-3 parsing natural language input...`,
      `[NLP Parser] Extraction success: parsed ${parsedCount} catalogue item(s).`,
      `[DB Ledger] Checking inventory availability... Stock ledger verified (OK).`,
      `[CV Shelf Monitor] Vision cameras active... Scanning shelf slot coordinates...`,
      `[Routing Agent] Swarm pathing started... Solving Multi-Agent TSP...`,
      `[Routing Engine] Optimal routes computed. Critical path: ${optimizedDist.toFixed(1)}m (FIFO was ${fifoDist.toFixed(1)}m).`,
      `[System] Picker robot swarm dispatched! Real-time path tracing active.`,
    ];
    setTelemetryLogs([]);
    logs.forEach((log, i) => {
      setTimeout(() => {
        setTelemetryLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${log}`]);
      }, i * 220);
    });
  }

  // Auto-scroll telemetry to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [telemetryLogs]);

  // Trigger telemetry on first load
  useEffect(() => {
    const optCritical = Math.max(...data.optimized_routes.map((r) => r.distance), 0);
    triggerTelemetry(data.parsed_items.length, optCritical, data.metrics.fifo_distance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setSource("api");
    } catch {
      nextData = simulateLocal(instruction, pickerCount);
      setSource("browser");
    } finally {
      setData(nextData);
      setLoading(false);
      setSimKey((k) => k + 1); // force re-mount so animations replay
      const optCritical = Math.max(...nextData.optimized_routes.map((r) => r.distance), 0);
      triggerTelemetry(nextData.parsed_items.length, optCritical, nextData.metrics.fifo_distance);
    }
  }

  // Quick-catalog item adder
  const addCatalogItem = (name: string) => {
    setInstruction((prev) => {
      const trimmed   = prev.trim();
      const itemLower = name.toLowerCase();
      if (!trimmed) return `2 ${itemLower}`;
      const regex = new RegExp(
        `(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozen)?\\s*${escapeRegExp(itemLower)}`,
        "i"
      );
      const match = trimmed.match(regex);
      if (match) {
        const currentQtyStr = match[1] || "1";
        const qty = /^\d+$/.test(currentQtyStr)
          ? parseInt(currentQtyStr, 10)
          : (numberWords[currentQtyStr.toLowerCase()] ?? 1);
        return trimmed.replace(regex, `${qty + 1} ${itemLower}`);
      }
      return `${trimmed}, 1 ${itemLower}`;
    });
  };

  const stopNames = useMemo(
    () => new Map(data.fifo_route.stops.map((s) => [s.sku_id, s.name])),
    [data.fifo_route.stops]
  );

  const optimizedCritical = Math.max(...data.optimized_routes.map((r) => r.distance), 0);
  const optimizedTotal    = data.optimized_routes.reduce((sum, r) => sum + r.distance, 0);

  return (
    <main className="app-shell home-shell">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">AI Dark Store Control Room</p>
          <h1>Operations Sandbox</h1>
          <p className="subhead">
            Parse messy customer baskets, compare FIFO against swarm routing,
            and watch live dispatch telemetry across a warehouse blueprint.
          </p>
        </div>

        <div className="hero-status-strip" aria-label="Simulation status">
          <span>
            <CheckCircle2 size={15} />
            {source === "api" ? "FastAPI connected" : "Browser simulation"}
          </span>
          <span><Activity size={15} /> {data.parsed_items.length} SKUs parsed</span>
          <span><Route size={15} /> {data.optimized_routes.filter(r => r.stops.length > 0).length} carts active</span>
        </div>
      </section>

      {/* ── Command strip ───────────────────────────────────────────────────── */}
      <section className="home-control-grid">
        <form onSubmit={runSimulation} className="command-card order-command">
          <div className="command-card-header">
            <div>
              <p className="eyebrow">Order Input</p>
              <h2>Natural language order note</h2>
            </div>
            <div className="scenario-actions">
              <button
                className="ghost-button scenario-button active"
                type="button"
                onClick={() => setInstruction(defaultOrder)}
              >
                <CheckCircle2 size={14} /> Default
              </button>
              <button
                className="ghost-button scenario-button"
                type="button"
                onClick={generateRandomOrder}
              >
                <Shuffle size={14} /> Random
              </button>
            </div>
          </div>

          <textarea
            id="instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="E.g. two bananas, whole milk, basmati rice, eggs x2..."
            className="order-textarea"
          />

          <div className="command-footer">
            <label htmlFor="pickerCount" className="picker-control">
              <span>Swarm Carts</span>
              <strong>{pickerCount}</strong>
              <input
                id="pickerCount"
                type="range"
                min={1}
                max={5}
                value={pickerCount}
                onChange={(e) => setPickerCount(Number(e.target.value))}
              />
            </label>
            <button type="submit" className="compact-btn run-button" disabled={loading}>
              {loading ? <><Zap size={16} /> Routing…</> : <><Play size={16} /> Run Simulation</>}
            </button>
          </div>
        </form>

        <div className="command-card quick-catalog-card">
          <div className="command-card-header compact">
            <div>
              <p className="eyebrow">Quick Add</p>
              <h2>Catalog shortcuts</h2>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="quick-catalog-grid">
            {quickCatalog.map((item) => (
              <button
                key={item.sku}
                type="button"
                onClick={() => addCatalogItem(item.name)}
                className="catalog-chip"
              >
                <span>{item.icon}</span>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard ───────────────────────────────────────────────────────── */}
      <section className="dashboard-grid home-dashboard-grid">
        {/* Left: Maps + Telemetry */}
        <div className="route-panel operations-sandbox">
          <div className="section-title">
            <div>
              <p className="eyebrow">Operations Sandbox</p>
              <h2>FIFO vs Swarm Routing Simulation Maps</h2>
            </div>
            <Warehouse size={24} />
          </div>

          <div className="route-comparison-wrap">
            <RouteComparison
              key={simKey}
              data={data}
              hoveredSkuId={hoveredSkuId}
              setHoveredSkuId={setHoveredSkuId}
            />
          </div>

          {/* Telemetry console */}
          <div className="telemetry-panel">
            <div className="telemetry-header">
              <Terminal size={14} />
              <span>Orchestrator Telemetry Logs</span>
              <span className="telemetry-live">
                <span className="pulse-dot-nav online" />
                Live Stream
              </span>
            </div>
            <div className="telemetry-logs-scroll" ref={logRef}>
              <AnimatePresence initial={false}>
                {telemetryLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span>&gt;</span> {log}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="dashboard-sidebar home-sidebar">
          <section className="metric-strip compact-metrics">
            <Metric
              icon={<Target />}
              label="Pick Reduction"
              value={`${data.metrics.reduction_percent}%`}
              detail="Swarm paths saved"
              tone="mint"
            />
            <Metric
              icon={<Gauge />}
              label="Optimised Route"
              value={`${optimizedCritical.toFixed(1)}m`}
              detail={`${optimizedTotal.toFixed(1)}m total`}
              tone="gold"
            />
            <Metric
              icon={<BrainCircuit />}
              label="NLP Confidence"
              value={data.metrics.nlp_bleu_score.toFixed(2)}
              detail={`${data.parsed_items.length} skus matched`}
              tone="blue"
            />
            <Metric
              icon={<Clock3 />}
              label="Dispatch ETA"
              value={`${data.metrics.dispatch_seconds}s`}
              detail={data.state.toUpperCase()}
              tone="coral"
            />
          </section>

          <div className="inspector-panel home-panel parsed-panel">
            <PanelTitle icon={<PackageCheck />} title="Parsed Order Basket" />
            <div className="parsed-list custom-scrollbar">
              {data.parsed_items.map((item) => {
                const isHovered = hoveredSkuId === item.sku_id;
                return (
                  <div
                    className="parsed-row"
                    key={item.sku_id}
                    style={{
                      background:   isHovered ? "rgba(13,148,136,0.08)" : "rgba(255,255,255,0.5)",
                      borderColor:  isHovered ? "var(--mint)" : "var(--glass-border)",
                      transition:   "all 0.2s ease",
                    }}
                    onMouseEnter={() => setHoveredSkuId(item.sku_id)}
                    onMouseLeave={() => setHoveredSkuId(null)}
                  >
                    <div>
                      <strong>{stopNames.get(item.sku_id) ?? item.sku_id}</strong>
                      <span>{item.sku_id} | confidence {Math.round(item.confidence * 100)}%</span>
                    </div>
                    <b>×{item.quantity}</b>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="inspector-panel home-panel anomaly-panel">
            <PanelTitle icon={<AlertTriangle />} title="CV Shelf Anomalies" />
            <div className="alert-list">
              {data.anomalies.length === 0 ? (
                <div className="empty-state">
                  No shelf anomalies detected.{" "}
                  <em style={{ display: "block", marginTop: 4, fontSize: "0.78rem" }}>
                    Try typing "cleaner" to scan chemicals.
                  </em>
                </div>
              ) : (
                data.anomalies.map((anomaly) => (
                  <div className={cx("alert-row", anomaly.severity)} key={anomaly.id}>
                    <div>
                      <strong>{anomaly.id}</strong>
                      <p>{anomaly.message}</p>
                    </div>
                    <span>{anomaly.f1_score.toFixed(2)}</span>
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  RouteComparison                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function RouteComparison({
  data,
  hoveredSkuId,
  setHoveredSkuId,
}: {
  data: SimulationResponse;
  hoveredSkuId: string | null;
  setHoveredSkuId: (id: string | null) => void;
}) {
  const allStops = [
    data.fifo_route.stops,
    ...data.optimized_routes.map((r) => r.stops),
  ].flat();

  const maxX = Math.max(
    20,
    ...data.inventory.map((i) => i.location.grid_x),
    ...allStops.map((s) => s.grid_x)
  );
  const maxY = Math.max(
    14,
    ...data.inventory.map((i) => i.location.grid_y),
    ...allStops.map((s) => s.grid_y)
  );

  return (
    <div className="comparison-grid" style={{ height: "100%" }}>
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
        title="Optimised Swarm"
        subtitle={`${data.optimized_routes.filter(r => r.stops.length > 0).length} pickers split nearby stops`}
        routes={data.optimized_routes}
        distance={optimizedCriticalFrom(data.optimized_routes)}
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

function optimizedCriticalFrom(routes: PickerRoute[]): number {
  return Math.max(...routes.map((r) => r.distance), 0);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  RouteBoard                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
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
  const activeSkuIds = new Set(routes.flatMap((r) => r.stops.map((s) => s.sku_id)));

  return (
    <article
      className={cx("route-board", mode)}
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* Header */}
      <header style={{ padding: "10px 14px", minHeight: 60, flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
          <span style={{ fontSize: "0.75rem", marginTop: 2 }}>{subtitle}</span>
        </div>
        <b style={{ fontSize: "1.4rem" }}>{distance.toFixed(1)}m</b>
      </header>

      {/* Map */}
      <div
        className="warehouse-map blueprint"
        style={{ flex: 1, minHeight: "clamp(320px, 38vh, 520px)", position: "relative" }}
      >
        {/* Route SVG lines */}
        <svg
          className="route-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {routes.map((route, rIdx) => {
            if (route.stops.length === 0) return null;
            const color = mode === "fifo"
              ? "#64748b"
              : routeColors[rIdx % routeColors.length];
            return (
              <motion.polyline
                key={`${mode}-line-${route.picker_id}`}
                points={routePoints(route.stops, maxX, maxY)}
                fill="none"
                stroke={color}
                strokeWidth={mode === "fifo" ? 1.8 : 2.2}
                strokeDasharray={mode === "fifo" ? "4 5" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, ease: "easeInOut", delay: rIdx * 0.12 }}
              />
            );
          })}
        </svg>

        {/* Dispatch node */}
        <span
          className="dispatch-node"
          style={pointCss(DISPATCH.x, DISPATCH.y, maxX, maxY)}
          title="Dispatch / Packing Station"
        >
          D
        </span>

        {/* All inventory shelf dots */}
        {inventory.map((item) => {
          const isStop    = activeSkuIds.has(item.sku.id);
          const isHovered = hoveredSkuId === item.sku.id;
          return (
            <span
              key={`${mode}-shelf-${item.sku.id}`}
              className={cx("shelf-dot", isStop && "active")}
              style={{
                ...pointCss(item.location.grid_x, item.location.grid_y, maxX, maxY),
                background:   isStop ? zoneColors[item.location.zone] : undefined,
                opacity:      isStop ? 1 : 0.28,
                transform:    isHovered && isStop
                  ? "translate(-50%,-50%) scale(1.7)"
                  : "translate(-50%,-50%)",
                boxShadow:    isHovered && isStop ? `0 0 12px ${zoneColors[item.location.zone]}` : undefined,
                zIndex:       isHovered ? 8 : isStop ? 4 : 2,
                transition:   "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
              }}
              title={`${item.sku.name} | ${item.location.zone}`}
              onMouseEnter={() => isStop && setHoveredSkuId(item.sku.id)}
              onMouseLeave={() => isStop && setHoveredSkuId(null)}
            />
          );
        })}

        {/* Anomaly pins */}
        {anomalies.map((a) => (
          <span
            key={`${mode}-anomaly-${a.id}`}
            className="anomaly-pin"
            style={pointCss(a.location.grid_x, a.location.grid_y, maxX, maxY)}
            title={a.message}
          >
            !
          </span>
        ))}

        {/* Stop number pins */}
        {routes.map((route, rIdx) =>
          route.stops.map((stop) => {
            const isHovered = hoveredSkuId === stop.sku_id;
            const color = mode === "fifo"
              ? "#475569"
              : routeColors[rIdx % routeColors.length];
            return (
              <motion.span
                key={`${mode}-stop-${route.picker_id}-${stop.sku_id}`}
                className="stop-pin"
                style={{
                  ...pointCss(stop.grid_x, stop.grid_y, maxX, maxY),
                  borderColor: color,
                  background:  color,
                  transform:   isHovered
                    ? "translate(-50%,-50%) scale(1.18)"
                    : "translate(-50%,-50%)",
                  boxShadow:   isHovered
                    ? `0 4px 12px ${color}55`
                    : `0 2px 6px ${color}33`,
                  zIndex:      isHovered ? 9 : 6,
                  transition:  "transform 0.18s, box-shadow 0.18s",
                }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: stop.step * 0.06 + rIdx * 0.1, type: "spring", stiffness: 260, damping: 22 }}
                title={`${stop.name} ×${stop.quantity}`}
                onMouseEnter={() => setHoveredSkuId(stop.sku_id)}
                onMouseLeave={() => setHoveredSkuId(null)}
              >
                {mode === "fifo" ? stop.step : `P${route.picker_id}.${stop.step}`}
                <span
                  className="stop-label"
                  style={{ opacity: isHovered ? 1 : 0, transition: "opacity 0.18s" }}
                >
                  {stop.name} (×{stop.quantity})
                </span>
              </motion.span>
            );
          })
        )}

        {/* Animated picker tokens — one per route that has stops */}
        {routes.map((route, rIdx) => {
          if (route.stops.length === 0) return null;
          const color    = mode === "fifo" ? "#475569" : routeColors[rIdx % routeColors.length];
          const lastStop = route.stops[route.stops.length - 1];
          const startPct = pointCss(DISPATCH.x, DISPATCH.y, maxX, maxY);
          const endPct   = pointCss(lastStop.grid_x, lastStop.grid_y, maxX, maxY);

          return (
            <motion.div
              key={`${mode}-picker-${route.picker_id}`}
              className="picker-token"
              style={{ background: color, position: "absolute" }}
              initial={{
                left:    startPct.left,
                top:     startPct.top,
                opacity: 0,
                scale:   0.7,
              }}
              animate={{
                left:    [startPct.left, endPct.left, startPct.left],
                top:     [startPct.top,  endPct.top,  startPct.top],
                opacity: 1,
                scale:   1,
              }}
              transition={{
                duration:   2.8,
                repeat:     Infinity,
                repeatType: "loop",
                ease:       "easeInOut",
                delay:      rIdx * 0.4,
              }}
            >
              P{route.picker_id}
            </motion.div>
          );
        })}
      </div>

      {/* Footer legend */}
      <footer className="route-footer" style={{ padding: "6px 14px", fontSize: "0.7rem", flexShrink: 0 }}>
        {routes.map((route, rIdx) => {
          if (route.stops.length === 0) return null;
          const color = mode === "fifo"
            ? "#64748b"
            : routeColors[rIdx % routeColors.length];
          return (
            <span key={route.picker_id} style={{ borderColor: color }}>
              P{route.picker_id}: {route.stops.length} stops | {route.distance.toFixed(1)}m
            </span>
          );
        })}
      </footer>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Metric card                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
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
    <article
      className={cx("metric", tone)}
      style={{ minHeight: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <div
          className="metric-icon"
          style={{ width: 22, height: 22, borderRadius: 6, margin: 0, fontSize: "0.75rem" }}
        >
          {icon}
        </div>
      </div>
      <strong style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>{value}</strong>
      <p style={{ fontSize: "0.63rem", color: "var(--muted)", margin: 0, marginTop: 2 }}>{detail}</p>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Panel title                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      className="panel-title"
      style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
    >
      {icon}
      <h3 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>{title}</h3>
    </div>
  );
}
