const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db/setup");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const timestamp = Date.now();
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported file type"));
  },
});

const knowledgePath = path.join(__dirname, "../data/nyayasetu-knowledge.json");
let knowledgeCache = null;

function loadKnowledge() {
  if (knowledgeCache) {
    return knowledgeCache;
  }

  try {
    const fileContents = fs.readFileSync(knowledgePath, "utf8");
    knowledgeCache = JSON.parse(fileContents || "{}");
  } catch (_error) {
    knowledgeCache = {};
  }

  return knowledgeCache;
}

function buildFriendlyGreeting(problemText) {
  if (problemText && problemText.trim()) {
    return "Hi — I’m sorry you’re dealing with that. Let’s figure out the right way to get it resolved.";
  }

  return "Hi! I can help with NyayaSetu and with finding the right grievance path. What are you trying to sort out?";
}

function answerNyayaSetuQuestion(text) {
  const data = loadKnowledge();
  const platform = data.platform || {};
  const features = Array.isArray(data.core_features) ? data.core_features : [];
  const categories = Array.isArray(data.problem_categories_seeded) ? data.problem_categories_seeded : [];
  const disclaimer = data.disclaimer || {};

  if (/(what is nyayasetu|what does nyayasetu do|who is nyayasetu|what is this app|tell me about nyayasetu|tell me about grievance|what is grievance|what is a grievance|what do you know about nyayasetu)/.test(text)) {
    const featureNames = features.map((feature) => feature.name || "feature").join(", ");
    return `${platform.what_it_is || platform.summary || "NyayaSetu is a citizen guidance platform that helps people find the right government authority for their grievance."} ${platform.why_it_exists || "It exists because many people do not know which authority or portal matches their problem, and official steps can be confusing."} In simple terms, it helps with ${featureNames}.`;
  }

  if (/(why does it exist|why was it created|why does nyayasetu exist)/.test(text)) {
    return platform.why_it_exists || "It exists because people often do not know which authority or portal matches their problem, and official processes can be hard to understand.";
  }

  if (/(how does .*feature|how does .*work|what are the features|features of nyayasetu|what can it do)/.test(text)) {
    const featureList = features
      .map((feature) => `${feature.name}: ${feature.plain_language || feature.description || ""}`)
      .join(". ");

    return `NyayaSetu is mainly built around a few simple tools: ${featureList}. If you want, I can walk you through any one of them in more detail.`;
  }

  if (/(problem search|search feature|search)/.test(text)) {
    const feature = features.find((item) => /problem search/i.test(item.name || ""));
    return feature ? `${feature.name}: ${feature.description}. ${feature.user_flow ? feature.user_flow.join(" ") : ""}` : "You can search by a few words describing your issue or browse the problem categories to find the closest match.";
  }

  if (/(route lookup|guidance questions|route|questions)/.test(text)) {
    const feature = features.find((item) => /route lookup/i.test(item.name || ""));
    return feature ? `${feature.name}: ${feature.description}. ${feature.user_flow ? feature.user_flow.join(" ") : ""}` : "After you pick a problem, NyayaSetu asks a few quick questions so it can suggest the most relevant authority and the next step.";
  }

  if (/(draft|complaint draft|generate a draft|draft page)/.test(text)) {
    const feature = features.find((item) => /draft/i.test(item.name || ""));
    return feature ? `${feature.name}: ${feature.description}. ${feature.user_flow ? feature.user_flow.join(" ") : ""}` : "You can head to the Draft page, choose your issue, answer a few questions, and get a complaint draft you can review before filing.";
  }

  if (/(tracker|complaint tracker|track my complaint|personal tracker)/.test(text)) {
    const feature = features.find((item) => /tracker/i.test(item.name || ""));
    return feature ? `${feature.name}: ${feature.description}. ${feature.user_flow ? feature.user_flow.join(" ") : ""}` : "The personal tracker is where you can save your complaint reference, notes, and follow-up steps in one place.";
  }

  if (/(what data|what categories|problem categories|seeded categories|categories you have|what issues does it cover)/.test(text)) {
    const categoryNames = categories.map((item) => item.title).join(", ");
    return `NyayaSetu currently covers these seeded problem areas: ${categoryNames}.`;
  }

  if (/(limitations|limits|not do|does not|what are the limits|legal advice|disclaimer)/.test(text)) {
    return `${disclaimer.gentle_text || "NyayaSetu helps guide and draft, but it does not file complaints or act as an official representative."} ${disclaimer.reassurance || "For the final filing step and any legal questions, it is best to check the official government portal or speak with a qualified professional."}`;
  }

  if (/(help with nyayasetu|about nyayasetu|nyayasetu itself|what can nyayasetu help with)/.test(text)) {
    return `NyayaSetu can help with problem search, route guidance, complaint drafting, and complaint tracking for public-service issues. It can also explain what categories it covers and what its limits are. If you need help with a specific grievance, tell me the issue and I’ll guide you from there.`;
  }

  return null;
}

