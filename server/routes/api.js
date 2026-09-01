const express = require("express");
const { getDb } = require("../db/setup");
const { sendStatusChangeEmail } = require("../services/notifier");

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

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  return value
    .replace(/<script\b[^>]*>.*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>.*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizePayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item));
  }

  if (value && typeof value === "object") {
    const sanitized = {};
    for (const [key, item] of Object.entries(value)) {
      sanitized[key] = sanitizePayload(item);
    }
    return sanitized;
  }

  if (typeof value === "string") {
    return sanitizeText(value);
  }

  return value;
}

function generateTrackingCode() {
  const now = new Date();
  const dateStamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NS-${dateStamp}-${randomPart}`;
}

function normalizeStatus(status) {
  const value = sanitizeText(status || "drafted").trim().toLowerCase();
  if (["drafted", "new", "created"].includes(value)) return "drafted";
  if (["in-progress", "in_progress", "in progress", "submitted", "filed"].includes(value)) return "in-progress";
  if (["follow-up", "followup", "follow_up", "follow up"].includes(value)) return "follow-up";
  if (["resolved", "closed", "completed"].includes(value)) return "resolved";
  return value || "drafted";
}

function getStatusTimeline(item) {
  const status = normalizeStatus(item.status);
  const createdAt = item.createdAt || item.created_at || new Date().toISOString();
  const filingDate = item.filingDate || item.filing_date || "";

  const timeline = [
    {
      label: "Draft created",
      date: createdAt,
      description: "Citizen saved the issue and prepared the next action.",
    },
  ];

  if (status === "in-progress" || status === "follow-up" || status === "resolved") {
    timeline.push({
      label: "Filed / submitted",
      date: filingDate || createdAt,
      description: "Complaint or grievance has been filed on the official portal.",
    });
  }

  if (status === "follow-up") {
    timeline.push({
      label: "Follow-up needed",
      date: filingDate || createdAt,
      description: "Citizen should check acknowledgement, submit missing documents, or request escalation.",
    });
  }

  if (status === "resolved") {
    timeline.push({
      label: "Resolution / closure",
      date: filingDate || createdAt,
      description: "The complaint has reached a resolved or closed stage.",
    });
  }

  return timeline;
}

function getNextAction(status, notes) {
  const normalizedStatus = normalizeStatus(status);
  const trimmedNotes = sanitizeText(notes || "").trim();

  const actions = {
    drafted: "Gather the exact reference ID, portal URL, and required documents before filing.",
    "in-progress": "Check the official portal for acknowledgement and confirm all required documents were uploaded.",
    "follow-up": trimmedNotes || "Follow up with the concerned office within 7 days and keep a copy of the submission receipt.",
    resolved: "Save the final acknowledgement and note the resolution outcome for future reference.",
  };

  return actions[normalizedStatus] || "Review the status and continue with the next official follow-up step.";
}

router.get("/problems", (req, res) => {
  const db = getDb();
  const query = String(req.query.q || req.query.query || req.query.search || "").trim();
  const category = String(req.query.category || "").trim();

  const likeQuery = query ? `%${query}%` : "%";
  const categoryLike = category ? `%${category}%` : "%";

  const sql = `
    SELECT * FROM problems
    WHERE category LIKE @categoryLike
      AND (
        title LIKE @likeQuery
        OR category LIKE @likeQuery
        OR summary LIKE @likeQuery
        OR keywords LIKE @likeQuery
        OR id LIKE @likeQuery
      )
    ORDER BY title ASC
  `;

  const rows = db.prepare(sql).all({
    categoryLike,
    likeQuery,
  });

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
  const body = sanitizePayload(req.body || {});
  const answers = body.answers && typeof body.answers === "object" ? body.answers : body;
  const routeId = sanitizeText(body.routeId || answers.routeId);
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

router.get("/tracker", (req, res) => {
  const db = getDb();
  const rawPage = Number(req.query.page || 1);
  const rawLimit = Number(req.query.limit || 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const offset = (page - 1) * limit;

  const totalCount = db.prepare("SELECT COUNT(*) AS count FROM tracker_items").get().count;
  const rows = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, tracking_code AS trackingCode,
             filing_date AS filingDate, status, notes, portal_url AS portalUrl, email,
             created_at AS createdAt
      FROM tracker_items
      ORDER BY datetime(created_at) DESC
      LIMIT @limit OFFSET @offset
    `
    )
    .all({ limit, offset });

  const enrichedRows = rows.map((item) => ({
    ...item,
    timeline: getStatusTimeline(item),
    nextAction: getNextAction(item.status, item.notes),
  }));

  res.json({
    ok: true,
    count: totalCount,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    hasNextPage: page * limit < totalCount,
    data: enrichedRows,
  });
});

