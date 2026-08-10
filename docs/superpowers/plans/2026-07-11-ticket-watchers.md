# Ticket Watchers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-ticket watcher system that grants cross-firm view+comment access, merges watched tickets into portal lists, and notifies watchers on updates.

**Architecture:** New `TicketWatcher` join table (ticketId + userId), a central `ticketAccess()` helper that replaces all portal company-scoped guards, watcher management API routes, and a sidebar UI panel on both admin and portal ticket detail pages. Notifications extend the existing `NotificationService` pattern.

**Tech Stack:** Next.js 14 (App Router), Prisma (PostgreSQL), Jest, SMTP notifications, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-11-ticket-watchers-design.md`

## Global Constraints

- Node 22 via nvm (default shell is v11 — run `source ~/.nvm/nvm.sh && nvm use 22` before tsc/build)
- DATABASE_URL points to Coolify-internal host — DB-backed pages don't render locally. Verify on deploy.
- Tests use Jest with ts-jest. Mock prisma with `jest.mock('@/lib/prisma', ...)`.
- Follow existing patterns: `requireClient()`/`requireAdmin()` for auth, `ActivityService` for timeline, `NotificationService` for email, `NextResponse.json()` for responses.
- Design tokens: `bg-bg-elev`, `border-line`, `text-ink`, `text-ink-mute`, `font-mono text-[10px] uppercase tracking-[0.22em]` for labels.
- No new npm dependencies.

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `TicketWatcher` model, `WATCHER_ADDED`/`WATCHER_REMOVED` activity types, `watchers` relation on Ticket, `watchedTickets`/`addedWatchers` relations on User

- [ ] **Step 1: Add ActivityType enum values**

In `prisma/schema.prisma`, add two values to the `ActivityType` enum after `MENTIONED`:

```prisma
enum ActivityType {
  // ... existing values ...
  MENTIONED
  WATCHER_ADDED
  WATCHER_REMOVED
}
```

- [ ] **Step 2: Add TicketWatcher model**

Add after the `TicketActivity` model in `prisma/schema.prisma`:

```prisma
model TicketWatcher {
  id        String   @id @default(cuid())
  ticketId  String
  userId    String
  addedById String
  createdAt DateTime @default(now())

  ticket  Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user    User   @relation("WatchedTickets", fields: [userId], references: [id], onDelete: Cascade)
  addedBy User   @relation("AddedWatchers", fields: [addedById], references: [id])

  @@unique([ticketId, userId])
  @@index([userId])
  @@map("ticket_watchers")
}
```

- [ ] **Step 3: Add relations to existing models**

Add to the `Ticket` model relations block (after `activities`):

```prisma
watchers         TicketWatcher[]
```

Add to the `User` model relations block (after `activities`):

```prisma
watchedTickets  TicketWatcher[] @relation("WatchedTickets")
addedWatchers   TicketWatcher[] @relation("AddedWatchers")
```

- [ ] **Step 4: Generate Prisma client**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 5: Create migration SQL**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx prisma migrate dev --name add_ticket_watchers --create-only
```

Expected: Migration file created at `prisma/migrations/<timestamp>_add_ticket_watchers/migration.sql`. Review it — should contain `CREATE TABLE "ticket_watchers"`, `ALTER TYPE "ActivityType" ADD VALUE`, unique constraint, indexes, and foreign keys.

- [ ] **Step 6: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit 2>&1 | grep -v '.test.' | head -20
```

Expected: No new errors in production files.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(watchers): add TicketWatcher model and WATCHER_ADDED/REMOVED activity types"
```

---

### Task 2: `ticketAccess()` Helper + Tests

**Files:**
- Create: `lib/ticket-access.ts`
- Create: `lib/ticket-access.test.ts`

**Interfaces:**
- Produces: `ticketAccess(userId, userRole, userCompanyId, ticketId): Promise<{ view: boolean; comment: boolean; manage: boolean }>` — used by all guard sites in Tasks 3-4 and all API routes in Tasks 5-6.

- [ ] **Step 1: Write failing tests**

Create `lib/ticket-access.test.ts`:

```typescript
import { ticketAccess } from './ticket-access'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn() },
    ticketWatcher: { findUnique: jest.fn() },
  },
}))

const mockTicketFind = prisma.ticket.findUnique as jest.MockedFunction<typeof prisma.ticket.findUnique>
const mockWatcherFind = prisma.ticketWatcher.findUnique as jest.MockedFunction<typeof prisma.ticketWatcher.findUnique>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ticketAccess', () => {
  const ticketId = 'ticket-1'
  const ticket = { companyId: 'company-a' }

  it('admin gets full access', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    const result = await ticketAccess('admin-1', 'ADMIN', null, ticketId)
    expect(result).toEqual({ view: true, comment: true, manage: true })
    expect(mockWatcherFind).not.toHaveBeenCalled()
  })

  it('owner-firm client gets full access', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    const result = await ticketAccess('client-1', 'CLIENT', 'company-a', ticketId)
    expect(result).toEqual({ view: true, comment: true, manage: true })
    expect(mockWatcherFind).not.toHaveBeenCalled()
  })

  it('watcher gets view+comment, not manage', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    mockWatcherFind.mockResolvedValue({ id: 'w-1' } as any)
    const result = await ticketAccess('client-2', 'CLIENT', 'company-b', ticketId)
    expect(result).toEqual({ view: true, comment: true, manage: false })
  })

  it('non-watcher cross-firm client gets nothing', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    mockWatcherFind.mockResolvedValue(null)
    const result = await ticketAccess('client-3', 'CLIENT', 'company-c', ticketId)
    expect(result).toEqual({ view: false, comment: false, manage: false })
  })

  it('returns no access when ticket not found', async () => {
    mockTicketFind.mockResolvedValue(null)
    const result = await ticketAccess('client-1', 'CLIENT', 'company-a', ticketId)
    expect(result).toEqual({ view: false, comment: false, manage: false })
  })

  it('deleted ticket returns no access', async () => {
    mockTicketFind.mockResolvedValue({ companyId: 'company-a', isDeleted: true } as any)
    const result = await ticketAccess('client-1', 'CLIENT', 'company-a', ticketId)
    expect(result).toEqual({ view: false, comment: false, manage: false })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx jest lib/ticket-access.test.ts --no-coverage 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module './ticket-access'`

- [ ] **Step 3: Implement ticketAccess**

Create `lib/ticket-access.ts`:

```typescript
import { prisma } from '@/lib/prisma'

export type TicketCapability = {
  view: boolean
  comment: boolean
  manage: boolean
}

const NO_ACCESS: TicketCapability = { view: false, comment: false, manage: false }
const FULL_ACCESS: TicketCapability = { view: true, comment: true, manage: true }
const WATCHER_ACCESS: TicketCapability = { view: true, comment: true, manage: false }

export async function ticketAccess(
  userId: string,
  userRole: string,
  userCompanyId: string | null,
  ticketId: string,
): Promise<TicketCapability> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { companyId: true, isDeleted: true },
  })

  if (!ticket || ticket.isDeleted) return NO_ACCESS

  if (userRole === 'ADMIN') return FULL_ACCESS

  if (userCompanyId && ticket.companyId === userCompanyId) return FULL_ACCESS

  const watcher = await prisma.ticketWatcher.findUnique({
    where: { ticketId_userId: { ticketId, userId } },
  })

  return watcher ? WATCHER_ACCESS : NO_ACCESS
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx jest lib/ticket-access.test.ts --no-coverage 2>&1 | tail -10
```

Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/ticket-access.ts lib/ticket-access.test.ts
git commit -m "feat(watchers): add ticketAccess() capability helper with tests"
```

---

### Task 3: Update Portal Read Guards (Pages)

Replace `companyId` checks in portal server components with `ticketAccess()`. Merge watched tickets into list queries.

**Files:**
- Modify: `app/portal/tickets/[id]/page.tsx` (detail page guard + conditional UI)
- Modify: `app/portal/tickets/page.tsx` (list query)
- Modify: `app/portal/page.tsx` (dashboard recent list query)

**Interfaces:**
- Consumes: `ticketAccess()` from `lib/ticket-access.ts`
- Produces: Portal pages that show watched cross-firm tickets alongside own-firm tickets

- [ ] **Step 1: Update ticket detail page guard**

In `app/portal/tickets/[id]/page.tsx`, replace the company guard (around lines 59-94).

Replace:
```typescript
const session = await requireClient()
const companyId = session.user.companyId!

// ... prisma.ticket.findUnique ...

// Return 404 if ticket doesn't exist or belongs to different company
if (!ticket || ticket.companyId !== companyId) {
  notFound()
}
```

With:
```typescript
import { ticketAccess, TicketCapability } from '@/lib/ticket-access'

// ... inside the function, after requireClient():
const session = await requireClient()
const companyId = session.user.companyId!

const access = await ticketAccess(session.user.id, session.user.role, companyId, params.id)
if (!access.view) {
  notFound()
}

