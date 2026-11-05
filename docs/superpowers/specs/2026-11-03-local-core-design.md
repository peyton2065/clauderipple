# Local-Core Fork Design

## Intent

Create a private ClaudeRipple fork that preserves the local Claude Desktop Code-tab workflow—model picker, Claude/GPT routing, Code tools, file editing, terminal execution, permissions, subagents, and project workflow—while making the fork incapable of accepting or creating remote-control connections.

## Goals

- Keep the router, OpenAI ingress, dashboard, Claude Desktop picker integration, and CLI-to-router integration working on Windows 11.
- Bind every service retained by the fork to IPv4 loopback (`127.0.0.1`) only.
- Remove the optional phone/mobile host, relay, push-notification, pairing, and SSH reverse-tunnel features.
- Reject an invalid or non-loopback router listen host at configuration validation time.
- Make the local-only guarantee observable through status output and covered by automated tests.

## Non-goals

- Do not remove the outbound connections to the model providers selected by the user; they are required for Claude/GPT routing.
- Do not change Claude Desktop's own cloud features, account behavior, credentials, CA/picker design, model routing semantics, or auto-update policy in this change.
- Do not create Windows Firewall rules automatically. The application must be safe by its own binding behavior; firewall configuration is optional defense in depth.

## Approach

Use a hard-coded local-only policy rather than a user-controlled "LAN mode" setting. Delete or disable the code paths that create remote reachability: the `ripple-host` phone/relay application and the router's SSH reverse-tunnel feature. Preserve only the existing local proxy and ingress servers, forcing the configurable proxy listener to `127.0.0.1`.

## Alternatives Considered

1. Keep remote features behind settings. Rejected: a future toggle or malformed configuration can reintroduce the exact capability this fork must exclude.
2. Rely on Windows Firewall only. Rejected: firewall policy can be changed or missing; the process itself must not listen on a network interface.
3. Remove the local proxy. Rejected: it breaks the Claude Desktop Code-tab picker and routed-model workflow.

## Constraints

- TypeScript and Node's built-in `node:test` framework only; do not add dependencies.
- Keep existing public commands and workflows unrelated to remote access compatible.
- `127.0.0.1` is the only accepted retained listener address. Do not silently rewrite a user-provided host.
- All new behavior follows test-first development.

