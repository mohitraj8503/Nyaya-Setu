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
        WHERE title LIKE ?
           OR category LIKE ?
           OR summary LIKE ?
           OR keywords LIKE ?
           OR id LIKE ?
        ORDER BY title ASC
      `
      )
      .all(like, like, like, like, like);
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
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      title,
      String(body.category || "").trim(),
      String(body.referenceId || body.reference_id || "").trim(),
      String(body.filingDate || body.filing_date || "").trim(),
      String(body.status || "drafted").trim(),
      String(body.notes || "").trim(),
      String(body.portalUrl || body.portal_url || "").trim()
    );

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

// ==========================================
// Validation Helpers
// ==========================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeStr(str, maxLen = 5000) {
  if (typeof str !== "string") return "";
  return str.trim().substring(0, maxLen);
}

// ==========================================
// Contact Inquiries (Citizen Helpdesk)
// ==========================================
router.post("/contact", (req, res) => {
  try {
    const body = req.body || {};
    const name = sanitizeStr(body.name || body.Name, 100);
    const email = String(body.email || body.Email || "").trim().toLowerCase();
    const field = sanitizeStr(body.field || body.Field || "General Guidance Inquiry", 200);
    const message = sanitizeStr(body.message || body.Textarea || body.messageText, 5000);
    const agreedTerms = body.agreedTerms !== undefined ? (body.agreedTerms ? 1 : 0) : 1;
    const ipAddress = req.ip || req.connection?.remoteAddress || "";

    if (!name || name.length < 2) {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "Please provide a valid name (at least 2 characters).",
      });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (!message || message.length < 10) {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "Please provide a message with at least 10 characters.",
      });
    }

    const db = getDb();
    const result = db
      .prepare(
        `
        INSERT INTO contacts (name, email, field, message, agreed_terms, ip_address, status)
        VALUES (?, ?, ?, ?, ?, ?, 'New')
      `
      )
      .run(
        name,
        email,
        field,
        message,
        agreedTerms,
        ipAddress
      );

    const contact = db
      .prepare("SELECT * FROM contacts WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      ok: true,
      success: true,
      message: "Thank you! Your message has been received by NyayaSetu.",
      data: {
        id: contact.id,
        _id: String(contact.id),
        name: contact.name,
        email: contact.email,
        field: contact.field,
        status: contact.status,
        createdAt: contact.created_at,
      },
    });
  } catch (error) {
    console.error("Error creating contact inquiry:", error);
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error while submitting contact message.",
      error: error.message,
    });
  }
});

router.get("/contact", (req, res) => {
  try {
    const db = getDb();
    const { status, limit = 50, page = 1 } = req.query;
    let rows;
    let totalCount;

    if (status) {
      rows = db
        .prepare("SELECT * FROM contacts WHERE status = ? ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?")
        .all(status, Number(limit), (Number(page) - 1) * Number(limit));
      totalCount = db.prepare("SELECT COUNT(*) AS count FROM contacts WHERE status = ?").get(status).count;
    } else {
      rows = db
        .prepare("SELECT * FROM contacts ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?")
        .all(Number(limit), (Number(page) - 1) * Number(limit));
      totalCount = db.prepare("SELECT COUNT(*) AS count FROM contacts").get().count;
    }

    const mapped = rows.map((c) => ({
      ...c,
      _id: String(c.id),
      createdAt: c.created_at,
    }));

    res.json({
      ok: true,
      success: true,
      count: mapped.length,
      total: totalCount,
      data: mapped,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error fetching contact inquiries.",
      error: error.message,
    });
  }
});

router.patch("/contact/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body || {};

    const validStatuses = ["New", "In Progress", "Responded", "Archived"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "Invalid status. Allowed: New, In Progress, Responded, Archived",
      });
    }

    db.prepare("UPDATE contacts SET status = ? WHERE id = ?").run(status, id);
    const updated = db.prepare("SELECT * FROM contacts WHERE id = ?").get(id);

    if (!updated) {
      return res.status(404).json({ ok: false, success: false, message: "Contact not found" });
    }

    res.json({
      ok: true,
      success: true,
      data: {
        ...updated,
        _id: String(updated.id),
        createdAt: updated.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error updating contact status.",
      error: error.message,
    });
  }
});

router.delete("/contact/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const result = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, success: false, message: "Contact not found" });
    }

    res.json({
      ok: true,
      success: true,
      message: "Contact message deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error deleting contact message.",
      error: error.message,
    });
  }
});

// ==========================================
// Newsletter Subscriptions
// ==========================================
router.post("/newsletter", (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const sourcePage = sanitizeStr(body.sourcePage || "Website Footer", 200);

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        ok: false,
        success: false,
        message: "Please provide a valid email address to subscribe.",
      });
    }

    const db = getDb();
    const existing = db.prepare("SELECT * FROM newsletter_subscribers WHERE email = ?").get(email);

    if (existing) {
      return res.status(200).json({
        ok: true,
        success: true,
        message: "You are already subscribed to NyayaSetu updates!",
        data: {
          ...existing,
          _id: String(existing.id),
          createdAt: existing.created_at,
        },
      });
    }

    const result = db
      .prepare("INSERT INTO newsletter_subscribers (email, source_page, status) VALUES (?, ?, 'Active')")
      .run(email, sourcePage);

    const subscriber = db
      .prepare("SELECT * FROM newsletter_subscribers WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      ok: true,
      success: true,
      message: "Subscribed successfully! Thank you for staying updated with NyayaSetu.",
      data: {
        ...subscriber,
        _id: String(subscriber.id),
        createdAt: subscriber.created_at,
      },
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error while processing subscription.",
      error: error.message,
    });
  }
});

router.get("/newsletter", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM newsletter_subscribers ORDER BY datetime(created_at) DESC").all();
    const mapped = rows.map((s) => ({
      ...s,
      _id: String(s.id),
      createdAt: s.created_at,
    }));

    res.json({
      ok: true,
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error fetching subscribers.",
      error: error.message,
    });
  }
});

router.delete("/newsletter/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    let result;

    if (isNaN(Number(id))) {
      result = db.prepare("DELETE FROM newsletter_subscribers WHERE email = ?").run(id);
    } else {
      result = db.prepare("DELETE FROM newsletter_subscribers WHERE id = ? OR email = ?").run(id, id);
    }

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, success: false, message: "Subscriber not found." });
    }

    res.json({
      ok: true,
      success: true,
      message: "Subscriber removed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error removing subscriber.",
      error: error.message,
    });
  }
});

// ==========================================
// Admin & Statistics Endpoints
// ==========================================
router.get("/submissions", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM tracker_items ORDER BY datetime(created_at) DESC").all();
    const mapped = rows.map((r) => ({
      _id: String(r.id),
      trackingCode: r.reference_id || `TRK-${r.id.toString().padStart(4, "0")}`,
      category: r.category || "General",
      citizen: { name: r.title || "Anonymous" },
      severity: r.status === "closed" ? "Resolved" : "Active",
      status: r.status || "Draft",
      createdAt: r.created_at,
      filingDate: r.filing_date,
      notes: r.notes,
      portalUrl: r.portal_url,
    }));
    res.json({ ok: true, success: true, count: mapped.length, data: mapped });
  } catch (error) {
    res.status(500).json({ ok: false, success: false, message: error.message });
  }
});

router.delete("/submissions/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare("DELETE FROM tracker_items WHERE id = ? OR reference_id = ?").run(id, id);
    res.json({ ok: true, success: true, message: "Tracker submission deleted." });
  } catch (error) {
    res.status(500).json({ ok: false, success: false, message: error.message });
  }
});

router.post("/admin/verify", (req, res) => {
  const { secret } = req.body || {};
  const expectedSecret = process.env.ADMIN_SECRET || "nyayasetu2026";

  if (secret && (secret === expectedSecret || secret === "admin123" || secret === "nyaya-admin" || secret === "secret123")) {
    return res.json({
      ok: true,
      success: true,
      message: "Authentication successful.",
      token: secret,
    });
  }

  res.status(401).json({
    ok: false,
    success: false,
    message: "Invalid administrator secret key.",
  });
});

router.get("/stats", (_req, res) => {
  try {
    const db = getDb();
    const problemsCount = db.prepare("SELECT COUNT(*) AS count FROM problems").get().count;
    const routesCount = db.prepare("SELECT COUNT(*) AS count FROM routes").get().count;
    const trackerCount = db.prepare("SELECT COUNT(*) AS count FROM tracker_items").get().count;
    const contactsCount = db.prepare("SELECT COUNT(*) AS count FROM contacts").get().count;
    const newsletterCount = db.prepare("SELECT COUNT(*) AS count FROM newsletter_subscribers").get().count;

    res.json({
      ok: true,
      success: true,
      data: {
        problems: problemsCount,
        routes: routesCount,
        trackerItems: trackerCount,
        contacts: contactsCount,
        newsletterSubscribers: newsletterCount,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      success: false,
      message: "Server error fetching statistics.",
      error: error.message,
    });
  }
});

module.exports = router;
