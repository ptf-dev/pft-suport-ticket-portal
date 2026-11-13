# Connect Claude to the portal over MCP

Date: 2026-11-13
Status: proposed

## Intent

Admins want to drive the ticket portal from Claude — file a ticket, search,
comment, change status — without leaving the conversation they are already in.
Today that is impossible: nothing the portal exposes speaks MCP.

## Why now

The portal already has nine HTTP endpoints under `/api/mcp/*` that do exactly
these operations, and they have been there long enough to be named "the MCP
API". They are not MCP. They are REST endpoints behind a bearer token. The only
client is `temp/mcp-remote.mjs`, a 26-line debug script with two commands that
curls two of them.

So the capability is 90% built and 0% reachable. This closes that gap.

## Goals

- An admin can connect Claude to the portal with one command and start working.
- The ten operations the REST routes already implement are available as tools.
- An admin can find the key and the command without asking anyone.

## Non-goals

- Per-admin or per-company keys. One shared key, as today.
- Rotating or revoking the key from the UI. It stays a Coolify env var.
- Scoping. The key is admin-wide across every company, as today.
- Client access. Admins only.
- Resources, prompts, sampling, or server-initiated messages.

## Anti-goals

Things that would make this a failure even if it technically worked:

- A settings page that shows a command which does not connect. The page is
  worthless unless the endpoint behind it works; the page is the easy half and
  must not be built first or alone.
- Reimplementing ticket logic. The tools call the same code paths the REST
  routes use. Two implementations of "create a ticket" that can drift is worse
  than no MCP server.
- Leaking the key. It is admin-wide; it must not reach a client-visible page,
  a log line, or a URL.

## Constraints

- Next.js 14 App Router, Node runtime. `@modelcontextprotocol/sdk` is not a
  dependency and adding it is optional, not required.
- Auth is `Authorization: Bearer <MCP_API_KEY>`, compared by string equality in
  nine handlers. Unchanged by this work.
- Every ticket created this way is attributed to `mcp-bot@propfirmstech.com`.
  With one shared key the audit trail cannot distinguish admins. Accepted.
- Claude Code negotiation, verified against the installed 2.1.284 bundle:
  - It POSTs `server/discover` first. A JSON-RPC `-32601` reply makes it fall
    back to the legacy handshake. **It must not hang** — a probe timeout is a
    hard connection failure with no fallback.
  - The legacy handshake sends `initialize` with `protocolVersion`
    `"2025-11-25"`, then `notifications/initialized`.
  - It accepts a server `protocolVersion` from
    `[2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07]`.
    Anything else fails with "Server's protocol version is not supported".
  - POST sends `Accept: application/json, text/event-stream`; a plain
    `application/json` response is expected and fine.
  - It opens a GET for a server stream on the legacy path. 405 means "no
    stream" and is handled cleanly.
  - It omits `Mcp-Session-Id` if the server never sets one. Stateless is fine.
  - It sends no `Origin` header.
  - A rejected `Authorization` header is a hard failure, not an OAuth fallback.

## Approaches

**A. Make `/api/mcp` a real MCP endpoint, hand-rolled. (Chosen.)**
One new route handler speaking the legacy JSON-RPC handshake, with the ten
tools delegating to the existing logic. One `claude mcp add --transport http`
line per admin, nothing installed locally, key as a header. ~300 lines, no new
dependency. Costs: we own a wire protocol, and the legacy path will eventually
need migrating to 2026-07-28.

**B. Same, but via `@modelcontextprotocol/sdk`.** Less protocol code, and the
SDK tracks spec changes. Rejected for now: a new dependency whose transport is
built around Node `req`/`res` rather than App Router `Request`/`Response`, to
avoid hand-writing a handshake that the probe findings above have already
reduced to a known, small surface. Worth revisiting at the 2026-07-28
migration.

**C. Grow `temp/mcp-remote.mjs` into a real stdio MCP server.** Rejected: every
admin installs and updates a local file, and it drifts from the API. The team
is "every admin", so per-machine install cost is paid repeatedly.

