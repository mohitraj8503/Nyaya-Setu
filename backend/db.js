/**
 * PostgreSQL (free-tier / Supabase compatible) connection layer.
 *
 * If DATABASE_URL is not set, the backend runs in "degraded mode":
 * health checks still respond and /api/contact returns a graceful 503 so the
 * frontend can preserve the user's message instead of losing it.
 */

const { Pool } = require("pg");

let pool = null;
let ready = false;

async function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[db] DATABASE_URL not set — running in degraded mode.");
    return;
  }
  try {
    pool = new Pool({
      connectionString: url,
      // Supabase requires SSL; allow opt-out for local postgres.
      ssl:
        process.env.DB_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });

    await pool.query("SELECT 1");

    // Ensure the contact table exists (idempotent).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT        NOT NULL,
        email       TEXT        NOT NULL,
        subject     TEXT        NOT NULL,
        message     TEXT        NOT NULL,
        ip_hash     TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    ready = true;
    console.log("[db] PostgreSQL connected and contact_messages ready.");
  } catch (err) {
    ready = false;
    console.error("[db] Connection failed — degraded mode:", err.message);
  }
}

function isDbReady() {
  return ready && !!pool;
}

function getPool() {
  return pool;
}

module.exports = { initDb, isDbReady, getPool };