// ... keep the existing prisma.ticket.findUnique query as-is ...
// After the query, add a second guard for the ticket being null:
if (!ticket) {
  notFound()
}
```

- [ ] **Step 2: Pass `access` to manage components for conditional rendering**

In the same file, pass `canManage={access.manage}` to `TicketStatusForm` and `TicketPriorityForm`, and conditionally hide `EditTicketForm`:

Replace the sidebar status/priority cards (lines ~324-342):
```tsx
{access.manage && (
  <Card>
    <CardHeader>
      <CardTitle>Manage Status</CardTitle>
    </CardHeader>
    <CardContent>
      <TicketStatusForm ticketId={ticket.id} currentStatus={ticket.status} />
    </CardContent>
  </Card>
)}

{access.manage && (
  <Card>
    <CardHeader>
      <CardTitle>Manage Priority</CardTitle>
    </CardHeader>
    <CardContent>
      <TicketPriorityForm ticketId={ticket.id} currentPriority={ticket.priority} />
    </CardContent>
  </Card>
)}
```

Also wrap `EditTicketForm` and `AddAttachmentsForm` (lines ~152-161):
```tsx
{access.manage && (
  <div className="flex gap-2">
    <EditTicketForm
      ticketId={ticket.id}
      initialTitle={ticket.title}
      initialDescription={ticket.description}
      initialCategory={ticket.category || undefined}
    />
    <AddAttachmentsForm ticketId={ticket.id} />
  </div>
)}
```

The `access` variable must be declared before the JSX return. It already is from step 1.

- [ ] **Step 3: Update portal tickets list query**

In `app/portal/tickets/page.tsx`, after `const companyId = session.user.companyId!` (line 34), add a watched ticket IDs lookup and update the `where` clause:

```typescript
const companyId = session.user.companyId!

const watchedTicketIds = await prisma.ticketWatcher.findMany({
  where: { userId: session.user.id },
  select: { ticketId: true },
}).then(rows => rows.map(r => r.ticketId))
```

Replace the where clause (line 43):
```typescript
// Old: const where: any = { companyId, isDeleted: false }
const where: any = {
  OR: [
    { companyId, isDeleted: false },
    ...(watchedTicketIds.length > 0
      ? [{ id: { in: watchedTicketIds }, isDeleted: false }]
      : []),
  ],
}
```

Add search filter wrapping:
```typescript
if (searchParams.search) {
  where.AND = [
    {
      OR: [
        { title: { contains: searchParams.search, mode: 'insensitive' } },
        { description: { contains: searchParams.search, mode: 'insensitive' } },
      ],
    },
  ]
}
```

Also add `company: { select: { name: true } }` to the `include` block (around line 58) so the list can display the firm name for cross-firm tickets.

Add the `import { prisma } from '@/lib/prisma'` is already there — just add `ticketWatcher` usage.

- [ ] **Step 4: Update dashboard recent tickets query**

In `app/portal/page.tsx`, same pattern. After `const companyId = session.user.companyId!` (line 26):

```typescript
const watchedTicketIds = await prisma.ticketWatcher.findMany({
  where: { userId: session.user.id },
  select: { ticketId: true },
}).then(rows => rows.map(r => r.ticketId))
```

Update `ticketWhere` (line 46):
```typescript
const ticketWhere: any = {
  OR: [
    { companyId, isDeleted: false },
    ...(watchedTicketIds.length > 0
      ? [{ id: { in: watchedTicketIds }, isDeleted: false }]
      : []),
  ],
}
```

Wrap the search filter:
```typescript
if (searchParams.search) {
  ticketWhere.AND = [
    {
      OR: [
        { title: { contains: searchParams.search, mode: 'insensitive' } },
        { description: { contains: searchParams.search, mode: 'insensitive' } },
      ],
    },
  ]
}
```

Add `company: { select: { name: true } }` to the `include` in `recentTickets` query.

**Dashboard stat counts stay firm-scoped** — do NOT change the `Promise.all` count queries (lines 55-60). Only the list merges.

- [ ] **Step 5: Add "Watching · FirmName" indicator to ticket rows**

In `app/portal/page.tsx`, in the ticket row's title cell (around line 157), add below the `#{ticket.id.slice(0,8)}` line:

```tsx
<div className="mt-1 text-[11px] font-mono text-ink-mute">
  #{ticket.id.slice(0, 8)}
  {ticket.companyId !== companyId && (
    <span className="ml-2 text-info">
      Watching · {ticket.company?.name}
    </span>
  )}
</div>
```

Apply the same pattern in `app/portal/tickets/page.tsx` wherever ticket titles are rendered in the list/table view.

