-- Cloudflare D1 Database Schema for Soft Cookies
-- Execute using: npx wrangler d1 execute softcookies-db --file=schema.sql

CREATE TABLE IF NOT EXISTS tandas (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 6.50,
  unit TEXT NOT NULL DEFAULT '/ porción',
  image TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  delivery_date TEXT NOT NULL,
  locations TEXT NOT NULL DEFAULT '["Tierras Altas", "Bugaba", "David"]',
  total_slots INTEGER NOT NULL DEFAULT 25,
  reserved_slots INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tandas_slug ON tandas(slug);
CREATE INDEX IF NOT EXISTS idx_tandas_active ON tandas(is_active);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  pickup_location TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
