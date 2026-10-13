import test from "node:test";
import assert from "node:assert/strict";
import { normalizeServerUrl, DEFAULT_ANDROID_SERVER } from "../src/native.js";
test("Android API address supports emulator, LAN and HTTPS without duplicate api paths", () => {
  assert.equal(DEFAULT_ANDROID_SERVER, "http://10.0.2.2:3001");
  assert.equal(
    normalizeServerUrl(" http://192.168.1.50:3001/ "),
    "http://192.168.1.50:3001",
  );
  assert.equal(
    normalizeServerUrl("https://vecinal.example/api/"),
    "https://vecinal.example",
  );
});
test("API configuration rejects embedded credentials and non-HTTP URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "file:///data/private",
    "https://user:pass@example.com",
    "https://example.com?token=abc",
    "https://example.com/#report",
  ])
    assert.throws(() => normalizeServerUrl(url));
});
