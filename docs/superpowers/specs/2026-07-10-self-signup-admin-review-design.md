# Self-Signup with Admin Review — Design Spec

**Date:** 2026-07-10
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/self-signup-admin-review`

## Problem

Each client firm's support team currently shares **one CLIENT account**. There is no
individual login, no per-person password, and no accountability. We want:

- A **public self-signup** form where an individual support-team member requests access.
- A **one-time super-admin review** of each request, where the admin maps the applicant
  to the correct firm (`Company`).
- On approval, the applicant gets **their own login** and manages their own password
  (set on invite, reset self-service thereafter).

Retiring the shared account per firm is an operational follow-up, not part of this build.

## Non-Goals (YAGNI for v1)

- IP-based rate limiting infra (no rate-limit infra exists in the repo today).
- Double opt-in email confirmation before the request enters the queue.
- Invite codes / shared secrets.
- Self-service firm switching, editing a submitted request, or bulk approve.
- Migrating existing firms off the shared account (operational, done later).
- Fixing the pre-existing password min-length inconsistency (6 vs 8) app-wide.

## Existing Architecture (what we mirror)

- **Stack:** Next.js 14 (app router) + Prisma (PostgreSQL) + NextAuth (credentials) + bcrypt + nodemailer.
- **Tenancy:** `Company` = firm/tenant, resolved by `subdomain` in `middleware.ts`
  (`extractSubdomain` / `validateTenant`, sets `x-tenant-id` header). `User.role` is
  `ADMIN | CLIENT`; a CLIENT's `companyId` links them to their firm. Super-admin == `ADMIN`.
- **Composite uniqueness:** `@@unique([email, companyId])` on `User` — email is unique
  *per firm*, not globally (`prisma/schema.prisma:149`).
- **Admin user creation (pattern to mirror):** `app/api/admin/users/route.ts` — zod validate,
  `requireAdmin()`, `bcrypt.hash(pw, 10)`, `companyId` assigned for CLIENT. UI at
  `app/admin/users/new/` fetches the company dropdown server-side via
  `prisma.company.findMany({ select: { id, name }, orderBy: { name: 'asc' } })`.
- **Auth guard:** `lib/auth-helpers.ts` → `requireAdmin()` (throws `'Admin access required'`).
- **Public auth pages (closest analog):** `app/login`, `app/forgot-password`, `app/reset-password`.
- **Password-reset token service (reused for invites):** `lib/password-reset.ts` —
  `generateToken()` = `crypto.randomBytes(32).toString('hex')`, stores
  `resetPasswordToken` + `resetPasswordExpiresAt` on `User`, `validateResetToken()`
  requires the user be `isActive`, `resetPassword()` bcrypt-hashes(10) and clears the token.
  Reset expiry is **1 hour**.
- **Email:** `SMTPService.sendEmail({ to, subject, text?, html? })` in
  `lib/services/smtp.ts` (returns `false` on failure, never throws; no-op if SMTP unconfigured).
  Standalone template module pattern: `lib/email-templates/password-reset.ts` returns
  `{ subject, html, text }`.
- **Migrations:** `prisma/migrations/<UTC YYYYMMDDHHMMSS>_<snake_case>/migration.sql`.
  Analog: `20260508160228_add_password_reset_fields`.

### Load-bearing gotchas discovered

1. **`requireAdmin()` catch-style bug:** some admin routes `catch` and test
   `error.message.includes('Unauthorized')`, but `requireAdmin()` throws
   `'Admin access required'` / `'Authentication required'` — neither contains
   `'Unauthorized'` — so those routes return **500** (not 403) for a logged-in
   non-admin. New routes will use a correct guard (match `'Admin access required'` /
   `'Authentication required'`, or the terse 401/403 style), not the buggy one.
2. **Empty-`tenantId` login is cross-tenant:** the login form sends the subdomain as
   `tenantId`; if empty (e.g. apex/localhost), `authorize()` does `findFirst({ where: { email } })`
   with no company filter — ambiguous when the same email exists in two firms. The invite
   therefore lands the user on **their firm's subdomain** so the first login is tenant-scoped.

## Approach

**Store requests in a dedicated `SignupRequest` table — not as a "pending user".**
A pending user would need a null `companyId` (colliding across firms under
`@@unique([email, companyId])`) and there is no PENDING `Role`. A separate table keeps
`users` clean and gives a review/audit trail. Approval provisions a real `User`.

## Data Model

New enum + model (new migration; **no change to `User`** — invites reuse the existing
reset-password columns):

```prisma
enum SignupStatus {
  PENDING
  APPROVED
  REJECTED
}

