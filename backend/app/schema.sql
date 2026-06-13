CREATE TYPE order_state AS ENUM ('pending', 'routing', 'picking', 'dispatched');
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
CREATE INDEX idx_tasks_picker ON tasks (picker_id);
