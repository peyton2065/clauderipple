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
  assert.throws(() => new ConfigStore(file), /listen.host must be 127\.0\.0\.1/);
});

test("router startup has no SSH reverse-tunnel lifecycle", () => {
  const source = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /RemoteTunnels|remote-tunnel|remote-host|spawnSsh|syncRemoteAssets/);
});

test("legacy remote host configuration is refused", () => {
  const withRemote = { ...DEFAULTS, remote: { hosts: [] } };
  assert.ok(validate(withRemote).includes("remote configuration is not supported in this local-only build"));
});

test("initial config refuses legacy remote host settings", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clauderipple-local-only-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "config.json");
  fs.writeFileSync(file, JSON.stringify({ remote: { hosts: [] } }));
  assert.throws(() => new ConfigStore(file), /remote configuration is not supported in this local-only build/);
});

test("OAuth callbacks bind only IPv4 loopback", () => {
  for (const relative of ["../src/providers/claude-oauth.ts", "../src/providers/google/login.ts"]) {
    const source = fs.readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\.listen\([^,\n]+,\s*"::1"/);
  }
});

test("automatic updates are disabled by default in the local-only fork", () => {
  assert.equal(DEFAULTS.autoUpdate, false);
});

test("dashboard does not offer upstream or automatic update controls", () => {
  const source = fs.readFileSync(new URL("../../ui/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /toggleAutoUpdate|\/api\/update/);
});

test("dashboard version row renders its fork update link", () => {
  const source = fs.readFileSync(new URL("../../ui/app.js", import.meta.url), "utf8");
  const start = source.indexOf("function versionRow() {");
  const end = source.indexOf("// ---- Inside the app:", start);
  assert.ok(start >= 0 && end > start);
  const render = new Function("cell", "el", "t", "status", `${source.slice(start, end)}; return versionRow();`);
  const row = render((...args: unknown[]) => args, (tag: string, attrs: unknown, children: unknown) => ({ tag, attrs, children }), (key: string) => key, { version: "test" }) as unknown[];
  assert.equal((row[1] as { tag: string }).tag, "a");
});
