-- COPIEZ ET COLLEZ CE CODE DANS LE "SQL EDITOR" DE SUPABASE
-- Puis cliquez sur "Run"

-- 1. Création des tables
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

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total_amount REAL NOT NULL,
  delivery_fee REAL DEFAULT 0,
  user_lat REAL,
  user_lng REAL,
  status TEXT DEFAULT 'En attente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price REAL NOT NULL
);

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'En attente',
  transaction_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investment_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  amount REAL NOT NULL,
  shares INTEGER NOT NULL,
  motivation TEXT,
  status TEXT DEFAULT 'En étude',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertion des produits de base (Optionnel)
INSERT INTO products (name, description, price, image_url) VALUES 
('Soja simple (fromage)', 'Fromage de soja artisanal, riche en protéines.', 500, 'https://picsum.photos/seed/soja1/800/800'),
('Soja + spaghetti', 'Mélange savoureux de soja et spaghetti.', 1000, 'https://picsum.photos/seed/soja2/800/800'),
('Soja + spaghetti + saucisses', 'Le menu complet pour les gourmands.', 1500, 'https://picsum.photos/seed/soja3/800/800'),
('Lait de soja', 'Lait de soja frais et onctueux.', 300, 'https://picsum.photos/seed/soja4/800/800');
