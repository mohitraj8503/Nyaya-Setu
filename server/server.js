const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { initializeDatabase } = require("./db/setup");
const apiRouter = require("./routes/api");

initializeDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ROOT = path.join(__dirname, "..");
const API_VERSION = "v1";

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many requests from this IP. Please try again later.",
  },
  skipSuccessfulRequests: false,
});

app.use(apiLimiter);
app.use(express.json({ limit: "256kb" }));

app.get("/api/v1/health", (_req, res) => {
  res.json({
    ok: true,
    service: "nyayasetu-api",
    apiVersion: API_VERSION,
    database: "sqlite",
    environment: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "nyayasetu-api",
    apiVersion: API_VERSION,
    database: "sqlite",
    environment: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

app.use("/api/v1", apiRouter);
app.use("/api", apiRouter);
app.use(express.static(ROOT));

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, error: "API route not found" });
});

app.listen(PORT, () => {
  console.log(`NyayaSetu running at http://localhost:${PORT}`);
});
