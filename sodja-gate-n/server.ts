import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`[Server] Starting with __dirname: ${__dirname}`);
console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Server] DATABASE_URL: ${process.env.DATABASE_URL ? 'Present' : 'Missing'}`);

const app = express();

// 0. GLOBAL STATE
let dbReady = false;

// 1. GLOBAL REQUEST LOGGER (Very first thing)
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || "";
  const isApi = url.startsWith('/api');
  if (isApi) {
    console.log(`[REQUEST] ${req.method} ${url}`);
  }
  next();
});

// 2. VERY EARLY TEST ROUTES (Before any middleware)
app.get("/api/test-json", (req, res) => {
  console.log("[DEBUG] HIT /api/test-json");
  res.json({ message: "JSON is working", timestamp: new Date().toISOString(), dbReady });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    db_ready: dbReady,
    version: "1.2.4",
    time: new Date().toISOString(),
    smtp_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    db_type: process.env.DATABASE_URL ? "Supabase (PostgreSQL)" : "Local (SQLite)"
  });
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "sodja-gate-secret-key";

// 2. Basic Middlewares
app.use(cors());
app.use(express.json());

// 4. Database Ready Middleware
const checkDbReady = (req: any, res: any, next: any) => {
  const url = req.originalUrl || req.url || "";
  const isApi = url.startsWith('/api');
  const isHealth = url === '/api/health' || url === '/api/test-json';
  
  if (isApi && !isHealth && !dbReady) {
    console.log(`[DB Check] DB not ready for ${url}. Returning 503.`);
    return res.status(503).json({ 
      error: "Le serveur démarre...", 
      message: "La base de données est en cours d'initialisation. Veuillez patienter quelques secondes." 
    });
  }
  next();
};
app.use(checkDbReady);

// --- PRODUCTS API (MOVED TO TOP FOR PRIORITY) ---
app.get("/api/products", async (req, res) => {
  const url = req.originalUrl || req.url || "";
  console.log(`[API] HIT /api/products - DB Ready: ${dbReady} - URL: ${url}`);
  try {
    if (!db) {
      console.error("[API] Database object is undefined!");
      return res.status(503).json({ error: "Base de données en cours d'initialisation" });
    }
    const products = await db.all("SELECT * FROM products");
    console.log(`[API] Found ${products?.length || 0} products`);
    res.json(products || []);
  } catch (err: any) {
    console.error("[API Error] Failed to fetch products:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des produits", details: err.message });
  }
});
// ------------------------------------------------

// 5. Global Error Handler for API (Early)
app.use((err: any, req: any, res: any, next: any) => {
  if (req.path && req.path.startsWith('/api')) {
    console.error("[API Error Early]", err);
    return res.status(500).json({ 
      error: "Erreur interne du serveur (Early)", 
      message: err.message 
    });
  }
  next(err);
});

// Database abstraction to support both SQLite and PostgreSQL
let db: {
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<{ lastInsertRowid: number | string | null; changes: number }>;
  exec: (sql: string) => Promise<void>;
  transaction: (fn: () => Promise<any>) => Promise<any>;
};

async function initDatabase() {
  if (process.env.DATABASE_URL) {
    console.log("[Database] Using PostgreSQL (Supabase)");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    db = {
      get: async (sql, params = []) => {
        let i = 0;
        const pgSql = sql.replace(/'[^']*'|(\?)/g, (match, group1) => group1 ? `$${++i}` : match);
        if (process.env.NODE_ENV !== 'production') console.log(`[DB Query] ${pgSql}`, params);
        try {
          const res = await pool.query(pgSql, params.map(p => p === undefined ? null : p));
          return res.rows[0];
        } catch (err: any) {
          console.error(`[DB Error] Query: ${pgSql}`, err);
          throw err;
        }
      },
      all: async (sql, params = []) => {
        let i = 0;
        const pgSql = sql.replace(/'[^']*'|(\?)/g, (match, group1) => group1 ? `$${++i}` : match);
        if (process.env.NODE_ENV !== 'production') console.log(`[DB Query] ${pgSql}`, params);
        try {
          const res = await pool.query(pgSql, params.map(p => p === undefined ? null : p));
          return res.rows;
        } catch (err: any) {
          console.error(`[DB Error] Query: ${pgSql}`, err);
          throw err;
        }
      },
      run: async (sql, params = []) => {
        let i = 0;
        let pgSql = sql.replace(/'[^']*'|(\?)/g, (match, group1) => group1 ? `$${++i}` : match);
        // Auto-append RETURNING id for INSERT statements if not present
        if (pgSql.trim().toUpperCase().startsWith("INSERT") && !pgSql.toUpperCase().includes("RETURNING")) {
          pgSql += " RETURNING id";
        }
        if (process.env.NODE_ENV !== 'production') console.log(`[DB Query] ${pgSql}`, params);
        try {
          const res = await pool.query(pgSql, params.map(p => p === undefined ? null : p));
          return { lastInsertRowid: res.rows[0]?.id || null, changes: res.rowCount || 0 };
        } catch (err: any) {
          console.error(`[DB Error] Query: ${pgSql}`, err);
          throw err;
        }
      },
      exec: async (sql) => {
        await pool.query(sql);
      },
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn();
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
    };
  } else {
    console.log("[Database] Using SQLite (Local)");
    const dbPath = path.join(__dirname, "sodjagate.db");
    console.log(`[Database] SQLite path: ${dbPath}`);
    try {
      const sqlite = new Database(dbPath);
      db = {
        get: async (sql, params = []) => sqlite.prepare(sql).get(...params),
        all: async (sql, params = []) => sqlite.prepare(sql).all(...params),
        run: async (sql, params = []) => {
          const res = sqlite.prepare(sql).run(...params);
          return { lastInsertRowid: res.lastInsertRowid, changes: res.changes };
        },
        exec: async (sql) => { sqlite.exec(sql); },
        transaction: async (fn) => {
          let result;
          sqlite.transaction(() => {
            // This is a bit tricky because fn is async but better-sqlite3 transaction is sync.
            // However, we are in a Node environment where we want to support async logic.
            // For now, we'll just run it.
          })();
          return fn();
        }
      };
    } catch (dbErr: any) {
      console.error("[Database Error] Failed to initialize SQLite:", dbErr.message);
      throw dbErr;
    }
  }

  const isPg = !!process.env.DATABASE_URL;
  const autoId = isPg ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY AUTOINCREMENT";

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${autoId},
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
      id ${autoId},
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id ${autoId},
      user_id INTEGER,
      total_amount REAL NOT NULL,
      delivery_fee REAL DEFAULT 0,
      user_lat REAL,
      user_lng REAL,
      status TEXT DEFAULT 'En attente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id ${autoId},
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id ${autoId},
      user_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      comment TEXT,
      status TEXT DEFAULT 'En attente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id ${autoId},
      order_id INTEGER,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      status TEXT DEFAULT 'En attente',
      transaction_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id ${autoId},
      name TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      message TEXT NOT NULL,
      rating INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS investment_requests (
      id ${autoId},
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
      id ${autoId},
      user_id INTEGER,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  
  // Migration for existing tables
  try { await db.run("ALTER TABLE orders ADD COLUMN delivery_fee REAL DEFAULT 0"); } catch (e) {}
  try { await db.run("ALTER TABLE orders ADD COLUMN user_lat REAL"); } catch (e) {}
  try { await db.run("ALTER TABLE orders ADD COLUMN user_lng REAL"); } catch (e) {}

  console.log("[Server] Database and tables ready.");
  
  // Seed in background
  seedDatabase().catch(err => console.error("[Server] Seeding failed:", err));
}

// Initialize DB immediately - removed top level call to avoid race condition
// startServer will call initDatabase

let wss: WebSocketServer;

const broadcast = (data: any) => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

const notifyAdmin = async (subject: string, message: string, type: 'order' | 'general' = 'general') => {
  const adminEmail = process.env.VITE_ADMIN_EMAIL || "sodjagate@gmail.com";
  const adminEmails = [adminEmail, "sodjagatecommande@gmail.com"];
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  console.log(`[Admin Notification] Tentative de notification pour : ${subject}`);
  console.log(`[Admin Notification] SMTP_USER: ${user ? 'Défini (' + user + ')' : 'NON DÉFINI'}`);
  console.log(`[Admin Notification] SMTP_PORT: ${port} (Secure: ${secure})`);

  if (!user || !pass) {
    console.log(`[Admin Notification Simulation] ${subject}: ${message}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
    debug: true,
    logger: true
  });

  try {
    const info = await transporter.sendMail({
      from: `"SODJA GATE System" <${user}>`,
      to: adminEmails.join(', '),
      subject: `[SODJA GATE] ${subject}`,
      text: message,
      html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981;">Nouvelle Notification SODJA GATE</h2>
        <p><strong>Sujet :</strong> ${subject}</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; white-space: pre-wrap;">
          ${message}
        </div>
        <p style="font-size: 12px; color: #6b7280;">Ceci est une notification automatique du système SODJA GATE.</p>
      </div>`,
    });
    console.log(`[Admin Notification] Email envoyé avec succès ! MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[Admin Notification Error] ÉCHEC de l'envoi :`, error.message);
    if (error.message.includes('Invalid login')) {
      console.error(`[Admin Notification Error] CONSEIL : Si vous utilisez Gmail, assurez-vous d'utiliser un "Mot de passe d'application" et non votre mot de passe habituel.`);
    }
  }
};

const notifyWhatsApp = async (message: string) => {
  const whatsappNumber = "+22871000588";
  console.log("--------------------------------------------------");
  console.log(`[WHATSAPP NOTIFICATION SENT TO ${whatsappNumber}]`);
  console.log(message);
  console.log("--------------------------------------------------");
  // Note: For real automated sending, an API like Twilio or a WhatsApp Business API provider is required.
};

const sendEmailOTP = async (email: string, otp: string): Promise<boolean> => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  console.log(`[Email OTP] Tentative d'envoi à : ${email}`);
  console.log(`[Email OTP] SMTP_USER: ${user ? 'Défini (' + user + ')' : 'NON DÉFINI'}`);

  if (!user || !pass) {
    console.log(`[Email Simulation] SODJA GATE envoie le code OTP ${otp} à ${email}`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
  });

  try {
    console.log(`[Email] Tentative d'envoi à ${email}...`);
    const info = await transporter.sendMail({
      from: `"SODJA GATE" <${user}>`,
      to: email,
      subject: "Code de vérification SODJA GATE",
      text: `Votre code de vérification est : ${otp}. Ce code expire dans 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
          <h2 style="color: #10b981; text-align: center;">SODJA GATE</h2>
          <p>Bonjour,</p>
          <p>Merci de vous être inscrit sur SODJA GATE. Pour finaliser votre inscription, veuillez utiliser le code de vérification suivant :</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #6b7280; text-align: center;">Ce code expirera dans 15 minutes. Si vous n'avez pas demandé ce code, vous pouvez ignorer cet e-mail.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 10px; color: #9ca3af; text-align: center;">&copy; 2026 SODJA GATE - Togo</p>
        </div>
      `,
    });
    console.log(`[Email] Code OTP envoyé avec succès à ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Erreur lors de l'envoi à ${email}:`, error.message);
    return false;
  }
};