**D. Implement the modern 2026-07-28 path.** Rejected for this pass: requires
the `_meta` envelope, `server/discover` with `supportedVersions`, and
validating `MCP-Protocol-Version` / `Mcp-Method` / `Mcp-Name` headers against
the body — more surface for an identical result today, given the legacy
fallback is explicitly clean.

The user handed over the how ("whatever"), so A is my call, not theirs.

## Design

### 1. The endpoint — `app/api/mcp/route.ts`

`POST` handles JSON-RPC. Bearer check first; on failure `401` with a plain
JSON body, no OAuth metadata.

| Method | Response |
|---|---|
| `server/discover` | error `-32601` immediately — triggers legacy fallback |
| `initialize` | result with `protocolVersion: "2025-11-25"`, `capabilities: {tools:{}}`, `serverInfo: {name, version}` |
| `notifications/initialized` | `202`, empty body |
| `tools/list` | `{tools: [...]}` — the ten below |
| `tools/call` | `{content:[{type:"text",text}], isError}` |
| anything else | error `-32601`, immediately |

`GET` returns `405`. No session id is ever issued. Every unknown method
answers at once; nothing waits on I/O it does not need.

Errors split by kind, which the spec is explicit about:
- Unknown tool, malformed request → JSON-RPC `error` (`-32601` / `-32602`).
- "Ticket not found", "company not found", a validation refusal → a *successful*
  result with `isError: true` and the message as text. These are tool errors,
  not protocol errors.

### 2. The tools

Ten, mapping to the existing routes:

`list_tickets`, `search_tickets`, `get_ticket`, `create_ticket`,
`list_comments`, `add_comment`, `set_status`, `list_relations`,
`add_relation`, `list_companies`.

Each `inputSchema` is `{"type":"object", properties, required}`. Enum fields
(`priority`, `status`, `relationType`) draw their values from the existing
`PRIORITY_VALUES`, the Prisma status enum, and `lib/relations.ts` rather than
being retyped, so they cannot drift.

**Shared logic, not duplicated.** The ticket work currently sits inline in the
nine route handlers. The builder extracts each into a plain function
(`lib/mcp/operations.ts`) that both the REST route and the MCP tool call. No
behaviour change to the REST routes — they keep their paths, auth, and response
shapes, because `mcp-remote.mjs` and anything else pointed at them must keep
working.

### 3. The settings page — `app/admin/settings/mcp/page.tsx`

Server component, `requireAdmin()`, nav entry next to SMTP.

```
MCP  ·  Connect Claude to the portal

  Status      ● Configured          Endpoint  https://portal.propfirmstech.com/api/mcp
  API key     ••••••••••••••••3f9a   [Reveal]  [Copy]

  ── Connect Claude Code ─────────────────────────────
  claude mcp add --transport http pft-portal \
    https://portal.propfirmstech.com/api/mcp \
    --header "Authorization: Bearer <key>"
                                              [Copy]

  ── Tools ───────────────────────────────────────────
  list_tickets · search_tickets · get_ticket · create_ticket
  list_comments · add_comment · set_status
  list_relations · add_relation · list_companies

  Tickets filed this way show as "PFT AI Agent (Bot)".
  The key is admin-wide: it can read and write every company's
  tickets. Treat it like a password.
```

When `MCP_API_KEY` is unset, the page says so and explains where to set it
(Coolify env, then redeploy) instead of rendering a broken command.

The key is masked by default and revealed on click. It reaches the browser,
which is unavoidable if an admin is to copy it — mitigated by the page being
behind `requireAdmin()`. It must never appear in a URL or a log.

## What is left to the builder

- Whether `tools/call` results carry `structuredContent` alongside the text
  block. Nice-to-have; text is sufficient.
- Exact copy on the page.
- How `lib/mcp/operations.ts` is split — one file or several.

## Verification

Unit tests over the handler: the probe returns `-32601`; `initialize` returns a
version Claude Code accepts; unknown methods do not hang; a bad bearer is 401; a
tool error is `isError: true` rather than a JSON-RPC error; `tools/list` lists
ten tools.

Those tests cannot prove the handshake works against the real client. Before
this is called done, connect an actual Claude Code to the deployed endpoint,
list the tools, and create a throwaway ticket — the investigation was read from
the bundle, not captured live.
