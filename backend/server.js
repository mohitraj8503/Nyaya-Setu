/**
 * NyayaSetu Backend — optional enhancement layer.
 *
 * PRODUCT BOUNDARY: provides ONLY non-sensitive support (Contact/Help + health).
 * It never stores complaints/tracker data, never handles Aadhaar/PAN/bank/OTP/
 * password/government credentials, never submits to a government portal, and is
 * never the source of truth for routing (curated + deterministic in the frontend).
 * The static frontend works fully without this backend.
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { initDb, isDbReady } = require("./db");
const contactRoutes = require("./routes/contactRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

app.use(helmet());

/* ---------- CORS: development is permissive; PRODUCTION fails closed ---------- */
const allowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const LOCAL_OK = [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // curl / server-to-server
      if (allowed.indexOf(origin) !== -1) return callback(null, true);
      if (!IS_PROD && LOCAL_OK.some((re) => re.test(origin))) return callback(null, true);
      // In production with no allow-list, fail CLOSED.
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true, service: "nyayasetu-backend", status: "ok",
    database: isDbReady() ? "connected" : "unavailable (degraded mode)",
    version: "2.1.0", time: new Date().toISOString(),
  });
});

app.use("/api/contact", contactRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "NyayaSetu optional backend (contact + health).",
    endpoints: { health: "/api/health", contact: "POST /api/contact" } });
});

app.use((req, res) => res.status(404).json({ success: false, message: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isCors = err && err.message === "Not allowed by CORS";
  res.status(isCors ? 403 : 500).json({
    success: false, message: isCors ? "Origin not allowed" : "Internal server error",
  });
});

(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`NyayaSetu backend on http://localhost:${PORT} (env:${NODE_ENV}, db:${isDbReady() ? "connected" : "degraded"})`);
  });
})();

module.exports = app;
