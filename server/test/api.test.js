const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const express = require("express");

const { initializeDatabase, getDb } = require("../db/setup");
const apiRouter = require("../routes/api");

let server;
let port;

before(async () => {
  initializeDatabase();

  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.use("/api/v1", apiRouter);

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  port = server.address().port;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("GET /problems returns seeded problem rows from SQLite", async () => {
  const db = getDb();
  const expectedCount = db.prepare("SELECT COUNT(*) AS count FROM problems").get().count;
  const expectedProblem = db.prepare("SELECT * FROM problems ORDER BY title ASC LIMIT 1").get();

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/problems`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.count, expectedCount);
  assert.ok(
    body.data.some(
      (problem) => problem.id === expectedProblem.id && problem.title === expectedProblem.title
    )
  );
});

test("GET /routes/:id returns the stored route and related questions", async () => {
  const db = getDb();
  const route = db.prepare("SELECT * FROM routes ORDER BY id LIMIT 1").get();
  const questionCount = db
    .prepare("SELECT COUNT(*) AS count FROM questions WHERE route_id = ?")
    .get(route.id).count;
  const problemCount = db.prepare("SELECT COUNT(*) AS count FROM problems WHERE route_id = ?").get(route.id).count;

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/routes/${route.id}`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.id, route.id);
  assert.equal(body.data.questions.length, questionCount);
  assert.equal(body.data.problems.length, problemCount);
});

test("POST /drafts generates a draft using the route template from SQLite", async () => {
  const db = getDb();
  const route = db.prepare("SELECT * FROM routes WHERE draft_template != '' ORDER BY id LIMIT 1").get();
  const payload = {
    routeId: route.id,
    answers: {
      complainantName: "Asha Verma",
      location: "Delhi",
      issueType: "Water Supply",
      description: "The pipeline near my home is leaking.",
      reliefSought: "Immediate repair and water connection check",
    },
  };

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.match(body.data.draft, /Asha Verma/);
  assert.match(body.data.draft, /Water Supply/);

  const routeTemplate = db
    .prepare("SELECT draft_template FROM routes WHERE id = ?")
    .get(route.id).draft_template;
  assert.ok(routeTemplate.includes("{{issueType}}") || routeTemplate.includes("{{complainantName}}"));
});

test("GET /tracker returns the tracker rows stored in SQLite", async () => {
  const db = getDb();
  const title = `Tracker check ${Date.now()}`;
  db.prepare(
    `
      INSERT INTO tracker_items (title, category, reference_id, filing_date, status, notes, portal_url)
      VALUES (@title, @category, @reference_id, @filing_date, @status, @notes, @portal_url)
    `
  ).run({
    title,
    category: "Service",
    reference_id: "REF-TRACKER-GET",
    filing_date: "2026-08-29",
    status: "drafted",
    notes: "Persistent row for GET check",
    portal_url: "https://example.com/track-get",
  });

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/tracker`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(
    body.data.some(
      (item) => item.title === title && item.referenceId === "REF-TRACKER-GET"
    )
  );
});

test("POST /tracker inserts a new tracker item and persists it in SQLite", async () => {
  const db = getDb();
  const payload = {
    title: `Tracker insert ${Date.now()}`,
    category: "Education",
    referenceId: "REF-TRACKER-POST",
    filingDate: "2026-08-29",
    status: "in-progress",
    notes: "Created by API test",
    portalUrl: "https://example.com/track-post",
  };

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/tracker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.title, payload.title);
  assert.equal(body.data.category, payload.category);
  assert.equal(body.data.referenceId, payload.referenceId);

  const saved = db
    .prepare(
      `
        SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
               status, notes, portal_url AS portalUrl
        FROM tracker_items
        WHERE title = ?
      `
    )
    .get(payload.title);

  assert.ok(saved);
  assert.equal(saved.referenceId, payload.referenceId);
  assert.equal(saved.status, payload.status);
  assert.equal(body.data.id, saved.id);
});
