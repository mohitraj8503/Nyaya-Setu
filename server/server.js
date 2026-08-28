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
    time: new Date().toISOString(),
  });
});

app.use("/api/v1", apiRouter);
app.use(express.static(ROOT));

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, error: "API route not found" });
});

app.listen(PORT, () => {
  console.log(`NyayaSetu running at http://localhost:${PORT}`);
});
