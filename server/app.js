import express from "express";
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { openDatabase, presentReport } from "./database.js";
import { categories, statuses } from "../src/data.js";
const derive = promisify(scrypt),
  digest = (value) => createHash("sha256").update(value).digest("hex");
const failure = (status, message) =>
  Object.assign(new Error(message), { status });
const text = (value, min, max, label) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw failure(400, `${label}: usa entre ${min} y ${max} caracteres.`);
  return value.trim();
};
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email });
export function createApp({
  db = openDatabase(process.env.DB_PATH),
  secureCookies = process.env.NODE_ENV === "production",
  serveStatic = true,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin
    ) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host)
          throw Error();
      } catch {
        return res
          .status(403)
          .json({ error: "Solicitud de otro origen no permitida." });
      }
    }
    next();
  });
  app.use(express.json({ limit: "5mb" }));
  app.use("/api", (req, res, next) => {
    const cookie = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("av_session="))
      ?.slice(11);
    if (cookie) {
      const session = db
        .prepare(
          "SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE token_hash=? AND expires_at>?",
        )
        .get(digest(cookie), Date.now());
      if (session) req.user = session;
    }
    next();
  });
  const required = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Inicia sesión para participar." });
  const rate = new Map();
  const authRate = (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = rate.get(key);
    if (entry && now - entry.start < 600000) {
      if (entry.count >= 30)
        return res
          .status(429)
          .json({ error: "Demasiados intentos. Espera unos minutos." });
      entry.count++;
    } else rate.set(key, { start: now, count: 1 });
    if (rate.size > 10000)
      for (const [k, v] of rate) if (now - v.start >= 600000) rate.delete(k);
    next();
  };
  const session = (res, user) => {
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      digest(token),
      user.id,
      Date.now() + 7 * 86400000,
    );
    res.cookie("av_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      maxAge: 7 * 86400000,
      path: "/",
    });
    res.json({ user: publicUser(user) });
  };
  app.get("/api/health", (_, res) =>
    res.json({ ok: true, database: "SQLite" }),
  );
  app.get("/api/me", (req, res) =>
    res.json({ user: req.user ? publicUser(req.user) : null }),
  );
  app.post("/api/auth/register", authRate, async (req, res, next) => {
    try {
      const name = text(req.body.name, 2, 60, "Nombre");
      const email = text(req.body.email, 5, 160, "Correo").toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw failure(400, "Escribe un correo válido.");
      const password = text(req.body.password, 8, 128, "Contraseña");
      if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
        throw failure(409, "Ese correo ya tiene una cuenta. Inicia sesión.");
      const salt = randomBytes(16).toString("hex");
      const key = await derive(password, salt, 64);
      const user = { id: randomUUID(), name, email };
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
        user.id,
        name,
        email,
        `${salt}:${key.toString("hex")}`,
        new Date().toISOString(),
      );
      session(res, user);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/login", authRate, async (req, res, next) => {
    try {
      const email = text(req.body.email, 5, 160, "Correo").toLowerCase(),
        password = text(req.body.password, 1, 128, "Contraseña");
      const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
      const [salt, hash] = (
        user?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`
      ).split(":");
      const key = await derive(password, salt, 64);
      if (!user || !timingSafeEqual(key, Buffer.from(hash, "hex")))
        throw failure(401, "Correo o contraseña incorrectos.");
      session(res, user);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("av_session="))
      ?.slice(11);
    if (token)
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(digest(token));
    res.clearCookie("av_session", {
      path: "/",
      secure: secureCookies,
      sameSite: "lax",
    });
    res.json({ ok: true });
  });
  const getReport = (id) => {
    const row = db.prepare("SELECT * FROM reports WHERE id=?").get(id);
    if (!row) throw failure(404, "El reporte ya no está disponible.");
    return row;
  };
  const own = (row, user) => {
    if (row.owner_id !== user.id || row.demo)
      throw failure(403, "Solo puedes gestionar tus propios reportes.");
  };
  app.get("/api/reports", (req, res) => {
    res.json({
      reports: db
        .prepare("SELECT * FROM reports ORDER BY created_at DESC")
        .all()
        .map((r) => presentReport(db, r, req.user?.id)),
    });
  });
  app.get("/api/reports/:id", (req, res, next) => {
    try {
      res.json({
        report: presentReport(db, getReport(req.params.id), req.user?.id),
      });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reports", required, (req, res, next) => {
    try {
      const v = req.body,
        title = text(v.title, 5, 100, "Título"),
        description = text(v.description, 10, 1500, "Descripción"),
        address = text(v.address, 5, 200, "Dirección");
      if (
        !categories.includes(v.category) ||
        !["Baja", "Media", "Alta"].includes(v.priority)
      )
        throw failure(400, "Categoría o prioridad inválida.");
      if (
        !Number.isFinite(v.lat) ||
        !Number.isFinite(v.lng) ||
        Math.abs(v.lat) > 90 ||
        Math.abs(v.lng) > 180
      )
        throw failure(400, "Selecciona una ubicación válida.");
      const photos = v.photos || [];
      if (!Array.isArray(photos) || photos.length > 3)
        throw failure(400, "Puedes adjuntar hasta 3 fotos.");
      for (const p of photos) {
        if (
          typeof p !== "string" ||
          p.length > 1400000 ||
          !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p)
        )
          throw failure(
            400,
            "Las fotos deben ser JPEG válidas de menos de 1 MB.",
          );
        const bytes = Buffer.from(p.split(",")[1], "base64");
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
          throw failure(400, "La foto no es un JPEG válido.");
      }
      const id = `AV-${randomBytes(5).toString("hex").toUpperCase()}`,
        date = new Date().toISOString();
      db.exec("BEGIN");
      try {
        db.prepare(
          "INSERT INTO reports VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          req.user.id,
          title,
          v.category,
          description,
          address,
          v.lat,
          v.lng,
          "Reportado",
          v.priority,
          JSON.stringify(photos),
          date,
          0,
          null,
          0,
        );
        db.prepare(
          "INSERT INTO history(report_id,status,note,created_at) VALUES(?,?,?,?)",
        ).run(id, "Reportado", "Reporte creado por el vecino", date);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      res
        .status(201)
        .json({ report: presentReport(db, getReport(id), req.user.id) });
    } catch (e) {
      next(e);
    }
  });
  app.patch("/api/reports/:id/status", required, (req, res, next) => {
    try {
      const row = getReport(req.params.id);
      own(row, req.user);
      if (!statuses.includes(req.body.status))
        throw failure(400, "Estado inválido.");
      const note = text(req.body.note, 5, 500, "Nota de seguimiento");
      if (row.status === req.body.status)
        throw failure(409, "Selecciona un estado diferente al actual.");
      db.exec("BEGIN");
      try {
        db.prepare("UPDATE reports SET status=? WHERE id=?").run(
          req.body.status,
          row.id,
        );
        db.prepare(
          "INSERT INTO history(report_id,status,note,created_at) VALUES(?,?,?,?)",
        ).run(row.id, req.body.status, note, new Date().toISOString());
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      res.json({ report: presentReport(db, getReport(row.id), req.user.id) });
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/reports/:id", required, (req, res, next) => {
    try {
      const row = getReport(req.params.id);
      own(row, req.user);
      db.prepare("DELETE FROM reports WHERE id=?").run(row.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  for (const [action, table] of [
    ["support", "votes"],
    ["save", "bookmarks"],
  ])
    app.put(`/api/reports/:id/${action}`, required, (req, res, next) => {
      try {
        getReport(req.params.id);
        if (typeof req.body.active !== "boolean")
          throw failure(400, "Acción inválida.");
        if (req.body.active)
          db.prepare(`INSERT OR IGNORE INTO ${table} VALUES(?,?)`).run(
            req.params.id,
            req.user.id,
          );
        else
          db.prepare(
            `DELETE FROM ${table} WHERE report_id=? AND user_id=?`,
          ).run(req.params.id, req.user.id);
        res.json({
          report: presentReport(db, getReport(req.params.id), req.user.id),
        });
      } catch (e) {
        next(e);
      }
    });
  app.post("/api/reports/:id/comments", required, (req, res, next) => {
    try {
      getReport(req.params.id);
      const body = text(req.body.body, 3, 600, "Comentario");
      db.prepare("INSERT INTO comments VALUES(?,?,?,?,?)").run(
        randomUUID(),
        req.params.id,
        req.user.id,
        body,
        new Date().toISOString(),
      );
      res
        .status(201)
        .json({
          report: presentReport(db, getReport(req.params.id), req.user.id),
        });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (_, res) =>
    res.status(404).json({ error: "Operación no disponible." }),
  );
  if (serveStatic) {
    app.use(express.static(resolve("dist")));
    app.get(/.*/, (_, res) => res.sendFile(resolve("dist/index.html")));
  }
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || 500;
    if (status >= 500) console.error("API error:", err.message);
    res
      .status(status)
      .json({
        error:
          status === 413
            ? "El archivo es demasiado grande."
            : status >= 500
              ? "No se pudo completar la operación. Inténtalo nuevamente."
              : err.message,
      });
  });
  return app;
}