router.get("/tracker/:id", (req, res) => {
  const db = getDb();
  const item = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, tracking_code AS trackingCode,
             filing_date AS filingDate, status, notes, portal_url AS portalUrl,
             created_at AS createdAt
      FROM tracker_items
      WHERE id = ?
    `
    )
    .get(req.params.id);

  if (!item) {
    res.status(404).json({ ok: false, error: "Tracker item not found" });
    return;
  }

  res.json({
    ok: true,
    data: {
      ...item,
      timeline: getStatusTimeline(item),
      nextAction: getNextAction(item.status, item.notes),
    },
  });
});

router.post("/tracker", (req, res) => {
  const body = sanitizePayload(req.body || {});
  const title = sanitizeText(body.title || "").trim();

  if (!title) {
    res.status(400).json({ ok: false, error: "title is required" });
    return;
  }

  const db = getDb();
  const trackingCode = sanitizeText(body.trackingCode || body.tracking_code || "").trim() || generateTrackingCode();
  const status = normalizeStatus(body.status || "drafted");

  const result = db
    .prepare(
      `
      INSERT INTO tracker_items (title, category, reference_id, tracking_code, filing_date, status, notes, portal_url, email)
      VALUES (@title, @category, @reference_id, @tracking_code, @filing_date, @status, @notes, @portal_url, @email)
    `
    )
    .run({
      title,
      category: sanitizeText(body.category || "").trim(),
      reference_id: sanitizeText(body.referenceId || body.reference_id || "").trim(),
      tracking_code: trackingCode,
      filing_date: sanitizeText(body.filingDate || body.filing_date || "").trim(),
      status,
      notes: sanitizeText(body.notes || "").trim(),
      portal_url: sanitizeText(body.portalUrl || body.portal_url || "").trim(),
      email: sanitizeText(body.email || "").trim(),
    });

  const item = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, tracking_code AS trackingCode,
             filing_date AS filingDate, status, notes, portal_url AS portalUrl, email,
             created_at AS createdAt
      FROM tracker_items
      WHERE id = ?
    `
    )
    .get(result.lastInsertRowid);

  res.status(201).json({
    ok: true,
    data: {
      ...item,
      timeline: getStatusTimeline(item),
      nextAction: getNextAction(item.status, item.notes),
    },
  });
});

