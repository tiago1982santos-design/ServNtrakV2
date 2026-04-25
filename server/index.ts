import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedProductionData } from "./seed-production";
import { startVisitChecker } from "./visitChecker";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  // Logging middleware: only emits request metadata. We deliberately do NOT
  // capture or stringify the response body to avoid leaking customer data,
  // OCR results, presigned upload URLs and other sensitive payloads into
  // application logs (Task #29).
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    const duration = Date.now() - start;
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_note_edits (
      id SERIAL PRIMARY KEY,
      expense_note_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      edited_at TIMESTAMP DEFAULT NOW(),
      field_changed TEXT NOT NULL,
      reason TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      quote_number TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      valid_until TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quote_items (
      id SERIAL PRIMARY KEY,
      quote_id INTEGER NOT NULL REFERENCES quotes(id),
      description TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'service',
      quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
      unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      total DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS invoice_number TEXT
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_send_events (
      id SERIAL PRIMARY KEY,
      at TIMESTAMP NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL,
      kind TEXT,
      status_code INTEGER,
      endpoint_preview TEXT NOT NULL,
      message TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS push_send_events_at_idx
    ON push_send_events (at)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS push_send_events_status_at_idx
    ON push_send_events (status, at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS push_send_events_status_kind_at_idx
    ON push_send_events (status, kind, at DESC)
  `);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
    // Seed production data on startup (only adds if not exists)
    seedProductionData().catch(err => {
      console.error("Failed to seed production data:", err);
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    startVisitChecker();
  });
})();
