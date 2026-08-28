const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { initializeDatabase } = require("./db/setup");
const apiRouter = require("./routes/api");

initializeDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ROOT = path.join(__dirname, "..");
const allowedOrigins = String(
  process.env.ALLOWED_ORIGINS ||
    "http://localhost:5500,http://127.0.0.1:5500,https://mohitraj8503.github.io"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "256kb" }));

const apiMutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  skip: (req) => !["POST", "PUT", "DELETE"].includes(req.method),
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      error: "Too many requests, please try again later",
    });
  },
});

app.get("/api/v1/health", (_req, res) => {
  res.json({
    ok: true,
    service: "nyayasetu-api",
    time: new Date().toISOString(),
  });
});

app.use("/api/v1", apiMutationLimiter, apiRouter);
app.use(express.static(ROOT));

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, error: "API route not found" });
});

app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack || err);
  }

  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`NyayaSetu running at http://localhost:${PORT}`);
});
