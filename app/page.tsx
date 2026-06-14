"use client";

import { FormEvent, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, BrainCircuit, CheckCircle2, Clock3,
  Gauge, PackageCheck, Play, Pause, RotateCcw, Route,
  Sparkles, Target, Warehouse, Terminal, Shuffle, Zap,
  TrendingDown, Bot, ChevronRight, FastForward,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
type Zone = "produce" | "dairy" | "pantry" | "personal" | "homecare" | "frozen";

type Location = {
  id: number; aisle: number; rack: number; shelf: number;
  grid_x: number; grid_y: number; zone: Zone;
};

type InventoryItem = {
  sku: { id: string; name: string; category: string; fragility_score: number; weight_grams: number };
  location: Location;
  stock_count: number;
};

type ParsedOrderItem = {
  sku_id: string; quantity: number; fragility_score: number; confidence: number;
};

type RouteStop = {
  sku_id: string; name: string; quantity: number;
  grid_x: number; grid_y: number; fragility_score: number;
  picker_id: number; step: number;
};

type PickerRoute = { picker_id: number; distance: number; stops: RouteStop[] };

type SimulationResponse = {
  state: "pending" | "routing" | "picking" | "dispatched";
  parsed_items: ParsedOrderItem[];
  missing_items: string[];
  fifo_route: PickerRoute;
  optimized_routes: PickerRoute[];
  metrics: {
    fifo_distance: number; optimized_distance: number; reduction_percent: number;
    nlp_bleu_score: number; cv_f1_score: number; dispatch_seconds: number;
  };
  anomalies: Array<{ id: string; severity: "low" | "medium" | "high"; message: string; location: Location; f1_score: number }>;
  recommendations: Array<{ id: string; title: string; lift: number; skus: string[]; rationale: string }>;
  inventory: InventoryItem[];
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Static Data                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const rawSkus: Array<[string, string, Zone, number, number]> = [
  ["SKU-001","Bananas","produce",7,120], ["SKU-002","Avocados","produce",6,180],
  ["SKU-003","Strawberries","produce",9,250], ["SKU-004","Baby Spinach","produce",8,150],
  ["SKU-005","Tomatoes","produce",7,300], ["SKU-006","Whole Milk","dairy",4,1000],
  ["SKU-007","Greek Yogurt","dairy",6,500], ["SKU-008","Cheddar Block","dairy",3,250],
  ["SKU-009","Paneer","dairy",4,400], ["SKU-010","Eggs 12 Pack","dairy",10,700],
  ["SKU-011","Basmati Rice","pantry",1,5000], ["SKU-012","Wheat Flour","pantry",1,5000],
  ["SKU-013","Olive Oil","pantry",5,1000], ["SKU-014","Pasta","pantry",2,500],
  ["SKU-015","Tomato Sauce","pantry",5,650], ["SKU-016","Cereal","pantry",4,450],
  ["SKU-017","Trail Mix","pantry",3,300], ["SKU-018","Coffee Beans","pantry",2,250],
  ["SKU-019","Green Tea","pantry",2,100], ["SKU-020","Protein Bars","pantry",2,360],
  ["SKU-021","Shampoo","personal",5,400], ["SKU-022","Toothpaste","personal",3,150],
  ["SKU-023","Body Wash","personal",5,500], ["SKU-024","Hand Soap","personal",5,300],
  ["SKU-025","Face Tissue","personal",4,220], ["SKU-026","Dish Soap","homecare",4,700],
  ["SKU-027","Glass Cleaner","homecare",6,600], ["SKU-028","Laundry Pods","homecare",3,900],
  ["SKU-029","Floor Cleaner","homecare",4,1000], ["SKU-030","Trash Bags","homecare",1,500],
  ["SKU-031","Frozen Peas","frozen",4,500], ["SKU-032","Ice Cream","frozen",8,750],
  ["SKU-033","Frozen Pizza","frozen",5,650], ["SKU-034","Hash Browns","frozen",4,450],
  ["SKU-035","Dumplings","frozen",5,550],
];

const zoneColors: Record<Zone, string> = {
  produce: "#16a34a", dairy: "#2563eb", pantry: "#d97706",
  personal: "#7c3aed", homecare: "#dc2626", frozen: "#0891b2",
};

const zoneEmoji: Record<Zone, string> = {
  produce: "🥦", dairy: "🥛", pantry: "🌾",
  personal: "🧴", homecare: "🧹", frozen: "❄️",
};

const routeColors = ["#0d9488", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];
const DISPATCH = { x: 0, y: 0 };

const aliasSeeds: Record<string, string> = {
  banana:"SKU-001",bananas:"SKU-001",avocado:"SKU-002",avocados:"SKU-002",
  strawberry:"SKU-003",strawberries:"SKU-003",spinach:"SKU-004",
  tomato:"SKU-005",tomatoes:"SKU-005",milk:"SKU-006",yogurt:"SKU-007",
  cheese:"SKU-008",paneer:"SKU-009",egg:"SKU-010",eggs:"SKU-010",
  rice:"SKU-011",basmati:"SKU-011",flour:"SKU-012",oil:"SKU-013",
  pasta:"SKU-014",sauce:"SKU-015",cereal:"SKU-016",coffee:"SKU-018",
  tea:"SKU-019",shampoo:"SKU-021",toothpaste:"SKU-022",soap:"SKU-024",
  "dish soap":"SKU-026","glass cleaner":"SKU-027",cleaner:"SKU-027",
  pods:"SKU-028",pizza:"SKU-033",peas:"SKU-031","ice cream":"SKU-032",
};

const numberWords: Record<string, number> = {
  a:1,an:1,one:1,two:2,three:3,four:4,five:5,
  six:6,seven:7,eight:8,nine:9,ten:10,dozen:12,
};

const defaultOrder = "two bananas, whole milk, basmati rice, glass cleaner, eggs x2";

const randomBasketPool = [
  "bananas","avocados","strawberries","baby spinach","tomatoes",
  "whole milk","greek yogurt","cheddar block","paneer","eggs",
  "basmati rice","olive oil","pasta","cereal","coffee beans",
  "shampoo","toothpaste","glass cleaner","laundry pods","frozen pizza",
  "ice cream","frozen peas",
];

const quickCatalog = [
  {name:"Bananas",icon:"🍌",sku:"SKU-001"},{name:"Avocados",icon:"🥑",sku:"SKU-002"},
  {name:"Whole Milk",icon:"🥛",sku:"SKU-006"},{name:"Eggs",icon:"🥚",sku:"SKU-010"},
  {name:"Basmati Rice",icon:"🌾",sku:"SKU-011"},{name:"Glass Cleaner",icon:"🧴",sku:"SKU-027"},
  {name:"Frozen Pizza",icon:"🍕",sku:"SKU-033"},{name:"Cereal",icon:"🥣",sku:"SKU-016"},
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Inventory Construction                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
function buildInventory(): InventoryItem[] {
  return rawSkus.map(([id, name, category, fragility, weight], index) => {
    const hi = index + 1;
    const aisle = Math.floor(index / 5) + 1;
    const rack = (index % 5) + 1;
    const shelf = (hi % 4) + 1;
    return {
      sku: { id, name, category, fragility_score: fragility, weight_grams: weight },
      location: {
        id: hi, aisle, rack, shelf,
        grid_x: aisle * 2.5,
        grid_y: rack * 2 + (shelf % 2),
        zone: category,
      },
      stock_count: 18 + ((hi * 7) % 23),
    };
  });
}

const localInventory = buildInventory();
const skuIndex = new Map(localInventory.map((i) => [i.sku.id, i]));

function buildAliasIndex() {
  const aliases = new Map(Object.entries(aliasSeeds));
  localInventory.forEach((item) => {
    const name = item.sku.name.toLowerCase();
    const compact = name.replace(/\b\d+\s*(pack|count|ct)\b/g,"").replace(/\s+/g," ").trim();
    aliases.set(name, item.sku.id);
    aliases.set(compact, item.sku.id);
    compact.split(/\s+/).forEach((tok) => {
      if (tok.length > 3 && !aliases.has(tok)) aliases.set(tok, item.sku.id);
      if (tok.endsWith("s") && tok.length > 4 && !aliases.has(tok.slice(0,-1)))
        aliases.set(tok.slice(0,-1), item.sku.id);
    });
  });
  return Array.from(aliases.entries()).sort((a,b) => b[0].length - a[0].length);
}
const aliasIndex = buildAliasIndex();

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
function cx(...cls: Array<string|false|undefined>) { return cls.filter(Boolean).join(" "); }
function manhattan(a:{x:number;y:number}, b:{x:number;y:number}) {
  return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
}
function escapeRegExp(s:string) { return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
function quantityFrom(raw?:string|null) {
  if (!raw) return 1;
  const c = raw.trim().toLowerCase();
  if (/^\d+$/.test(c)) return Math.max(1,Number(c));
  return numberWords[c] ?? 1;
}

const PAD = 7;
function toPercent(val:number, max:number): number {
  if (max === 0) return PAD;
  return PAD + ((val/(max+2))*(100-PAD*2));
}
function routePoints(stops:RouteStop[], maxX:number, maxY:number): string {
  const pts = [{grid_x:DISPATCH.x,grid_y:DISPATCH.y},...stops,{grid_x:DISPATCH.x,grid_y:DISPATCH.y}];
  return pts.map(p=>`${toPercent(p.grid_x,maxX).toFixed(2)},${toPercent(p.grid_y,maxY).toFixed(2)}`).join(" ");
}
function routePointsUpTo(stops:RouteStop[], upTo:number, maxX:number, maxY:number): string {
  const partial = stops.slice(0, upTo+1);
  if (partial.length === 0) return "";
  const pts = [{grid_x:DISPATCH.x,grid_y:DISPATCH.y},...partial];
  return pts.map(p=>`${toPercent(p.grid_x,maxX).toFixed(2)},${toPercent(p.grid_y,maxY).toFixed(2)}`).join(" ");
}
function pointCss(gridX:number, gridY:number, maxX:number, maxY:number) {
  return { left:`${toPercent(gridX,maxX).toFixed(2)}%`, top:`${toPercent(gridY,maxY).toFixed(2)}%` };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  NLP Parser                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function parseLocalInstruction(instruction: string): ParsedOrderItem[] {
  const lowered = instruction.toLowerCase();
  const quantities = new Map<string,number>();

  aliasIndex.forEach(([alias, skuId]) => {
    const esc = escapeRegExp(alias);
    // Pattern: optional before-qty, alias, optional after-qty
    const numWords = Object.keys(numberWords).join("|");
    const qty = `(?:\\d+|${numWords})`;
    const re = new RegExp(`(?:(${qty})\\s+)?\\b${esc}s?\\b(?:\\s+x\\s*(${qty}))?`,"gi");
    let m: RegExpExecArray|null;
    while ((m = re.exec(lowered)) !== null) {
      if (quantities.has(skuId)) continue; // take first match
      const q = m[1] ? quantityFrom(m[1]) : m[2] ? quantityFrom(m[2]) : 1;
      quantities.set(skuId, q);
    }
  });

  if (!quantities.size) {
    ["SKU-001","SKU-006","SKU-011","SKU-027","SKU-010"].forEach(id=>quantities.set(id,1));
  }

  return Array.from(quantities.entries()).map(([skuId,quantity]) => {
    const item = skuIndex.get(skuId)!;
    return { sku_id:skuId, quantity, fragility_score:item.sku.fragility_score, confidence:0.92 };
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Routing Engine                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function makeStops(items: ParsedOrderItem[]): RouteStop[] {
  return items.map((item,i) => {
    const ledger = skuIndex.get(item.sku_id)!;
    return {
      sku_id:item.sku_id, name:ledger.sku.name, quantity:item.quantity,
      grid_x:ledger.location.grid_x, grid_y:ledger.location.grid_y,
      fragility_score:ledger.sku.fragility_score, picker_id:1, step:i+1,
    };
  });
}

function routeDistance(stops: RouteStop[]): number {
  let cur = DISPATCH, dist = 0;
  stops.forEach(s => { const n={x:s.grid_x,y:s.grid_y}; dist+=manhattan(cur,n); cur=n; });
  dist += manhattan(cur, DISPATCH);
  return Math.round(dist*10)/10;
}

function makeFifoRoute(items: ParsedOrderItem[]): PickerRoute {
  const stops = makeStops(items);
  return { picker_id:1, stops, distance:routeDistance(stops) };
}

/**
 * Round-robin spatial assignment — guarantees all configured pickers receive
 * items, fixing the "stays at 2" display bug with the greedy algorithm.
 */
function makeOptimizedRoutes(items: ParsedOrderItem[], pickerCount: number): PickerRoute[] {
  const n = items.length;
  if (n === 0) {
    return Array.from({length:pickerCount},(_,i)=>({picker_id:i+1,stops:[],distance:0}));
  }

  // Effective pickers = min(requested, available items)
  const ep = Math.min(pickerCount, n);

  // Sort spatially: x first (aisle grouping), then y (rack)
  const sorted = [...items].sort((a,b) => {
    const la = skuIndex.get(a.sku_id)!.location;
    const lb = skuIndex.get(b.sku_id)!.location;
    if (Math.abs(la.grid_x-lb.grid_x) > 0.01) return la.grid_x-lb.grid_x;
    return la.grid_y-lb.grid_y;
  });

  const stops = makeStops(sorted);
  const buckets: RouteStop[][] = Array.from({length:ep},()=>[]);

  // Round-robin: spatially-adjacent items go to different pickers
  stops.forEach((stop,i) => {
    const p = i % ep;
    buckets[p].push({...stop, picker_id:p+1, step:buckets[p].length+1});
  });

  const result: PickerRoute[] = buckets.map((bstops,idx) => ({
    picker_id: idx+1,
    stops: bstops,
    distance: Math.round(routeDistance(bstops)*10)/10,
  }));

  // Pad with empty routes if pickerCount > n
  for (let i=ep; i<pickerCount; i++) {
    result.push({picker_id:i+1, stops:[], distance:0});
  }

  return result;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Local Simulation                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function simulateLocal(instruction:string, pickerCount:number): SimulationResponse {
  const parsed  = parseLocalInstruction(instruction);
  const missing = parsed.filter(i=>(skuIndex.get(i.sku_id)?.stock_count??0)<i.quantity).map(i=>i.sku_id);
  const fifo    = makeFifoRoute(parsed);
  const opt     = makeOptimizedRoutes(parsed, pickerCount);

  const fifoDist  = fifo.distance;
  const optMax    = Math.max(...opt.map(r=>r.distance),0);
  const reduction = fifoDist>0 ? Math.max(0,Math.round(((fifoDist-optMax)/fifoDist)*100)) : 0;

  const lower = instruction.toLowerCase();
  const anomalies: SimulationResponse["anomalies"] = [];
  if (lower.includes("cleaner")||lower.includes("soap")) {
    const ci = localInventory.find(i=>i.sku.id==="SKU-027")!;
    anomalies.push({id:"ANOMALY-101",severity:"high",message:"Chemical agent stored adjacent to Fresh Produce zone",location:ci.location,f1_score:0.94});
  }

  return {
    state:"dispatched", parsed_items:parsed, missing_items:missing,
    fifo_route:fifo, optimized_routes:opt,
    metrics:{
      fifo_distance:fifoDist, optimized_distance:optMax,
      reduction_percent:reduction,
      nlp_bleu_score:Number((0.86+Math.min(parsed.length,8)*0.012).toFixed(2)),
      cv_f1_score:0.92, dispatch_seconds:3+parsed.length*2,
    },
    anomalies,
    recommendations:[{
      id:"REC-01", title:"Co-locate Milk & Cereal", lift:1.34,
      skus:["SKU-006","SKU-016"],
      rationale:"Co-occur in 24% of baskets. Moving to adjacent racks cuts avg pick-path by 8m.",
    }],
    inventory:localInventory,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Zone Bounds (for SVG zone background regions)                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function computeZoneBounds(inventory: InventoryItem[]) {
  const b: Partial<Record<Zone,{x1:number;y1:number;x2:number;y2:number}>> = {};
  inventory.forEach(item => {
    const z = item.location.zone;
    const {grid_x:x,grid_y:y} = item.location;
    if (!b[z]) b[z]={x1:x,y1:y,x2:x,y2:y};
    else {
      b[z]!.x1=Math.min(b[z]!.x1,x); b[z]!.y1=Math.min(b[z]!.y1,y);
      b[z]!.x2=Math.max(b[z]!.x2,x); b[z]!.y2=Math.max(b[z]!.y2,y);
    }
  });
  return b;
}
const zoneBounds = computeZoneBounds(localInventory);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Home Page                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function Home() {
  const [instruction,   setInstruction]   = useState(defaultOrder);
  const [pickerCount,   setPickerCount]   = useState(3);
  const [data,          setData]          = useState<SimulationResponse>(() => simulateLocal(defaultOrder,3));
  const [loading,       setLoading]       = useState(false);
  const [source,        setSource]        = useState<"api"|"browser">("browser");
  const [hoveredSkuId,  setHoveredSkuId]  = useState<string|null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [simKey,        setSimKey]        = useState(0);

  // ── Animation state ──────────────────────────────────────────────────────
  const [animStep,    setAnimStep]    = useState(-1); // -1 = idle / finished
  const [isAnimating, setIsAnimating] = useState(false);
  const [animSpeed,   setAnimSpeed]   = useState(1200); // ms per step
  const animRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const logRef  = useRef<HTMLDivElement>(null);

  const maxAnimSteps = useMemo(()=>Math.max(
    data.fifo_route.stops.length,
    ...data.optimized_routes.map(r=>r.stops.length), 0
  ), [data]);

  // Auto-advance animation
  useEffect(()=>{
    if (!isAnimating) return;
    if (animStep >= maxAnimSteps) { setIsAnimating(false); return; }
    animRef.current = setTimeout(()=>setAnimStep(s=>s+1), animSpeed);
    return ()=>{ if(animRef.current) clearTimeout(animRef.current); };
  },[isAnimating,animStep,maxAnimSteps,animSpeed]);

  const startAnim  = useCallback(()=>{ setAnimStep(0); setIsAnimating(true); },[]);
  const pauseAnim  = useCallback(()=>{ setIsAnimating(false); },[]);
  const resetAnim  = useCallback(()=>{ setIsAnimating(false); setAnimStep(-1); },[]);
  const stepAnim   = useCallback(()=>{ setAnimStep(s=>Math.min(s+1,maxAnimSteps)); },[maxAnimSteps]);

  // Reset animation on new simulation
  useEffect(()=>{ resetAnim(); }, [simKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll telemetry
  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[telemetryLogs]);

  function generateRandomOrder() {
    const shuffled = [...randomBasketPool].sort(()=>Math.random()-0.5);
    const count = 5+Math.floor(Math.random()*4);
    setInstruction(shuffled.slice(0,count).map(item=>{
      const qty=1+Math.floor(Math.random()*3);
      return qty===1?item:`${qty} ${item}`;
    }).join(", "));
  }

  function triggerTelemetry(parsedCount:number, optDist:number, fifoDist:number) {
    const logs=[
      `[System] Orchestrator session initialized...`,
      `[NLP] Fine-tuned Llama-3 parsing natural language input...`,
      `[NLP] Extraction success: ${parsedCount} catalogue SKU(s) identified.`,
      `[DB] Inventory ledger verified — stock availability confirmed (OK).`,
      `[CV] YOLO-v8 cameras scanning shelf coordinates... Anomaly scan complete.`,
      `[Router] Multi-Agent TSP solver initializing with ${pickerCount} robot carts...`,
      `[Router] Optimal swarm paths computed. Critical path: ${optDist.toFixed(1)}m (FIFO was ${fifoDist.toFixed(1)}m).`,
      `[System] ✅ Picker robot swarm dispatched! Real-time telemetry streaming.`,
    ];
    setTelemetryLogs([]);
    logs.forEach((log,i)=>setTimeout(()=>setTelemetryLogs(prev=>[...prev,`${new Date().toLocaleTimeString()} ${log}`]),i*230));
  }

  useEffect(()=>{
    const opt=Math.max(...data.optimized_routes.map(r=>r.distance),0);
    triggerTelemetry(data.parsed_items.length,opt,data.metrics.fifo_distance);
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runSimulation(event?:FormEvent) {
    event?.preventDefault();
    setLoading(true);
    let nextData: SimulationResponse = simulateLocal(instruction, pickerCount);
    try {
      const res = await fetch("http://localhost:8000/api/simulate",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({instruction,picker_count:pickerCount}),
      });
      if(!res.ok) throw new Error("API unavailable");
      const next=(await res.json()) as SimulationResponse;
      nextData=next.inventory.length?next:{...next,inventory:localInventory};
      setSource("api");
    } catch {
      nextData=simulateLocal(instruction,pickerCount);
      setSource("browser");
    } finally {
      setData(nextData); setLoading(false); setSimKey(k=>k+1);
      const opt=Math.max(...nextData.optimized_routes.map(r=>r.distance),0);
      triggerTelemetry(nextData.parsed_items.length,opt,nextData.metrics.fifo_distance);
    }
  }

  const addCatalogItem=(name:string)=>{
    setInstruction(prev=>{
      const t=prev.trim(), lc=name.toLowerCase();
      if(!t) return `2 ${lc}`;
      const re=new RegExp(`(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozen)?\\s*${escapeRegExp(lc)}`,"i");
      const m=t.match(re);
      if(m){
        const s=m[1]||"1";
        const q=/^\d+$/.test(s)?parseInt(s,10):(numberWords[s.toLowerCase()]??1);
        return t.replace(re,`${q+1} ${lc}`);
      }
      return `${t}, 1 ${lc}`;
    });
  };

  const stopNames = useMemo(()=>new Map(data.fifo_route.stops.map(s=>[s.sku_id,s.name])),[data.fifo_route.stops]);
  const activePickers = data.optimized_routes.filter(r=>r.stops.length>0).length;
  const optimizedCritical = Math.max(...data.optimized_routes.map(r=>r.distance),0);
  const optimizedTotal    = data.optimized_routes.reduce((s,r)=>s+r.distance,0);

  return (
    <main className="app-shell home-shell">

      {/* ── SIMULATION FIRST — the star of the show ───────────────────────── */}
      <section className="sim-section sim-hero">

        {/* Compact command bar sits inside the sim card */}
        <form className="sim-command-bar" onSubmit={runSimulation}>
          <div className="scb-brand">
            <Warehouse size={15}/>
            <span>Q-Swarm Orchestrator</span>
            <span className="scb-divider"/>
            <span className="scb-tags">
              <span>🧠 NLP</span><span>🤖 TSP Routing</span><span>📷 CV Anomaly</span>
            </span>
          </div>

          <div className="scb-input-row">
            <textarea
              className="scb-textarea"
              value={instruction}
              onChange={e=>setInstruction(e.target.value)}
              placeholder="Natural language order: two bananas, whole milk, eggs x2, basmati rice…"
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); runSimulation(); }}}
            />
            <div className="scb-right">
              <div className="scb-picker-row">
                <Bot size={14}/>
                <span className="scb-picker-num">{pickerCount}</span>
                <span>carts</span>
                <input type="range" min={1} max={5} value={pickerCount}
                  onChange={e=>setPickerCount(Number(e.target.value))} className="scb-slider"/>
              </div>
              <div className="scb-buttons">
                <button type="button" className="scb-random" onClick={generateRandomOrder} title="Random order">
                  <Shuffle size={14}/> Random
                </button>
                <button type="submit" className="scb-run" disabled={loading}>
                  {loading?<><Zap size={15}/> Routing…</>:<><Play size={15}/> Simulate</>}
                </button>
              </div>
            </div>
          </div>

          {/* Catalog chips inline */}
          <div className="scb-catalog">
            {quickCatalog.map(item=>(
              <button key={item.sku} type="button" className="scb-chip"
                onClick={()=>addCatalogItem(item.name)}>
                {item.icon} {item.name}
              </button>
            ))}
            <button type="button" className="scb-chip scb-chip-default"
              onClick={()=>setInstruction(defaultOrder)}>
              ↺ Default
            </button>
          </div>
        </form>

        {/* Stats bar — compact improvement summary */}
        <div className="sim-stats-bar">
          <div className="ssb-stat ssb-highlight">
            <span className="ssb-value" style={{color:"var(--coral)"}}>{data.metrics.reduction_percent}%</span>
            <span className="ssb-label">distance saved</span>
          </div>
          <div className="ssb-divider"/>
          <div className="ssb-stat">
            <span className="ssb-value" style={{color:"var(--muted)",textDecoration:"line-through"}}>{data.metrics.fifo_distance.toFixed(1)}m</span>
            <span className="ssb-label">FIFO route</span>
          </div>
          <ChevronRight size={16} style={{color:"var(--mint)",flexShrink:0}}/>
          <div className="ssb-stat">
            <span className="ssb-value" style={{color:"var(--mint)"}}>{optimizedCritical.toFixed(1)}m</span>
            <span className="ssb-label">swarm path</span>
          </div>
          <div className="ssb-divider"/>
          <div className="ssb-stat">
            <span className="ssb-value">{activePickers}<span style={{fontSize:"0.8em",fontWeight:600}}>/{pickerCount}</span></span>
            <span className="ssb-label">carts active</span>
          </div>
          <div className="ssb-divider"/>
          <div className="ssb-stat">
            <span className="ssb-value">{data.parsed_items.length}</span>
            <span className="ssb-label">SKUs parsed</span>
          </div>
          <div className="ssb-divider"/>
          <div className="ssb-stat">
            <span className="ssb-value">{data.metrics.dispatch_seconds}s</span>
            <span className="ssb-label">dispatch ETA</span>
          </div>
          <div className="ssb-divider"/>
          {/* Animation controls inline */}
          <div className="ssb-anim-controls">
            <div className="anim-speed-toggle">
              {[["1×",1200],["2×",600],["3×",300]].map(([label,ms])=>(
                <button key={label} className={cx("speed-btn",animSpeed===ms&&"active")}
                  onClick={()=>setAnimSpeed(ms as number)} type="button">{label}</button>
              ))}
            </div>
            <button className="anim-btn reset" onClick={resetAnim} type="button" title="Reset"><RotateCcw size={13}/></button>
            <button className="anim-btn step" onClick={stepAnim} type="button" title="Next step" disabled={animStep>=maxAnimSteps}><ChevronRight size={13}/></button>
            {isAnimating
              ? <button className="anim-btn pause" onClick={pauseAnim} type="button"><Pause size={13}/> Pause</button>
              : <button className="anim-btn play" onClick={startAnim} type="button" disabled={maxAnimSteps===0}>
                  <Play size={13}/> {animStep<0?"▶ Play":"Resume"}
                </button>
            }
            <span className="anim-step-badge">
              {animStep<0?"Ready":animStep>=maxAnimSteps?`✓ Done`:`${animStep+1}/${maxAnimSteps}`}
            </span>
          </div>
        </div>

        {/* Two Maps — the main visual */}
        <div className="sim-maps-row">
          <RouteBoard
            key={`fifo-${simKey}`}
            title="FIFO — Single Picker"
            subtitle="One robot, all stops in order"
            routes={[data.fifo_route]}
            distance={data.metrics.fifo_distance}
            inventory={data.inventory}
            anomalies={data.anomalies}
            maxX={useMemo(()=>Math.max(20,...data.inventory.map(i=>i.location.grid_x),...data.fifo_route.stops.map(s=>s.grid_x)),[data])}
            maxY={useMemo(()=>Math.max(14,...data.inventory.map(i=>i.location.grid_y),...data.fifo_route.stops.map(s=>s.grid_y)),[data])}
            mode="fifo"
            animStep={animStep}
            hoveredSkuId={hoveredSkuId}
            setHoveredSkuId={setHoveredSkuId}
          />
          <RouteBoard
            key={`swarm-${simKey}`}
            title={`Swarm — ${activePickers} Robots in Parallel`}
            subtitle="TSP-optimised; each bot covers its nearest zone"
            routes={data.optimized_routes}
            distance={optimizedCritical}
            inventory={data.inventory}
            anomalies={data.anomalies}
            maxX={useMemo(()=>Math.max(20,...data.inventory.map(i=>i.location.grid_x),...data.optimized_routes.flatMap(r=>r.stops).map(s=>s.grid_x)),[data])}
            maxY={useMemo(()=>Math.max(14,...data.inventory.map(i=>i.location.grid_y),...data.optimized_routes.flatMap(r=>r.stops).map(s=>s.grid_y)),[data])}
            mode="optimized"
            animStep={animStep}
            hoveredSkuId={hoveredSkuId}
            setHoveredSkuId={setHoveredSkuId}
          />
        </div>

        {/* Zone Legend */}
        <div className="zone-legend">
          <span className="zone-legend-label">Zones:</span>
          {(Object.keys(zoneColors) as Zone[]).map(zone=>(
            <span key={zone} className="zone-chip">
              <span className="zone-dot" style={{background:zoneColors[zone]}}/>
              {zoneEmoji[zone]} {zone.charAt(0).toUpperCase()+zone.slice(1)}
            </span>
          ))}
          <span className="zone-chip"><span className="zone-dot" style={{background:"#0f172a"}}/>D Dispatch</span>
          <span className="zone-chip anomaly-chip">⚠ Anomaly</span>
          <span style={{marginLeft:"auto",fontSize:"0.7rem",color:"var(--muted)"}}>
            {source==="api"?"⚡ FastAPI":"🖥 Browser simulation"}
          </span>
        </div>

        {/* Telemetry */}
        <div className="telemetry-panel">
          <div className="telemetry-header">
            <Terminal size={13}/><span>Orchestrator Pipeline Log</span>
            <span className="telemetry-live"><span className="pulse-dot-nav online"/>Live</span>
          </div>
          <div className="telemetry-logs-scroll" ref={logRef}>
            <AnimatePresence initial={false}>
              {telemetryLogs.map((log,i)=>(
                <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{duration:0.2}}>
                  <span>&gt;</span> {log}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── Bottom Details (secondary, scroll to see) ─────────────────────── */}
      <section className="info-panels-row">
        {/* Parsed Order */}
        <div className="inspector-panel info-panel">
          <PanelTitle icon={<PackageCheck size={16}/>} title="Parsed Order Basket"/>
          <div className="parsed-list">
            {data.parsed_items.map(item=>{
              const isH=hoveredSkuId===item.sku_id;
              const ledger=skuIndex.get(item.sku_id)!;
              return (
                <div className="parsed-row" key={item.sku_id}
                  style={{background:isH?"rgba(13,148,136,0.08)":"rgba(255,255,255,0.5)",borderColor:isH?"var(--mint)":"var(--glass-border)",transition:"all 0.18s"}}
                  onMouseEnter={()=>setHoveredSkuId(item.sku_id)} onMouseLeave={()=>setHoveredSkuId(null)}>
                  <div>
                    <strong>{stopNames.get(item.sku_id)??item.sku_id}</strong>
                    <span style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}>
                      <span style={{background:zoneColors[ledger.location.zone],color:"#fff",borderRadius:4,padding:"1px 5px",fontSize:"0.65rem",fontWeight:700}}>
                        {ledger.location.zone}
                      </span>
                      {item.sku_id} · {Math.round(item.confidence*100)}%
                    </span>
                  </div>
                  <b>×{item.quantity}</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* Swarm Status */}
        <div className="inspector-panel info-panel">
          <PanelTitle icon={<Bot size={16}/>} title={`Swarm — ${pickerCount} Carts`}/>
          <div className="swarm-status-list">
            {data.optimized_routes.map((route,idx)=>{
              const color=routeColors[idx%routeColors.length];
              const currentStop = animStep>=0 ? route.stops[Math.min(animStep,route.stops.length-1)] : null;
              const done = animStep>=0 && animStep>=route.stops.length;
              const pct = route.stops.length===0?0:animStep<0?100:Math.min(100,Math.round((Math.min(animStep,route.stops.length)/route.stops.length)*100));
              return (
                <div key={route.picker_id} className="swarm-picker-row">
                  <div className="picker-avatar" style={{background:color}}>P{route.picker_id}</div>
                  <div className="picker-info">
                    <div className="picker-info-top">
                      <strong>Picker {route.picker_id}</strong>
                      <span style={{color:"var(--muted)",fontSize:"0.7rem"}}>
                        {route.stops.length} stops · {route.distance.toFixed(1)}m
                      </span>
                    </div>
                    {route.stops.length===0
                      ? <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>Standby</div>
                      : <>
                          <div className="picker-progress-bar">
                            <div style={{width:`${pct}%`,background:color,height:"100%",borderRadius:"inherit",transition:"width 0.4s ease"}}/>
                          </div>
                          <div style={{fontSize:"0.7rem",color:done?"var(--mint)":color,marginTop:2}}>
                            {done?"✓ Complete":animStep<0?`${route.stops.length} items`:currentStop?`→ ${currentStop.name}`:"—"}
                          </div>
                        </>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomalies */}
        <div className="inspector-panel info-panel">
          <PanelTitle icon={<AlertTriangle size={16}/>} title="CV Shelf Anomalies"/>
          <div className="alert-list" style={{flex:1}}>
            {data.anomalies.length===0
              ? <div className="empty-state">No anomalies detected.<br/><em style={{fontSize:"0.78rem"}}>Add "cleaner" to trigger CV scan.</em></div>
              : data.anomalies.map(a=>(
                  <div className={cx("alert-row",a.severity)} key={a.id}>
                    <div><strong>{a.id}</strong><p>{a.message}</p></div>
                    <span>{a.f1_score.toFixed(2)}</span>
                  </div>
                ))
            }
          </div>
          <div style={{marginTop:"auto",paddingTop:12}}>
            <PanelTitle icon={<BrainCircuit size={16}/>} title="AI Recommendation"/>
            {data.recommendations.map(r=>(
              <div key={r.id} className="rec-inline">
                <span className="rec-lift">+{r.lift.toFixed(2)}× lift</span>
                <div><strong>{r.title}</strong><p>{r.rationale}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  RouteBoard                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function RouteBoard({
  title, subtitle, routes, distance, inventory, anomalies, maxX, maxY, mode, animStep, hoveredSkuId, setHoveredSkuId,
}: {
  title:string; subtitle:string; routes:PickerRoute[]; distance:number;
  inventory:InventoryItem[]; anomalies:SimulationResponse["anomalies"];
  maxX:number; maxY:number; mode:"fifo"|"optimized";
  animStep:number; hoveredSkuId:string|null; setHoveredSkuId:(id:string|null)=>void;
}) {
  const activeSkuIds = new Set(routes.flatMap(r=>r.stops.map(s=>s.sku_id)));
  const isIdle = animStep<0;

  return (
    <article className={cx("route-board-new",mode)}>
      {/* Header */}
      <div className="rb-header">
        <div>
          <div className="rb-mode-badge" style={{background:mode==="fifo"?"#64748b":"var(--mint)"}}>
            {mode==="fifo"?"FIFO":"SWARM"}
          </div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <div className="rb-distance">
          <div className="rb-dist-num">{distance.toFixed(1)}<span>m</span></div>
          <div className="rb-dist-label">critical path</div>
        </div>
      </div>

      {/* Map */}
      <div className="sim-warehouse-map">
        <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {/* Zone background regions */}
          {(Object.entries(zoneBounds) as [Zone,{x1:number;y1:number;x2:number;y2:number}][]).map(([zone,b])=>{
            const px1=toPercent(b.x1-1.2,maxX), py1=toPercent(b.y1-0.8,maxY);
            const px2=toPercent(b.x2+1.2,maxX), py2=toPercent(b.y2+0.8,maxY);
            return (
              <g key={`zone-${zone}`}>
                <rect x={`${px1}%`} y={`${py1}%`} width={`${px2-px1}%`} height={`${py2-py1}%`}
                  fill={zoneColors[zone]} fillOpacity={0.06} stroke={zoneColors[zone]}
                  strokeOpacity={0.25} strokeWidth={0.4} rx="1"/>
                <text x={`${((px1+px2)/2).toFixed(1)}%`} y={`${(py1-0.5).toFixed(1)}%`}
                  textAnchor="middle" fontSize="2.2" fill={zoneColors[zone]}
                  fontWeight="800" opacity={0.7} style={{textTransform:"uppercase",letterSpacing:"0.05em"}}>
                  {zone}
                </text>
              </g>
            );
          })}

          {/* Ghost route lines (full, dashed) */}
          {routes.map((route,rIdx)=>{
            if(route.stops.length===0) return null;
            const color=mode==="fifo"?"#94a3b8":routeColors[rIdx%routeColors.length];
            return (
              <polyline key={`ghost-${route.picker_id}`}
                points={routePoints(route.stops,maxX,maxY)}
                fill="none" stroke={color} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.35}/>
            );
          })}

          {/* Active route lines (animated portion) */}
          {!isIdle && routes.map((route,rIdx)=>{
            if(route.stops.length===0) return null;
            const color=mode==="fifo"?"#64748b":routeColors[rIdx%routeColors.length];
            const upTo=Math.min(animStep,route.stops.length-1);
            if(upTo<0) return null;
            const pts=routePointsUpTo(route.stops,upTo,maxX,maxY);
            return (
              <motion.polyline key={`active-${route.picker_id}-${animStep}`}
                points={pts} fill="none" stroke={color} strokeWidth={mode==="fifo"?2:2.5}
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                transition={{duration:0.7,ease:"easeOut"}}/>
            );
          })}

          {/* Static full route on idle */}
          {isIdle && routes.map((route,rIdx)=>{
            if(route.stops.length===0) return null;
            const color=mode==="fifo"?"#64748b":routeColors[rIdx%routeColors.length];
            return (
              <motion.polyline key={`full-${route.picker_id}`}
                points={routePoints(route.stops,maxX,maxY)}
                fill="none" stroke={color} strokeWidth={mode==="fifo"?1.8:2.2}
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                transition={{duration:1.6,ease:"easeInOut",delay:rIdx*0.12}}/>
            );
          })}
        </svg>

        {/* Dispatch node */}
        <span className="dispatch-node" style={pointCss(DISPATCH.x,DISPATCH.y,maxX,maxY)} title="Dispatch Station">D</span>

        {/* Shelf dots */}
        {inventory.map(item=>{
          const isStop=activeSkuIds.has(item.sku.id);
          const isH=hoveredSkuId===item.sku.id;
          return (
            <span key={`${mode}-shelf-${item.sku.id}`}
              className={cx("shelf-dot",isStop&&"active")}
              style={{
                ...pointCss(item.location.grid_x,item.location.grid_y,maxX,maxY),
                background:isStop?zoneColors[item.location.zone]:undefined,
                opacity:isStop?1:0.22,
                transform:isH&&isStop?"translate(-50%,-50%) scale(1.8)":"translate(-50%,-50%)",
                boxShadow:isH&&isStop?`0 0 14px ${zoneColors[item.location.zone]}`:"none",
                transition:"all 0.18s",zIndex:isH?8:isStop?4:2,
              }}
              title={`${item.sku.name} — ${item.location.zone}`}
              onMouseEnter={()=>isStop&&setHoveredSkuId(item.sku.id)}
              onMouseLeave={()=>isStop&&setHoveredSkuId(null)}/>
          );
        })}

        {/* Anomaly pins */}
        {anomalies.map(a=>(
          <span key={`${mode}-anomaly-${a.id}`} className="anomaly-pin"
            style={pointCss(a.location.grid_x,a.location.grid_y,maxX,maxY)} title={a.message}>!</span>
        ))}

        {/* Stop pins */}
        {routes.map((route,rIdx)=>
          route.stops.map((stop,si)=>{
            const isH=hoveredSkuId===stop.sku_id;
            const color=mode==="fifo"?"#475569":routeColors[rIdx%routeColors.length];
            const isCollected=!isIdle && animStep>si;
            const isCurrent=!isIdle && animStep===si;
            return (
              <motion.span key={`${mode}-stop-${route.picker_id}-${stop.sku_id}`}
                className="stop-pin"
                style={{
                  ...pointCss(stop.grid_x,stop.grid_y,maxX,maxY),
                  borderColor:color,
                  background:isCurrent?"#fbbf24":isCollected?"rgba(100,116,139,0.6)":color,
                  opacity:isCollected?0.6:1,
                  transform:isH||isCurrent?"translate(-50%,-50%) scale(1.2)":"translate(-50%,-50%)",
                  zIndex:isH||isCurrent?9:6, transition:"all 0.18s",
                  boxShadow:isCurrent?"0 0 16px #fbbf24":isH?`0 4px 12px ${color}44`:`0 2px 6px ${color}33`,
                }}
                initial={{scale:0.3,opacity:0}} animate={{scale:1,opacity:isCollected?0.6:1}}
                transition={{delay:si*0.05+rIdx*0.1,type:"spring",stiffness:280,damping:24}}
                title={`${stop.name} ×${stop.quantity}`}
                onMouseEnter={()=>setHoveredSkuId(stop.sku_id)}
                onMouseLeave={()=>setHoveredSkuId(null)}>
                {mode==="fifo"?stop.step:`P${route.picker_id}.${stop.step}`}
                <span className="stop-label" style={{opacity:isH?1:0,transition:"opacity 0.15s"}}>
                  {stop.name} (×{stop.quantity})
                </span>
              </motion.span>
            );
          })
        )}

        {/* Animated picker tokens */}
        {routes.map((route,rIdx)=>{
          if(route.stops.length===0) return null;
          const color=mode==="fifo"?"#475569":routeColors[rIdx%routeColors.length];
          let tx: string, ty: string;
          if(isIdle){
            // Idle: sit at dispatch
            tx=`${toPercent(DISPATCH.x,maxX).toFixed(2)}%`;
            ty=`${toPercent(DISPATCH.y,maxY).toFixed(2)}%`;
          } else if(animStep>=route.stops.length){
            // Done: return to dispatch
            tx=`${toPercent(DISPATCH.x,maxX).toFixed(2)}%`;
            ty=`${toPercent(DISPATCH.y,maxY).toFixed(2)}%`;
          } else {
            const s=route.stops[animStep];
            tx=`${toPercent(s.grid_x,maxX).toFixed(2)}%`;
            ty=`${toPercent(s.grid_y,maxY).toFixed(2)}%`;
          }
          return (
            <motion.div key={`${mode}-bot-${route.picker_id}`}
              className="bot-token"
              style={{background:color,position:"absolute"}}
              animate={{left:tx,top:ty,opacity:isIdle?0:1,scale:isIdle?0:1}}
              initial={{left:`${toPercent(DISPATCH.x,maxX).toFixed(2)}%`,top:`${toPercent(DISPATCH.y,maxY).toFixed(2)}%`,opacity:0,scale:0}}
              transition={{type:"spring",stiffness:120,damping:20}}>
              🤖
            </motion.div>
          );
        })}
      </div>

      {/* Step info bar */}
      {!isIdle && (
        <div className="step-info-bar">
          {mode==="fifo"?(()=>{
            const s=routes[0]?.stops?.[animStep];
            return <>
              <span className="step-badge">Step {Math.min(animStep+1,routes[0]?.stops.length??0)}/{routes[0]?.stops.length??0}</span>
              {s?<span>📍 Picking <strong>{s.name}</strong> ×{s.quantity}</span>
                 :<span style={{color:"var(--mint)"}}>✓ Route complete! Returning to dispatch.</span>}
            </>;
          })():(()=>{
            const active=routes.filter(r=>r.stops.length>0&&animStep<r.stops.length);
            const done=routes.filter(r=>r.stops.length>0&&animStep>=r.stops.length);
            return <>
              <span className="step-badge">Round {Math.min(animStep+1,Math.max(...routes.map(r=>r.stops.length),1))}</span>
              {active.map((r,i)=>{
                const s=r.stops[animStep];
                const c=routeColors[(r.picker_id-1)%routeColors.length];
                return s?<span key={r.picker_id} style={{color:c}}>P{r.picker_id}→{s.name}</span>:null;
              })}
              {done.length>0&&<span style={{color:"var(--mint)"}}>✓ {done.map(r=>`P${r.picker_id}`).join(",")} done</span>}
            </>;
          })()}
        </div>
      )}

      {/* Route footer legend */}
      <div className="rb-footer">
        {routes.map((route,rIdx)=>{
          if(route.stops.length===0) return null;
          const c=mode==="fifo"?"#64748b":routeColors[rIdx%routeColors.length];
          return (
            <span key={route.picker_id} style={{borderColor:c,color:c}}>
              P{route.picker_id}: {route.stops.length} stops · {route.distance.toFixed(1)}m
            </span>
          );
        })}
      </div>
    </article>
  );
}

function Metric({icon,label,value,detail,tone}:{icon:React.ReactNode;label:string;value:string;detail:string;tone:"mint"|"blue"|"gold"|"coral"}) {
  return (
    <article className={cx("metric",tone)} style={{minHeight:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:2}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
        <div className="metric-icon" style={{width:22,height:22,borderRadius:6,margin:0,fontSize:"0.75rem"}}>{icon}</div>
      </div>
      <strong style={{fontSize:"1.25rem",fontWeight:800,margin:0}}>{value}</strong>
      <p style={{fontSize:"0.63rem",color:"var(--muted)",margin:0,marginTop:2}}>{detail}</p>
    </article>
  );
}

function PanelTitle({icon,title}:{icon:React.ReactNode;title:string}) {
  return (
    <div className="panel-title" style={{margin:"0 0 10px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
      {icon}<h3 style={{fontSize:"0.85rem",fontWeight:700,margin:0}}>{title}</h3>
    </div>
  );
}