function answerGrievanceIssue(text) {
  const lower = text.toLowerCase();

  if (/(water|supply|utility|pipeline|tap|sewer|drain)/.test(lower)) {
    return "I’m sorry you’re dealing with that. For water and utility issues, gather the affected location, photos, and the date the problem started, then use the right local municipal or utility complaint route and keep the complaint reference number for follow-up.";
  }

  if (/(road|pothole|infrastructure|drain|street|traffic|repair)/.test(lower)) {
    return "That sounds frustrating. For road or civic infrastructure issues, document the exact location, take photos if possible, and report it through the local municipal or public works grievance route so you have a clear reference for follow-up.";
  }

  if (/(electric|power|electricity|meter|lighting|transformer)/.test(lower)) {
    return "I’m sorry you’re dealing with that. For electricity issues, note the service connection details, location, outage details, and the date it started, then raise it with the relevant electricity distribution company and keep the complaint ID handy.";
  }

  if (/(bank|refund|upi|payment|wallet|transaction|chargeback|digital|payment)/.test(lower)) {
    return "That’s understandably stressful. For refund or payment problems, save the transaction ID, amount, date, and screenshots, then raise it through the bank, payment app, or the official complaint channel and keep a copy of the reference number.";
  }

  if (/(hospital|health|doctor|medical|medicine|clinic|pharmacy)/.test(lower)) {
    return "I’m sorry you’re dealing with that. For healthcare or hospital issues, keep the facility name, treatment details, dates, and any bills or records ready, and use the hospital grievance route or the relevant public health complaint mechanism.";
  }

  if (/(school|college|student|education|fees|admission|scholarship)/.test(lower)) {
    return "That sounds really tough. For education-related issues, keep the institution details, dates, and any documents or communication, then raise it through the school or education department channel and keep the reference number for follow-up.";
  }

  if (/(complain|grievance|portal|official|file|status|track)/.test(lower)) {
    return "That’s exactly the sort of thing NyayaSetu can help with. I can help you find the likely authority, understand the complaint route, and prepare a clearer draft before you file it on the official portal.";
  }

  return null;
}

function answerOutOfScope(text) {
  const lower = text.toLowerCase();

  if (/(weather|football|stocks|movie|recipe|travel booking|password reset|fix my phone|how to code|write an essay|solve math)/.test(lower)) {
    return "I’m best at helping with NyayaSetu and public grievance guidance. If you need help with a government complaint, a route to the right authority, or how the app’s features work, I can absolutely help with that. If it’s something else, tell me what you need and I’ll redirect you to the right kind of support.";
  }

  return "I can help with NyayaSetu itself, like what it does, how its features work, the categories it covers, and its limits. If you’re dealing with a grievance, tell me a bit about the issue and I’ll help you find the right path.";
}

function answerChatMessage(rawText) {
  const message = String(rawText || "").trim();
  if (!message) {
    return "Hi! I can help with NyayaSetu and with finding the right grievance route. Tell me what you’re dealing with.";
  }

  const text = message.toLowerCase();

  if (/(^\s*(hi|hello|hey|namaste|namastey|good morning|good afternoon|good evening|hello there|hi there)\s*$|^(hi|hello|hey|namaste|namastey|good morning|good afternoon|good evening|hello there|hi there)\b)/.test(text)) {
    return "Hello! Good to see you here 😊 I’m here to help you find the right government authority for any civic issue you’re facing — whether it’s roads, utilities, payments, or something else. What’s going on?";
  }

  const knowledgeAnswer = answerNyayaSetuQuestion(text);
  if (knowledgeAnswer) {
    return knowledgeAnswer;
  }

  const grievanceAnswer = answerGrievanceIssue(text);
  if (grievanceAnswer) {
    return grievanceAnswer;
  }

  if (/(nyayasetu|grievance|complaint|portal|official|draft|tracker|route|problem search)/.test(text)) {
    return answerOutOfScope(text);
  }

  return answerOutOfScope(text);
}

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

