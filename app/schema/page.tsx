"use client";

import { motion } from "framer-motion";
import { Database, Key, List, Info, Code, FileText, ArrowRight, Activity } from "lucide-react";
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
};

const tables: ERDTable[] = [
  {
    name: "inventory",
    theme: { bg: "#e8eaf6", border: "#3f51b5", text: "#1a237e" },
    fields: [
      { name: "sku_id", type: "text", isPk: true, isFk: true },
      { name: "location_id", type: "int", isPk: true, isFk: true },
      { name: "stock_count", type: "int" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
  {
    name: "order_items",
    theme: { bg: "#e0f2f1", border: "#009688", text: "#004d40" },
    fields: [
      { name: "order_id", type: "uuid", isPk: true, isFk: true },
      { name: "sku_id", type: "text", isPk: true, isFk: true },
      { name: "quantity", type: "int" },
    ],
  },
  {
    name: "orders",
    theme: { bg: "#e3f2fd", border: "#2196f3", text: "#0d47a1" },
    fields: [
      { name: "id", type: "uuid", isPk: true },
      { name: "customer_note", type: "text" },
      { name: "state", type: "enum" },
      { name: "created_at", type: "timestamptz" },
    ],
    indexes: ["state,created_at"],
  },
  {
    name: "locations",
    theme: { bg: "#ffebee", border: "#f44336", text: "#b71c1c" },
    fields: [
      { name: "id", type: "serial", isPk: true },
      { name: "aisle", type: "int" },
      { name: "rack", type: "int" },
      { name: "shelf", type: "int" },
      { name: "grid_x", type: "int" },
      { name: "grid_y", type: "int" },
      { name: "zone", type: "enum" },
    ],
    indexes: ["aisle,rack,shelf", "grid_x,grid_y"],
  },
  {
    name: "skus",
    theme: { bg: "#f3e5f5", border: "#9c27b0", text: "#4a148c" },
    fields: [
      { name: "id", type: "text", isPk: true },
      { name: "name", type: "text" },
      { name: "category", type: "text" },
      { name: "fragility_score", type: "int" },
      { name: "weight_grams", type: "int" },
    ],
  },
];

const ddlCode = `CREATE TYPE order_state AS ENUM ('pending', 'routing', 'picking', 'dispatched');

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

CREATE INDEX idx_locations_grid ON locations (grid_x, grid_y);
CREATE INDEX idx_inventory_stock ON inventory (stock_count);
CREATE INDEX idx_orders_state_created ON orders (state, created_at);`;

export default function SchemaPage() {
  const [showSql, setShowSql] = useState(false);

  return (
    <main className="app-shell" style={{ padding: "16px 0 32px" }}>
      <section className="masthead" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow">Database Architecture</p>
          <h1 style={{ fontSize: "2.5rem" }}>Relational Schema Model</h1>
          <p className="subhead" style={{ marginTop: "8px", fontSize: "0.95rem" }}>
            Decoupled microservice storage mapped to a 3NF PostgreSQL structure, enforcing grid constraints and state-machine transitions.
          </p>
        </div>
        <button
          className="compact-btn"
          style={{ alignSelf: "center", minHeight: "36px", height: "36px", fontSize: "0.85rem", padding: "0 14px" }}
          onClick={() => setShowSql(!showSql)}
        >
          {showSql ? <FileText size={16} /> : <Code size={16} />}
          <span>{showSql ? "View Diagram" : "View DDL Script"}</span>
        </button>
      </section>

      {showSql ? (
        <motion.div
          className="code-viewer-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="code-header" style={{ padding: "10px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={15} />
              <h3 style={{ fontSize: "0.9rem" }}>PostgreSQL Migration Script</h3>
            </div>
            <span className="erd-tag" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>PostgreSQL</span>
          </div>
          <pre className="code-body" style={{ padding: "16px", fontSize: "0.8rem", maxHeight: "580px", overflowY: "auto" }}>
            <code>{ddlCode}</code>
          </pre>
        </motion.div>
      ) : (
        <div className="schema-grid" style={{ gridTemplateColumns: "1fr", gap: "24px" }}>
          {/* ERD Canvas Grid */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "32px 24px",
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "32px",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Top Row: inventory, order_items, orders */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "24px",
                width: "100%",
                zIndex: 2
              }}
            >
              <ERDCard table={tables[0]} />
              <ERDCard table={tables[1]} />
              <ERDCard table={tables[2]} />
            </div>

            {/* Bottom Row: locations, skus */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "24px",
                width: "100%",
                paddingRight: "80px",
                zIndex: 2
              }}
            >
              <ERDCard table={tables[3]} />
              <ERDCard table={tables[4]} />
            </div>

            {/* SVG Connector Overlay representing relationships */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 1,
                pointerEvents: "none",
                opacity: 0.75
              }}
            >
              {/* inventory.sku_id -> skus.id */}
              <path d="M 190 210 C 190 280, 480 250, 480 340" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
              {/* inventory.location_id -> locations.id */}
              <path d="M 120 210 C 120 280, 240 280, 240 340" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
              {/* order_items.order_id -> orders.id */}
              <path d="M 660 170 C 660 170, 720 170, 740 170" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
              {/* order_items.sku_id -> skus.id */}
              <path d="M 480 210 L 480 340" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
          </div>
        </div>
      )}

      {/* Constraints & Indexes details */}
      <section
        className="erd-card"
        style={{
          marginTop: "20px",
          padding: "16px 20px",
          background: "var(--panel)",
          border: "1px solid var(--glass-border)"
        }}
      >
        <div className="panel-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <Info size={16} />
          <h4 style={{ fontSize: "1rem", color: "var(--ink)" }}>Constraints & Performance Logic</h4>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "12px" }}>
          <ul style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: "1.5", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px", margin: 0 }}>
            <li>
              <strong>Aisle, Rack, Shelf Constraint:</strong> Unique composite index on <code>locations</code> stops items from conflicting physically.
            </li>
            <li>
              <strong>Fragility Weighting:</strong> Checked automatically in the application layer. Heavy weight items must map to locations with index order priorities.
            </li>
          </ul>
          <ul style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: "1.5", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px", margin: 0 }}>
            <li>
              <strong>Cascade Deletes:</strong> Composite keys on <code>order_items</code> reference <code>orders</code> with delete cascade hooks for active sandbox resets.
            </li>
            <li>
              <strong>Grid Indexing:</strong> The composite spatial index <code>idx_locations_grid</code> accelerates picker path boundary lookups.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function ERDCard({ table }: { table: ERDTable }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
        borderRadius: "6px",
        overflow: "hidden",
        width: "290px",
        display: "flex",
        flexDirection: "column",
        fontSize: "0.8rem"
      }}
    >
      {/* Table Header */}
      <div
        style={{
          background: table.theme.bg,
          borderBottom: `2px solid ${table.theme.border}`,
          padding: "8px 16px",
          textAlign: "center",
          fontWeight: 800,
          color: table.theme.text,
          letterSpacing: "0.02em",
          fontSize: "0.9rem"
        }}
      >
        {table.name}
      </div>

      {/* Fields List */}
      <div style={{ padding: "6px 0", display: "flex", flexDirection: "column" }}>
        {table.fields.map((field) => (
          <div
            key={field.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 16px",
              borderBottom: "1px solid #f1f5f9"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}>
              {field.isPk ? (
                <span title={field.isFk ? "PK / FK" : "Primary Key"} style={{ color: "#d97706", display: "flex", alignItems: "center" }}>
                  🔑
                </span>
              ) : field.isFk ? (
                <span title="Foreign Key" style={{ color: "#7c3aed", display: "flex", alignItems: "center" }}>
                  🔗
                </span>
              ) : (
                <div style={{ width: 12 }} />
              )}
              <span style={{ fontWeight: field.isPk || field.isFk ? 600 : 400 }}>{field.name}</span>
            </div>
            <span style={{ color: "#94a3b8", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem" }}>
              {field.type}
            </span>
          </div>
        ))}
      </div>

      {/* Indexes Block */}
      {table.indexes && table.indexes.length > 0 && (
        <div
          style={{
            margin: "0 8px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            background: "#f8fafc",
            padding: "6px 12px"
          }}
        >
          <div style={{ fontWeight: 700, color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>
            Indexes
          </div>
          {table.indexes.map((idx, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569", fontFamily: "ui-monospace, monospace", fontSize: "0.7rem" }}>
              <span>🔑</span>
              <span>{idx}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
