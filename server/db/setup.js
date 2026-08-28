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