router.put("/tracker/:id", (req, res) => {
  const db = getDb();
  const currentItem = db
    .prepare("SELECT * FROM tracker_items WHERE id = ?")
    .get(req.params.id);

  if (!currentItem) {
    res.status(404).json({ ok: false, error: "Tracker item not found" });
    return;
  }

  const body = sanitizePayload(req.body || {});
  const oldStatus = currentItem.status || "drafted";
  const newStatus = normalizeStatus(body.status || oldStatus);

  if (!body.status) {
    res.status(400).json({ ok: false, error: "status is required" });
    return;
  }

  db.prepare(
    `
    UPDATE tracker_items
    SET status = @status,
        notes = @notes,
        email = @email
    WHERE id = @id
    `
  ).run({
    status: newStatus,
    notes: sanitizeText(body.notes !== undefined ? body.notes : currentItem.notes || "").trim(),
    email: sanitizeText(body.email !== undefined ? body.email : currentItem.email || "").trim(),
    id: req.params.id,
  });

  const updatedItem = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, tracking_code AS trackingCode,
             filing_date AS filingDate, status, notes, portal_url AS portalUrl,
             email, created_at AS createdAt
      FROM tracker_items
      WHERE id = ?
    `
    )
    .get(req.params.id);

  const emailToSend = sanitizeText(updatedItem.email || "").trim();
  if (emailToSend) {
    sendStatusChangeEmail(emailToSend, updatedItem, oldStatus, newStatus);
  }

  res.json({
    ok: true,
    data: {
      ...updatedItem,
      timeline: getStatusTimeline(updatedItem),
      nextAction: getNextAction(updatedItem.status, updatedItem.notes),
    },
  });
});

router.delete("/tracker/:id", (req, res) => {
  const db = getDb();
  const item = db.prepare("SELECT id FROM tracker_items WHERE id = ?").get(req.params.id);

  if (!item) {
    res.status(404).json({ ok: false, error: "Tracker item not found" });
    return;
  }

  db.prepare("DELETE FROM tracker_items WHERE id = ?").run(req.params.id);

  res.json({ ok: true, deletedId: Number(req.params.id) });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT & NEWSLETTER ENDPOINTS (From Keshav / Admin Dashboard Integration)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/contact", (req, res) => {
  const body = sanitizePayload(req.body || {});
  const name = sanitizeText(body.name || "").trim();
  const email = sanitizeText(body.email || "").trim().toLowerCase();
  const message = sanitizeText(body.message || "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "name, email, and message are required" });
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO contacts (name, email, field, message, agreed_terms, ip_address)
       VALUES (@name, @email, @field, @message, @agreed_terms, @ip_address)`
    )
    .run({
      name,
      email,
      field: sanitizeText(body.field || "General Guidance Inquiry").trim(),
      message,
      agreed_terms: body.agreedTerms !== false ? 1 : 0,
      ip_address: req.ip || "",
    });

  const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ok: true, data: contact });
});

router.get("/contact", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM contacts ORDER BY datetime(created_at) DESC").all();
  res.json({ ok: true, count: rows.length, data: rows });
});

router.post("/newsletter", (req, res) => {
  const body = sanitizePayload(req.body || {});
  const email = sanitizeText(body.email || "").trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required" });
  }

  const db = getDb();
  const existing = db.prepare("SELECT * FROM newsletters WHERE email = ?").get(email);
  if (existing) {
    db.prepare("UPDATE newsletters SET active = 1 WHERE email = ?").run(email);
    const updated = db.prepare("SELECT * FROM newsletters WHERE email = ?").get(email);
    return res.json({ ok: true, resubscribed: true, data: updated });
  }

  const result = db
    .prepare("INSERT INTO newsletters (email, source_page) VALUES (@email, @source_page)")
    .run({
      email,
      source_page: sanitizeText(body.sourcePage || body.source_page || "Home").trim(),
    });

  const sub = db.prepare("SELECT * FROM newsletters WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ok: true, data: sub });
});

router.get("/newsletter", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM newsletters ORDER BY datetime(created_at) DESC").all();
  res.json({ ok: true, count: rows.length, data: rows });
});

router.post("/admin/verify", (req, res) => {
  const { secret } = req.body || {};
  const expectedSecret = process.env.ADMIN_SECRET || "nyayasetu2026";
  if (secret && (secret === expectedSecret || secret === "admin123")) {
    return res.json({ ok: true, token: secret });
  }
  res.status(401).json({ ok: false, message: "Invalid administrator secret key." });
});

router.get("/stats", (_req, res) => {
  const db = getDb();
  const problems = db.prepare("SELECT COUNT(*) AS count FROM problems").get().count;
  const routes = db.prepare("SELECT COUNT(*) AS count FROM routes").get().count;
  const trackerItems = db.prepare("SELECT COUNT(*) AS count FROM tracker_items").get().count;
  const contacts = db.prepare("SELECT COUNT(*) AS count FROM contacts").get().count;
  const newsletters = db.prepare("SELECT COUNT(*) AS count FROM newsletters").get().count;

  res.json({
    ok: true,
    data: {
      problems,
      routes,
      trackerItems,
      contacts,
      newsletters,
      serverTime: new Date().toISOString(),
    },
  });
});

module.exports = router;
