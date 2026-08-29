const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { initializeDatabase } = require("./db/setup");
const apiRouter = require("./routes/api");

initializeDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ROOT = path.join(__dirname, "..");
const startTime = Date.now();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

const handleHealth = (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    ok: true,
    success: true,
    service: "nyayasetu-api",
    engine: "SQLite3",
    db: "connected",
    dbName: "nyayasetu.db",
    uptimeSeconds,
    uptimeFormatted: `${uptimeSeconds}s`,
    time: new Date().toISOString(),
  });
};

app.get("/api/v1/health", handleHealth);
app.get("/api/health", handleHealth);

// Mount API router on both /api/v1 and /api for seamless backwards compatibility
app.use("/api/v1", apiRouter);
app.use("/api", apiRouter);

// Serve static frontend files
app.use(express.static(ROOT));

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, success: false, error: "API route not found" });
});

app.listen(PORT, () => {
  console.log(`NyayaSetu running at http://localhost:${PORT}`);
});