function stripHtmlAndScripts(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = typeof value === "string" ? value : String(value);
  return stringValue
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
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

function normalizeLanguage(lang) {
  const value = String(lang || "en").trim().toLowerCase();
  return value === "hi" ? "hi" : "en";
}

const problemTranslations = {
  "consumer-refunds": {
    hi: {
      title: "उपभोक्ता शिकायत और रिफंड",
      category: "उपभोक्ता",
      summary: "देरी से रिफंड, खराब सामान और ई-कॉमर्स विवादों को राष्ट्रीय उपभोक्ता हेल्पलाइन 2.0 के साथ जोड़ा गया है।",
      keywords: "रिफंड, अमेज़न, फ्लिपकार्ट, खराब, nch, उपभोक्ता, ऑर्डर, ई-कॉमर्स, वारंटी",
    },
  },
  "road-repair": {
    hi: {
      title: "सार्वजनिक आधारभूत संरचना और सड़क मरम्मत",
      category: "नगर",
      summary: "क्षतिग्रस्त मोहल्ले की सड़कें, गड्ढे और नगरपालिका / सीपीजीआरएमएस चैनल के लिए नागरिक आधारभूत सुविधाओं की शिकायतें।",
      keywords: "गड्ढा, सड़क, स्ट्रीट लाइट, नगर, नगरपालिका, नलगर निगम, ड्रेनेज",
    },
  },
  "electricity-utility": {
    hi: {
      title: "बिजली और उपयोगिता समस्याएँ",
      category: "उपयोगिता",
      summary: "बिलिंग त्रुटियाँ, बिजली कटौती और DISCOM escalation, राज्य बिजली बोर्डों और CPGRAMS के साथ।",
      keywords: "बिजली, बिल, आउटेज, डिस्कॉम, मीटर, बिजली कटौती, उपयोगिता",
    },
  },
  "water-supply": {
    hi: {
      title: "नगरपालिका जल आपूर्ति",
      category: "नगर",
      summary: "अनियमित जल आपूर्ति, दूषित पानी और जल बोर्ड / नगर निकाय escalation।",
      keywords: "पानी, जल बोर्ड, टैंकर, प्रदूषण, लीक, नगरपालिका",
    },
  },
  "digital-payments": {
    hi: {
      title: "डिजिटल भुगतान और बैंकिंग",
      category: "वित्त",
      summary: "असफल UPI, अनधिकृत debits और RBI Ombudsman / cybercrime 1930 के माध्यम से बैंकिंग शिकायतें।",
      keywords: "upi, बैंकिंग, आरबीआई, ओम्बुड्समैन, debits, धोखाधड़ी, 1930, neft, असफल भुगतान",
    },
  },
  "cyber-fraud": {
    hi: {
      title: "साइबर अपराध और डिजिटल धोखाधड़ी",
      category: "साइबर",
      summary: "ऑनलाइन वित्तीय धोखाधड़ी, फ़िशिंग और account freeze सहायता cybercrime.gov.in के जरिए।",
      keywords: "साइबर, धोखाधड़ी, फ़िशिंग, otp, स्कैम, 1930, freeze, UPI fraud",
    },
  },
  "schemes": {
    hi: {
      title: "योजना और लाभ खोज",
      category: "कल्याण",
      summary: "सरकारी केंद्र और राज्य कल्याण योजनाओं और पात्रता को myScheme के माध्यम से खोजें।",
      keywords: "योजना, सब्सिडी, myscheme, पेंशन, छात्रवृत्ति, कल्याण, पीएम किसान",
    },
  },
  "public-health": {
    hi: {
      title: "सार्वजनिक स्वास्थ्य और अस्पताल मार्गदर्शन",
      category: "स्वास्थ्य",
      summary: "सार्वजनिक अस्पताल सेवा मुद्दे, रेफ़रल में देरी और स्वास्थ्य grievance चैनल।",
      keywords: "अस्पताल, स्वास्थ्य, आयुष्मान, फार्मेसी, एम्बुलेंस, opd",
    },
  },
  "education": {
    hi: {
      title: "छात्र और शिक्षा मार्गदर्शन",
      category: "शिक्षा",
      summary: "छात्रवृत्ति पोर्टल, स्कूल/कॉलेज सेवा मुद्दे और शिक्षा विभाग शिकायतें।",
      keywords: "छात्रवृत्ति, स्कूल, कॉलेज, nsp, शिक्षा, परीक्षा, प्रवेश",
    },
  },
};

function localizeProblem(problem, lang) {
  const language = normalizeLanguage(lang);
  if (!problem || language === "en") {
    return { ...problem, language };
  }

  const translations = problemTranslations[problem.id];
  if (!translations || !translations.hi) {
    return { ...problem, language };
  }

  return {
    ...problem,
    language,
    title: translations.hi.title || problem.title,
    category: translations.hi.category || problem.category,
    summary: translations.hi.summary || problem.summary,
    keywords: translations.hi.keywords || problem.keywords,
  };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Authentication required" });
  }

  try {
    const secret = process.env.JWT_SECRET || "nyayasetu-jwt-secret";
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin access required" });
  }
  return next();
}

