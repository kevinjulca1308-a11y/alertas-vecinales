import test from "node:test";
import assert from "node:assert/strict";
import { normalizeServerUrl, DEFAULT_ANDROID_SERVER, selectServerUrl } from "../src/native.js";
test("Android API address supports emulator, LAN and HTTPS without duplicate api paths", () => {
  assert.equal(DEFAULT_ANDROID_SERVER, "https://alertavecinal-guadalupe.onrender.com");
  assert.equal(
    normalizeServerUrl(" http://192.168.1.50:3001/ "),
    "http://192.168.1.50:3001",
  );
  assert.equal(
    normalizeServerUrl("https://vecinal.example/api/"),
    "https://vecinal.example",
  );
});

test('Android upgrades old LAN and emulator settings to the public deployment once', () => {
  for (const old of ['http://10.0.2.2:3001', 'http://192.168.18.41:3001', 'http://127.0.0.1:3001', 'http://172.16.0.3:3001'])
    assert.equal(selectServerUrl(old, DEFAULT_ANDROID_SERVER, null), DEFAULT_ANDROID_SERVER);
  assert.equal(selectServerUrl(null, DEFAULT_ANDROID_SERVER, null), DEFAULT_ANDROID_SERVER);
});

test('Android preserves explicit local choices after migration and other public communities', () => {
  assert.equal(selectServerUrl('http://192.168.18.41:3001', DEFAULT_ANDROID_SERVER, DEFAULT_ANDROID_SERVER), 'http://192.168.18.41:3001');
  assert.equal(selectServerUrl('https://another-community.example', DEFAULT_ANDROID_SERVER, null), 'https://another-community.example');
  assert.equal(selectServerUrl('http://10.0.2.2:3001', 'http://10.0.2.2:3001', null), 'http://10.0.2.2:3001');
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
