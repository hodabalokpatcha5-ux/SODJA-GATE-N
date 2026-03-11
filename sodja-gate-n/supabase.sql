-- SQL Script for Supabase (PostgreSQL)
-- Copy and paste this into the Supabase SQL Editor

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  quartier TEXT,
  email TEXT,
  password_hash TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,
  otp_code TEXT,
  otp_expiration TEXT,
  is_admin INTEGER DEFAULT 0
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total_amount REAL NOT NULL,
  delivery_fee REAL DEFAULT 0,
  user_lat REAL,
  user_lng REAL,
  status TEXT DEFAULT 'En attente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price REAL NOT NULL
);

-- Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'En attente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'En attente',
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suggestions Table
CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Investment Requests Table
CREATE TABLE IF NOT EXISTS investment_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  amount REAL NOT NULL,
  shares INTEGER NOT NULL,
  motivation TEXT,
  status TEXT DEFAULT 'En étude',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data (Products)
INSERT INTO products (name, description, price, image_url) VALUES 
('Lait de Soja Naturel', 'Pur soja, sans conservateur, riche en protéines.', 500, 'https://picsum.photos/seed/soymilk/400/300'),
('Yaourt de Soja', 'Onctueux et rafraîchissant, saveur vanille ou fraise.', 300, 'https://picsum.photos/seed/soyogurt/400/300'),
('Fromage de Soja (Tofu)', 'Idéal pour vos plats cuisinés, riche en fer.', 400, 'https://picsum.photos/seed/tofu/400/300'),
('Farine de Soja', 'Parfait pour les bouillies et la pâtisserie.', 1000, 'https://picsum.photos/seed/soyflour/400/300');