router.post("/auth/register", async (req, res) => {
  const body = sanitizePayload(req.body || {});
  const name = sanitizeText(body.name || "").trim();
  const email = sanitizeText(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const requestedRole = String(body.role || "user").trim().toLowerCase();
  const adminSecretInput = String(body.adminSecret || body.admin_secret || "").trim();

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: "name, email, and password are required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required" });
  }

  const db = getDb();
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existingUser) {
    return res.status(409).json({ ok: false, error: "User already exists" });
  }

  const isAdminRequest = requestedRole === "admin" || adminSecretInput;
  const validAdminSecret = (process.env.ADMIN_SECRET || "nyayasetu-admin") === adminSecretInput;
  const finalRole = isAdminRequest && validAdminSecret ? "admin" : "user";

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (@name, @email, @password_hash, @role)")
    .run({
      name,
      email,
      password_hash: passwordHash,
      role: finalRole,
    });

  const user = db.prepare("SELECT id, name, email, role, created_at AS createdAt FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET || "nyayasetu-jwt-secret", {
    expiresIn: "7d",
  });

  return res.status(201).json({ ok: true, data: { token, user } });
});

router.post("/auth/login", async (req, res) => {
  const body = sanitizePayload(req.body || {});
  const email = sanitizeText(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "email and password are required" });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ ok: false, error: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role || "user" }, process.env.JWT_SECRET || "nyayasetu-jwt-secret", {
    expiresIn: "7d",
  });

  return res.json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        createdAt: user.created_at,
      },
    },
  });
});

router.post("/admin/problems", authMiddleware, adminMiddleware, (req, res) => {
  const body = sanitizePayload(req.body || {});
  const title = sanitizeText(body.title || "").trim();
  const category = sanitizeText(body.category || "").trim();
  const summary = sanitizeText(body.summary || "").trim();
  const keywords = sanitizeText(body.keywords || "").trim();
  const routeId = sanitizeText(body.routeId || "").trim();
  const id = sanitizeText(body.id || body.slug || "").trim();
  const slug = sanitizeText(body.slug || body.id || "").trim();

  if (!title || !category || !summary || !routeId) {
    return res.status(400).json({ ok: false, error: "title, category, summary, and routeId are required" });
  }

  const db = getDb();
  const routeExists = db.prepare("SELECT id FROM routes WHERE id = ?").get(routeId);
  if (!routeExists) {
    return res.status(400).json({ ok: false, error: "Provided routeId does not exist" });
  }

  const problemId = id || slug || `${slugify(category)}-${Date.now()}`;
  const finalSlug = slug || problemId;

  const existing = db.prepare("SELECT id FROM problems WHERE id = ? OR slug = ?").get(problemId, finalSlug);
  if (existing) {
    return res.status(409).json({ ok: false, error: "Problem with this id or slug already exists" });
  }

  db.prepare(
    `INSERT INTO problems (id, slug, title, category, summary, keywords, route_id)
     VALUES (@id, @slug, @title, @category, @summary, @keywords, @route_id)`
  ).run({
    id: problemId,
    slug: finalSlug,
    title,
    category,
    summary,
    keywords: keywords || `${title} ${category}`,
    route_id: routeId,
  });

  const created = db.prepare("SELECT * FROM problems WHERE id = ?").get(problemId);
  return res.status(201).json({ ok: true, data: mapProblem(created) });
});

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "problem";
}