const sendOrderConfirmation = async (email: string, orderId: number, total: number, items: any[], quartier: string, locationLink: string): Promise<boolean> => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  if (!user || !pass || !email) return false;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
  });

  const itemsList = items.map(item => `<li>${item.name} (x${item.quantity}) - ${item.price * item.quantity} FCFA</li>`).join('');

  try {
    await transporter.sendMail({
      from: `"SODJA GATE" <${user}>`,
      to: email,
      subject: `Confirmation de votre commande #${orderId} - SODJA GATE`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; border: 1px solid #e5e7eb; border-radius: 20px; max-width: 600px; margin: auto; color: #374151;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">SODJA GATE</h1>
            <p style="color: #6b7280; font-style: italic;">L'excellence du soja au Togo</p>
          </div>
          
          <p>Bonjour,</p>
          <p>Merci d'avoir choisi <strong>SODJA GATE</strong> ! Nous sommes ravis de vous compter parmi nos clients. Votre commande <strong>#${orderId}</strong> a bien été enregistrée.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 15px; margin: 25px 0; border: 1px solid #f3f4f6;">
            <h3 style="margin-top: 0; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Détails de la commande</h3>
            <ul style="padding-left: 20px; margin: 15px 0;">
              ${itemsList}
            </ul>
            <p style="margin: 10px 0;"><strong>Quartier :</strong> ${quartier || 'Non précisé'}</p>
            <p style="margin: 10px 0;"><strong>Localisation :</strong> <a href="${locationLink}" style="color: #10b981;">Voir sur la carte</a></p>
            <p style="margin: 15px 0 0 0; font-size: 18px; color: #10b981;"><strong>Total à payer : ${total} FCFA</strong></p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background: #ecfdf5; border-radius: 15px; border: 1px dashed #10b981;">
            <h4 style="margin-top: 0; color: #065f46;">À propos de SODJA GATE</h4>
            <p style="margin-bottom: 0; font-size: 14px; line-height: 1.6;">
              Chez SODJA GATE, nous croyons que la santé passe par une alimentation naturelle et de qualité. 
              Nos produits à base de soja sont transformés artisanalement avec passion au Togo pour vous offrir 
              le meilleur des nutriments. Merci de soutenir la production locale !
            </p>
          </div>

          <p style="font-weight: bold; color: #111827;">Un livreur vous contactera dans moins de 3 minutes pour coordonner la livraison.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">SODJA GATE - Lomé, Togo</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">Contact : +228 71 00 05 88 | sodjagate@gmail.com</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error(`[Order Email Error]`, error);
    return false;
  }
};

const sendInvestmentConfirmation = async (email: string, name: string, amount: number, shares: number, motivation: string): Promise<boolean> => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  if (!user || !pass || !email) return false;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"SODJA GATE" <${user}>`,
      to: email,
      subject: `Confirmation de votre demande d'investissement - SODJA GATE`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; border: 1px solid #e5e7eb; border-radius: 20px; max-width: 600px; margin: auto; color: #374151;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">SODJA GATE</h1>
            <p style="color: #6b7280; font-style: italic;">Investir dans l'excellence</p>
          </div>
          
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Nous avons bien reçu votre demande d'investissement dans <strong>SODJA GATE</strong>. Nous vous remercions pour la confiance que vous portez à notre vision.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #f0f9ff; border-radius: 15px; border: 1px solid #e0f2fe;">
            <h4 style="margin-top: 0; color: #0369a1;">Votre Motivation</h4>
            <p style="margin-bottom: 0; font-style: italic; color: #0c4a6e;">
              "${motivation}"
            </p>
            <p style="margin-top: 10px; font-weight: 600; color: #0369a1;">
              C'est une vision inspirante ! SODJA GATE est le partenaire idéal pour concrétiser ce but en transformant durablement l'agro-industrie togolaise et en créant de la valeur partagée.
            </p>
          </div>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 15px; margin: 25px 0; border: 1px solid #dcfce7;">
            <h3 style="margin-top: 0; color: #111827; border-bottom: 1px solid #dcfce7; padding-bottom: 10px;">Détails de l'investissement</h3>
            <p style="margin: 10px 0;"><strong>Montant investi :</strong> ${amount} FCFA</p>
            <p style="margin: 10px 0;"><strong>Nombre d'actions :</strong> ${shares}</p>
            <p style="margin: 10px 0;"><strong>Prix par action :</strong> 1000 FCFA</p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 15px; border: 1px solid #f3f4f6;">
            <h4 style="margin-top: 0; color: #111827;">Prochaines étapes</h4>
            <p style="margin-bottom: 0; font-size: 14px; line-height: 1.6;">
              Notre équipe examine actuellement votre demande. Si votre profil et vos objectifs correspondent aux valeurs de notre entreprise, nous reviendrons vers vous très rapidement pour finaliser l'achat de ces actions.
            </p>
            <p style="margin-top: 10px; font-size: 14px; line-height: 1.6;">
              Un conseiller vous contactera sur votre numéro WhatsApp pour les formalités administratives.
            </p>
          </div>

          <p style="font-weight: bold; color: #111827; text-align: center;">Ensemble, bâtissons l'avenir de l'agro-industrie au Togo.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">SODJA GATE - Lomé, Togo</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 5px 0;">Contact : +228 71 00 05 88 | sodjagate@gmail.com</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error(`[Investment Email Error]`, error);
    return false;
  }
};