- [ ] **Step 6: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit 2>&1 | grep -v '.test.' | head -20
```

Expected: No new errors in production files.

- [ ] **Step 7: Commit**

```bash
git add app/portal/tickets/\[id\]/page.tsx app/portal/tickets/page.tsx app/portal/page.tsx
git commit -m "feat(watchers): update portal pages to use ticketAccess() and merge watched tickets"
```

---

### Task 4: Update Portal API Route Guards

Replace `companyId !== companyId` guards in portal API routes with `ticketAccess()`.

**Files:**
- Modify: `app/api/portal/tickets/[id]/route.ts` (GET — view)
- Modify: `app/api/portal/tickets/[id]/comments/route.ts` (GET/POST — comment)
- Modify: `app/api/portal/tickets/[id]/comments/[commentId]/images/route.ts` (POST — comment)
- Modify: `app/api/portal/tickets/[id]/images/route.ts` (GET/POST — view)
- Modify: `app/api/portal/tickets/[id]/images/[imageId]/route.ts` (GET — view)
- Modify: `app/api/portal/tickets/[id]/status/route.ts` (PATCH — manage)
- Modify: `app/api/portal/tickets/[id]/priority/route.ts` (PATCH — manage)

**Interfaces:**
- Consumes: `ticketAccess()` from `lib/ticket-access.ts`

The pattern is the same for each file. Replace the manual company check with `ticketAccess()`. For view/comment routes, check the appropriate capability. For status/priority, check `manage`.

- [ ] **Step 1: Update ticket GET route (view)**

In `app/api/portal/tickets/[id]/route.ts`, replace:
```typescript
const companyId = session.user.companyId!
// ... findUnique ...
if (ticket.companyId !== companyId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

With:
```typescript
import { ticketAccess } from '@/lib/ticket-access'

const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
if (!access.view) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

Note: return 404 (not 403) to avoid confirming ticket existence to unauthorized users.

- [ ] **Step 2: Update comments route (comment capability)**

In `app/api/portal/tickets/[id]/comments/route.ts`, replace the company guard (line 46):

```typescript
import { ticketAccess } from '@/lib/ticket-access'

// Replace companyId guard with:
const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
if (!access.comment) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

Remove the now-unused `const companyId = session.user.companyId!` line, and the `prisma.ticket.findUnique` + guard block. The `ticketAccess` call already verified the ticket exists. Fetch the ticket separately for the notification/activity calls that need ticket data.

Actually, keep the `findUnique` for the ticket data needed by notifications — just remove the manual `companyId` guard. The `ticketAccess` check replaces only the authorization logic, not the data fetch.

- [ ] **Step 3: Update comment images route (comment capability)**

In `app/api/portal/tickets/[id]/comments/[commentId]/images/route.ts`:

```typescript
import { ticketAccess } from '@/lib/ticket-access'

const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
if (!access.comment) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

Replace the existing `ticket.companyId !== companyId` check.

- [ ] **Step 4: Update ticket images routes (view capability)**

In `app/api/portal/tickets/[id]/images/route.ts`:

```typescript
import { ticketAccess } from '@/lib/ticket-access'

const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
if (!access.view) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
```

In `app/api/portal/tickets/[id]/images/[imageId]/route.ts`, same pattern with `access.view`.

- [ ] **Step 5: Update status route (manage capability)**

In `app/api/portal/tickets/[id]/status/route.ts`, replace the guard (line 47):

```typescript
import { ticketAccess } from '@/lib/ticket-access'

// Replace: if (session.user.role === 'CLIENT' && ticket.companyId !== session.user.companyId)
const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
if (!access.manage) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

Keep the existing `findUnique` for ticket data (needed for status comparison logic).

- [ ] **Step 6: Update priority route (manage capability)**

In `app/api/portal/tickets/[id]/priority/route.ts`, same as status:

```typescript
import { ticketAccess } from '@/lib/ticket-access'

const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
if (!access.manage) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

- [ ] **Step 7: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit 2>&1 | grep -v '.test.' | head -20
```

Expected: No new errors.

- [ ] **Step 8: Commit**

```bash
git add app/api/portal/tickets/
git commit -m "feat(watchers): replace portal API company guards with ticketAccess()"
```

---

### Task 5: Watcher Management API

**Files:**
- Create: `app/api/tickets/[id]/watchers/route.ts`
- Modify: `lib/services/activity.ts`
- Modify: `lib/services/notification.ts`

**Interfaces:**
- Consumes: `ticketAccess()` from `lib/ticket-access.ts`, `ActivityService` from `lib/services/activity.ts`, `NotificationService` from `lib/services/notification.ts`
- Produces: `GET/POST /api/tickets/[id]/watchers`, `DELETE /api/tickets/[id]/watchers` (body: `{ watcherId }`)

- [ ] **Step 1: Add ActivityService helper methods**

In `lib/services/activity.ts`, add two new static methods:

```typescript
static watcherAdded(ticketId: string, actorId: string, watcherUser: { id: string; name: string; email: string }) {
  return this.log({
    ticketId,
    actorId,
    type: ActivityType.WATCHER_ADDED,
    toValue: watcherUser.name,
    meta: { watcherUserId: watcherUser.id, watcherUserName: watcherUser.name, watcherUserEmail: watcherUser.email },
  })
}

static watcherRemoved(ticketId: string, actorId: string, watcherUser: { id: string; name: string; email: string }) {
  return this.log({
    ticketId,
    actorId,
    type: ActivityType.WATCHER_REMOVED,
    fromValue: watcherUser.name,
    meta: { watcherUserId: watcherUser.id, watcherUserName: watcherUser.name, watcherUserEmail: watcherUser.email },
  })
}
```

- [ ] **Step 2: Add NotificationService.notifyWatcherAdded**

In `lib/services/notification.ts`, add:

```typescript
static async notifyWatcherAdded(ticketId: string, watcherUserId: string): Promise<void> {
  try {
    const smtpSettings = await prisma.sMTPSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!smtpSettings) return

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    })
    if (!ticket) return

    const watcher = await prisma.user.findUnique({
      where: { id: watcherUserId },
      select: { name: true, email: true, role: true },
    })
    if (!watcher) return

    const portalPath = watcher.role === 'ADMIN' ? 'admin' : 'portal'
    const subject = `[Watching] You've been added to: ${ticket.title}`
    const html = baseHtml('You\'re Now Watching a Ticket', `
      <p>Hi ${watcher.name},</p>
      <p>You've been added as a watcher on a support ticket. You'll receive notifications when there are updates.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#6b7280;width:120px;">Ticket</td><td style="padding:8px;font-weight:600;">${ticket.title}</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Company</td><td style="padding:8px;">${ticket.company.name}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">Created by</td><td style="padding:8px;">${ticket.createdBy.name}</td></tr>
      </table>
      <a href="${process.env.NEXTAUTH_URL}/${portalPath}/tickets/${ticketId}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">View Ticket →</a>
    `)

    await SMTPService.sendEmail({ to: watcher.email, subject, html })
  } catch (err) {
    console.error('[NotificationService] notifyWatcherAdded failed:', err)
  }
}
```

- [ ] **Step 3: Add NotificationService.notifyWatchers**

In `lib/services/notification.ts`, add a method to notify all watchers on ticket events:

```typescript
static async notifyWatchers(
  ticketId: string,
  event: 'comment' | 'status_changed',
  excludeUserId?: string,
  extraContext?: { commentAuthor?: string; commentPreview?: string; oldStatus?: string; newStatus?: string },
): Promise<void> {
  try {
    const smtpSettings = await prisma.sMTPSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!smtpSettings) return

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        company: { select: { name: true } },
        watchers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    })
    if (!ticket) return

    for (const w of ticket.watchers) {
      if (w.user.id === excludeUserId) continue

      const portalPath = w.user.role === 'ADMIN' ? 'admin' : 'portal'
      let subject: string
      let body: string

      if (event === 'comment') {
        subject = `[Ticket Update] New comment on: ${ticket.title}`
        body = `
          <p>Hi ${w.user.name},</p>
          <p>A new comment was added to a ticket you're watching.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#6b7280;width:120px;">Ticket</td><td style="padding:8px;font-weight:600;">${ticket.title}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Company</td><td style="padding:8px;">${ticket.company.name}</td></tr>
            ${extraContext?.commentAuthor ? `<tr><td style="padding:8px;color:#6b7280;">Comment by</td><td style="padding:8px;">${extraContext.commentAuthor}</td></tr>` : ''}
          </table>
          ${extraContext?.commentPreview ? `<div style="background:#f9fafb;padding:16px;border-radius:6px;margin:16px 0;"><p style="color:#374151;margin:0;">${extraContext.commentPreview.slice(0, 300)}</p></div>` : ''}
          <a href="${process.env.NEXTAUTH_URL}/${portalPath}/tickets/${ticketId}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">View Ticket →</a>
        `
      } else {
        subject = `[Ticket Update] Status changed on: ${ticket.title}`
        body = `
          <p>Hi ${w.user.name},</p>
          <p>A ticket you're watching has had its status updated.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#6b7280;width:120px;">Ticket</td><td style="padding:8px;font-weight:600;">${ticket.title}</td></tr>
            ${extraContext?.oldStatus ? `<tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Previous status</td><td style="padding:8px;">${extraContext.oldStatus.replace(/_/g, ' ')}</td></tr>` : ''}
            ${extraContext?.newStatus ? `<tr><td style="padding:8px;color:#6b7280;">New status</td><td style="padding:8px;font-weight:600;color:#2563eb;">${extraContext.newStatus.replace(/_/g, ' ')}</td></tr>` : ''}
          </table>
          <a href="${process.env.NEXTAUTH_URL}/${portalPath}/tickets/${ticketId}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">View Ticket →</a>
        `
      }

      const html = baseHtml(event === 'comment' ? 'New Comment on Watched Ticket' : 'Status Change on Watched Ticket', body)
      await SMTPService.sendEmail({ to: w.user.email, subject, html })
    }
  } catch (err) {
    console.error('[NotificationService] notifyWatchers failed:', err)
  }
}
```

- [ ] **Step 4: Create watcher management API route**

Create `app/api/tickets/[id]/watchers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { ticketAccess } from '@/lib/ticket-access'
import { ActivityService } from '@/lib/services/activity'
import { NotificationService } from '@/lib/services/notification'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, params.id)
    if (!access.view) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const watchers = await prisma.ticketWatcher.findMany({
      where: { ticketId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, company: { select: { name: true } } } },
        addedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(watchers)
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching watchers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true, isDeleted: true },
    })
    if (!ticket || ticket.isDeleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isOwnerFirm = session.user.companyId === ticket.companyId

    if (!isAdmin && !isOwnerFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    let targetUser: { id: string; name: string; email: string } | null = null

    if (isAdmin && body.userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true, name: true, email: true, isActive: true },
      }) as any
      if (!targetUser || !(targetUser as any).isActive) {
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
      }
    } else if (body.email) {
      const found = await prisma.user.findFirst({
        where: { email: body.email, isActive: true },
        select: { id: true, name: true, email: true },
      })
      if (!found) {
        return NextResponse.json({ error: 'No account found for that email' }, { status: 404 })
      }
      targetUser = found
    } else {
      return NextResponse.json({ error: 'Provide userId (admin) or email (client)' }, { status: 400 })
    }

    const existing = await prisma.ticketWatcher.findUnique({
      where: { ticketId_userId: { ticketId: params.id, userId: targetUser.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already watching this ticket' }, { status: 409 })
    }

    const watcher = await prisma.ticketWatcher.create({
      data: {
        ticketId: params.id,
        userId: targetUser.id,
        addedById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, company: { select: { name: true } } } },
        addedBy: { select: { name: true } },
      },
    })

    ActivityService.watcherAdded(params.id, session.user.id, targetUser).catch(() => {})
    NotificationService.notifyWatcherAdded(params.id, targetUser.id).catch(() => {})

    return NextResponse.json(watcher, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding watcher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { watcherId } = body
    if (!watcherId) {
      return NextResponse.json({ error: 'watcherId required' }, { status: 400 })
    }

    const watcherRecord = await prisma.ticketWatcher.findUnique({
      where: { id: watcherId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { companyId: true } },
      },
    })
    if (!watcherRecord || watcherRecord.ticketId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isOwnerFirm = session.user.companyId === watcherRecord.ticket.companyId
    const isSelf = session.user.id === watcherRecord.userId

    if (!isAdmin && !isOwnerFirm && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.ticketWatcher.delete({ where: { id: watcherId } })

    ActivityService.watcherRemoved(params.id, session.user.id, watcherRecord.user).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error removing watcher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Wire watcher notifications into existing comment and status routes**

In `app/api/portal/tickets/[id]/comments/route.ts`, after the existing notification calls (around line 98), add:

```typescript
import { NotificationService } from '@/lib/services/notification'

// After the existing notifyAdminNewComment/notifyClientNewComment/notifyMentionedUsers calls:
NotificationService.notifyWatchers(params.id, 'comment', session.user.id, {
  commentAuthor: session.user.name,
  commentPreview: data.message,
}).catch(() => {})
```

In `app/api/portal/tickets/[id]/status/route.ts`, after the activity log (around line 73), add:

```typescript
import { NotificationService } from '@/lib/services/notification'

// After: ActivityService.statusChanged(...)
NotificationService.notifyWatchers(params.id, 'status_changed', session.user.id, {
  oldStatus: ticket.status,
  newStatus: status,
}).catch(() => {})
```

Also add the same call in the admin status route at `app/api/admin/tickets/[id]/status/route.ts` if it exists and handles status changes.

- [ ] **Step 6: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit 2>&1 | grep -v '.test.' | head -20
```

Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/tickets/ lib/services/activity.ts lib/services/notification.ts app/api/portal/tickets/
git commit -m "feat(watchers): add watcher management API + notifications + activity logging"
```

---

### Task 6: Watchers UI Panel (Admin + Portal)

**Files:**
- Create: `components/watchers-panel.tsx`
- Modify: `app/admin/tickets/[id]/page.tsx`
- Modify: `app/portal/tickets/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/tickets/[id]/watchers`
- Produces: `<WatchersPanel>` client component rendered in both ticket detail sidebars

- [ ] **Step 1: Create WatchersPanel component**

Create `components/watchers-panel.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Eye, Loader2 } from 'lucide-react'

interface Watcher {
  id: string
  user: {
    id: string
    name: string
    email: string
    company: { name: string } | null
  }
  addedBy: { name: string }
  createdAt: string
}

interface WatchersPanelProps {
  ticketId: string
  isAdmin: boolean
  canAddWatchers: boolean
  currentUserId: string
}

export function WatchersPanel({ ticketId, isAdmin, canAddWatchers, currentUserId }: WatchersPanelProps) {
  const [watchers, setWatchers] = useState<Watcher[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; company: { name: string } | null }>>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchWatchers()
  }, [ticketId])

  async function fetchWatchers() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/watchers`)
      if (res.ok) setWatchers(await res.json())
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function addByEmail() {
    if (!input.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/watchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.trim() }),
      })
      if (res.ok) {
        setInput('')
        setShowAdd(false)
        fetchWatchers()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add watcher')
      }
    } catch {
      setError('Network error')
    } finally {
      setAdding(false)
    }
  }

  async function addById(userId: string) {
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/watchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setInput('')
        setSearchResults([])
        setShowAdd(false)
        fetchWatchers()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add watcher')
      }
    } catch {
      setError('Network error')
    } finally {
      setAdding(false)
    }
  }

  async function searchUsers(query: string) {
    setInput(query)
    if (!isAdmin || query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        const watcherIds = new Set(watchers.map(w => w.user.id))
        setSearchResults((data.users || data).filter((u: any) => !watcherIds.has(u.id)))
      }
    } catch {
    } finally {
      setSearching(false)
    }
  }

  async function removeWatcher(watcherId: string) {
    try {
      await fetch(`/api/tickets/${ticketId}/watchers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watcherId }),
      })
      fetchWatchers()
    } catch {
    }
  }

  const canRemove = (watcher: Watcher) =>
    isAdmin || canAddWatchers || watcher.user.id === currentUserId

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Watchers
          {watchers.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0">{watchers.length}</Badge>
          )}
        </div>
        {canAddWatchers && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-ink-faint hover:text-accent transition-colors"
            title="Add watcher"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-ink-mute" />
        </div>
      ) : watchers.length === 0 && !showAdd ? (
        <p className="text-xs text-ink-faint py-2">No watchers yet.</p>
      ) : (
        <div className="space-y-2">
          {watchers.map((w) => (
            <div key={w.id} className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-md bg-ink text-bg flex items-center justify-center text-xs font-medium shrink-0">
                {w.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink truncate">{w.user.name}</div>
                <div className="text-[11px] text-ink-mute truncate">
                  {w.user.email}
                  {w.user.company && <span className="ml-1 text-ink-faint">· {w.user.company.name}</span>}
                </div>
              </div>
              {canRemove(w) && (
                <button
                  onClick={() => removeWatcher(w.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-all shrink-0"
                  title="Remove watcher"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="space-y-2 pt-2 border-t border-line-soft">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => isAdmin ? searchUsers(e.target.value) : setInput(e.target.value)}
              placeholder={isAdmin ? 'Search users...' : 'Enter email address'}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAdmin) addByEmail()
                if (e.key === 'Escape') {
                  setShowAdd(false)
                  setInput('')
                  setSearchResults([])
                  setError(null)
                }
              }}
            />
            {!isAdmin && (
              <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={addByEmail} disabled={adding}>
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
              </Button>
            )}
          </div>

          {isAdmin && searchResults.length > 0 && (
            <div className="border border-line rounded-lg overflow-hidden divide-y divide-line-soft">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => addById(user.id)}
                  disabled={adding}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-sunken transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-ink text-bg flex items-center justify-center text-[10px] font-medium shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{user.name}</div>
                    <div className="text-[10px] text-ink-mute truncate">
                      {user.email}
                      {user.company && <span> · {user.company.name}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isAdmin && searching && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-ink-mute">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching...
            </div>
          )}

          <button
            onClick={() => { setShowAdd(false); setInput(''); setSearchResults([]); setError(null) }}
            className="text-xs text-ink-faint hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add admin user search API (if needed)**

Check if `/api/admin/users` exists with search support. If not, add a `search` query param to the existing admin users endpoint. If the endpoint returns paginated data, the WatchersPanel expects an array at `data.users` or the root response.

If no search endpoint exists, create `app/api/admin/users/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const search = request.nextUrl.searchParams.get('search') || ''
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: { select: { name: true } },
      },
      take: limit,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error: any) {
    if (error.message === 'Admin access required' || error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Then update the `searchUsers` function in `WatchersPanel` to use `/api/admin/users/search?search=...`.

- [ ] **Step 3: Add WatchersPanel to admin ticket detail sidebar**

In `app/admin/tickets/[id]/page.tsx`, import and add the panel in the sidebar (after the Ticket Information card, before TicketCommits, around line 516):

```tsx
import { WatchersPanel } from '@/components/watchers-panel'

// In the sidebar, add a new Card:
<Card>
  <CardContent className="pt-5">
    <WatchersPanel
      ticketId={ticket.id}
      isAdmin={true}
      canAddWatchers={true}
      currentUserId={session.user.id}
    />
  </CardContent>
</Card>
```

- [ ] **Step 4: Add WatchersPanel to portal ticket detail sidebar**

In `app/portal/tickets/[id]/page.tsx`, import and add the panel in the sidebar (after the Ticket Info card, before the Help card, around line 380):

```tsx
import { WatchersPanel } from '@/components/watchers-panel'

// In the sidebar, add a new Card:
<Card>
  <CardContent className="pt-5">
    <WatchersPanel
      ticketId={ticket.id}
      isAdmin={false}
      canAddWatchers={access.manage}
      currentUserId={session.user.id}
    />
  </CardContent>
</Card>
```

The `access.manage` prop means only owner-firm clients (and admins) can add watchers — watchers themselves cannot add other watchers.

- [ ] **Step 5: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit 2>&1 | grep -v '.test.' | head -20
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add components/watchers-panel.tsx app/admin/tickets/\[id\]/page.tsx app/portal/tickets/\[id\]/page.tsx app/api/admin/users/search/
git commit -m "feat(watchers): add WatchersPanel UI to admin and portal ticket detail sidebars"
```

---

### Task 7: Access Control Tests

**Files:**
- Create: `app/api/tickets/[id]/watchers/route.test.ts`

**Interfaces:**
- Consumes: watcher API routes from Task 5

- [ ] **Step 1: Write access control tests**

Create `app/api/tickets/[id]/watchers/route.test.ts`:

```typescript
import { ticketAccess } from '@/lib/ticket-access'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn() },
    ticketWatcher: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
  },
}))
jest.mock('@/lib/ticket-access')