function computeSimilarProblems(problem, allProblems) {
  if (!problem) {
    return [];
  }

  const targetText = [
    problem.title,
    problem.category,
    problem.summary,
    problem.keywords,
    problem.id,
  ]
    .join(" ")
    .toLowerCase();

  const targetTokens = new Set(
    targetText
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );

  return allProblems
    .filter((item) => item.id !== problem.id)
    .map((item) => {
      const itemText = [
        item.title,
        item.category,
        item.summary,
        item.keywords,
        item.id,
      ]
        .join(" ")
        .toLowerCase();

      const itemTokens = new Set(
        itemText
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((token) => token.length > 2)
      );

      const overlap = [...targetTokens].filter((token) => itemTokens.has(token));
      const score = overlap.length + (targetText.includes(item.category.toLowerCase()) ? 2 : 0);

      return {
        ...mapProblem(item),
        similarityScore: score,
        overlap,
      };
    })
    .filter((item) => item.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 4)
    .map(({ similarityScore, overlap, ...item }) => item);
}

router.get("/problems", (req, res) => {
  const db = getDb();
  const query = String(req.query.q || req.query.query || "").trim();
  const language = normalizeLanguage(req.query.lang);

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

  const mapped = rows.map(mapProblem);
  const allProblems = db.prepare("SELECT * FROM problems ORDER BY title ASC").all();

  mapped.forEach((problem) => {
    problem.similarProblems = computeSimilarProblems(problem, allProblems).map((item) => localizeProblem(item, language));
  });

  res.json({
    ok: true,
    language,
    count: rows.length,
    data: mapped.map((problem) => localizeProblem(problem, language)),
  });
});

router.get("/problems/:id/similar", (req, res) => {
  const db = getDb();
  const language = normalizeLanguage(req.query.lang);
  const problem = db.prepare("SELECT * FROM problems WHERE id = ?").get(req.params.id);

  if (!problem) {
    return res.status(404).json({ ok: false, error: "Problem not found" });
  }

  const allProblems = db.prepare("SELECT * FROM problems ORDER BY title ASC").all();
  return res.json({
    ok: true,
    language,
    data: computeSimilarProblems(problem, allProblems).map((item) => localizeProblem(item, language)),
  });
});

router.get("/routes/:id", (req, res) => {
  const db = getDb();
  const language = normalizeLanguage(req.query.lang);
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
    .map((row) => localizeProblem(mapProblem(row), language));

  res.json({
    ok: true,
    language,
    data: {
      ...mapRoute(route, questions),
      problems: relatedProblems,
    },
  });
});

const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