// Test Email Route
app.get("/api/admin/test-email", async (req, res) => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return res.status(400).json({ 
      error: "SMTP non configuré. Veuillez définir SMTP_USER et SMTP_PASS dans les Secrets.",
      tip: "Pour Gmail, utilisez un Mot de passe d'application."
    });
  }

  try {
    await notifyAdmin("Test de Configuration Email", "Ceci est un email de test pour vérifier la configuration SMTP de SODJA GATE.");
    res.json({ message: "Email de test envoyé. Vérifiez les boîtes de réception (et les spams)." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Database setup
async function seedDatabase() {
  if (!db) return;

  try {
    // Check if admin already exists
    const adminExists = await db.get("SELECT * FROM users WHERE whatsapp = ?", ["+22871000588"]);
    
    if (!adminExists) {
      console.log("[Server] Creating admin account...");
      const password_hash = await bcrypt.hash("SODJA@GATE", 10);
      await db.run("INSERT INTO users (nom, whatsapp, email, password_hash, is_verified, is_admin) VALUES (?, ?, ?, ?, ?, ?)", 
        ["SODJA GATE Business", "+22871000588", "sodjagate@gmail.com", password_hash, 1, 1]);
    }

    // Check if products exist
    const productCount = await db.get("SELECT COUNT(*) as count FROM products") as any;
    if (productCount.count === 0) {
      console.log("[Server] Seeding initial products...");
      const initialProducts = [
        { name: "Soja simple (fromage)", description: "Fromage de soja artisanal, riche en protéines.", price: 500, image_url: "https://picsum.photos/seed/soja1/800/800" },
        { name: "Soja + spaghetti", description: "Mélange savoureux de soja et spaghetti.", price: 1000, image_url: "https://picsum.photos/seed/soja2/800/800" },
        { name: "Soja + spaghetti + saucisses", description: "Le menu complet pour les gourmands.", price: 1500, image_url: "https://picsum.photos/seed/soja3/800/800" },
        { name: "Lait de soja", description: "Lait de soja frais et onctueux.", price: 300, image_url: "https://picsum.photos/seed/soja4/800/800" }
      ];
      for (const p of initialProducts) {
        await db.run("INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)", 
          [p.name, p.description, p.price, p.image_url]);
      }
      console.log("[Server] Products seeded.");
    }
  } catch (err) {
    console.error("[Server] Seeding error:", err);
  }
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Non autorisé" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token invalide" });
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: "Accès administrateur requis" });
  }
};

