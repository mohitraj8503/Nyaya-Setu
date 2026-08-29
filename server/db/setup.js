const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(__dirname, "..", "nyayasetu.db");

let DatabaseConstructor = null;
let isNodeBuiltin = false;

try {
  DatabaseConstructor = require("better-sqlite3");
} catch (_e) {
  try {
    const { DatabaseSync } = require("node:sqlite");
    DatabaseConstructor = DatabaseSync;
    isNodeBuiltin = true;
  } catch (err) {
    console.error("No SQLite engine available.");
    process.exit(1);
  }
}

let rawDbInstance = null;
let wrappedDbInstance = null;

function readJson(fileName) {
  const fullPath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function createDbWrapper(rawDb) {
  if (!isNodeBuiltin) {
    rawDb.pragma("journal_mode = WAL");
    rawDb.pragma("foreign_keys = ON");
    return rawDb;
  }

  // Node:sqlite pragma setup
  try {
    rawDb.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  } catch (_e) {}

  return {
    exec(sql) {
      return rawDb.exec(sql);
    },
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        get(...params) {
          if (params.length === 1 && typeof params[0] === "object" && params[0] !== null && !Array.isArray(params[0])) {
            const keys = Object.keys(params[0]);
            const values = Object.values(params[0]);
            return stmt.get(...values);
          }
          return stmt.get(...params);
        },
        all(...params) {
          if (params.length === 1 && typeof params[0] === "object" && params[0] !== null && !Array.isArray(params[0])) {
            const values = Object.values(params[0]);
            return stmt.all(...values);
          }
          return stmt.all(...params);
        },
        run(...params) {
          if (params.length === 1 && typeof params[0] === "object" && params[0] !== null && !Array.isArray(params[0])) {
            const values = Object.values(params[0]);
            return stmt.run(...values);
          }
          return stmt.run(...params);
        },
      };
    },
    transaction(fn) {
      return function (...args) {
        try {
          rawDb.exec("BEGIN IMMEDIATE TRANSACTION;");
          const result = fn(...args);
          rawDb.exec("COMMIT;");
          return result;
        } catch (err) {
          try {
            rawDb.exec("ROLLBACK;");
          } catch (_rbErr) {}
          throw err;
        }
      };
    },
  };
}

function getDb() {
  if (!wrappedDbInstance) {
    rawDbInstance = new DatabaseConstructor(DB_PATH);
    wrappedDbInstance = createDbWrapper(rawDbInstance);
  }
  return wrappedDbInstance;
}

function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '',
      route_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      authority_name TEXT NOT NULL,
      portal_name TEXT NOT NULL,
      portal_url TEXT NOT NULL,
      helpline TEXT,
      department TEXT,
      checklist_json TEXT NOT NULL DEFAULT '[]',
      steps_json TEXT NOT NULL DEFAULT '[]',
      draft_template TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      prompt TEXT NOT NULL,
      question_key TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    CREATE TABLE IF NOT EXISTS tracker_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      reference_id TEXT,
      filing_date TEXT,
      status TEXT NOT NULL DEFAULT 'drafted',
      notes TEXT,
      portal_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      field TEXT DEFAULT 'General Guidance Inquiry',
      message TEXT NOT NULL,
      agreed_terms INTEGER DEFAULT 1,
      ip_address TEXT DEFAULT '',
      status TEXT DEFAULT 'New',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      source_page TEXT DEFAULT 'Website Footer',
      status TEXT DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedIfEmpty(db) {
  const problemCount = db.prepare("SELECT COUNT(*) AS count FROM problems").get().count;
  const routeCount = db.prepare("SELECT COUNT(*) AS count FROM routes").get().count;

  if (routeCount === 0) {
    const routes = readJson("routes.json");
    const insertRoute = db.prepare(`
      INSERT INTO routes (
        id, authority_name, portal_name, portal_url, helpline, department,
        checklist_json, steps_json, draft_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedRoutes = db.transaction((rows) => {
      for (const row of rows) {
        insertRoute.run(
          row.id,
          row.authority_name,
          row.portal_name,
          row.portal_url,
          row.helpline || "",
          row.department || "",
          JSON.stringify(row.checklist || []),
          JSON.stringify(row.steps || []),
          row.draft_template || ""
        );
      }
    });
    seedRoutes(routes);
  }

  if (problemCount === 0) {
    const problems = readJson("problems.json");
    const insertProblem = db.prepare(`
      INSERT INTO problems (id, slug, title, category, summary, keywords, route_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const seedProblems = db.transaction((rows) => {
      for (const row of rows) {
        insertProblem.run(
          row.id,
          row.slug,
          row.title,
          row.category,
          row.summary,
          row.keywords || "",
          row.route_id
        );
      }
    });
    seedProblems(problems);
  }

  const questionCount = db.prepare("SELECT COUNT(*) AS count FROM questions").get().count;
  if (questionCount === 0) {
    const questions = readJson("questions.json");
    const insertQuestion = db.prepare(`
      INSERT INTO questions (id, route_id, sort_order, prompt, question_key, options_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const seedQuestions = db.transaction((rows) => {
      for (const row of rows) {
        insertQuestion.run(
          row.id,
          row.route_id,
          row.sort_order,
          row.prompt,
          row.question_key,
          JSON.stringify(row.options || [])
        );
      }
    });
    seedQuestions(questions);
  }
}

function initializeDatabase() {
  const db = getDb();
  createTables(db);
  seedIfEmpty(db);
  return db;
}

if (require.main === module) {
  initializeDatabase();
  console.log(`SQLite ready at ${DB_PATH} using ${isNodeBuiltin ? "node:sqlite (built-in)" : "better-sqlite3"}`);
}

module.exports = {
  getDb,
  initializeDatabase,
  DB_PATH,
};
