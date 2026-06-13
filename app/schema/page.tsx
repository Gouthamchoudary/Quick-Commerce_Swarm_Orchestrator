"use client";

import { motion } from "framer-motion";
import { Database, Key, List, Info, Code, FileText, ArrowRight, Activity, Server, ShieldCheck, Layers, RefreshCw } from "lucide-react";
import { useState } from "react";

type Field = {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
};

type ERDTable = {
  name: string;
  theme: {
    bg: string;
    border: string;
    text: string;
  };
  fields: Field[];
  indexes?: string[];
  description: string;
  constraints: string[];
};

const tablesData: ERDTable[] = [
  {
    name: "inventory",
    theme: { bg: "#e0e7ff", border: "#4f46e5", text: "#1e1b4b" },
    fields: [
      { name: "sku_id", type: "text", isPk: true, isFk: true },
      { name: "location_id", type: "int", isPk: true, isFk: true },
      { name: "stock_count", type: "int" },
      { name: "updated_at", type: "timestamptz" },
    ],
    indexes: ["stock_count"],
    description: "Enforces ledger records of available quantities per SKU per physical location.",
    constraints: ["Primary Key: composite (sku_id, location_id)", "Foreign Key: sku_id ➔ skus.id", "Foreign Key: location_id ➔ locations.id", "Check constraint: stock_count >= 0"],
  },
  {
    name: "locations",
    theme: { bg: "#ffe4e6", border: "#e11d48", text: "#881337" },
    fields: [
      { name: "id", type: "serial", isPk: true },
      { name: "aisle", type: "int" },
      { name: "rack", type: "int" },
      { name: "shelf", type: "int" },
      { name: "grid_x", type: "int" },
      { name: "grid_y", type: "int" },
      { name: "zone", type: "enum" },
    ],
    indexes: ["Grid_x,grid_y", "aisle,rack,shelf"],
    description: "Stores the physical warehouse layout map (aisles, shelves, grid coordinates).",
    constraints: ["Primary Key: id", "Unique constraint: composite (aisle, rack, shelf)", "Check constraints: grid_x >= 0, grid_y >= 0"],
  },
  {
    name: "order_items",
    theme: { bg: "#ccfbf1", border: "#0d9488", text: "#115e59" },
    fields: [
      { name: "order_id", type: "uuid", isPk: true, isFk: true },
      { name: "sku_id", type: "text", isPk: true, isFk: true },
      { name: "quantity", type: "int" },
    ],
    description: "Junction table mapping order transaction IDs to inventory SKUs with quantities.",
    constraints: ["Primary Key: composite (order_id, sku_id)", "Foreign Key: order_id ➔ orders.id ON DELETE CASCADE", "Foreign Key: sku_id ➔ skus.id", "Check constraint: quantity > 0"],
  },
  {
    name: "skus",
    theme: { bg: "#f3e8ff", border: "#a855f7", text: "#581c87" },
    fields: [
      { name: "id", type: "text", isPk: true },
      { name: "name", type: "text" },
      { name: "category", type: "text" },
      { name: "fragility_score", type: "int" },
      { name: "weight_grams", type: "int" },
    ],
    description: "Master catalog of retail items, specifying physical properties.",
    constraints: ["Primary Key: id", "Check constraint: fragility_score BETWEEN 1 AND 10", "Check constraint: weight_grams > 0"],
  },
  {
    name: "tasks",
    theme: { bg: "#ecfccb", border: "#84cc16", text: "#3f6212" },
    fields: [
      { name: "id", type: "uuid", isPk: true },
      { name: "picker_id", type: "int", isFk: true },
      { name: "order_id", type: "uuid", isFk: true },
      { name: "status", type: "enum" },
      { name: "assigned_at", type: "timestamptz" },
    ],
    indexes: ["picker_id", "order_id"],
    description: "Coordinates active picker carts, mapping active orders to specific robots in the swarm.",
    constraints: ["Primary Key: id", "Foreign Key: picker_id ➔ pickers.id", "Foreign Key: order_id ➔ orders.id ON DELETE CASCADE"],
  },
  {
    name: "orders",
    theme: { bg: "#e0f2fe", border: "#0ea5e9", text: "#075985" },
    fields: [
      { name: "id", type: "uuid", isPk: true },
      { name: "customer_note", type: "text" },
      { name: "state", type: "enum" },
      { name: "created_at", type: "timestamptz" },
    ],
    indexes: ["State,created_at"],
    description: "Stores order header metadata including customer notes, state transitions, and creation timestamps.",
    constraints: ["Primary Key: id", "State enum: ('pending', 'routing', 'picking', 'dispatched')"],
  },
  {
    name: "pickers",
    theme: { bg: "#cffafe", border: "#06b6d4", text: "#155e75" },
    fields: [
      { name: "id", type: "serial", isPk: true },
      { name: "name", type: "text" },
      { name: "status", type: "enum" },
      { name: "battery_percent", type: "int" },
      { name: "current_x", type: "int" },
      { name: "current_y", type: "int" },
    ],
    description: "Tracks physical robot carts, their battery charge, status, and grid coordinates.",
    constraints: ["Primary Key: id", "Check constraint: battery_percent BETWEEN 0 AND 100", "Status enum: ('idle', 'picking', 'charging', 'maintenance')"],
  },
];

