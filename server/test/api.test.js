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

test("GET /problems supports category and search filters using LIKE queries", async () => {
  const response = await fetch(
    `http://127.0.0.1:${port}/api/v1/problems?category=electricity&search=refund`
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.data));

  if (body.data.length > 0) {
    assert.ok(body.data.every((problem) => problem.category.toLowerCase().includes("electric")));
    assert.ok(
      body.data.every((problem) =>
        `${problem.title} ${problem.summary} ${problem.keywords}`
          .toLowerCase()
          .includes("refund")
      )
    );
  }
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

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/tracker?page=1&limit=10`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.page, 1);
  assert.equal(body.limit, 10);
  assert.ok(Array.isArray(body.data));
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
  assert.ok(body.data.trackingCode);

  const saved = db
    .prepare(
      `
        SELECT id, title, category, reference_id AS referenceId, tracking_code AS trackingCode,
               filing_date AS filingDate, status, notes, portal_url AS portalUrl
        FROM tracker_items
        WHERE title = ?
      `
    )
    .get(payload.title);

  assert.ok(saved);
  assert.equal(saved.referenceId, payload.referenceId);
  assert.equal(saved.status, payload.status);
  assert.equal(body.data.id, saved.id);
  assert.ok(saved.trackingCode);
});

test("GET /tracker/:id returns timeline and nextAction for a saved grievance", async () => {
  const db = getDb();
  const title = `Timeline check ${Date.now()}`;
  const insert = db.prepare(`
    INSERT INTO tracker_items (title, category, reference_id, tracking_code, filing_date, status, notes, portal_url)
    VALUES (@title, @category, @reference_id, @tracking_code, @filing_date, @status, @notes, @portal_url)
  `);
  const result = insert.run({
    title,
    category: "Utilities",
    reference_id: "REF-TIMELINE-1",
    tracking_code: "NS-TRACK-1001",
    filing_date: "2026-08-30",
    status: "filed",
    notes: "Complaint filed and awaiting acknowledgment.",
    portal_url: "https://example.com/track-timeline"
  });

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/tracker/${result.lastInsertRowid}`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.title, title);
  assert.ok(body.data.trackingCode);
  assert.ok(Array.isArray(body.data.timeline));
  assert.ok(body.data.timeline.length >= 1);
  assert.ok(body.data.nextAction);
});

test("PUT /tracker/:id updates tracker status and notes", async () => {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO tracker_items (title, category, reference_id, tracking_code, filing_date, status, notes, portal_url)
    VALUES (@title, @category, @reference_id, @tracking_code, @filing_date, @status, @notes, @portal_url)
  `);
  const result = insert.run({
    title: `Update check ${Date.now()}`,
    category: "Banking",
    reference_id: "REF-UPDATE-1",
    tracking_code: "NS-UPDATE-1",
    filing_date: "2026-08-31",
    status: "drafted",
    notes: "Initial draft",
    portal_url: "https://example.com/update"
  });

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/tracker/${result.lastInsertRowid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "resolved", notes: "Complaint closed after resolution." }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.status, "resolved");
  assert.match(body.data.notes, /resolution/i);
});

test("DELETE /tracker/:id removes an item from the tracker", async () => {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO tracker_items (title, category, reference_id, tracking_code, filing_date, status, notes, portal_url)
    VALUES (@title, @category, @reference_id, @tracking_code, @filing_date, @status, @notes, @portal_url)
  `);
  const result = insert.run({
    title: `Delete check ${Date.now()}`,
    category: "Health",
    reference_id: "REF-DELETE-1",
    tracking_code: "NS-DELETE-1",
    filing_date: "2026-08-31",
    status: "drafted",
    notes: "To be removed",
    portal_url: "https://example.com/delete"
  });

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/tracker/${result.lastInsertRowid}`, {
    method: "DELETE",
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.deletedId, result.lastInsertRowid);

  const deleted = db.prepare("SELECT * FROM tracker_items WHERE id = ?").get(result.lastInsertRowid);
  assert.equal(deleted, undefined);
});
