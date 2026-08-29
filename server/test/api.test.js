const assert = require("node:assert/strict");
const express = require("express");

const { initializeDatabase, getDb } = require("../db/setup");
const apiRouter = require("../routes/api");

initializeDatabase();

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use("/api/v1", apiRouter);

async function requestJSON(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function run() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const port = server.address().port;

  const tests = [
    {
      name: "GET /problems",
      fn: async () => {
        const db = getDb();
        const expectedCount = db.prepare("SELECT COUNT(*) AS count FROM problems").get().count;
        const expectedProblem = db.prepare("SELECT * FROM problems ORDER BY title ASC LIMIT 1").get();

        const result = await requestJSON(port, "/api/v1/problems");
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.count, expectedCount);
        assert.ok(result.body.data.some((problem) => problem.id === expectedProblem.id));
      },
    },
    {
      name: "GET /routes/:id",
      fn: async () => {
        const db = getDb();
        const route = db.prepare("SELECT * FROM routes ORDER BY id ASC LIMIT 1").get();
        const questionCount = db
          .prepare("SELECT COUNT(*) AS count FROM questions WHERE route_id = ?")
          .get(route.id).count;
        const problemCount = db
          .prepare("SELECT COUNT(*) AS count FROM problems WHERE route_id = ?")
          .get(route.id).count;

        const result = await requestJSON(port, `/api/v1/routes/${route.id}`);
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.data.id, route.id);
        assert.equal(result.body.data.questions.length, questionCount);
        assert.equal(result.body.data.problems.length, problemCount);
      },
    },
    {
      name: "POST /drafts",
      fn: async () => {
        const db = getDb();
        const route = db
          .prepare("SELECT * FROM routes WHERE draft_template != '' ORDER BY id ASC LIMIT 1")
          .get();

        const payload = {
          routeId: route.id,
          answers: {
            complainantName: "Asha Verma",
            location: "Bengaluru",
            issueType: "Water supply disruption",
            description: "The pipeline is broken and supply is unavailable for three days.",
            reliefSought: "Immediate repair and restoration of supply",
          },
        };

        const result = await requestJSON(port, "/api/v1/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.match(result.body.data.draft, /Asha Verma/);
        assert.match(result.body.data.draft, /Water supply disruption/);
      },
    },
    {
      name: "GET /tracker",
      fn: async () => {
        const db = getDb();
        const title = `Tracker GET ${Date.now()}`;
        db.prepare(
          `INSERT INTO tracker_items (title, category, reference_id, filing_date, status, notes, portal_url)
           VALUES (@title, @category, @reference_id, @filing_date, @status, @notes, @portal_url)`
        ).run({
          title,
          category: "Utilities",
          reference_id: "REF-GET-001",
          filing_date: "2026-08-29",
          status: "drafted",
          notes: "Inserted for GET verification",
          portal_url: "https://example.com/track-get",
        });

        const result = await requestJSON(port, "/api/v1/tracker");
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(result.body.data.some((item) => item.title === title && item.referenceId === "REF-GET-001"));
      },
    },
    {
      name: "POST /tracker",
      fn: async () => {
        const db = getDb();
        const payload = {
          title: `Tracker POST ${Date.now()}`,
          category: "Education",
          referenceId: "REF-POST-001",
          filingDate: "2026-08-29",
          status: "in-progress",
          notes: "Inserted during API test",
          portalUrl: "https://example.com/track-post",
        };

        const result = await requestJSON(port, "/api/v1/tracker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        assert.equal(result.status, 201);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.data.title, payload.title);

        const saved = db
          .prepare(
            `SELECT id, title, category, reference_id AS referenceId, status, portal_url AS portalUrl
             FROM tracker_items WHERE title = ? ORDER BY id DESC LIMIT 1`
          )
          .get(payload.title);

        assert.ok(saved);
        assert.equal(saved.id, result.body.data.id);
        assert.equal(saved.referenceId, payload.referenceId);
      },
    },
  ];

  let failures = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${name}`);
      console.error(error.stack || String(error));
    }
  }

  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );

  if (failures > 0) {
    process.exitCode = 1;
  }
}

run();
