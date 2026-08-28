const express = require("express");
const { getDb } = require("../db/setup");

const router = express.Router();

function parseJsonColumn(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapProblem(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    keywords: row.keywords,
    routeId: row.route_id,
  };
}

function mapRoute(row, questions) {
  return {
    id: row.id,
    authorityName: row.authority_name,
    portalName: row.portal_name,
    portalUrl: row.portal_url,
    helpline: row.helpline,
    department: row.department,
    checklist: parseJsonColumn(row.checklist_json, []),
    steps: parseJsonColumn(row.steps_json, []),
    draftTemplate: row.draft_template,
    questions: (questions || []).map((question) => ({
      id: question.id,
      routeId: question.route_id,
      sortOrder: question.sort_order,
      prompt: question.prompt,
      questionKey: question.question_key,
      options: parseJsonColumn(question.options_json, []),
    })),
  };
}

function interpolate(template, values) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = values[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      return "[to be filled]";
    }
    return String(value).trim();
  });
}

function containsSensitiveField(obj) {
  const sensitiveFields = new Set([
    "aadhaar",
    "pan",
    "bankaccount",
    "bank_account",
    "otp",
    "password",
  ]);

  if (!obj || typeof obj !== "object") {
    return false;
  }

  return Object.entries(obj).some(([key, value]) =>
    sensitiveFields.has(key.toLowerCase()) || containsSensitiveField(value)
  );
}

router.get("/problems", (req, res, next) => {
  const query = String(req.query.q || req.query.query || "").trim();

  let rows;
  try {
    const db = getDb();
    if (query) {
      const like = `%${query}%`;
      rows = db
        .prepare(
          `
          SELECT * FROM problems
          WHERE title LIKE @like
             OR category LIKE @like
             OR summary LIKE @like
             OR keywords LIKE @like
             OR id LIKE @like
          ORDER BY title ASC
        `
        )
        .all({ like });
    } else {
      rows = db.prepare("SELECT * FROM problems ORDER BY title ASC").all();
    }
  } catch (err) {
    next(err);
    return;
  }

  res.json({ ok: true, count: rows.length, data: rows.map(mapProblem) });
});

router.get("/resources", (_req, res, next) => {
  let rows;
  try {
    const db = getDb();
    rows = db
      .prepare(
        `
        SELECT id, authority_name AS authorityName, portal_name AS portalName,
               portal_url AS portalUrl, helpline, department
        FROM routes
        ORDER BY authority_name ASC
      `
      )
      .all();
  } catch (err) {
    next(err);
    return;
  }

  res.json({ ok: true, count: rows.length, data: rows });
});

router.get("/routes/:id", (req, res, next) => {
  let route;
  let questions;
  let relatedProblems;
  try {
    const db = getDb();
    route = db.prepare("SELECT * FROM routes WHERE id = ?").get(req.params.id);

    if (!route) {
      res.status(404).json({ ok: false, error: "Route not found" });
      return;
    }

    questions = db
      .prepare("SELECT * FROM questions WHERE route_id = ? ORDER BY sort_order ASC")
      .all(req.params.id);

    relatedProblems = db
      .prepare("SELECT * FROM problems WHERE route_id = ?")
      .all(req.params.id)
      .map(mapProblem);
  } catch (err) {
    next(err);
    return;
  }

  res.json({
    ok: true,
    data: {
      ...mapRoute(route, questions),
      problems: relatedProblems,
    },
  });
});

router.post("/wizard/evaluate", (req, res, next) => {
  const body = req.body || {};
  const problemId = String(body.problemId || "").trim();

  if (!problemId) {
    res.status(400).json({ ok: false, error: "problemId is required" });
    return;
  }

  let problem;
  let route;
  let questions;
  try {
    const db = getDb();
    problem = db.prepare("SELECT * FROM problems WHERE id = ?").get(problemId);
  } catch (err) {
    next(err);
    return;
  }

  if (!problem) {
    res.status(404).json({ ok: false, error: "Problem not found" });
    return;
  }

  // Future multi-route branching based on answers must stay here and only select stored routes; never infer or generate a destination via an LLM.
  try {
    const db = getDb();
    route = db.prepare("SELECT * FROM routes WHERE id = ?").get(problem.route_id);

    if (!route) {
      res.status(404).json({ ok: false, error: "Route not found" });
      return;
    }

    questions = db
      .prepare("SELECT * FROM questions WHERE route_id = ? ORDER BY sort_order ASC")
      .all(problem.route_id);
  } catch (err) {
    next(err);
    return;
  }

  res.json({
    ok: true,
    data: {
      problem: mapProblem(problem),
      route: mapRoute(route, questions),
    },
  });
});