const ddlCode = `CREATE TYPE order_state AS ENUM ('pending', 'routing', 'picking', 'dispatched');
CREATE TYPE picker_status AS ENUM ('idle', 'picking', 'charging', 'maintenance');
CREATE TYPE task_status AS ENUM ('assigned', 'active', 'completed', 'cancelled');

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  aisle INTEGER NOT NULL,
  rack INTEGER NOT NULL,
  shelf INTEGER NOT NULL,
  grid_x INTEGER NOT NULL CHECK (grid_x >= 0),
  grid_y INTEGER NOT NULL CHECK (grid_y >= 0),
  zone TEXT NOT NULL CHECK (zone IN ('produce', 'dairy', 'pantry', 'personal', 'homecare', 'frozen')),
  UNIQUE (aisle, rack, shelf)
);

CREATE TABLE skus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  fragility_score INTEGER NOT NULL CHECK (fragility_score BETWEEN 1 AND 10),
  weight_grams INTEGER NOT NULL CHECK (weight_grams > 0)
);

CREATE TABLE inventory (
  sku_id TEXT NOT NULL REFERENCES skus(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  stock_count INTEGER NOT NULL CHECK (stock_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sku_id, location_id)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_note TEXT NOT NULL,
  state order_state NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, sku_id)
);

CREATE TABLE pickers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status picker_status NOT NULL DEFAULT 'idle',
  battery_percent INTEGER NOT NULL CHECK (battery_percent BETWEEN 0 AND 100),
  current_x INTEGER NOT NULL DEFAULT 0,
  current_y INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  picker_id INTEGER NOT NULL REFERENCES pickers(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status task_status NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_grid ON locations (grid_x, grid_y);
CREATE INDEX idx_inventory_stock ON inventory (stock_count);
CREATE INDEX idx_orders_state_created ON orders (state, created_at);
CREATE INDEX idx_tasks_picker ON tasks (picker_id);`;

// Initial visual coordinates that replicate the user's screenshot layout
const initialPositions = {
  inventory: { x: 40, y: 40 },
  locations: { x: 40, y: 320 },
  order_items: { x: 280, y: 40 },
  skus: { x: 280, y: 290 },
  tasks: { x: 520, y: 40 },
  orders: { x: 520, y: 340 },
  pickers: { x: 760, y: 40 },
};

const cardWidth = 200;