// API Routes
app.post("/api/auth/register", async (req, res) => {
  const { nom, whatsapp, quartier, email, password } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "L'adresse email est obligatoire pour la vérification." });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiration = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Check if user already exists
    const existingUser = await db.get("SELECT * FROM users WHERE whatsapp = ?", [whatsapp]) as any;
    
    let userId;
    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(400).json({ error: "Ce numéro WhatsApp est déjà utilisé par un compte vérifié." });
      }
      // Update existing unverified user
      await db.run("UPDATE users SET nom = ?, quartier = ?, email = ?, password_hash = ?, otp_code = ?, otp_expiration = ? WHERE id = ?", 
        [nom, quartier, email, password_hash, otp_code, otp_expiration, existingUser.id]);
      userId = existingUser.id;
    } else {
      // Create new user
      const result = await db.run("INSERT INTO users (nom, whatsapp, quartier, email, password_hash, otp_code, otp_expiration) VALUES (?, ?, ?, ?, ?, ?, ?)", 
        [nom, whatsapp, quartier, email, password_hash, otp_code, otp_expiration]);
      userId = result.lastInsertRowid;
    }
    
    // Send Email OTP
    const emailSent = await sendEmailOTP(email, otp_code);

    res.json({ 
      message: emailSent 
        ? "Inscription réussie. Veuillez vérifier votre compte avec le code envoyé par email." 
        : "Inscription réussie. (Note: L'envoi d'email a échoué, utilisez le code de test ci-dessous).",
      userId,
      emailSent,
      testCode: emailSent ? null : otp_code // Send code to UI only if email fails
    });
  } catch (error: any) {
    console.error("[Register Error]", error);
    res.status(400).json({ error: "Erreur lors de l'inscription." });
  }
});

