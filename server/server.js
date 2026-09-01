const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const envFiles = [
  ".env",
  `.env.${process.env.NODE_ENV || "development"}`,
  ".env.local",
];

for (const file of envFiles) {
  const filePath = path.join(__dirname, file);
  if (filePath && filePath !== path.join(__dirname, ".env")) {
    dotenv.config({ path: filePath, override: false });
  }
}

dotenv.config({ path: path.join(__dirname, ".env"), override: false });

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
