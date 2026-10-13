import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { openDatabase } from "../server/database.js";
const valid = {
  title: "Luminaria apagada frente al parque",
  category: "Alumbrado",
  description: "La luminaria no enciende desde ayer por la noche.",
  address: "Calle Primavera 123",
  lat: -12.12,
  lng: -77.03,
  priority: "Alta",
  photos: [],
};
async function setup(t, filename = ":memory:") {
  const db = openDatabase(filename);
  const server = createApp({
    db,
    secureCookies: false,
    serveStatic: false,
  }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  const call = async (path, { method = "GET", body, cookie, origin } = {}) => {
    const res = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const register = async (email) =>
    call("/auth/register", {
      method: "POST",
      body: { name: "Vecino de prueba", email, password: "PruebaSeguro123!" },
    });
  return { call, register, db, server };
}
test("registration, login, protected sessions and logout", async (t) => {
  const { call, register } = await setup(t);
  const a = await register("uno@vecino.test");
  assert.equal(a.status, 200);
  assert.ok(a.cookie.startsWith("av_session="));
  assert.equal(
    (await call("/me", { cookie: a.cookie })).data.user.email,
    "uno@vecino.test",
  );
  assert.equal((await register("uno@vecino.test")).status, 409);
  assert.equal(
    (
      await call("/auth/login", {
        method: "POST",
        body: { email: "uno@vecino.test", password: "incorrecta" },
      })
    ).status,
    401,
  );
  const login = await call("/auth/login", {
    method: "POST",
    body: { email: "uno@vecino.test", password: "PruebaSeguro123!" },
  });
  assert.equal(login.status, 200);
  assert.equal(
    (await call("/reports", { method: "POST", body: valid })).status,
    401,
  );
  await call("/auth/logout", { method: "POST", cookie: login.cookie });
  assert.equal((await call("/me", { cookie: login.cookie })).data.user, null);
});
test("shared reports enforce ownership, comments, bookmarks and idempotent support", async (t) => {
  const { call, register, db } = await setup(t);
  const a = await register("autor@vecino.test"),
    b = await register("otro@vecino.test");
  const created = await call("/reports", {
    method: "POST",
    body: { ...valid, owner_id: "fake", status: "Resuelto" },
    cookie: a.cookie,
  });
  assert.equal(created.status, 201);
  const r = created.data.report;
  assert.equal(r.status, "Reportado");
  assert.equal(r.own, true);
  const seen = (await call("/reports/" + r.id, { cookie: b.cookie })).data
    .report;
  assert.equal(seen.own, false);
  assert.equal(
    (
      await call("/reports/" + r.id + "/status", {
        method: "PATCH",
        body: { status: "Resuelto", note: "Intento indebido" },
        cookie: b.cookie,
      })
    ).status,
    403,
  );
  assert.equal(
    (await call("/reports/" + r.id, { method: "DELETE", cookie: b.cookie }))
      .status,
    403,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await call("/reports/" + r.id + "/support", {
          method: "PUT",
          body: { active: true },
          cookie: b.cookie,
        })
      ).data.report.votes,
      1,
    );
  await call("/reports/" + r.id + "/save", {
    method: "PUT",
    body: { active: true },
    cookie: b.cookie,
  });
  assert.equal(
    (await call("/reports/" + r.id, { cookie: b.cookie })).data.report.saved,
    true,
  );
  assert.equal(
    (await call("/reports/" + r.id, { cookie: a.cookie })).data.report.saved,
    false,
  );
  const comment = await call("/reports/" + r.id + "/comments", {
    method: "POST",
    body: { body: "También vi este problema ayer." },
    cookie: b.cookie,
  });
  assert.equal(comment.status, 201);
  assert.equal(comment.data.report.comments.length, 1);
  const update = await call("/reports/" + r.id + "/status", {
    method: "PATCH",
    body: {
      status: "En proceso",
      note: "Se está realizando mantenimiento en el lugar.",
    },
    cookie: a.cookie,
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.report.history.length, 2);
  assert.equal(update.data.report.status, "En proceso");
  assert.equal(
    (
      await call("/reports/" + r.id + "/status", {
        method: "PATCH",
        body: { status: "En proceso", note: "Mismo estado" },
        cookie: a.cookie,
      })
    ).status,
    409,
  );
  assert.equal(
    (await call("/reports/" + r.id, { method: "DELETE", cookie: a.cookie }))
      .status,
    200,
  );
  assert.equal((await call("/reports/" + r.id)).status, 404);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM votes WHERE report_id=?").get(r.id).n,
    0,
  );
});
test("input validation, CSRF origin and demo protection", async (t) => {
  const { call, register } = await setup(t);
  const { cookie } = await register("validar@vecino.test");
  for (const changes of [
    { lat: 91 },
    { lat: null },
    { category: "desconocida" },
    { priority: "Urgente" },
    { photos: ["data:image/jpeg;base64,AAAA"] },
    { photos: [1] },
    { description: " " },
    { title: 1 },
  ])
    assert.equal(
      (
        await call("/reports", {
          method: "POST",
          cookie,
          body: { ...valid, ...changes },
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await call("/reports", {
        method: "POST",
        cookie,
        body: valid,
        origin: "https://untrusted.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (await call("/reports/AV-1048", { method: "DELETE", cookie })).status,
    403,
  );
  assert.equal(
    (
      await call("/reports/AV-1048/comments", {
        method: "POST",
        cookie,
        body: { body: "a".repeat(601) },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("/reports", { method: "POST", cookie, body: valid })).status,
    201,
  );
});
test("SQLite retains reports after closing and reopening the database", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "av-db-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "reports.sqlite");
  const db = openDatabase(path);
  db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
    "persist",
    "Persistente",
    "persist@test.local",
    "not-used",
    new Date().toISOString(),
  );
  db.prepare("UPDATE reports SET title=? WHERE id=?").run(
    "Reporte conservado",
    "AV-1048",
  );
  db.close();
  const reopened = openDatabase(path);
  assert.equal(
    reopened.prepare("SELECT title FROM reports WHERE id=?").get("AV-1048")
      .title,
    "Reporte conservado",
  );
  assert.equal(
    reopened.prepare("SELECT name FROM users WHERE id=?").get("persist").name,
    "Persistente",
  );
  reopened.close();
});