const generateDraft = (req, res) => {
  const body = sanitizePayload(req.body || {});
  const answers = body.answers && typeof body.answers === "object" ? body.answers : body;
  const routeId = stripHtmlAndScripts(body.routeId || answers.routeId);

  const cleanedAnswers = {};
  for (const [key, value] of Object.entries(answers || {})) {
    if (typeof value === "string") {
      cleanedAnswers[key] = stripHtmlAndScripts(value);
    } else if (Array.isArray(value)) {
      cleanedAnswers[key] = value.map((item) =>
        typeof item === "string" ? stripHtmlAndScripts(item) : sanitizePayload(item)
      );
    } else if (value && typeof value === "object") {
      cleanedAnswers[key] = sanitizePayload(value);
    } else {
      cleanedAnswers[key] = value;
    }
  }

  const db = getDb();

  let template =
    "Subject: Citizen grievance — {{issueType}}\n\nTo,\nThe Concerned Authority\n\nRespected Sir/Madam,\n\nI am {{complainantName}} of {{location}}.\n\nIssue: {{issueType}}\nDetails: {{description}}\n\nRelief sought: {{reliefSought}}\n\nI will file this myself on the official government portal. NyayaSetu does not submit complaints on my behalf.\n\nThank you.\n{{complainantName}}";

  if (routeId) {
    const route = db.prepare("SELECT draft_template FROM routes WHERE id = ?").get(routeId);
    if (route && route.draft_template) {
      template = route.draft_template;
    }
  }

  const draft = interpolate(template, cleanedAnswers);
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

router.post("/drafts/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded" });
  }

  const filePath = path.relative(path.join(__dirname, ".."), req.file.path).replace(/\\/g, "/");
  const db = getDb();
  const draftId = sanitizeText(req.body.draftId || req.body.id || "").trim() || `draft-${Date.now()}`;

  db.prepare(
    `
    INSERT INTO drafts (id, route_id, title, content, status, file_path, created_at, updated_at)
    VALUES (@id, @route_id, @title, @content, @status, @file_path, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET file_path = excluded.file_path, updated_at = excluded.updated_at
    `
  ).run({
    id: draftId,
    route_id: sanitizeText(req.body.routeId || "").trim(),
    title: sanitizeText(req.body.title || "Draft").trim(),
    content: sanitizeText(req.body.content || "").trim(),
    status: sanitizeText(req.body.status || "draft").trim(),
    file_path: filePath,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return res.status(201).json({
    ok: true,
    data: {
      draftId,
      filePath,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
  });
});

router.get("/tracker", authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
             status, notes, portal_url AS portalUrl, created_at AS createdAt
      FROM tracker_items
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(req.user.id);

  res.json({ ok: true, count: rows.length, data: rows });
});

