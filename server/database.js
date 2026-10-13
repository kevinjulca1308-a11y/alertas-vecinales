import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedReports } from "../src/data.js";
export function openDatabase(path = resolve("data/alertavecinal.sqlite")) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), title TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, address TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, status TEXT NOT NULL, priority TEXT NOT NULL, photos TEXT NOT NULL, created_at TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0, demo_author TEXT, base_votes INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT, report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, status TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS votes(report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(report_id,user_id));
 CREATE TABLE IF NOT EXISTS bookmarks(report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(report_id,user_id));
 CREATE INDEX IF NOT EXISTS reports_created ON reports(created_at);
 CREATE INDEX IF NOT EXISTS comments_report ON comments(report_id);
 `);
  if (!db.prepare("SELECT id FROM reports LIMIT 1").get()) {
    db.exec("BEGIN");
    try {
      for (const r of seedReports) {
        db.prepare(
          "INSERT INTO reports VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          r.id,
          null,
          r.title,
          r.category,
          r.description,
          r.address,
          r.lat,
          r.lng,
          r.status,
          r.category === "Vías públicas" ? "Alta" : "Media",
          JSON.stringify([
            `/illustrations/${r.category === "Alumbrado" ? "light" : r.category === "Limpieza" ? "clean" : r.category === "Áreas verdes" ? "park" : "road"}.svg`,
          ]),
          r.date,
          1,
          r.author,
          r.votes,
        );
        for (const h of r.history)
          db.prepare(
            "INSERT INTO history(report_id,status,note,created_at) VALUES(?,?,?,?)",
          ).run(r.id, h.status, "Datos de demostración", h.date);
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
export function presentReport(db, row, userId) {
  const author = row.demo
    ? row.demo_author
    : db.prepare("SELECT name FROM users WHERE id=?").get(row.owner_id)?.name ||
      "Vecino";
  const votes =
    row.base_votes +
    db
      .prepare("SELECT COUNT(*) AS total FROM votes WHERE report_id=?")
      .get(row.id).total;
  const comments = db
    .prepare(
      "SELECT c.id,c.body,c.created_at AS date,u.name AS author,c.user_id FROM comments c JOIN users u ON u.id=c.user_id WHERE c.report_id=? ORDER BY c.created_at",
    )
    .all(row.id)
    .map((c) => ({ ...c, own: c.user_id === userId, user_id: undefined }));
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    priority: row.priority,
    photos: JSON.parse(row.photos),
    date: row.created_at,
    demo: !!row.demo,
    author,
    votes,
    own: !!userId && row.owner_id === userId,
    supported:
      !!userId &&
      !!db
        .prepare("SELECT 1 FROM votes WHERE report_id=? AND user_id=?")
        .get(row.id, userId),
    saved:
      !!userId &&
      !!db
        .prepare("SELECT 1 FROM bookmarks WHERE report_id=? AND user_id=?")
        .get(row.id, userId),
    comments,
    history: db
      .prepare(
        "SELECT status,note,created_at AS date FROM history WHERE report_id=? ORDER BY id",
      )
      .all(row.id),
  };
}