model SignupRequest {
  id              String       @id @default(cuid())
  name            String
  email           String
  firmName        String       // free-text firm name the applicant typed
  note            String?      // optional message from applicant
  status          SignupStatus @default(PENDING)
  reviewedById    String?      // admin User.id who actioned it
  reviewedAt      DateTime?
  mappedCompanyId String?      // Company chosen at approval
  createdUserId   String?      // User provisioned on approval
  rejectionReason String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([status, createdAt])
  @@map("signup_requests")
}
```

Migration adds `signup_requests` table + `SignupStatus` enum only.

## Components

### 1. Public signup

- **Page** `app/signup/page.tsx` — client component, styled like `app/login` /
  `app/forgot-password`. Fields: `name`, `email`, `firmName` (free text), `note` (optional).
  On success shows a generic "Your request was submitted. We'll review it and email you."
- **API** `POST /api/auth/signup`:
  - zod validate `{ name (min 1), email (.email()), firmName (min 1), note (optional) }`.
  - **Abuse guard:** reject silently-generically if a `PENDING` `SignupRequest` already
    exists for that email (dup-guard), or if one was created for that email within a short
    cooldown window (e.g. 10 minutes). No pre-verification.
  - Create the `PENDING` row. Always return the same generic success (anti-enumeration,
    matching `forgot-password`).
  - Notify the super-admin of the new request (see §5).

### 2. Admin review queue

- **Nav:** add "Access Requests" to `NAV_ITEMS` in `app/admin/modern-admin-nav.tsx`
  (with a pending-count badge if cheap).
- **List page** `app/admin/access-requests/page.tsx` — server component, `requireAdmin()`,
  lists requests (PENDING first, then history). Fetches the firm dropdown server-side via
  `prisma.company.findMany({ select: { id, name }, orderBy: { name: 'asc' } })`
  (mirrors `app/admin/users/new/page.tsx`). Each PENDING row shows applicant name/email/
  firmName/note and an approve control (Company dropdown + confirm) and a reject control.
- **Approve** `POST /api/admin/access-requests/[id]/approve`, body `{ companyId }`:
  - `requireAdmin()`; load the request; 409 if not `PENDING`.
  - Validate `companyId` exists and is active.
  - If a `User` already exists for `[email, companyId]`: do not duplicate — link that user
    (`createdUserId`), mark APPROVED, optionally re-send invite. Return a clear result.
  - Else create `User` { name, email, role: CLIENT, companyId, isActive: true,
    password: bcrypt.hash(randomBytes, 10) } (random, unusable — real password set via invite).
  - Generate an invite token (§4), send the invite email.
  - Mark request APPROVED, set `reviewedById`, `reviewedAt`, `mappedCompanyId`, `createdUserId`.
- **Reject** `POST /api/admin/access-requests/[id]/reject`, body `{ reason? }`:
  - `requireAdmin()`; 409 if not `PENDING`; mark REJECTED with `reviewedById`/`reviewedAt`/
    `rejectionReason`; send an optional rejection email if a reason is provided.

### 3. Invite = reuse reset-password flow

On approval, set on the new `User`:
`resetPasswordToken = crypto.randomBytes(32).toString('hex')`,
`resetPasswordExpiresAt = now + 7 days` (resets use 1h; invites need a longer window).

Invite link points at the **firm's own subdomain**:
`https://{company.subdomain}.<ROOT_DOMAIN>/reset-password?token=...`

- The existing `app/reset-password` page + `POST /api/auth/reset-password` handle token
  validation and password set (min 8), then redirect to `/login` — which, on the firm
  subdomain, is correctly tenant-scoped.
- `ROOT_DOMAIN` is derived from `NEXTAUTH_URL` (or a new `NEXT_PUBLIC_ROOT_DOMAIN` env if
  the base host can't be derived cleanly — to be confirmed during implementation).
- v1 reuses the reset-password page copy as-is ("reset your password"). A friendlier
  "set your password / welcome" variant (branch on a `?welcome=1` query param) is a
  nice-to-have, not required.

### 4. Emails

New template module `lib/email-templates/signup-invite.ts` →
`generateSignupInviteEmail({ name, firmName, inviteLink })` returns `{ subject, html, text }`,
mirroring `lib/email-templates/password-reset.ts`. Sent via `SMTPService.sendEmail`.

Optional: `lib/email-templates/signup-rejected.ts` for the reject path.

### 5. Notifications

- **New request → super-admin:** send a simple notice to the admin/support address
  (reuse `SMTPService` / the `NotificationService` inline pattern). Non-fatal if SMTP
  is unconfigured. **Decision: include in v1** (simple, one email).
- **Approve → applicant:** the invite email (required).
- **Reject → applicant:** optional email with the reason (sent only when a reason is given).

## Data Flow

```
Applicant                Public                 Super-Admin              System
   |  fill /signup          |                        |                      |
   |----------------------->| POST /api/auth/signup  |                      |
   |                        |--- dup/cooldown guard ->|                      |
   |                        |--- create PENDING row --------------------->  DB
   |  "we'll email you"     |<-----------------------|   notify admin ----> email
   |<-----------------------|                        |                      |
   |                        |                 sees queue badge              |
   |                        |         approve {companyId} / reject          |
   |                        |                        |-- create User ----> DB
   |                        |                        |-- token + invite --> email
   |  click invite link (firm subdomain) -> set password -> /login (tenant-scoped)
```

## Error Handling

- Signup API: always generic success on valid input; validation errors return
  `400 { error, details }` (zod flatten), matching existing routes.
- Approve/reject: `requireAdmin()` guard; `409` if request not `PENDING`; `400` for a
  missing/invalid `companyId`; graceful path when the `User` already exists for
  `[email, companyId]`.
- Email failures are non-fatal (`SMTPService.sendEmail` returns `false`); approval still
  succeeds and the admin can re-send the invite. This must be surfaced in the approve
  response so the admin knows the invite email didn't go out.

## Testing Strategy

- **Unit:** signup zod schema; dup/cooldown guard logic; approve handler (creates user,
  sets token+expiry, marks APPROVED, links ids); already-exists path; reject handler;
  invite-link construction (correct firm subdomain + token).
- **Integration (mirror `middleware.test.ts` / existing route tests):** `POST /api/auth/signup`
  happy + duplicate; approve/reject with and without admin session (guard).
- **Manual:** end-to-end — submit signup, approve mapping to a firm, receive invite,
  set password on firm subdomain, log in as the new individual user.

## Rollout / Ops (out of build scope)

Shared accounts keep working. Once a firm's team has self-onboarded, the admin deactivates
that firm's shared `User` (`isActive = false`). No data migration required.

## Open Items for Implementation

1. Confirm `ROOT_DOMAIN` derivation (from `NEXTAUTH_URL`) vs adding `NEXT_PUBLIC_ROOT_DOMAIN`.
2. Pending-count badge in nav — include only if it's a cheap query.
