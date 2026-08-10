# Ticket Watchers — Design Spec

**Date:** 2026-07-11
**Status:** Approved

## Problem

Admins and firm users need to bring specific people's attention to tickets — including users from other firms. Today, ticket visibility is strictly scoped by `companyId`. There is no way to grant per-ticket cross-tenant read access.

**Motivating example:** Admin wants Roland (XPIPS) to see a ticket belonging to PFT Support Team. Currently impossible without changing Roland's company.

## Solution

A **watcher** system that grants per-ticket view + comment access. Watchers see watched tickets merged into their normal portal ticket lists. Cross-firm watching is supported — tenant isolation is pierced on a per-ticket basis, controlled by explicit watcher records.

## Decisions

| Decision | Choice | Alternatives rejected |
|---|---|---|
| Storage | Join table `TicketWatcher` | `String[] watcherIds` on Ticket (no FK integrity, hard reverse lookup) |
| Cross-firm access | Allowed per-ticket | Firm-only (defeats the purpose) |
| Who can add watchers | Admins (any user) + owner-firm clients (by email) | Anyone; admins only |
| Watcher capabilities | View + comment | View-only; full manage |
| How watchers find tickets | Merged into portal ticket lists | Separate "Watched" tab |
| Internal notes | Hidden from watchers | Visible (breaks confidentiality) |

## 1. Data Model

### New table: `TicketWatcher`

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

### Relation additions

```prisma
// On Ticket model:
watchers TicketWatcher[]

// On User model:
watchedTickets  TicketWatcher[] @relation("WatchedTickets")
addedWatchers   TicketWatcher[] @relation("AddedWatchers")
```

### New activity types

Add to `ActivityType` enum:

```prisma
WATCHER_ADDED
WATCHER_REMOVED
```

Activity records use `meta` JSON to store `{ watcherUserId, watcherUserName, watcherUserEmail }`.

## 2. Access Control

Central helper: `lib/ticket-access.ts`

```typescript
type TicketCapability = { view: boolean; comment: boolean; manage: boolean }

async function ticketAccess(userId: string, userRole: string, userCompanyId: string | null, ticketId: string): Promise<TicketCapability>
```

**Rules:**

| Role | Condition | view | comment | manage |
|---|---|---|---|---|
| ADMIN | always | yes | yes | yes |
| CLIENT | `ticket.companyId === user.companyId` | yes | yes | yes |
| CLIENT | row in `TicketWatcher` | yes | yes | **no** |
| CLIENT | otherwise | no | no | no |

**"manage"** covers: status change, priority change, edit title/description, delete, assign. Watchers never get manage.

**Internal notes** (`TicketComment.internal === true`): filtered out for any non-ADMIN user, including watchers. Existing behavior — no change needed.

### Guard sites to update

Each site currently checks `ticket.companyId !== session.user.companyId` and returns 403/404. Replace with `ticketAccess()` call, checking appropriate capability.

**View-capable (watchers pass):**

| File | Line | Current guard |
|---|---|---|
| `app/portal/tickets/[id]/page.tsx` | 92 | `ticket.companyId !== companyId` |
| `app/api/portal/tickets/[id]/route.ts` | 35 | `ticket.companyId !== companyId` |
| `app/api/portal/tickets/[id]/images/route.ts` | 41 | `ticket.companyId !== companyId` |
| `app/api/portal/tickets/[id]/images/[imageId]/route.ts` | 19 | `ticket.companyId !== session.user.companyId` |

**Comment-capable (watchers pass):**

| File | Line | Current guard |
|---|---|---|
| `app/api/portal/tickets/[id]/comments/route.ts` | 46 | `ticket.companyId !== companyId` |
| `app/api/portal/tickets/[id]/comments/[commentId]/images/route.ts` | 40 | `ticket.companyId !== companyId` |

**Manage-only (watchers blocked):**

| File | Line | Current guard |
|---|---|---|
| `app/api/portal/tickets/[id]/status/route.ts` | 47 | `ticket.companyId !== session.user.companyId` |
| `app/api/portal/tickets/[id]/priority/route.ts` | 46 | `ticket.companyId !== session.user.companyId` |

**List queries (add OR clause):**

| File | Line | Current query |
|---|---|---|
| `app/portal/page.tsx` | 46-60 | `where: { companyId, isDeleted: false }` |
| `app/portal/tickets/page.tsx` | 34+ | `where: { companyId, ... }` |

**Unchanged (not ticket-scoped):**

- `app/api/portal/tickets/route.ts` — POST creates ticket, stays firm-only
- `app/api/portal/settings/notifications/route.ts` — firm settings, not ticket-scoped

## 3. Read Paths

### Ticket detail page (`app/portal/tickets/[id]/page.tsx`)

Replace:
```typescript
if (!ticket || ticket.companyId !== companyId) { notFound() }
```

With:
```typescript
const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId, ticketId)
if (!access.view) { notFound() }
```

Pass `access` to client components so UI can conditionally hide manage controls for watchers.

### Ticket lists (dashboard + tickets page)

Add watched ticket IDs to query:

```typescript
const watchedTicketIds = await prisma.ticketWatcher.findMany({
  where: { userId: session.user.id },
  select: { ticketId: true },
}).then(rows => rows.map(r => r.ticketId))

const ticketWhere = {
  OR: [
    { companyId, isDeleted: false },
    { id: { in: watchedTicketIds }, isDeleted: false },
  ],
}
```

### Dashboard stat counts

Stay firm-scoped. Watched tickets do NOT inflate Open/Resolved/In Progress tiles. Only the ticket lists merge.

### Watched ticket display

In ticket lists, watched tickets from other firms show a tag: **`Watching · {FirmName}`**. This distinguishes them from own-firm tickets. Include `company: { select: { name: true } }` in list queries.

