const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT = path.join(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(__dirname, "..", "nyayasetu.db");

let dbInstance = null;

function readJson(fileName) {
  const fullPath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
  }
  return dbInstance;
}

function migrateFeedbackTable(db) {
  const tableInfo = db.prepare("PRAGMA table_info(feedback)").all();

  if (tableInfo.length === 0) {
    db.exec(`
      CREATE TABLE feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracker_id INTEGER,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tracker_id) REFERENCES tracker_items(id)
      );
    `);
    return;
  }

  const columns = tableInfo.map((column) => column.name);
  const hasTrackerId = columns.includes("tracker_id");
  const hasComment = columns.includes("comment");
  const hasRating = columns.includes("rating");
  const hasCreatedAt = columns.includes("created_at");

  if (hasTrackerId && hasComment && hasRating && hasCreatedAt) {
    return;
  }

  const legacyRows = db.prepare("SELECT * FROM feedback").all();
  db.exec("ALTER TABLE feedback RENAME TO feedback_legacy;");

  db.exec(`
    CREATE TABLE feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracker_id INTEGER,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tracker_id) REFERENCES tracker_items(id)
    );
  `);

  if (legacyRows.length > 0) {
    const migrationValues = legacyRows
      .map((row) => {
        const trackerId = row.tracker_id ?? row.trackerId ?? null;
        const rating = Number(row.rating ?? 0);
        const comment = String(row.comment ?? row.feedback_text ?? row.feedbackText ?? "");
        const createdAt = row.created_at || row.createdAt || new Date().toISOString();

        return `(${row.id}, ${trackerId === null ? "NULL" : Number(trackerId)}, ${Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : 1}, ${JSON.stringify(comment)}, ${JSON.stringify(createdAt)})`;
      })
      .join(", ");

    if (migrationValues) {
      db.exec(`INSERT INTO feedback (id, tracker_id, rating, comment, created_at) VALUES ${migrationValues};`);
    }
  }

  db.exec("DROP TABLE feedback_legacy;");
}

function migrateTrackerTable(db) {
  const trackerInfo = db.prepare("PRAGMA table_info(tracker_items)").all();
  if (trackerInfo.length === 0) {
    return;
  }

  const columns = trackerInfo.map((column) => column.name);
  if (!columns.includes("user_id")) {
    const anonymousUser = db.prepare("SELECT id FROM users WHERE email = ?").get("anonymous@nyayasetu.local");
    if (!anonymousUser) {
      db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
        .run("Anonymous User", "anonymous@nyayasetu.local", "anonymous");
    }

    const userRow = db.prepare("SELECT id FROM users WHERE email = ?").get("anonymous@nyayasetu.local");
    db.exec("ALTER TABLE tracker_items ADD COLUMN user_id INTEGER;");
    db.prepare("UPDATE tracker_items SET user_id = ? WHERE user_id IS NULL").run(userRow.id);
  }
}

function migrateUsersTable(db) {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  if (tableInfo.length === 0) {
    return;
  }

  const columns = tableInfo.map((column) => column.name);
  if (!columns.includes("role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");
  }
}

function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      route_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      file_path TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracker (
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
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      reference_id TEXT,
      filing_date TEXT,
      status TEXT NOT NULL DEFAULT 'drafted',
      notes TEXT,
      portal_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      field TEXT NOT NULL DEFAULT 'General Guidance Inquiry',
      message TEXT NOT NULL,
      agreed_terms INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'New',
      ip_address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      source_page TEXT NOT NULL DEFAULT 'Home',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateTrackerTable(db);
  migrateFeedbackTable(db);
  migrateUsersTable(db);
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
      ) VALUES (
        @id, @authority_name, @portal_name, @portal_url, @helpline, @department,
        @checklist_json, @steps_json, @draft_template
      )
    `);

    const seedRoutes = db.transaction((rows) => {
      for (const row of rows) {
        insertRoute.run({
          id: row.id,
          authority_name: row.authority_name,
          portal_name: row.portal_name,
          portal_url: row.portal_url,
          helpline: row.helpline || "",
          department: row.department || "",
          checklist_json: JSON.stringify(row.checklist || []),
          steps_json: JSON.stringify(row.steps || []),
          draft_template: row.draft_template || "",
        });
      }
    });
    seedRoutes(routes);
  }

  if (problemCount === 0) {
    const problems = readJson("problems.json");
    const insertProblem = db.prepare(`
      INSERT INTO problems (id, slug, title, category, summary, keywords, route_id)
      VALUES (@id, @slug, @title, @category, @summary, @keywords, @route_id)
    `);
    const seedProblems = db.transaction((rows) => {
      for (const row of rows) {
        insertProblem.run(row);
      }
    });
    seedProblems(problems);
  }

  const questionCount = db.prepare("SELECT COUNT(*) AS count FROM questions").get().count;
  if (questionCount === 0) {
    const questions = readJson("questions.json");
    const insertQuestion = db.prepare(`
      INSERT INTO questions (id, route_id, sort_order, prompt, question_key, options_json)
      VALUES (@id, @route_id, @sort_order, @prompt, @question_key, @options_json)
    `);
    const seedQuestions = db.transaction((rows) => {
      for (const row of rows) {
        insertQuestion.run({
          id: row.id,
          route_id: row.route_id,
          sort_order: row.sort_order,
          prompt: row.prompt,
          question_key: row.question_key,
          options_json: JSON.stringify(row.options || []),
        });
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
  console.log(`SQLite ready at ${DB_PATH}`);
}

module.exports = {
  getDb,
  initializeDatabase,
  DB_PATH,
};
