import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigStore, DEFAULTS, validate } from "../src/config.ts";

test("local-only router defaults to IPv4 loopback", () => {
  assert.equal(DEFAULTS.listen.host, "127.0.0.1");
});

for (const host of ["0.0.0.0", "::", "localhost", "192.168.1.20", " 127.0.0.1"]) {
  test(`local-only router rejects ${host}`, () => {
    const errors = validate({ ...DEFAULTS, listen: { ...DEFAULTS.listen, host } });
    assert.ok(errors.some((error) => error.includes("listen.host") && error.includes("127.0.0.1")), errors.join("\n"));
  });
}

test("initial config refuses a non-loopback listener", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clauderipple-local-only-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "config.json");
  fs.writeFileSync(file, JSON.stringify({ listen: { host: "0.0.0.0", port: 8790 } }));
  assert.throws(() => new ConfigStore(file), /listen.host must be 127\\.0\\.0\\.1/);
});
