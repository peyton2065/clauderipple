# Local-Core Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a ClaudeRipple variant that preserves local Claude Desktop Code-tab routing but cannot expose, pair, tunnel, or relay the application beyond `127.0.0.1`.

**Architecture:** The retained router and OpenAI ingress form the only runtime surface. Configuration validation fixes the proxy listener to IPv4 loopback, and all remote-control entry points are removed from the CLI/router runtime rather than hidden behind options. The fork remains a local proxy that makes normal outbound calls only to the providers the user configures.

**Tech Stack:** TypeScript, Node.js 24+, Node `node:test`, existing ClaudeRipple CLI/router build pipeline.

**Spec:** `docs/superpowers/specs/2026-11-03-local-core-design.md`

## Global Constraints

- Make every implementation change directly on `peyton2065/clauderipple` branch `codex/hardened-local-only`; do not clone, install, or run ClaudeRipple on the user's Windows machine during development.
- Use the GitHub connection to create commits and inspect diffs. Treat the fork's CI workflow runs as the authoritative test execution; do not claim a local test result that was not run.
- Preserve Claude Desktop Code-tab model picker, Claude/GPT routing, Code tools, subagents, permissions, and project workflow.
- Retain only listeners bound to `127.0.0.1`; reject every other configured router listen host.
- Remove phone/mobile host, relay, push, pairing, and SSH reverse-tunnel features; do not replace them with a toggle.
- Do not change provider outbound traffic, credential storage, CA/picker behavior, or automatic-update behavior in this change.
- Add no dependencies.
- Use test-first development for every behavior change.

## Review Focus

- A configuration with `0.0.0.0`, `::`, `localhost`, a LAN address, or whitespace must fail validation rather than bind or normalize silently; Task 2 owns these tests.
- The default configuration must continue to select `127.0.0.1`; Task 2 owns this regression test.
- A retained router startup must pass the validated loopback host to its listener; Task 3 owns this integration test.
- Remote CLI invocations must fail before they read, write, or open an SSH/relay/mobile resource; Task 4 owns this test.
- Uninstall and status must not leave a remote service, relay state, or tunnel child behind; Task 5 owns this acceptance check.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `packages/router/src/config.ts` | Define and validate the one allowed local router listener address. |
| `packages/router/src/index.ts` | Remove SSH reverse-tunnel lifecycle wiring while keeping local proxy/ingress startup. |
| `packages/router/src/remote-host.ts` and `packages/router/src/remote-tunnel.ts` | Delete after all router imports and tests are removed. |
| `packages/cli/src/index.ts` | Remove `remote` command registration and remote-host update imports. |
| `packages/cli/src/remote.ts` | Delete after command registration and tests are removed. |
| `packages/remote/` | Remove the optional phone/relay host package from the distributable workspace. |
| `package.json`, `package-lock.json` | Remove remote-only scripts and direct runtime dependencies made unused by the deletion. |
| `packages/router/test/local-only.test.ts` | New configuration and retained-local-router behavior tests. |
| `packages/cli/test/local-only.test.ts` | New CLI contract tests proving remote commands are absent/rejected. |
| `README.md`, `CHANGELOG.md` | State the fork's local-only boundary and upgrade incompatibility. |

### Task 1: Establish the Remote-Surface Inventory

**Files:**
- Modify: `docs/superpowers/specs/2026-11-03-local-core-design.md`
- Inspect: `packages/router/src/index.ts`, `packages/router/src/config.ts`, `packages/router/src/remote-host.ts`, `packages/router/src/remote-tunnel.ts`, `packages/cli/src/index.ts`, `packages/cli/src/remote.ts`, `packages/remote/`, `packages/app/`, `package.json`

**Interfaces:**
- Consumes: current default branch.
- Produces: a checked file/import list that identifies every compile-time and runtime reference to phone host, relay, push, pairing, SSH remote host, and reverse tunnel.

- [ ] **Step 1: Search the repository for remote-surface identifiers**

Use GitHub code search against `peyton2065/clauderipple` for `remote-host`, `remote-tunnel`, `ripple-host`, `RelayHost`, `remote install`, `remote add`, `remote pair`, `web-push`, `expo-push`, and `tailscale`.

Expected: a complete list grouped into retained local-router references versus code to remove.

- [ ] **Step 2: Record the exact deletion boundary in the design spec**

Add the discovered file list and explain any retained file that shares local and remote behavior. Do not delete shared code until its retained responsibility has a replacement.

- [ ] **Step 3: Record the untouched baseline CI state**

Inspect the latest passing GitHub Actions run for the fork's default branch. If no workflow covers tests and type checking, add that gap to the branch's first review note before behavior changes.

Expected: baseline status and workflow commands recorded before changes; stop for user direction if the baseline is red.

- [ ] **Step 4: Create the implementation branch and commit the inventory-only design update**

