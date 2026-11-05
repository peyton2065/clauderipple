import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, validate } from "../src/config.ts";

test("local-only router defaults to IPv4 loopback", () => {
  assert.equal(DEFAULTS.listen.host, "127.0.0.1");
});

for (const host of ["0.0.0.0", "::", "localhost", "192.168.1.20", " 127.0.0.1"]) {
  test(`local-only router rejects ${host}`, () => {
    const errors = validate({ ...DEFAULTS, listen: { ...DEFAULTS.listen, host } });
    assert.ok(errors.some((error) => error.includes("listen.host") && error.includes("127.0.0.1")), errors.join("\n"));
  });
}