## 4. Write Paths

### Comment POST (watchers allowed)

`app/api/portal/tickets/[id]/comments/route.ts`:
- Replace `companyId` guard with `ticketAccess(...).comment` check
- Watcher comments are non-internal (watchers are CLIENT role, internal notes already admin-gated)
- Existing notification flow (`notifyAdminNewComment`, `notifyClientNewComment`, `notifyMentionedUsers`) fires as usual

### Status/priority PATCH (watchers blocked)

`app/api/portal/tickets/[id]/status/route.ts` and `priority/route.ts`:
- Replace guard with `ticketAccess(...).manage` check
- Watchers get 403

## 5. Watcher Management API

### `POST /api/tickets/[id]/watchers`

Add a watcher. Body: `{ userId: string }` (admin) or `{ email: string }` (client).

**Authorization:**
- ADMIN: can add any user as watcher
- CLIENT with `ticket.companyId === user.companyId`: can add by email (must match existing user account)
- Others: 403

**Validation:**
- User must exist and be active (`isActive: true`)
- Cannot add duplicate watcher (unique constraint handles this)
- Cannot watch own ticket if already owner-firm member (optional — allow for v1 simplicity)

**Side effects:**
- Create `TicketActivity` with type `WATCHER_ADDED`
- Send email notification to the added watcher

### `DELETE /api/tickets/[id]/watchers/[watcherId]`

Remove a watcher.

**Authorization:**
- ADMIN: can remove any watcher
- CLIENT with `ticket.companyId === user.companyId`: can remove any watcher on their ticket
- The watcher themselves: can remove themselves (unwatch)
- Others: 403

**Side effects:**
- Create `TicketActivity` with type `WATCHER_REMOVED`

### `GET /api/tickets/[id]/watchers`

List watchers. Available to anyone with `view` access to the ticket.

Returns: `{ id, user: { id, name, email, company: { name } }, addedBy: { name }, createdAt }[]`

## 6. Notifications

### New: `NotificationService.notifyWatcherAdded`

When a user is added as watcher, email them:
- Subject: `[Watching] You've been added to: {ticket.title}`
- Body: ticket summary, link to portal ticket detail
- Always sent (watcher opted in by being added; not gated by firm's `NotificationSettings`)

### Extended: watcher notifications on ticket events

On new comment and status change, notify all watchers (except the actor). Reuse `notifyMentionedUsers` pattern — iterate watcher emails, send individualized emails.

**Events that notify watchers:**
- New non-internal comment (skip if watcher is the comment author)
- Status change

**Events that do NOT notify watchers:**
- Priority change (low signal for external watchers)
- Assignment change
- Internal notes (watchers can't see them)

### SMTP gating

Watcher notifications use the global SMTP settings but bypass per-company `NotificationSettings` toggles. Rationale: watcher is explicitly added, notification is opt-in by nature.

## 7. UI — Watchers Panel

### Location

Both ticket detail pages:
- Admin: `app/admin/tickets/[id]/page.tsx`
- Portal: `app/portal/tickets/[id]/page.tsx`

### Components

**`WatchersList`** — displays current watchers:
- Avatar initial + name + email + firm name
- "Added by {name}" subtitle
- Remove button (X icon) if user has permission
- Empty state: "No watchers yet"

**`AddWatcherForm`** — add watcher input:
- **Admin view:** searchable user picker (combobox), searches across all firms, shows `{name} · {firm}` in results
- **Client view:** email input field + "Add" button. If email matches existing user, add as watcher. If not, show "No account found for that email."
- Placed below watchers list

### Design tokens

Follow existing ticket detail sidebar patterns:
- Section container: `bg-bg-elev border border-line rounded-xl`
- Section header: `font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute`
- Watcher row: `flex items-center gap-3`, avatar circle, name `text-sm text-ink`, email `text-xs text-ink-mute`
- Remove button: `text-ink-faint hover:text-danger` with X icon
- Add button: `Button variant="outline" size="sm"`

### Watched ticket indicator in lists

In portal ticket list/dashboard, for watched cross-firm tickets:
```tsx
<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-info">
  Watching · {ticket.company.name}
</span>
```

Displayed below the ticket title in the ticket cell, alongside the existing `#{ticket.id.slice(0,8)}` mono ID.

## 8. Security

### Threat model

| Threat | Mitigation |
|---|---|
| Watcher escalates to manage (status/priority change) | `ticketAccess().manage` returns false for watchers; status/priority routes check manage capability |
| Cross-firm user enumerates tickets by guessing IDs | `ticketAccess()` returns `{ view: false }` for non-watchers; 404 response (not 403) to avoid confirming existence |
| Client adds watcher from competitor firm | Intentional — admin decided to allow cross-firm watching. Admins + owner-firm control who gets added |
| Watcher sees internal notes | Internal notes filtered by `comment.internal && user.role !== 'ADMIN'` — existing behavior, unchanged |
| Removed watcher retains cached ticket data | Acceptable for v1 — no real-time revocation needed for a support portal |

### Required tests

- Watcher can GET ticket detail: 200
- Watcher can POST comment: 201
- Watcher cannot PATCH status: 403
- Watcher cannot PATCH priority: 403
- Non-watcher cross-firm user cannot GET ticket: 404
- Watcher cannot see internal notes in comment list
- Removing watcher revokes access immediately
- `ticketAccess()` unit tests for all role/condition combinations

## 9. Out of Scope (v1)

- Invite non-users by email (no account creation/invite flow from watcher UI)
- WhatsApp notifications for watchers
- Watcher management from kanban board view
- Per-watcher notification preferences (mute/unmute)
- Bulk add/remove watchers
- "Watch" button for self-subscription (users can only be added by admins or owner-firm)