app.post("/api/auth/resend-otp", async (req, res) => {
  const { whatsapp } = req.body;
  const user = await db.get("SELECT * FROM users WHERE whatsapp = ?", [whatsapp]) as any;

  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé." });
  }

  const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
  const otp_expiration = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.run("UPDATE users SET otp_code = ?, otp_expiration = ? WHERE id = ?", [otp_code, otp_expiration, user.id]);

  // Send Email OTP
  const emailSent = await sendEmailOTP(user.email, otp_code);

  res.json({ 
    message: emailSent 
      ? "Un nouveau code OTP a été envoyé par email." 
      : "Échec de l'envoi d'email. Utilisez le code de test ci-dessous.",
    emailSent,
    testCode: emailSent ? null : otp_code
  });
});

app.post("/api/auth/verify", async (req, res) => {
  const { whatsapp, otp_code } = req.body;
  const user = await db.get("SELECT * FROM users WHERE whatsapp = ? AND otp_code = ?", [whatsapp, otp_code]) as any;

  if (!user) {
    return res.status(400).json({ error: "Code OTP invalide." });
  }

  if (new Date(user.otp_expiration) < new Date()) {
    return res.status(400).json({ error: "Code OTP expiré." });
  }

  await db.run("UPDATE users SET is_verified = 1, otp_code = NULL, otp_expiration = NULL WHERE id = ?", [user.id]);
  res.json({ message: "Compte vérifié avec succès." });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { whatsapp } = req.body;
  const user = await db.get("SELECT * FROM users WHERE whatsapp = ?", [whatsapp]) as any;

  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé." });
  }

  const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
  const otp_expiration = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.run("UPDATE users SET otp_code = ?, otp_expiration = ? WHERE id = ?", [otp_code, otp_expiration, user.id]);

  // Send Email OTP
  const emailSent = await sendEmailOTP(user.email, otp_code);

  res.json({ 
    message: emailSent 
      ? "Un code de récupération a été envoyé par email." 
      : "Échec de l'envoi d'email. Utilisez le code de test ci-dessous.",
    emailSent,
    testCode: emailSent ? null : otp_code
  });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { whatsapp, otp_code, new_password } = req.body;
  const user = await db.get("SELECT * FROM users WHERE whatsapp = ? AND otp_code = ?", [whatsapp, otp_code]) as any;

  if (!user) {
    return res.status(400).json({ error: "Code de récupération invalide." });
  }

  if (new Date(user.otp_expiration) < new Date()) {
    return res.status(400).json({ error: "Code de récupération expiré." });
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  await db.run("UPDATE users SET password_hash = ?, otp_code = NULL, otp_expiration = NULL WHERE id = ?", [password_hash, user.id]);
  
  res.json({ message: "Mot de passe réinitialisé avec succès." });
});

