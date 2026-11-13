# MCP Endpoint + Admin Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/api/mcp` a working MCP server so an admin can connect Claude Code with one command, and give them an admin page that hands them that command.

**Architecture:** Ticket logic moves out of the nine REST handlers into shared
functions in `lib/mcp/operations.ts`; the REST routes and the new MCP tools
both call those. A single `app/api/mcp/route.ts` speaks JSON-RPC over POST,
stateless, answering `server/discover` with `-32601` so Claude Code falls back
to the legacy `initialize` handshake. An admin settings page renders the
connect command.

**Tech Stack:** Next.js 14 App Router (Node runtime), TypeScript, Prisma,
Jest + ts-jest (`testEnvironment: node`, `@/` path alias), Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-13-mcp-admin-config-design.md`

## Global Constraints

- No new npm dependencies. `@modelcontextprotocol/sdk` is explicitly not used.
- Auth is `Authorization: Bearer <process.env.MCP_API_KEY>`, string equality.
  When `MCP_API_KEY` is unset, every request is rejected — never allowed.
- `initialize` must return `protocolVersion: "2025-11-25"`. Any value outside
  `[2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07]`
  fails the client with "Server's protocol version is not supported".
- `server/discover` and every unknown method return JSON-RPC `-32601`
  **immediately**. A hang is a hard connection failure with no fallback.
- `GET /api/mcp` returns `405`. No `Mcp-Session-Id` is ever issued.
- Responses are `application/json`. Notifications return `202` with no body.
- Tool failures ("not found", validation) are results with `isError: true`.
  Protocol failures (unknown tool, malformed request) are JSON-RPC `error`.
- The REST routes under `/api/mcp/*` keep their paths, auth and response
  shapes exactly — `temp/mcp-remote.mjs` and any other caller must keep working.
- Enum values are imported from their existing source of truth, never retyped:
  `PRIORITY_VALUES` (`lib/priorities.ts`), `RELATION_TYPES` (`lib/relations.ts`),
  `TicketStatus` (Prisma).
- The key must never appear in a URL, a log line, or any client-visible page
  outside `requireAdmin()`.

## Review Focus

1. **`MCP_API_KEY` unset** — a caller sending `Authorization: Bearer undefined`,
   or no header, must get 401, never access. An unset key must not become an
   open endpoint. (Task 3)
2. **Malformed or empty POST body** — non-JSON, empty string, or a JSON array
   (batch) must return a JSON-RPC parse/invalid error promptly, never a 500 or
   a hang, because a hang kills the handshake with no fallback. (Task 3)
3. **`tools/call` naming an unknown tool** — must be JSON-RPC `-32601`, not a
   result with `isError`, or Claude Code cannot distinguish a broken server
   from a refused action. (Task 4)
4. **`tools/call` missing a required argument, or `arguments` absent entirely** —
   must be `isError: true` with a readable message, not a thrown exception. (Task 4)
5. **A tool naming a ticket or company that does not exist** — must surface the
   underlying "not found" as `isError: true` text, not an empty success. (Task 4)

---

### Task 1: Extract ticket operations into a shared module

**Files:**
- Create: `lib/mcp/operations.ts`
- Modify: `app/api/mcp/tickets/route.ts`, `app/api/mcp/tickets/search/route.ts`,
  `app/api/mcp/tickets/create/route.ts`, `app/api/mcp/tickets/[id]/route.ts`,
  `app/api/mcp/tickets/[id]/comments/route.ts`,
  `app/api/mcp/tickets/[id]/status/route.ts`,
  `app/api/mcp/tickets/[id]/relations/route.ts`,
  `app/api/mcp/companies/route.ts`
- Test: `lib/mcp/operations.test.ts` (new), `app/api/mcp/tickets/mcp-key-field.test.ts` (must still pass unchanged)

**Interfaces:**
- Consumes: nothing.
- Produces, all `async`, throwing `NotFoundError` (exported from this module,
  carrying a `resource: 'ticket' | 'company' | 'sourceTicket' | 'targetTicket'`
  discriminator) when a referenced ticket or company does not exist. **As built**
  (Task 1 deviated from the first draft of this block to preserve existing
  behaviour; these are the real signatures):
  - `listTickets(input?: ListTicketsInput)`
  - `searchTickets(input: SearchTicketsInput)` — `{q: string, limit?: number}`
  - `getTicket(id: string, options?: ImageUrlOptions)`
  - `createTicket(input: CreateTicketInput)` — `{title, description, priority?, category?, companyId}`
  - `listComments(ticketId: string, options?: ImageUrlOptions)`
  - `addComment(ticketId: string, input: {content: string, internal?: boolean})`
  - `setStatus(ticketId: string, status: TicketStatus)` — Prisma enum, not `string`
  - `listRelations(ticketId: string)`
  - `addRelation(ticketId: string, input: {targetTicketId: string, relationType: TicketRelationType})`
  - `listCompanies()`

  `ImageUrlOptions` is `{baseUrl?: string}`: `getTicket` and `listComments`
  build absolute attachment URLs from the caller's host. MCP tools have no
  request host, so they omit it and the URLs come back relative.

  `listComments` is the one operation that never throws `NotFoundError` — that
  route never checked ticket existence and returns an empty 200. Preserved.

- [ ] **Step 1: Write the failing test**

In `lib/mcp/operations.test.ts`, with `@/lib/prisma` mocked in the style of
`app/api/mcp/tickets/mcp-key-field.test.ts`:

```ts
it('returns the ticket key so callers can show FTM-042', async () => {
  const t = await getTicket('t1')
  expect(t).toMatchObject({ id: 't1', key: 'FTM-042' })
})

it('throws NotFoundError when the ticket does not exist', async () => {
  await expect(getTicket('nope')).rejects.toBeInstanceOf(NotFoundError)
})

it('throws NotFoundError when creating against an unknown company', async () => {
  await expect(createTicket({ title: 'a', description: 'b', companyId: 'nope' }))
    .rejects.toBeInstanceOf(NotFoundError)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/mcp/operations.test.ts`
Expected: FAIL — cannot find module `lib/mcp/operations`.

- [ ] **Step 3: Implement `lib/mcp/operations.ts`**

Move the body of each existing handler's work — the Prisma queries, the
defaulting, the response object construction — into the function above with the
matching name. Keep the selected fields and shapes byte-identical to what the
routes return today; the point of this task is that nothing observable changes.
Replace each route's `404` branch with a thrown `NotFoundError`.

- [ ] **Step 4: Rewire the eight route files to call the new functions**

Each handler keeps its own auth check and HTTP concerns, calls the operation,
and maps `NotFoundError` to its existing `404` JSON body. No change to paths,
status codes, or response shapes.

- [ ] **Step 5: Run the full MCP route tests to verify nothing moved**

Run: `npx jest app/api/mcp lib/mcp`
Expected: PASS, including the pre-existing `mcp-key-field.test.ts` unchanged.

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/operations.ts lib/mcp/operations.test.ts app/api/mcp
git commit -m "refactor(mcp): extract ticket operations from the REST handlers"
```

---

### Task 2: Tool definitions

**Files:**
- Create: `lib/mcp/tools.ts`
- Test: `lib/mcp/tools.test.ts`

**Interfaces:**
- Consumes: `lib/mcp/operations.ts` (Task 1).
- Produces:
  - `interface McpTool { name: string; description: string; inputSchema: Record<string, unknown> }`
  - `export const TOOLS: McpTool[]` — exactly ten, named `list_tickets`,
    `search_tickets`, `get_ticket`, `create_ticket`, `list_comments`,
    `add_comment`, `set_status`, `list_relations`, `add_relation`,
    `list_companies`.
  - `export async function callTool(name: string, args: Record<string, unknown>): Promise<unknown>`
    — dispatches to the Task 1 operation, throws `UnknownToolError` (exported)
    for an unrecognised name and `InvalidArgumentsError` (exported) when a
    required argument is missing or the wrong type.

- [ ] **Step 1: Write the failing test**

```ts
it('exposes exactly the ten documented tools', () => {
  expect(TOOLS.map((t) => t.name).sort()).toEqual([
    'add_comment', 'add_relation', 'create_ticket', 'get_ticket',
    'list_comments', 'list_companies', 'list_relations', 'list_tickets',
    'search_tickets', 'set_status',
  ])
})

it('every tool declares an object inputSchema', () => {
  for (const t of TOOLS) {
    expect(t.inputSchema).toMatchObject({ type: 'object' })
    expect(t.description.length).toBeGreaterThan(0)
  }
})

it('draws enum values from the source of truth, not a retyped copy', () => {
  const create = TOOLS.find((t) => t.name === 'create_ticket')!
  const props = (create.inputSchema as any).properties
  expect(props.priority.enum).toEqual([...PRIORITY_VALUES])
  expect((TOOLS.find((t) => t.name === 'add_relation')!.inputSchema as any)
    .properties.relationType.enum).toEqual([...RELATION_TYPES])
  expect((TOOLS.find((t) => t.name === 'set_status')!.inputSchema as any)
    .properties.status.enum).toContain('WAITING_CLIENT')
})

it('rejects an unknown tool name', async () => {
  await expect(callTool('nope', {})).rejects.toBeInstanceOf(UnknownToolError)
})

it('rejects a call missing a required argument', async () => {
  await expect(callTool('get_ticket', {})).rejects.toBeInstanceOf(InvalidArgumentsError)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/mcp/tools.test.ts`
Expected: FAIL — cannot find module `lib/mcp/tools`.

- [ ] **Step 3: Implement `lib/mcp/tools.ts`**

Each `inputSchema` is `{type: 'object', properties, required}`. Import
`PRIORITY_VALUES` from `@/lib/priorities` and `RELATION_TYPES` from
`@/lib/relations`; take statuses from the Prisma `TicketStatus` enum. Required
fields follow the REST routes: `create_ticket` requires `title`, `description`,
`companyId`; `get_ticket`/`list_comments`/`list_relations` require `id`;
`add_comment` requires `id` and `content`; `set_status` requires `id` and
`status`; `add_relation` requires `id`, `targetTicketId`, `relationType`;
`search_tickets` requires `q`; `list_tickets` and `list_companies` require
nothing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/mcp/tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/tools.ts lib/mcp/tools.test.ts
git commit -m "feat(mcp): define the ten tools and their schemas"
```

---

### Task 3: JSON-RPC endpoint — auth and handshake

**Files:**
- Create: `app/api/mcp/route.ts`
- Test: `app/api/mcp/route.test.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1–2 yet.
- Produces: `POST(request: NextRequest): Promise<Response>` and
  `GET(): Promise<Response>` at `/api/mcp`.

Note: `app/api/mcp/route.ts` sits alongside the existing `app/api/mcp/tickets/`
and `app/api/mcp/companies/` subdirectories and does not shadow them.

- [ ] **Step 1: Write the failing test**

Set `process.env.MCP_API_KEY = 'test-key'` per test; build requests with
`new NextRequest('http://localhost/api/mcp', {method:'POST', headers, body})`.

```ts
it('rejects a request with no Authorization header', async () => {
  expect((await POST(req({ method: 'initialize' }, null))).status).toBe(401)
})

it('rejects a wrong key', async () => {
  expect((await POST(req({ method: 'initialize' }, 'wrong'))).status).toBe(401)
})

it('rejects everything when MCP_API_KEY is unset', async () => {
  delete process.env.MCP_API_KEY
  expect((await POST(req({ method: 'initialize' }, 'anything'))).status).toBe(401)
  expect((await POST(req({ method: 'initialize' }, 'undefined'))).status).toBe(401)
})

it('answers initialize with a version Claude Code accepts', async () => {
  const body = await (await POST(req({ id: 1, method: 'initialize' }))).json()
  expect(body.result.protocolVersion).toBe('2025-11-25')
  expect(body.result.capabilities).toMatchObject({ tools: {} })
  expect(body.result.serverInfo.name).toBeTruthy()
})

it('answers server/discover with -32601 so the client falls back to legacy', async () => {
  const body = await (await POST(req({ id: 1, method: 'server/discover' }))).json()
  expect(body.error.code).toBe(-32601)
})

it('answers an unknown method with -32601', async () => {
  const body = await (await POST(req({ id: 1, method: 'nope/nope' }))).json()
  expect(body.error.code).toBe(-32601)
})

it('answers notifications/initialized with 202 and no body', async () => {
  const res = await POST(req({ method: 'notifications/initialized' }))
  expect(res.status).toBe(202)
  expect(await res.text()).toBe('')
})

it('returns 405 for GET so the client treats it as "no stream"', async () => {
  expect((await GET()).status).toBe(405)
})

it('returns a JSON-RPC error for a malformed body rather than throwing', async () => {
  const body = await (await POST(rawReq('not json'))).json()
  expect(body.error.code).toBe(-32700)
})

it('returns a JSON-RPC error for a batch array rather than hanging', async () => {
  const body = await (await POST(rawReq('[{"id":1,"method":"initialize"}]'))).json()
  expect(body.error.code).toBe(-32600)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest app/api/mcp/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Implement the handler in `app/api/mcp/route.ts`**

Order matters: auth check, then parse, then dispatch. Parse failures and
non-object bodies answer before any method dispatch. A request with no `id` is
a notification and gets `202`. Everything responds synchronously — no awaiting
anything the method does not need. Set `export const dynamic = 'force-dynamic'`
as the sibling routes do.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest app/api/mcp/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/route.ts app/api/mcp/route.test.ts
git commit -m "feat(mcp): serve the MCP handshake at /api/mcp"
```

---

### Task 4: `tools/list` and `tools/call`

**Files:**
- Modify: `app/api/mcp/route.ts`
- Test: `app/api/mcp/route.test.ts` (extend)

**Interfaces:**
- Consumes: `TOOLS`, `callTool`, `UnknownToolError`, `InvalidArgumentsError`
  from `lib/mcp/tools.ts` (Task 2); `NotFoundError` from `lib/mcp/operations.ts`
  (Task 1).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```ts
it('lists the ten tools', async () => {
  const body = await (await POST(req({ id: 1, method: 'tools/list' }))).json()
  expect(body.result.tools).toHaveLength(10)
})

it('returns tool output as a text content block', async () => {
  const body = await (await POST(req({ id: 1, method: 'tools/call',
    params: { name: 'list_companies', arguments: {} } }))).json()
  expect(body.result.content[0].type).toBe('text')
  expect(body.result.isError).toBe(false)
})

it('reports an unknown tool as a protocol error, not a tool error', async () => {
  const body = await (await POST(req({ id: 1, method: 'tools/call',
    params: { name: 'nope', arguments: {} } }))).json()
  expect(body.error.code).toBe(-32601)
  expect(body.result).toBeUndefined()
})

it('reports a missing required argument as a tool error', async () => {
  const body = await (await POST(req({ id: 1, method: 'tools/call',
    params: { name: 'get_ticket', arguments: {} } }))).json()
  expect(body.result.isError).toBe(true)
  expect(body.error).toBeUndefined()
})

it('treats absent arguments as empty rather than throwing', async () => {
  const body = await (await POST(req({ id: 1, method: 'tools/call',
    params: { name: 'list_companies' } }))).json()
  expect(body.result.isError).toBe(false)
})

it('reports a missing ticket as a tool error with a readable message', async () => {
  const body = await (await POST(req({ id: 1, method: 'tools/call',
    params: { name: 'get_ticket', arguments: { id: 'nope' } } }))).json()
  expect(body.result.isError).toBe(true)
  expect(body.result.content[0].text).toMatch(/not found/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest app/api/mcp/route.test.ts`
Expected: FAIL — `tools/list` currently answers `-32601`.

- [ ] **Step 3: Add the two methods to the handler**

`tools/list` returns `{tools: TOOLS}`. `tools/call` reads
`params.name` and `params.arguments ?? {}`, calls `callTool`, and serialises the
result into `{content:[{type:'text', text: JSON.stringify(result, null, 2)}], isError:false}`.
`UnknownToolError` becomes JSON-RPC `-32601`; `InvalidArgumentsError` and
`NotFoundError` and any other thrown error become `isError: true` with the
error's message as the text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest app/api/mcp`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/mcp/route.ts app/api/mcp/route.test.ts
git commit -m "feat(mcp): expose the ten tools over tools/list and tools/call"
```

---

### Task 5: Admin settings page

**Files:**
- Create: `lib/mcp/config-display.ts`, `app/admin/settings/mcp/page.tsx`,
  `app/admin/settings/mcp/mcp-config-client.tsx`
- Modify: `app/admin/modern-admin-nav.tsx:23-30`
- Test: `lib/mcp/config-display.test.ts`

**Interfaces:**
- Consumes: `TOOLS` from `lib/mcp/tools.ts` (Task 2), so the listed tool names
  cannot drift from the served ones.
- Produces, both in `lib/mcp/config-display.ts` — a plain module with no JSX
  and no `'use client'`, so the node-env test imports it without dragging a
  React component in:
  - `export function maskKey(key: string): string`
  - `export function connectCommand(baseUrl: string): string`

- [ ] **Step 1: Write the failing test**

```ts
it('masks all but the last four characters', () => {
  expect(maskKey('abcdefghijklmnop')).toBe('••••••••••••mnop')
})

it('masks a short key without revealing it', () => {
  expect(maskKey('abc')).not.toContain('abc')
})

it('builds a connect command carrying no key', () => {
  const cmd = connectCommand('https://portal.propfirmstech.com')
  expect(cmd).toContain('claude mcp add --transport http')
  expect(cmd).toContain('https://portal.propfirmstech.com/api/mcp')
  expect(cmd).toContain('Authorization: Bearer')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/mcp/config-display.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page and its client component**

`config-display.ts` holds the two pure functions above. `page.tsx` is a server component: `await requireAdmin()`, read
`process.env.MCP_API_KEY` and `process.env.NEXTAUTH_URL` (falling back to
`https://portal.propfirmstech.com`), and pass them to the client component.
When the key is unset, render the "not configured" state — explain it is set as
`MCP_API_KEY` in Coolify and needs a redeploy — and do not render a command.
The client component owns reveal/copy state and renders the layout from the
spec's sketch, including the admin-wide-key warning and the
"PFT AI Agent (Bot)" attribution note. Tool names come from `TOOLS`.

- [ ] **Step 4: Add the nav entry**

In `app/admin/modern-admin-nav.tsx`, add
`{ href: '/admin/settings/mcp', label: 'MCP', icon: Plug }` after the SMTP
entry, importing `Plug` from `lucide-react` alongside the existing icons.

- [ ] **Step 5: Run test and typecheck**

Run: `npx jest lib/mcp/config-display.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` reports no new errors (pre-existing `*.test.tsx` mock
errors are unrelated and stay).

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/config-display.ts lib/mcp/config-display.test.ts app/admin/settings/mcp app/admin/modern-admin-nav.tsx
git commit -m "feat(admin): add the MCP connection settings page"
```

---

### Task 6: Verify against a real Claude Code

**Files:** none — this is the acceptance gate the spec requires.

- [ ] **Step 1: Run the whole suite and typecheck**

Run: `npx jest app/api/mcp lib/mcp && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Deploy and confirm the build is live**

Push to `main`, then confirm the login page's `buildId` changes.

- [ ] **Step 3: Connect a real client and prove the handshake**

Run `claude mcp add --transport http pft-portal <url>/api/mcp --header "Authorization: Bearer <key>"`
in a scratch directory, then list the tools and create a throwaway ticket
against a test company. Delete the ticket and remove the server entry after.
Expected: ten tools listed; the ticket appears in the portal attributed to
"PFT AI Agent (Bot)".

This step is what closes the gap the design flagged: the protocol behaviour was
read from the Claude Code bundle, not captured live. If the handshake fails
here, capture the actual methods and headers received before changing anything.
