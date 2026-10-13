import test from "node:test";
import assert from "node:assert/strict";
import { filterReports, seedReports } from "../src/data.js";
test("search combines category and status and ignores accents and spaces", () => {
  const result = filterReports(seedReports, {
    search: " GALVEZ ",
    category: "Limpieza",
    status: "En proceso",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "AV-1047");
  assert.equal(
    filterReports(seedReports, { search: "galvez", status: "Resuelto" }).length,
    0,
  );
});
test("my reports and bookmarks use account ownership, not demo flags", () => {
  const data = [
    { ...seedReports[0], demo: false, own: false, saved: true },
    { ...seedReports[1], demo: false, own: true, saved: false },
  ];
  assert.equal(filterReports(data, { mine: true })[0].id, "AV-1047");
  assert.equal(filterReports(data, { saved: true })[0].id, "AV-1048");
  assert.equal(filterReports(data, { mine: true, saved: true }).length, 0);
});
test("priority filtering and ordering put high priority first", () => {
  const data = seedReports
    .slice(0, 3)
    .map((r, i) => ({ ...r, priority: ["Baja", "Media", "Alta"][i] }));
  assert.equal(filterReports(data, { priority: "Alta" }).length, 1);
  assert.equal(filterReports(data, { sort: "priority" })[0].id, "AV-1046");
});
test("support and recent sorting preserve the original array", () => {
  const before = seedReports.map((r) => r.id);
  assert.equal(filterReports(seedReports, { sort: "popular" })[0].votes, 32);
  assert.equal(filterReports(seedReports, { sort: "recent" })[0].id, "AV-1048");
  assert.deepEqual(
    seedReports.map((r) => r.id),
    before,
  );
});