app.post("/api/auth/login", async (req, res) => {
  const { whatsapp, password } = req.body;
  const user = await db.get("SELECT * FROM users WHERE whatsapp = ?", [whatsapp]) as any;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  if (!user.is_verified) {
    return res.status(403).json({ error: "Veuillez vérifier votre compte avant de vous connecter." });
  }

  const token = jwt.sign({ id: user.id, nom: user.nom, whatsapp: user.whatsapp, is_admin: user.is_admin, quartier: user.quartier }, JWT_SECRET);
  res.json({ token, user: { id: user.id, nom: user.nom, whatsapp: user.whatsapp, is_admin: user.is_admin, quartier: user.quartier } });
});

app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await db.get("SELECT id, nom, whatsapp, quartier, is_admin, email FROM users WHERE id = ?", [req.user.id]) as any;
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Products
// (Moved to top)

// Orders
app.post("/api/orders", authenticateToken, async (req: any, res) => {
  const { items, total_amount, delivery_fee, payment_method, user_lat, user_lng } = req.body;
  
  const total = Number(total_amount);
  const fee = Number(delivery_fee || 0);
  const lat = user_lat ? Number(user_lat) : null;
  const lng = user_lng ? Number(user_lng) : null;

  try {
    const orderId = await db.transaction(async () => {
      const orderResult = await db.run("INSERT INTO orders (user_id, total_amount, delivery_fee, user_lat, user_lng) VALUES (?, ?, ?, ?, ?)", 
        [req.user.id, total, fee, lat, lng]);
      const orderId = orderResult.lastInsertRowid;

      for (const item of items) {
        await db.run("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", 
          [orderId, Number(item.id), Number(item.quantity), Number(item.price)]);
      }

      await db.run("INSERT INTO payments (order_id, amount, method, status) VALUES (?, ?, ?, ?)", 
        [orderId, total, payment_method, 'Confirmé']);

      return orderId;
    });
    
    // Get user details for notification
    const user = await db.get("SELECT nom, whatsapp, quartier, email FROM users WHERE id = ?", [req.user.id]) as any;
    
    // Notify Admin
    let adminMessage = `Nouvelle commande #${orderId} de ${user.nom} (${user.whatsapp}).\nQuartier: ${user.quartier || 'Non précisé'}\nTotal: ${total} FCFA (Livraison: ${fee} FCFA).\nMéthode: ${payment_method}.`;
    if (lat && lng) {
      adminMessage += `\nCoordonnées client: ${lat}, ${lng}\nItinéraire: https://www.google.com/maps/dir/?api=1&origin=6.1319,1.2228&destination=${lat},${lng}&travelmode=driving`;
    }
    adminMessage += `\n\nConnectez-vous au tableau de bord pour plus de détails.`;
    
    notifyAdmin(`Nouvelle Commande #${orderId}`, adminMessage, 'order');
    notifyWhatsApp(adminMessage);
    
    // Notify Customer
    if (user.email) {
      const locationLink = user_lat && user_lng 
        ? `https://www.google.com/maps?q=${user_lat},${user_lng}` 
        : 'Non précisée';
      sendOrderConfirmation(user.email, Number(orderId), total_amount, items, user.quartier, locationLink);
    }
    
    // Persistent notification for admins
    const admins = await db.all("SELECT id FROM users WHERE is_admin = 1") as any[];
    for (const admin of admins) {
      await db.run("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)", 
        [admin.id, `Nouvelle commande #${orderId} de ${user.nom}`, 'order']);
    }

    // Real-time broadcast
    broadcast({ 
      type: 'NEW_ORDER', 
      orderId, 
      user: user.nom, 
      whatsapp: user.whatsapp,
      quartier: user.quartier,
      total: total_amount,
      delivery_fee: delivery_fee
    });
    
    res.json({ message: "Commande passée avec succès.", orderId });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la commande." });
  }
});