const generateDraft = (req, res, next) => {
  const body = req.body || {};
  if (containsSensitiveField(body)) {
    res.status(400).json({
      ok: false,
      error: "Sensitive identity or financial fields are not accepted",
    });
    return;
  }

  const answers = body.answers && typeof body.answers === "object" ? body.answers : body;
  const routeId = body.routeId || answers.routeId;
  let template =
    "Subject: Citizen grievance — {{issueType}}\n\nTo,\nThe Concerned Authority\n\nRespected Sir/Madam,\n\nI am {{complainantName}} of {{location}}.\n\nIssue: {{issueType}}\nDetails: {{description}}\n\nRelief sought: {{reliefSought}}\n\nI will file this myself on the official government portal. NyayaSetu does not submit complaints on my behalf.\n\nThank you.\n{{complainantName}}";

  try {
    if (routeId) {
      const db = getDb();
      const route = db.prepare("SELECT draft_template FROM routes WHERE id = ?").get(routeId);
      if (route && route.draft_template) {
        template = route.draft_template;
      }
    }
  } catch (err) {
    next(err);
    return;
  }

  const draft = interpolate(template, answers);
  res.json({
    ok: true,
    data: {
      draft,
      disclaimer:
        "NyayaSetu is an independent guidance layer. It does not file this text on any government portal.",
    },
  });
};

router.post("/drafts/generate", generateDraft);
router.post("/drafts", generateDraft);

router.get("/tracker", (_req, res, next) => {
  let rows;
  try {
    const db = getDb();
    rows = db
      .prepare(
        `
        SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
               status, notes, portal_url AS portalUrl, created_at AS createdAt
        FROM tracker_items
        ORDER BY datetime(created_at) DESC
      `
      )
      .all();
  } catch (err) {
    next(err);
    return;
  }

  res.json({ ok: true, count: rows.length, data: rows });
});

router.post("/tracker", (req, res, next) => {
  const body = req.body || {};
  if (containsSensitiveField(body)) {
    res.status(400).json({
      ok: false,
      error: "Sensitive identity or financial fields are not accepted",
    });
    return;
  }

  const title = String(body.title || "").trim();

  if (!title) {
    res.status(400).json({ ok: false, error: "title is required" });
    return;
  }

  let item;
  try {
    const db = getDb();
    const result = db
      .prepare(
        `
        INSERT INTO tracker_items (title, category, reference_id, filing_date, status, notes, portal_url)
        VALUES (@title, @category, @reference_id, @filing_date, @status, @notes, @portal_url)
      `
      )
      .run({
        title,
        category: String(body.category || "").trim(),
        reference_id: String(body.referenceId || body.reference_id || "").trim(),
        filing_date: String(body.filingDate || body.filing_date || "").trim(),
        status: String(body.status || "drafted").trim(),
        notes: String(body.notes || "").trim(),
        portal_url: String(body.portalUrl || body.portal_url || "").trim(),
      });

    item = db
      .prepare(
        `
        SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
               status, notes, portal_url AS portalUrl, created_at AS createdAt
        FROM tracker_items
        WHERE id = ?
      `
      )
      .get(result.lastInsertRowid);
  } catch (err) {
    next(err);
    return;
  }

  res.status(201).json({ ok: true, data: item });
});

router.put("/tracker/:id", (req, res, next) => {
  const body = req.body || {};
  if (containsSensitiveField(body)) {
    res.status(400).json({
      ok: false,
      error: "Sensitive identity or financial fields are not accepted",
    });
    return;
  }

  const fields = {
    title: "title",
    category: "category",
    referenceId: "reference_id",
    filingDate: "filing_date",
    status: "status",
    notes: "notes",
    portalUrl: "portal_url",
  };
  const presentFields = Object.keys(fields).filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field)
  );
  let item;
  try {
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM tracker_items WHERE id = ?")
      .get(req.params.id);

    if (!existing) {
      res.status(404).json({ ok: false, error: "Tracker item not found" });
      return;
    }

    if (presentFields.length > 0) {
      const updates = presentFields.map((field) => `${fields[field]} = @${field}`);
      const values = Object.fromEntries(
        presentFields.map((field) => [field, String(body[field] || "").trim()])
      );

      db.prepare(
        `UPDATE tracker_items SET ${updates.join(", ")} WHERE id = @id`
      ).run({ ...values, id: req.params.id });
    }

    item = db
      .prepare(
        `
        SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
               status, notes, portal_url AS portalUrl, created_at AS createdAt
        FROM tracker_items
        WHERE id = ?
      `
      )
      .get(req.params.id);
  } catch (err) {
    next(err);
    return;
  }

  res.json({ ok: true, data: item });
});

router.delete("/tracker/:id", (req, res, next) => {
  let result;
  try {
    const db = getDb();
    result = db
      .prepare("DELETE FROM tracker_items WHERE id = ?")
      .run(req.params.id);
  } catch (err) {
    next(err);
    return;
  }

  if (result.changes === 0) {
    res.status(404).json({ ok: false, error: "Tracker item not found" });
    return;
  }

  res.json({ ok: true, data: { id: req.params.id } });
});

module.exports = router;