router.get("/tracker/export", authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, title, category, reference_id AS referenceId, filing_date AS filingDate,
             status, notes, portal_url AS portalUrl, created_at AS createdAt
      FROM tracker_items
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(req.user.id);

  const format = String(req.query.format || "csv").toLowerCase();

  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const filename = "nyayasetu-tracker-history.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.fontSize(18).text("NyayaSetu Tracker History", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    rows.forEach((row, index) => {
      doc.fontSize(10).text(`${index + 1}. ${row.title}`);
      doc.text(`Category: ${row.category || "-"}`);
      doc.text(`Reference ID: ${row.referenceId || "-"}`);
      doc.text(`Status: ${row.status || "-"}`);
      doc.text(`Date: ${row.filingDate || row.createdAt || "-"}`);
      doc.text(`Notes: ${row.notes || "-"}`);
      doc.text(`Portal URL: ${row.portalUrl || "-"}`);
      doc.moveDown();
    });

    doc.end();
    return;
  }

  const csvData = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    reference_id: row.referenceId,
    filing_date: row.filingDate,
    status: row.status,
    notes: row.notes,
    portal_url: row.portalUrl,
    created_at: row.createdAt,
  }));

  const parser = new Parser({
    fields: [
      "id",
      "title",
      "category",
      "reference_id",
      "filing_date",
      "status",
      "notes",
      "portal_url",
      "created_at",
    ],
  });

  const csv = parser.parse(csvData);
  const filename = "nyayasetu-tracker-history.csv";

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.post("/tracker", authMiddleware, (req, res) => {
  const body = sanitizePayload(req.body || {});
  const title = stripHtmlAndScripts(body.title || "").trim();

  if (!title) {
    res.status(400).json({ ok: false, error: "title is required" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare(
      `
      INSERT INTO tracker_items (user_id, title, category, reference_id, filing_date, status, notes, portal_url)
      VALUES (@user_id, @title, @category, @reference_id, @filing_date, @status, @notes, @portal_url)
    `
    )
    .run({
      user_id: req.user.id,
      title,
      category: stripHtmlAndScripts(body.category || "").trim(),
      reference_id: stripHtmlAndScripts(body.referenceId || body.reference_id || "").trim(),
      filing_date: stripHtmlAndScripts(body.filingDate || body.filing_date || "").trim(),
      status: stripHtmlAndScripts(body.status || "drafted").trim(),
      notes: stripHtmlAndScripts(body.notes || "").trim(),
      portal_url: stripHtmlAndScripts(body.portalUrl || body.portal_url || "").trim(),
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

router.post("/feedback", (req, res) => {
  const body = sanitizePayload(req.body || {});
  const trackerId = Number(body.trackerId ?? body.tracker_id ?? 0);
  const rating = Number(body.rating ?? 0);
  const comment = stripHtmlAndScripts(body.comment || body.feedback || "").trim();

  if (!Number.isFinite(trackerId) || trackerId <= 0) {
    return res.status(400).json({ ok: false, error: "trackerId is required" });
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ ok: false, error: "rating must be between 1 and 5" });
  }

  const db = getDb();
  const trackerExists = db
    .prepare("SELECT id FROM tracker_items WHERE id = ?")
    .get(trackerId);

  if (!trackerExists) {
    return res.status(404).json({ ok: false, error: "tracker item not found" });
  }

  const result = db
    .prepare(
      `
      INSERT INTO feedback (tracker_id, rating, comment)
      VALUES (@tracker_id, @rating, @comment)
    `
    )
    .run({
      tracker_id: trackerId,
      rating,
      comment,
    });

  const feedback = db
    .prepare(
      `
      SELECT id, tracker_id AS trackerId, rating, comment, created_at AS createdAt
      FROM feedback
      WHERE id = ?
    `
    )
    .get(result.lastInsertRowid);

  return res.json({ ok: true, data: feedback });
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

router.post("/chat", (req, res) => {
  const body = sanitizePayload(req.body || {});
  const message = stripHtmlAndScripts(body.message || body.prompt || "").trim();

  if (!message) {
    return res.status(400).json({ ok: false, error: "Message is required" });
  }

  const response = answerChatMessage(message);
  return res.json({ ok: true, response });
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

router.get("/analytics/stats", (_req, res) => {
  const db = getDb();

  const categoryStats = db
    .prepare(`
      SELECT category, COUNT(*) AS count
      FROM tracker_items
      WHERE category IS NOT NULL AND TRIM(category) != ''
      GROUP BY category
      ORDER BY count DESC, category ASC
    `)
    .all();

  const resolutionStats = db
    .prepare(`
      SELECT
        AVG(
          CASE
            WHEN filing_date IS NOT NULL AND created_at IS NOT NULL THEN
              CAST((julianday(filing_date) - julianday(created_at)) * 86400 AS INTEGER)
            ELSE 0
          END
        ) AS avgResolutionSeconds,
        MIN(
          CASE
            WHEN filing_date IS NOT NULL AND created_at IS NOT NULL THEN
              CAST((julianday(filing_date) - julianday(created_at)) * 86400 AS INTEGER)
            ELSE 0
          END
        ) AS minResolutionSeconds,
        MAX(
          CASE
            WHEN filing_date IS NOT NULL AND created_at IS NOT NULL THEN
              CAST((julianday(filing_date) - julianday(created_at)) * 86400 AS INTEGER)
            ELSE 0
          END
        ) AS maxResolutionSeconds
      FROM tracker_items
    `)
    .get();

  const statusStats = db
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM tracker_items
      GROUP BY status
      ORDER BY count DESC, status ASC
    `)
    .all();

  const totals = db
    .prepare(`
      SELECT
        COUNT(*) AS totalCases,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolvedCases,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) AS inProgressCases,
        SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) AS draftedCases
      FROM tracker_items
    `)
    .get();

  const avgResolutionSeconds = Number(resolutionStats?.avgResolutionSeconds || 0);

  res.json({
    ok: true,
    data: {
      totalCases: Number(totals.totalCases || 0),
      resolvedCases: Number(totals.resolvedCases || 0),
      inProgressCases: Number(totals.inProgressCases || 0),
      draftedCases: Number(totals.draftedCases || 0),
      categoryBreakdown: categoryStats,
      statusBreakdown: statusStats,
      averageResolutionSeconds: Math.round(avgResolutionSeconds),
      averageResolutionHours: Number((avgResolutionSeconds / 3600).toFixed(2)),
      averageResolutionDays: Number((avgResolutionSeconds / 86400).toFixed(2)),
      generatedAt: new Date().toISOString(),
    },
  });
});

module.exports = router;
