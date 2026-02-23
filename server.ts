import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("milyoner.db");
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    wallet_balance REAL DEFAULT 1000,
    bank_balance REAL DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    options TEXT, -- JSON array
    correct_answer TEXT,
    difficulty INTEGER, -- 1 to 15
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_type TEXT,
    item_id TEXT,
    name TEXT,
    price REAL,
    passive_income REAL,
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'fixed', 'flex', 'risky'
    balance REAL DEFAULT 0,
    last_interest_calc DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    score INTEGER,
    earnings REAL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed some initial questions if empty
const questionCount = db.prepare("SELECT COUNT(*) as count FROM questions").get() as { count: number };
if (questionCount.count === 0) {
  const seedQuestions = [
    { text: "Türkiye'nin başkenti neresidir?", options: JSON.stringify(["İstanbul", "Ankara", "İzmir", "Bursa"]), correct_answer: "Ankara", difficulty: 1, category: "Coğrafya" },
    { text: "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?", options: JSON.stringify(["Venüs", "Mars", "Jüpiter", "Satürn"]), correct_answer: "Mars", difficulty: 2, category: "Bilim" },
    { text: "İstiklal Marşı'nın şairi kimdir?", options: JSON.stringify(["Ziya Gökalp", "Mehmet Akif Ersoy", "Namık Kemal", "Tevfik Fikret"]), correct_answer: "Mehmet Akif Ersoy", difficulty: 3, category: "Edebiyat" },
  ];
  const insert = db.prepare("INSERT INTO questions (text, options, correct_answer, difficulty, category) VALUES (?, ?, ?, ?, ?)");
  seedQuestions.forEach(q => insert.run(q.text, q.options, q.correct_answer, q.difficulty, q.category));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = db.prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)").run(username, email, hash);
      const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, username, email } });
    } catch (e) {
      res.status(400).json({ error: "Username or email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  });

  // User Profile & Passive Income
  app.get("/api/user/profile", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, username, email, wallet_balance, bank_balance, xp, level FROM users WHERE id = ?").get(req.user.id) as any;
    const inventory = db.prepare("SELECT * FROM inventory WHERE user_id = ?").all(req.user.id);
    const history = db.prepare("SELECT * FROM game_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 10").all(req.user.id);
    
    // Calculate pending passive income
    let totalPassive = 0;
    inventory.forEach((item: any) => {
      totalPassive += item.passive_income || 0;
    });
    
    res.json({ ...user, inventory, history, totalPassive });
  });

  app.post("/api/user/collect-income", authenticateToken, (req: any, res) => {
    const inventory = db.prepare("SELECT passive_income FROM inventory WHERE user_id = ?").all(req.user.id);
    let total = 0;
    inventory.forEach((item: any) => total += (item.passive_income || 0));
    
    if (total > 0) {
      db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(total, req.user.id);
    }
    res.json({ collected: total });
  });

  // Quiz Routes
  app.get("/api/quiz/questions", authenticateToken, (req, res) => {
    // Get 15 questions, one for each difficulty level
    const questions = [];
    for (let i = 1; i <= 15; i++) {
      const q = db.prepare("SELECT * FROM questions WHERE difficulty = ? ORDER BY RANDOM() LIMIT 1").get(i);
      if (q) {
        (q as any).options = JSON.parse((q as any).options);
        questions.push(q);
      }
    }
    res.json(questions);
  });

  app.post("/api/quiz/complete", authenticateToken, (req: any, res) => {
    const { score, earnings, xpGained } = req.body;
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, xp = xp + ? WHERE id = ?").run(earnings, xpGained, req.user.id);
    db.prepare("INSERT INTO game_history (user_id, score, earnings) VALUES (?, ?, ?)").run(req.user.id, score, earnings);
    
    // Level up logic
    const user = db.prepare("SELECT xp, level FROM users WHERE id = ?").get(req.user.id) as any;
    const nextLevelXp = user.level * 1000;
    if (user.xp >= nextLevelXp) {
      db.prepare("UPDATE users SET level = level + 1 WHERE id = ?").run(req.user.id);
    }
    
    res.json({ success: true });
  });

  // Shop Routes
  app.get("/api/shop/items", (req, res) => {
    const items = [
      { id: 'h1', type: 'Ev', name: '1+1 Daire', price: 50000, passive_income: 100 },
      { id: 'h2', type: 'Ev', name: 'Villa', price: 250000, passive_income: 600 },
      { id: 'c1', type: 'Araba', name: 'Ekonomik Araç', price: 20000, passive_income: 0 },
      { id: 'c2', type: 'Araba', name: 'Spor Araba', price: 150000, passive_income: 0 },
      { id: 'i1', type: 'İşletme', name: 'Kafe', price: 100000, passive_income: 500 },
      { id: 'i2', type: 'İşletme', name: 'Restoran', price: 500000, passive_income: 3000 },
    ];
    res.json(items);
  });

  app.post("/api/shop/buy", authenticateToken, (req: any, res) => {
    const { itemId, name, price, passive_income, type } = req.body;
    const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id) as any;
    if (user.wallet_balance < price) return res.status(400).json({ error: "Yetersiz bakiye" });

    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(price, req.user.id);
    db.prepare("INSERT INTO inventory (user_id, item_type, item_id, name, price, passive_income) VALUES (?, ?, ?, ?, ?, ?)").run(req.user.id, type, itemId, name, price, passive_income);
    res.json({ success: true });
  });

  // Bank Routes
  app.post("/api/bank/deposit", authenticateToken, (req: any, res) => {
    const { amount } = req.body;
    const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id) as any;
    if (user.wallet_balance < amount) return res.status(400).json({ error: "Yetersiz bakiye" });

    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ?, bank_balance = bank_balance + ? WHERE id = ?").run(amount, amount, req.user.id);
    res.json({ success: true });
  });

  app.post("/api/bank/withdraw", authenticateToken, (req: any, res) => {
    const { amount } = req.body;
    const user = db.prepare("SELECT bank_balance FROM users WHERE id = ?").get(req.user.id) as any;
    if (user.bank_balance < amount) return res.status(400).json({ error: "Bankada yeterli para yok" });

    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, bank_balance = bank_balance - ? WHERE id = ?").run(amount, amount, req.user.id);
    res.json({ success: true });
  });

  // Leaderboard
  app.get("/api/leaderboard", (req, res) => {
    const topWealthy = db.prepare("SELECT username, (wallet_balance + bank_balance) as total_wealth, level FROM users ORDER BY total_wealth DESC LIMIT 20").all();
    const topLevel = db.prepare("SELECT username, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT 20").all();
    res.json({ topWealthy, topLevel });
  });

  // AI Question Generation (Proxy to Gemini)
  app.post("/api/ai/generate-question", authenticateToken, async (req, res) => {
    const { difficulty, category } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Milyoner yarışması için ${difficulty} zorluk seviyesinde (1-15 arası), ${category || 'genel kültür'} kategorisinde bir soru üret. JSON formatında olsun: { "text": "...", "options": ["A", "B", "C", "D"], "correct_answer": "...", "category": "..." }`,
        config: { responseMimeType: "application/json" }
      });
      const question = JSON.parse(response.text || "{}");
      res.json(question);
    } catch (e) {
      res.status(500).json({ error: "AI error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