// Reservations
app.post("/api/reservations", authenticateToken, async (req: any, res) => {
  const { product_name, quantity, date, time, location, comment } = req.body;
  try {
    await db.run("INSERT INTO reservations (user_id, product_name, quantity, date, time, location, comment) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [req.user.id, product_name, quantity, date, time, location, comment]);
    
    // Notify Admin
    const adminMessage = `Nouvelle réservation de ${req.user.nom} (${req.user.whatsapp}).\nProduit: ${product_name}\nQuantité: ${quantity}\nDate: ${date} à ${time}\nLieu: ${location}\nCommentaire: ${comment || 'Aucun'}`;
    notifyAdmin(`Nouvelle Réservation`, adminMessage);

    // Persistent notification for admins
    const admins = await db.all("SELECT id FROM users WHERE is_admin = 1") as any[];
    for (const admin of admins) {
      await db.run("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)", 
        [admin.id, `Nouvelle réservation de ${req.user.nom} pour ${product_name}`, 'reservation']);
    }

    // Real-time broadcast
    broadcast({ type: 'NEW_RESERVATION', user: req.user.nom, product: product_name });

    res.json({ message: "Réservation enregistrée." });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la réservation." });
  }
});

// Suggestions
app.post("/api/suggestions", async (req, res) => {
  const { name, whatsapp, message, rating } = req.body;
  try {
    await db.run("INSERT INTO suggestions (name, whatsapp, message, rating) VALUES (?, ?, ?, ?)", 
      [name, whatsapp, message, rating]);
    
    // Notify Admin
    const adminMessage = `Nouvelle suggestion de ${name} (${whatsapp}).\nNote: ${rating}/5\nMessage: ${message}`;
    notifyAdmin(`Nouvelle Suggestion/Avis`, adminMessage);

    // Real-time broadcast
    broadcast({ type: 'NEW_SUGGESTION', user: name });

    res.json({ message: "Merci pour votre suggestion !" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'envoi." });
  }
});

// Investment
app.post("/api/investments", async (req, res) => {
  const { name, whatsapp, email, amount, shares, motivation } = req.body;
  try {
    await db.run("INSERT INTO investment_requests (name, whatsapp, email, amount, shares, motivation) VALUES (?, ?, ?, ?, ?, ?)", 
      [name, whatsapp, email, amount, shares, motivation]);
    
    // Notify Admin
    const adminMessage = `Nouvelle demande d'investissement de ${name} (${whatsapp}).\nMontant: ${amount} FCFA\nActions: ${shares}\nEmail: ${email}\nMotivation: ${motivation}`;
    notifyAdmin(`Nouvelle Demande d'Investissement`, adminMessage);

    // Notify Customer
    if (email) {
      sendInvestmentConfirmation(email, name, amount, shares, motivation);
    }

    // Real-time broadcast
    broadcast({ type: 'NEW_INVESTMENT', user: name, amount });

    res.json({ message: "Votre demande d'investissement a été reçue et est en cours d'étude." });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'envoi de la demande." });
  }
});

// Admin Routes
app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  const users = await db.get("SELECT COUNT(*) as count FROM users") as any;
  const orders = await db.get("SELECT COUNT(*) as count FROM orders") as any;
  const revenue = await db.get("SELECT SUM(total_amount) as total FROM orders") as any;
  res.json({ users: users.count, orders: orders.count, revenue: revenue.total || 0 });
});

app.get("/api/admin/orders", authenticateToken, isAdmin, async (req, res) => {
  const orders = await db.all(`
    SELECT o.*, u.nom as user_name, u.whatsapp as user_whatsapp, u.quartier as user_quartier, p.method as payment_method
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    LEFT JOIN payments p ON o.id = p.order_id
    ORDER BY o.created_at DESC
  `);
  res.json(orders);
});

app.get("/api/admin/reservations", authenticateToken, isAdmin, async (req, res) => {
  const reservations = await db.all(`
    SELECT r.*, u.nom as user_name, u.whatsapp as user_whatsapp 
    FROM reservations r 
    JOIN users u ON r.user_id = u.id 
    ORDER BY r.created_at DESC
  `);
  res.json(reservations);
});

app.get("/api/admin/suggestions", authenticateToken, isAdmin, async (req, res) => {
  const suggestions = await db.all("SELECT * FROM suggestions ORDER BY created_at DESC");
  res.json(suggestions);
});

app.get("/api/admin/investments", authenticateToken, isAdmin, async (req, res) => {
  const investments = await db.all("SELECT * FROM investment_requests ORDER BY created_at DESC");
  res.json(investments);
});

app.patch("/api/admin/orders/:id", authenticateToken, isAdmin, async (req, res) => {
  const { status } = req.body;
  await db.run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
  res.json({ message: "Statut mis à jour." });
});

app.patch("/api/admin/reservations/:id", authenticateToken, isAdmin, async (req, res) => {
  const { status } = req.body;
  await db.run("UPDATE reservations SET status = ? WHERE id = ?", [status, req.params.id]);
  res.json({ message: "Statut mis à jour." });
});

app.patch("/api/admin/investments/:id", authenticateToken, isAdmin, async (req, res) => {
  const { status } = req.body;
  await db.run("UPDATE investment_requests SET status = ? WHERE id = ?", [status, req.params.id]);
  res.json({ message: "Statut mis à jour." });
});

app.patch("/api/admin/products/:id", authenticateToken, isAdmin, async (req, res) => {
  const { name, price, description, image_url } = req.body;
  await db.run("UPDATE products SET name = ?, price = ?, description = ?, image_url = ? WHERE id = ?", 
    [name, price, description, image_url, req.params.id]);
  res.json({ message: "Produit mis à jour." });
});

app.post("/api/admin/products", authenticateToken, isAdmin, async (req, res) => {
  const { name, price, description, image_url } = req.body;
  await db.run("INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)", 
    [name, price, description, image_url]);
  res.json({ message: "Produit ajouté." });
});

app.delete("/api/admin/products/:id", authenticateToken, isAdmin, async (req, res) => {
  await db.run("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.json({ message: "Produit supprimé." });
});

app.post("/api/admin/notify", authenticateToken, isAdmin, async (req, res) => {
  const { user_id, message, type } = req.body;
  try {
    const result = await db.run("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)", 
      [user_id, message, type || 'info']);
    
    // Broadcast to the specific user if they are connected
    broadcast({ 
      type: 'USER_NOTIFICATION', 
      user_id, 
      message, 
      notification_id: result.lastInsertRowid 
    });

    res.json({ message: "Notification envoyée." });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'envoi de la notification." });
  }
});

app.get("/api/notifications", authenticateToken, async (req: any, res) => {
  const notifications = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", 
    [req.user.id]);
  res.json(notifications);
});

app.post("/api/notifications/read", authenticateToken, async (req: any, res) => {
  await db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
  res.json({ message: "Notifications marquées comme lues." });
});

// 4. API 404 Handler (Catch-all for unmatched /api routes)
app.all("/api/*", (req, res) => {
  console.log(`[404] API Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: "Route API non trouvée", 
    method: req.method,
    path: req.originalUrl,
    tip: "Vérifiez que l'URL est correcte et que la route est définie dans server.ts"
  });
});

// Initialize database
// dbReady is now declared at the top

// Start Server
async function startServer() {
  console.log(`[Server] Initializing...`);
  
  // 0. Start listening IMMEDIATELY to prevent platform-level HTML fallback pages
  const server = app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 [Server] HTTP server is now listening on http://0.0.0.0:${PORT}`);
  });

  // Setup WebSockets
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    console.log('Admin connected to WebSocket');
  });

  // 1. Initialize Database
  try {
    await initDatabase();
    dbReady = true;
    console.log("[Server] Database ready.");
  } catch (err) {
    console.error("[Server] Database initialization failed:", err);
  }

  // 2. API Routes (Defined BEFORE Vite/Static)
  // Final API Guard to prevent HTML fallback for any /api/* request
  app.use('/api', (req, res, next) => {
    // If we reach this point, it means no specific API route matched
    // and we are about to hit Vite or Static files.
    // We MUST NOT let this happen for /api requests.
    console.log(`[API Guard] No specific route matched for ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "Route API non trouvée (Guard)",
      path: req.originalUrl
    });
  });
  
  // 3. Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Starting Vite...");
    try {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false 
        },
        appType: "spa",
      });
      // Ensure Vite middleware only handles non-API requests
      app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        vite.middlewares(req, res, next);
      });
      console.log("[Server] Vite middleware attached.");
    } catch (err) {
      console.error("[Server] Failed to start Vite:", err);
    }
  } else {
    console.log("[Server] Serving static files...");
    const distPath = path.join(__dirname, "dist");
    
    // Serve static files but EXCLUDE /api
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      express.static(distPath, { etag: false })(req, res, next);
    });

    // SPA Fallback but EXCLUDE /api
    app.get("*", (req, res, next) => {
      const url = req.originalUrl || req.url || "";
      if (url.startsWith('/api') || req.path.startsWith('/api')) {
        console.log(`[CRITICAL] API request reached SPA Fallback: ${req.method} ${url}`);
        return res.status(404).json({ 
          error: "Route API non trouvée (SPA Fallback Blocked)",
          path: url
        });
      }
      res.setHeader('X-Debug-Source', 'SPA-Fallback');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 5. Global Error Handler (to return JSON instead of HTML)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Server Error]", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ 
      error: "Erreur interne du serveur", 
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
}

startServer().catch(err => {
  console.error("[Server] Critical failure during startup:", err);
  process.exit(1);
});
