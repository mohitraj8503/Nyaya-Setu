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

router.get("/problems", (req, res) => {
  const db = getDb();
  const query = String(req.query.q || req.query.query || "").trim();

  let rows;
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

  res.json({ ok: true, count: rows.length, data: rows.map(mapProblem) });
});

router.get("/routes/:id", (req, res) => {
  const db = getDb();
  const route = db.prepare("SELECT * FROM routes WHERE id = ?").get(req.params.id);

  if (!route) {
    res.status(404).json({ ok: false, error: "Route not found" });
    return;
  }

  const questions = db
    .prepare("SELECT * FROM questions WHERE route_id = ? ORDER BY sort_order ASC")
    .all(req.params.id);

  const relatedProblems = db
    .prepare("SELECT * FROM problems WHERE route_id = ?")
    .all(req.params.id)
    .map(mapProblem);

  res.json({
    ok: true,
    data: {
      ...mapRoute(route, questions),
      problems: relatedProblems,
    },
  });
});

const generateDraft = (req, res) => {
  const body = req.body || {};
  const answers = body.answers && typeof body.answers === "object" ? body.answers : body;
  const routeId = body.routeId || answers.routeId;
  const db = getDb();

  let template =
    "Subject: Citizen grievance — {{issueType}}\n\nTo,\nThe Concerned Authority\n\nRespected Sir/Madam,\n\nI am {{complainantName}} of {{location}}.\n\nIssue: {{issueType}}\nDetails: {{description}}\n\nRelief sought: {{reliefSought}}\n\nI will file this myself on the official government portal. NyayaSetu does not submit complaints on my behalf.\n\nThank you.\n{{complainantName}}";

  if (routeId) {
    const route = db.prepare("SELECT draft_template FROM routes WHERE id = ?").get(routeId);
    if (route && route.draft_template) {
      template = route.draft_template;
    }
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

router.get("/tracker", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
             status, notes, portal_url AS portalUrl, created_at AS createdAt
      FROM tracker_items
      ORDER BY datetime(created_at) DESC
    `
    )
    .all();

  res.json({ ok: true, count: rows.length, data: rows });
});

router.post("/tracker", (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();

  if (!title) {
    res.status(400).json({ ok: false, error: "title is required" });
    return;
  }

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

  const item = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
             status, notes, portal_url AS portalUrl, created_at AS createdAt
      FROM tracker_items
      WHERE id = ?
    `
    )
    .get(result.lastInsertRowid);

  res.status(201).json({ ok: true, data: item });
});

module.exports = router;
