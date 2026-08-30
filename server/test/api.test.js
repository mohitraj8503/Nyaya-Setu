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

async function registerAndLogin(port, overrides = {}) {
  const email = overrides.email || `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = overrides.password || "Password@123";
  const name = overrides.name || "Test User";

  const registerResult = await requestJSON(port, "/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      role: overrides.role || "user",
      adminSecret: overrides.adminSecret || overrides.admin_secret || "",
    }),
  });

  assert.equal(registerResult.status, 201);
  assert.equal(registerResult.body.ok, true);

  const loginResult = await requestJSON(port, "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(loginResult.status, 200);
  assert.equal(loginResult.body.ok, true);
  assert.ok(loginResult.body.data.token);

  return {
    user: loginResult.body.data.user,
    token: loginResult.body.data.token,
    authHeader: { Authorization: `Bearer ${loginResult.body.data.token}` },
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
      name: "GET /problems?lang=hi",
      fn: async () => {
        const result = await requestJSON(port, "/api/v1/problems?lang=hi");
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.language, "hi");
        assert.ok(result.body.data.some((problem) => /जल|सड़क|बिजली|उपभोक्ता/i.test(problem.title || problem.summary || "")));
      },
    },
    {
      name: "POST /admin/problems requires admin role",
      fn: async () => {
        const auth = await registerAndLogin(port, { email: `admin-user-${Date.now()}@example.com` });
        const result = await requestJSON(port, "/api/v1/admin/problems", {
          method: "POST",
          headers: { ...auth.authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `admin-problem-${Date.now()}`,
            slug: `admin-problem-${Date.now()}`,
            title: "Admin Added Problem",
            category: "Admin",
            summary: "Problem added via admin API.",
            keywords: "admin, test",
            routeId: "civic-cpgrams",
          }),
        });

        assert.equal(result.status, 403);
        assert.equal(result.body.ok, false);
        assert.match(String(result.body.error || result.body.message || ""), /admin|authorized/i);
      },
    },
    {
      name: "POST /admin/problems allows admin user",
      fn: async () => {
        const auth = await registerAndLogin(port, {
          email: `admin-${Date.now()}@example.com`,
          role: "admin",
          adminSecret: "nyayasetu-admin",
        });

        const payload = {
          id: `admin-problem-${Date.now()}`,
          slug: `admin-problem-${Date.now()}`,
          title: "Admin Added Problem",
          category: "Admin",
          summary: "Problem added via admin API.",
          keywords: "admin, test",
          routeId: "civic-cpgrams",
        };

        const result = await requestJSON(port, "/api/v1/admin/problems", {
          method: "POST",
          headers: { ...auth.authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        assert.equal(result.status, 201);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.data.title, payload.title);
        assert.equal(result.body.data.category, payload.category);
      },
    },
    {
      name: "GET /problems/:id/similar",
      fn: async () => {
        const result = await requestJSON(port, "/api/v1/problems/electricity-utility/similar");
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(result.body.data.some((problem) => /water supply/i.test(problem.title)));
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
      name: "POST /chat - grievance help is warm and specific",
      fn: async () => {
        const result = await requestJSON(port, "/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "I need help with water supply" }),
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(typeof result.body.response === "string");
        assert.match(result.body.response.toLowerCase(), /sorry|water|supply|grievance|complaint/);
      },
    },
    {
      name: "POST /chat - NyayaSetu knowledge questions are answered from the knowledge file",
      fn: async () => {
        const result = await requestJSON(port, "/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "What is NyayaSetu and what does it do?" }),
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(typeof result.body.response === "string");
        assert.match(result.body.response.toLowerCase(), /nyayasetu|government authority|grievance|official/);
      },
    },
    {
      name: "POST /chat - off-scope questions redirect back to supported help",
      fn: async () => {
        const result = await requestJSON(port, "/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "What is the weather in Delhi today?" }),
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(typeof result.body.response === "string");
        assert.match(result.body.response.toLowerCase(), /nyayasetu|grievance|government complaint|help with/);
      },
    },
    {
      name: "POST /feedback",
      fn: async () => {
        const db = getDb();
        const trackerItem = db
          .prepare("INSERT INTO tracker_items (title, category, reference_id, filing_date, status, notes, portal_url) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(
            `Feedback Tracker ${Date.now()}`,
            "Utilities",
            "REF-FEEDBACK-001",
            "2026-08-29",
            "resolved",
            "Inserted for feedback verification",
            "https://example.com/feedback-test"
          );

        const result = await requestJSON(port, "/api/v1/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackerId: trackerItem.lastInsertRowid,
            rating: 5,
            comment: "Very helpful and easy to follow.",
          }),
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.data.rating, 5);
        assert.equal(result.body.data.trackerId, trackerItem.lastInsertRowid);
        assert.match(result.body.data.comment, /helpful/i);
      },
    },
    {
      name: "GET /tracker",
      fn: async () => {
        const auth = await registerAndLogin(port);
        const db = getDb();
        const title = `Tracker GET ${Date.now()}`;
        db.prepare(
          `INSERT INTO tracker_items (title, category, reference_id, filing_date, status, notes, portal_url, user_id)
           VALUES (@title, @category, @reference_id, @filing_date, @status, @notes, @portal_url, @user_id)`
        ).run({
          title,
          category: "Utilities",
          reference_id: "REF-GET-001",
          filing_date: "2026-08-29",
          status: "drafted",
          notes: "Inserted for GET verification",
          portal_url: "https://example.com/track-get",
          user_id: auth.user.id,
        });

        const result = await requestJSON(port, "/api/v1/tracker", {
          headers: auth.authHeader,
        });
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(result.body.data.some((item) => item.title === title && item.referenceId === "REF-GET-001"));
      },
    },
    {
      name: "GET /tracker/export - CSV and PDF download",
      fn: async () => {
        const auth = await registerAndLogin(port);
        const db = getDb();
        db.prepare(
          `INSERT INTO tracker_items (title, category, reference_id, filing_date, status, notes, portal_url, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          `Export Tracker ${Date.now()}`,
          "Education",
          "REF-EXPORT-001",
          "2026-08-29",
          "resolved",
          "Exported for CSV and PDF verification",
          "https://example.com/export-check",
          auth.user.id
        );

        const csvResponse = await fetch(`http://127.0.0.1:${port}/api/v1/tracker/export?format=csv`, { headers: auth.authHeader });
        const csvText = await csvResponse.text();
        assert.equal(csvResponse.status, 200);
        assert.equal(csvResponse.headers.get("content-type").includes("text/csv"), true);
        assert.match(csvText, /title.*category.*reference_id/i);

        const pdfResponse = await fetch(`http://127.0.0.1:${port}/api/v1/tracker/export?format=pdf`, { headers: auth.authHeader });
        const pdfText = Buffer.from(await pdfResponse.arrayBuffer()).toString("binary");
        assert.equal(pdfResponse.status, 200);
        assert.equal(pdfResponse.headers.get("content-type").includes("application/pdf"), true);
        assert.match(pdfText.slice(0, 8), /%PDF/);
      },
    },
    {
      name: "POST /tracker",
      fn: async () => {
        const auth = await registerAndLogin(port);
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
          headers: { ...auth.authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        assert.equal(result.status, 201);
        assert.equal(result.body.ok, true);
        assert.equal(result.body.data.title, payload.title);

        const saved = db
          .prepare(
            `SELECT id, title, category, reference_id AS referenceId, status, portal_url AS portalUrl, user_id
             FROM tracker_items WHERE title = ? ORDER BY id DESC LIMIT 1`
          )
          .get(payload.title);

        assert.ok(saved);
        assert.equal(saved.id, result.body.data.id);
        assert.equal(saved.referenceId, payload.referenceId);
        assert.equal(saved.user_id, auth.user.id);
      },
    },
    {
      name: "GET /analytics/stats",
      fn: async () => {
        const auth = await registerAndLogin(port);
        const db = getDb();
        db.prepare(
          `INSERT INTO tracker_items (user_id, title, category, reference_id, filing_date, status, notes, portal_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          auth.user.id,
          `Analytics Case ${Date.now()}`,
          "Utilities",
          "REF-ANALYTICS-001",
          "2026-08-29",
          "resolved",
          "Inserted for analytics verification",
          "https://example.com/analytics"
        );

        const result = await requestJSON(port, "/api/v1/analytics/stats", {
          headers: auth.authHeader,
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.ok(Array.isArray(result.body.data.categoryBreakdown));
        assert.ok(Number.isFinite(result.body.data.averageResolutionSeconds));
        assert.ok(Number.isFinite(result.body.data.averageResolutionHours));
        assert.ok(Number.isFinite(result.body.data.averageResolutionDays));
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