Create `codex/hardened-local-only` from the current fork `main`, then commit the inventory update through the GitHub API with message `docs: define local-only remote-surface boundary`.

### Task 2: Enforce the Loopback-Only Router Contract

**Files:**
- Modify: `packages/router/src/config.ts`
- Create: `packages/router/test/local-only.test.ts`

**Interfaces:**
- Consumes: `DEFAULTS` and `validate()` from `packages/router/src/config.ts`.
- Produces: `LOCAL_ONLY_LISTEN_HOST = "127.0.0.1"` and validation that rejects a `listen.host` other than that value.

- [ ] **Step 1: Write failing configuration tests**

```ts
test("local-only router defaults to IPv4 loopback", () => {
  assert.equal(DEFAULTS.listen.host, "127.0.0.1");
});

for (const host of ["0.0.0.0", "::", "localhost", "192.168.1.20", " 127.0.0.1"]) {
  test(`local-only router rejects ${host}`, () => {
    const { errors } = validate({ ...DEFAULTS, listen: { ...DEFAULTS.listen, host } });
    assert.ok(errors.some(error => error.includes("listen.host") && error.includes("127.0.0.1")));
  });
}
```

- [ ] **Step 2: Commit the failing test and verify the expected CI failure**

Commit the new test to `codex/hardened-local-only`, then inspect its GitHub Actions run.

Expected: FAIL because non-loopback hosts are currently accepted or not diagnosed.

- [ ] **Step 3: Add `LOCAL_ONLY_LISTEN_HOST` and validate `listen.host` exactly**

In `packages/router/src/config.ts`, export `LOCAL_ONLY_LISTEN_HOST` and add one validation rule: `listen.host` must equal it exactly. Preserve the current default only if it already equals the constant; otherwise change the default to the constant. Do not normalize user input.

- [ ] **Step 4: Commit the minimal policy implementation and verify the focused test passes in CI**

Use the existing test workflow, or add a narrowly scoped workflow invocation only if the repository does not support a focused test target.

Expected: PASS.

- [ ] **Step 5: Verify router regression coverage in CI and preserve the commit boundary**

Commit message: `feat: enforce loopback-only router binding`. The workflow must execute the full router test set and report green before Task 3 begins.

### Task 3: Preserve the Local Routing Path While Removing SSH Tunnels

**Files:**
- Modify: `packages/router/src/index.ts`
- Delete: `packages/router/src/remote-host.ts`
- Delete: `packages/router/src/remote-tunnel.ts`
- Delete: `packages/router/test/remote-tunnel.test.ts`
- Modify: affected router tests identified in Task 1

**Interfaces:**
- Consumes: `LOCAL_ONLY_LISTEN_HOST` from `config.ts` and the existing `Proxy.listen()` / `OpenAiIngress.listen()` APIs.
- Produces: router startup that has no `RemoteTunnels` instance, no SSH child process, and no remote-host reconciliation.

- [ ] **Step 1: Write a failing retained-local-startup test**

Add a test using the existing proxy/ingress test seams that asserts startup receives `127.0.0.1` and that no SSH spawn dependency is required or invoked.

- [ ] **Step 2: Commit the focused test and verify it fails in CI**

Expected: CI fails because `index.ts` still imports and initializes `RemoteTunnels`.

Expected: FAIL because `index.ts` still imports and initializes `RemoteTunnels`.

- [ ] **Step 3: Remove remote tunnel lifecycle wiring from `index.ts`**

Remove `remote-host.ts` / `remote-tunnel.ts` imports, `tunnels` state, config reconciliation calls, asset synchronization, and process-exit cleanup. Keep proxy, ingress, admin, and normal drain behavior unchanged.

- [ ] **Step 4: Delete tunnel implementation and its dedicated tests**

Delete only after TypeScript has no imports of either remote-router module.

- [ ] **Step 5: Commit the router removal and verify focused and complete router tests in CI**

Expected: CI passes; no test or compilation reference to the deleted tunnel files.

- [ ] **Step 6: Preserve the isolated router commit boundary**

Commit message: `feat: remove SSH remote tunnel support`.

### Task 4: Remove Remote Commands and Phone/Relay Distribution

**Files:**
- Modify: `packages/cli/src/index.ts`
- Delete: `packages/cli/src/remote.ts`
- Delete: `packages/remote/`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `packages/cli/test/local-only.test.ts`
- Delete: remote-only tests identified in Task 1

**Interfaces:**
- Consumes: CLI command dispatch in `packages/cli/src/index.ts`.
- Produces: no `remote` command, no `ripple-host` distributable, and no remote-only runtime dependencies.

- [ ] **Step 1: Write failing CLI contract tests**