export default function SchemaPage() {
  const [showSql, setShowSql] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(initialPositions);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  function resetPositions() {
    setPositions(initialPositions);
  }

  // Visual Tracing Triggers
  const activeTable = hoveredTable || selectedTable;

  const isTableActive = (name: string) => {
    if (!activeTable) return true;
    if (activeTable === name) return true;

    // Direct relationship connections
    const connections: Record<string, string[]> = {
      inventory: ["skus", "locations"],
      locations: ["inventory"],
      order_items: ["orders", "skus"],
      skus: ["order_items", "inventory"],
      orders: ["order_items", "tasks"],
      pickers: ["tasks"],
      tasks: ["pickers", "orders"],
    };
    return connections[activeTable]?.includes(name);
  };

  const isLineActive = (tblA: string, tblB: string) => {
    if (!activeTable) return true;
    return activeTable === tblA || activeTable === tblB;
  };

  // Helper to draw clean relational cubic curves
  function getCubicBezier(x1: number, y1: number, x2: number, y2: number, orient: "lr" | "loopL" | "loopR" | "diag") {
    if (orient === "loopL") {
      return `M ${x1} ${y1} C ${x1 - 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`;
    }
    if (orient === "loopR") {
      return `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 + 50} ${y2}, ${x2} ${y2}`;
    }
    const controlX = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + controlX} ${y1}, ${x2 - controlX} ${y2}, ${x2} ${y2}`;
  }

  const activeTableInfo = tablesData.find((t) => t.name === selectedTable);

  return (
    <main className="app-shell" style={{ padding: "12px 0 20px", height: "calc(100vh - 84px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: "20px", flex: 1, overflow: "hidden", minHeight: "500px" }}>
        
        {/* Left Side: Metadata & Interactive Constraints Inspector */}
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
            <p className="eyebrow" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>Database Architecture</p>
            <h1 style={{ fontSize: "1.75rem", lineHeight: 1.1 }}>Relational Model</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "6px", lineHeight: 1.4 }}>
              Decoupled microservice storage mapped to a 3NF PostgreSQL structure. Drag tables to reorganize.
            </p>
          </div>

          {/* Table view selectors */}
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              className={`compact-btn ${!showSql ? "active" : ""}`}
              style={{
                flex: 1,
                justifyContent: "center",
                padding: "8px 10px",
                fontSize: "0.8rem",
                borderRadius: "8px",
                background: !showSql ? "var(--mint)" : "transparent",
                color: !showSql ? "#fff" : "var(--muted)",
                border: !showSql ? "none" : "1px solid var(--glass-border)"
              }}
              onClick={() => setShowSql(false)}
            >
              <Layers size={14} />
              <span>Interactive Map</span>
            </button>
            <button
              className={`compact-btn ${showSql ? "active" : ""}`}
              style={{
                flex: 1,
                justifyContent: "center",
                padding: "8px 10px",
                fontSize: "0.8rem",
                borderRadius: "8px",
                background: showSql ? "var(--mint)" : "transparent",
                color: showSql ? "#fff" : "var(--muted)",
                border: showSql ? "none" : "1px solid var(--glass-border)"
              }}
              onClick={() => setShowSql(true)}
            >
              <Code size={14} />
              <span>SQL Code DDL</span>
            </button>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--glass-border)", margin: "2px 0" }} />

          {/* Contextual Table Detail Inspector */}
          {activeTableInfo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, textTransform: "capitalize", color: "var(--ink)", fontSize: "1.1rem", fontWeight: 800 }}>
                  Table: {activeTableInfo.name}
                </h3>
                <span className="erd-tag" style={{ background: activeTableInfo.theme.bg, color: activeTableInfo.theme.text, border: "none", fontSize: "0.65rem", padding: "2px 6px" }}>
                  Active Details
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
                {activeTableInfo.description}
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Constraints & Rules</span>
                <ul style={{ paddingLeft: "14px", margin: 0, fontSize: "0.75rem", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {activeTableInfo.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--ink)" }}>
                <ShieldCheck size={14} style={{ color: "var(--mint)" }} />
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>Constraint Specifications</h4>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
                Click any table on the interactive diagram to audit its relational constraints, foreign keys, and indexes.
              </p>
              <ul style={{ color: "var(--muted)", fontSize: "0.76rem", lineHeight: "1.4", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
                <li><strong>Composite PKs:</strong> Junction tables enforce unique matching records.</li>
                <li><strong>Foreign Keys:</strong> Enforces cascade resets on active database schema updates.</li>
              </ul>
            </div>
          )}

          {/* Reset positions */}
          {!showSql && (
            <button
              onClick={resetPositions}
              style={{
                marginTop: "auto",
                width: "100%",
                padding: "8px",
                fontSize: "0.75rem",
                background: "rgba(15, 23, 42, 0.03)",
                border: "1px solid var(--glass-border)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                color: "var(--ink)"
              }}
            >
              <RefreshCw size={12} />
              <span>Reset Draggable Grid Layout</span>
            </button>
          )}
        </div>

        {/* Right Side: Visual Canvas or Code Block */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxShadow: "inset 0 1px 4px rgba(0,0,0,0.02)"
          }}
        >
          {showSql ? (
            <motion.div
              style={{ display: "flex", flexDirection: "column", height: "100%" }}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="code-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Database size={15} style={{ color: "var(--mint)" }} />
                  <h3>PostgreSQL Migration Script</h3>
                </div>
                <span className="erd-tag" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>PostgreSQL</span>
              </div>
              <pre className="code-body" style={{ margin: 0, flex: 1, overflowY: "auto", borderRadius: 0 }}>
                <code>{ddlCode}</code>
              </pre>
            </motion.div>
          ) : (
            <motion.div
              style={{ position: "relative", flex: 1, overflow: "auto" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="erd-canvas-dotted"
            >
              <div style={{ position: "absolute", width: "1000px", height: "560px", zIndex: 2 }}>
                {tablesData.map((table) => {
                  const pos = positions[table.name] || { x: 0, y: 0 };
                  const active = isTableActive(table.name);
                  const isSelected = selectedTable === table.name;

                  return (
                    <motion.div
                      key={table.name}
                      drag
                      dragMomentum={false}
                      dragElastic={0}
                      onDrag={(event, info) => {
                        setPositions((prev) => ({
                          ...prev,
                          [table.name]: {
                            x: prev[table.name].x + info.delta.x,
                            y: prev[table.name].y + info.delta.y,
                          },
                        }));
                      }}
                      onPointerDown={() => setSelectedTable(table.name)}
                      onHoverStart={() => setHoveredTable(table.name)}
                      onHoverEnd={() => setHoveredTable(null)}
                      style={{
                        position: "absolute",
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        background: "#ffffff",
                        border: isSelected ? "2px solid var(--mint)" : "1px solid #e2e8f0",
                        boxShadow: isSelected
                          ? "0 10px 15px -3px rgba(13, 148, 136, 0.15), 0 4px 6px -2px rgba(13, 148, 136, 0.05)"
                          : "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        width: `${cardWidth}px`,
                        display: "flex",
                        flexDirection: "column",
                        fontSize: "0.75rem",
                        cursor: "grab",
                        opacity: active ? 1 : 0.45,
                        zIndex: isSelected || hoveredTable === table.name ? 5 : 2,
                        transition: "opacity 0.25s, border-color 0.2s"
                      }}
                      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                    >
                      {/* Table Header Bar */}
                      <div
                        style={{
                          background: table.theme.bg,
                          borderBottom: `2px solid ${table.theme.border}`,
                          padding: "6px 12px",
                          textAlign: "center",
                          fontWeight: 800,
                          color: table.theme.text,
                          letterSpacing: "0.02em",
                          fontSize: "0.8rem",
                          pointerEvents: "none"
                        }}
                      >
                        {table.name}
                      </div>

                      {/* Columns list */}
                      <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", pointerEvents: "none" }}>
                        {table.fields.map((field) => (
                          <div
                            key={field.name}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "5px 12px",
                              borderBottom: "1px solid #f8fafc"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}>
                              {field.isPk ? (
                                <span title={field.isFk ? "PK / FK" : "Primary Key"} style={{ fontSize: "0.7rem" }}>
                                  🔑
                                </span>
                              ) : field.isFk ? (
                                <span title="Foreign Key" style={{ fontSize: "0.7rem" }}>
                                  🔗
                                </span>
                              ) : (
                                <div style={{ width: 10 }} />
                              )}
                              <span style={{ fontWeight: field.isPk || field.isFk ? 600 : 400 }}>{field.name}</span>
                            </div>
                            <span style={{ color: "#94a3b8", fontFamily: "ui-monospace, monospace", fontSize: "0.68rem" }}>
                              {field.type}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Indexes block */}
                      {table.indexes && table.indexes.length > 0 && (
                        <div
                          style={{
                            margin: "0 6px 6px",
                            border: "1px solid #f1f5f9",
                            borderRadius: "4px",
                            background: "#fafafb",
                            padding: "4px 8px",
                            pointerEvents: "none"
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#94a3b8", fontSize: "0.62rem", textTransform: "uppercase", marginBottom: "2px" }}>
                            Indexes
                          </div>
                          {table.indexes.map((idx, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", color: "#64748b", fontFamily: "ui-monospace, monospace", fontSize: "0.65rem" }}>
                              <span>⚡</span>
                              <span>{idx}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Dynamic SVG Connections Overlay */}
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "1000px",
                  height: "560px",
                  zIndex: 1,
                  pointerEvents: "none"
                }}
              >
                {/* 1. inventory.sku_id ➔ skus.id */}
                {(() => {
                  const pInv = positions.inventory || { x: 0, y: 0 };
                  const pSku = positions.skus || { x: 0, y: 0 };
                  const active = isLineActive("inventory", "skus");
                  return (
                    <path
                      d={getCubicBezier(pInv.x + cardWidth, pInv.y + 42, pSku.x, pSku.y + 42, "lr")}
                      fill="none"
                      stroke={active ? "var(--mint)" : "#cbd5e1"}
                      strokeWidth={active && activeTable ? 3 : 1.5}
                      strokeDasharray={active ? undefined : "3 3"}
                      style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
                    />
                  );
                })()}

                {/* 2. inventory.location_id ➔ locations.id */}
                {(() => {
                  const pInv = positions.inventory || { x: 0, y: 0 };
                  const pLoc = positions.locations || { x: 0, y: 0 };
                  const active = isLineActive("inventory", "locations");
                  return (
                    <path
                      d={getCubicBezier(pInv.x, pInv.y + 60, pLoc.x, pLoc.y + 42, "loopL")}
                      fill="none"
                      stroke={active ? "var(--mint)" : "#cbd5e1"}
                      strokeWidth={active && activeTable ? 3 : 1.5}
                      strokeDasharray={active ? undefined : "3 3"}
                      style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
                    />
                  );
                })()}

                {/* 3. order_items.order_id ➔ orders.id */}
                {(() => {
                  const pItems = positions.order_items || { x: 0, y: 0 };
                  const pOrd = positions.orders || { x: 0, y: 0 };
                  const active = isLineActive("order_items", "orders");
                  return (
                    <path
                      d={getCubicBezier(pItems.x, pItems.y + 42, pOrd.x, pOrd.y + 42, "loopL")}
                      fill="none"
                      stroke={active ? "var(--mint)" : "#cbd5e1"}
                      strokeWidth={active && activeTable ? 3 : 1.5}
                      strokeDasharray={active ? undefined : "3 3"}
                      style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
                    />
                  );
                })()}

                {/* 4. order_items.sku_id ➔ skus.id */}
                {(() => {
                  const pItems = positions.order_items || { x: 0, y: 0 };
                  const pSku = positions.skus || { x: 0, y: 0 };
                  const active = isLineActive("order_items", "skus");
                  return (
                    <path
                      d={getCubicBezier(pItems.x, pItems.y + 60, pSku.x, pSku.y + 42, "loopL")}
                      fill="none"
                      stroke={active ? "var(--mint)" : "#cbd5e1"}
                      strokeWidth={active && activeTable ? 3 : 1.5}
                      strokeDasharray={active ? undefined : "3 3"}
                      style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
                    />
                  );
                })()}

                {/* 5. tasks.picker_id ➔ pickers.id */}
                {(() => {
                  const pTask = positions.tasks || { x: 0, y: 0 };
                  const pPick = positions.pickers || { x: 0, y: 0 };
                  const active = isLineActive("tasks", "pickers");
                  return (
                    <path
                      d={getCubicBezier(pTask.x + cardWidth, pTask.y + 60, pPick.x, pPick.y + 42, "lr")}
                      fill="none"
                      stroke={active ? "var(--mint)" : "#cbd5e1"}
                      strokeWidth={active && activeTable ? 3 : 1.5}
                      strokeDasharray={active ? undefined : "3 3"}
                      style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
                    />
                  );
                })()}

                {/* 6. tasks.order_id ➔ orders.id */}
                {(() => {
                  const pTask = positions.tasks || { x: 0, y: 0 };
                  const pOrd = positions.orders || { x: 0, y: 0 };
                  const active = isLineActive("tasks", "orders");
                  return (
                    <path
                      d={getCubicBezier(pTask.x, pTask.y + 80, pOrd.x, pOrd.y + 42, "loopL")}
                      fill="none"
                      stroke={active ? "var(--mint)" : "#cbd5e1"}
                      strokeWidth={active && activeTable ? 3 : 1.5}
                      strokeDasharray={active ? undefined : "3 3"}
                      style={{ transition: "stroke 0.25s, stroke-width 0.25s" }}
                    />
                  );
                })()}
              </svg>
            </motion.div>
          )}
        </div>

      </div>
    </main>
  );
}
