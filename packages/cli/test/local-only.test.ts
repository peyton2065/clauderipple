import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../src/index.ts", import.meta.url));

test("local-only CLI help does not offer remote control", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "clauderipple-local-cli-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [cli, "--help"], {
    encoding: "utf8",
    env: { ...process.env, CLAUDERIPPLE_HOME: home },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /^\s*remote\b/m);
});

test("local-only CLI rejects remote before loading host resources", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "clauderipple-local-cli-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [cli, "remote", "add"], {
    encoding: "utf8",
    env: { ...process.env, CLAUDERIPPLE_HOME: home },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /local-only build/i);
  assert.deepEqual(fs.readdirSync(home), []);
});

test("update check does not offer the upstream package", (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "clauderipple-local-cli-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [cli, "update", "--check", "--json"], {
    encoding: "utf8",
    env: { ...process.env, CLAUDERIPPLE_HOME: home, CLAUDERIPPLE_PACKAGE: "clauderipple@999.0.0" },
  });
  assert.equal(result.status, 0, result.stderr);
  const check = JSON.parse(result.stdout) as { latest: string | null; newer: boolean };
  assert.equal(check.latest, null);
  assert.equal(check.newer, false);
});