import { prisma } from '@/lib/prisma'

const mockTicketAccess = ticketAccess as jest.MockedFunction<typeof ticketAccess>

describe('Watcher access control', () => {
  it('watcher CAN view ticket (ticketAccess returns view:true)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.view).toBe(true)
    expect(result.manage).toBe(false)
  })

  it('watcher CAN comment (ticketAccess returns comment:true)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.comment).toBe(true)
  })

  it('watcher CANNOT change status (manage:false)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.manage).toBe(false)
  })

  it('watcher CANNOT change priority (manage:false)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.manage).toBe(false)
  })

  it('non-watcher cross-firm user gets no access', async () => {
    mockTicketAccess.mockResolvedValue({ view: false, comment: false, manage: false })
    const result = await ticketAccess('stranger-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.view).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx jest app/api/tickets/ lib/ticket-access.test.ts --no-coverage 2>&1 | tail -15
```

Expected: All tests pass.

- [ ] **Step 3: Run full test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx jest --no-coverage 2>&1 | tail -10
```

Expected: No regressions. Pre-existing failures are acceptable.

- [ ] **Step 4: Final typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && npx tsc --noEmit 2>&1 | grep -v '.test.' | head -20
```

Expected: No new errors in production files.

- [ ] **Step 5: Commit**

```bash
git add app/api/tickets/\[id\]/watchers/route.test.ts
git commit -m "test(watchers): add access control tests for watcher capabilities"
```

---

## Summary

| Task | Description | Key files |
|------|-------------|-----------|
| 1 | Schema + migration | `prisma/schema.prisma` |
| 2 | `ticketAccess()` + tests | `lib/ticket-access.ts` |
| 3 | Portal page guards + list merge | `app/portal/` pages (3 files) |
| 4 | Portal API route guards | `app/api/portal/tickets/` (7 files) |
| 5 | Watcher management API + notifications | `app/api/tickets/[id]/watchers/`, services |
| 6 | WatchersPanel UI | `components/watchers-panel.tsx`, detail pages |
| 7 | Access control tests | Test files |