```ts
test("help omits the remote command", async () => {
  const result = await runCli(["--help"]);
  assert.equal(result.code, 0);
  assert.doesNotMatch(result.stdout, /\bremote\b/i);
});

test("remote command is rejected before side effects", async () => {
  const result = await runCli(["remote", "add", "user@example.test"]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /local-only build/i);
  assert.equal(result.sshSpawnCount, 0);
});
```

Use existing CLI test helpers; extend them only enough to count child-process calls.

- [ ] **Step 2: Commit the focused CLI tests and verify they fail in CI**

Expected: CI fails because the remote command remains listed and callable.

Expected: FAIL because the remote command remains listed and callable.

- [ ] **Step 3: Remove CLI remote command registration and all remote-host-update imports**

Make `remote` an explicit local-only error only if preserving an informative migration message is simpler than removing dispatch entirely; otherwise leave it unrecognized. It must never load a remote module or spawn a process.

- [ ] **Step 4: Remove the phone/relay workspace and remote-only dependency edges**

Remove the `remote` workspace package, scripts, runtime launchers, packaging entries, and direct dependencies that Task 1 proves are no longer imported. Regenerate `package-lock.json` with the project’s pinned npm workflow; do not hand-edit the lockfile.

- [ ] **Step 5: Commit the removal and verify CLI tests and workspace type checking in CI**

Expected: PASS; no TypeScript path resolves into `packages/remote`.

- [ ] **Step 6: Preserve the removal commit boundary**

Commit message: `feat: remove remote host and relay features`.

### Task 5: Lock Down Status, Documentation, and Uninstall Verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: CLI status/help tests identified in Task 1
- Modify: `packages/cli/test/local-only.test.ts`

**Interfaces:**
- Consumes: retained CLI `status`, `install`, `uninstall`, and `--help` commands.
- Produces: user-visible local-only guarantee and a verifiable clean uninstall without remote service artifacts.

- [ ] **Step 1: Write failing status and uninstall-contract tests**

```ts
test("status identifies the local-only build", async () => {
  const result = await runCli(["status"]);
  assert.match(result.stdout, /Local-only build/i);
  assert.match(result.stdout, /127\.0\.0\.1/);
});

test("uninstall does not retain remote service registrations", async () => {
  await runCli(["uninstall"]);
  assert.equal(await hasRemoteServiceRegistration(), false);
  assert.equal(await exists(remoteStatePath), false);
});
```

- [ ] **Step 2: Commit the focused tests and verify they fail in CI**

Expected: CI fails because current status and uninstall describe/support remote components.

Expected: FAIL because current status and uninstall describe/support remote components.

- [ ] **Step 3: Add the local-only status marker and uninstall cleanup**

Expose `Local-only build: router and ingress bind only to 127.0.0.1; phone, relay, and SSH remote features are unavailable.` Ensure uninstall removes only fork-owned state and does not remove unrelated user services or credentials.

- [ ] **Step 4: Update user documentation**

Document retained local functionality, explicit exclusions, the exact loopback bind, and optional manually-created Windows Firewall inbound block rule. State that provider requests remain outbound by design.

- [ ] **Step 5: Commit documentation and run the full verification workflow**

Expected: PASS with no remote package references, remote command, or accepted non-loopback listener configuration.

- [ ] **Step 6: Preserve the final behavior/documentation commit boundary**

Commit message: `docs: document local-only ClaudeRipple build`.

### Task 6: Package and Audit the Local-Only Release Candidate

**Files:**
- Modify: `CHANGELOG.md`
- Inspect: generated npm tarball and Git diff

**Interfaces:**
- Consumes: completed Tasks 1–5.
- Produces: a release candidate that contains no phone/relay runtime assets and is installable through the existing local CLI path.

- [ ] **Step 1: Build the npm tarball in GitHub Actions**

Add a workflow artifact step only on `codex/hardened-local-only` if the existing CI does not already produce a package artifact. The package command is `npm pack --ignore-scripts`.

Expected: a tarball whose file list excludes `packages/remote`, relay assets, phone-host executables, and remote command implementation.

- [ ] **Step 2: Inspect the CI tarball file list and dependency graph**

The CI job must fail if `tar -tf clauderipple-*.tgz | rg "packages/remote|ripple-host|relay|expo-push|web-push"` finds a match.

Expected: no matches.

- [ ] **Step 3: Run dependency audit in GitHub Actions without applying changes**

Run `npm audit --omit=dev`; record and triage findings, but never invoke `npm audit fix`.

Expected: findings recorded and triaged; no `npm audit fix` in this task.

- [ ] **Step 4: Commit release-candidate metadata only if changed**

Commit message: `chore: prepare local-only release candidate`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-03-local-core-lockdown.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — fresh implementation and review context per task. Recommended because deleting remote surfaces across router, CLI, packaging, and tests has a high regression cost.
- **Native** — I implement each task in this session and perform one full review at the end. Faster, but less independent checking between deletions.

