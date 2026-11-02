import { openDatabase, presentReport } from './database.js';

export function sqliteStore(db = openDatabase(process.env.DB_PATH)) {
  const transaction = (action) => {
    db.exec('BEGIN');
    try { const result = action(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  return {
    name: 'SQLite',
    findUser: (email) => db.prepare("SELECT u.*,COALESCE(a.role,'user') AS role,COALESCE(a.status,'active') AS status FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.email=?").get(email),
    getUser: (id) => db.prepare("SELECT u.*,COALESCE(a.role,'user') AS role,COALESCE(a.status,'active') AS status FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.id=?").get(id),
    listUsers: () => db.prepare("SELECT u.id,u.name,u.email,u.created_at,COALESCE(a.role,'user') AS role,COALESCE(a.status,'active') AS status,(SELECT COUNT(*) FROM reports r WHERE r.owner_id=u.id) AS report_count FROM users u LEFT JOIN user_access a ON a.user_id=u.id ORDER BY u.created_at DESC").all(),
    setUserStatus: (id, status) => db.prepare("INSERT INTO user_access(user_id,role,status) VALUES(?,'user',?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status").run(id, status),
    grantAdmin: (id) => db.prepare("INSERT INTO user_access(user_id,role,status) VALUES(?,'admin','active') ON CONFLICT(user_id) DO UPDATE SET role='admin',status='active'").run(id),
    deleteComment: (report, comment) => db.prepare('DELETE FROM comments WHERE report_id=? AND id=?').run(report, comment),
    createUser: (u) => db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(u.id, u.name, u.email, u.password_hash, u.created_at),
    getSession: (token, now) => db.prepare("SELECT u.*,COALESCE(a.role,'user') AS role,COALESCE(a.status,'active') AS status FROM sessions s JOIN users u ON s.user_id=u.id LEFT JOIN user_access a ON a.user_id=u.id WHERE token_hash=? AND expires_at>?").get(token, now),
    createSession: (token, user, expires) => transaction(() => {
      db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
      db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token, user, expires);
    }),
    deleteSession: (token) => db.prepare('DELETE FROM sessions WHERE token_hash=?').run(token),
    getReport: (id) => db.prepare('SELECT * FROM reports WHERE id=?').get(id),
    listReports: () => db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all(),
    present: (row, user) => presentReport(db, row, user),
    createReport: (r) => transaction(() => {
      db.prepare('INSERT INTO reports VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(r.id, r.owner_id, r.title, r.category, r.description, r.address, r.lat, r.lng, r.status, r.priority, JSON.stringify(r.photos), r.created_at, 0, null, 0);
      db.prepare('INSERT INTO history(report_id,status,note,created_at) VALUES(?,?,?,?)').run(r.id, r.status, 'Reporte creado por el vecino', r.created_at);
    }),
    updateStatus: (id, user, status, note, date) => transaction(() => {
      db.prepare('UPDATE reports SET status=? WHERE id=?').run(status, id);
      db.prepare('INSERT INTO history(report_id,status,note,created_at) VALUES(?,?,?,?)').run(id, status, note, date);
    }),
    deleteReport: (id) => db.prepare('DELETE FROM reports WHERE id=?').run(id),
    toggle: (id, user, table, active) => {
      if (!['votes', 'bookmarks'].includes(table)) throw Error('Invalid relation');
      return active
        ? db.prepare(`INSERT OR IGNORE INTO ${table} VALUES(?,?)`).run(id, user)
        : db.prepare(`DELETE FROM ${table} WHERE report_id=? AND user_id=?`).run(id, user);
    },
    addComment: (id, c) => db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run(c.id, id, c.user_id, c.body, c.created_at),
  };
}
