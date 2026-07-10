# Self-Signup with Admin Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let individual client support-team members self-request access via a public form; a super-admin reviews each request, maps them to a firm, and the approved user gets their own login via an emailed set-password link.

**Architecture:** A new `SignupRequest` table holds pending requests (no "pending user"). A public `POST /api/auth/signup` creates a request with a dup/cooldown guard. An admin review page approves (creating a real `CLIENT` `User` and provisioning an invite token that reuses the existing password-reset columns) or rejects. The invite link points at the firm's own subdomain so the first login is tenant-scoped. Business logic lives in `lib/signup.ts` (`SignupService`) so routes stay thin and testable.

**Tech Stack:** Next.js 14 (app router), Prisma (PostgreSQL), NextAuth (credentials), bcrypt, nodemailer, zod, Jest (ts-jest, node env).

## Global Constraints

- **Node 22 via nvm for every `npm` / `npx` / `tsc` / `prisma` / `jest` command** — the default shell `node` is v11 and will fail. Prefix commands with `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null &&`.
- **Token:** `crypto.randomBytes(32).toString('hex')` (mirror `lib/password-reset.ts`).
- **Password hashing:** `bcrypt.hash(x, 10)` everywhere (universal in this repo).
- **Invite expiry:** 7 days. **Signup cooldown:** 10 minutes. (Named constants in `lib/signup.ts`.)
- **Set-password path:** reuse existing `app/reset-password` page + `POST /api/auth/reset-password` (already enforces min-8). Do NOT build a new set-password page in v1.
- **Anti-enumeration:** `POST /api/auth/signup` always returns the same generic success on valid input (mirror `app/api/auth/forgot-password/route.ts`).
- **Admin guard catch (do NOT copy the buggy `.includes('Unauthorized')` pattern):** `requireAdmin()` throws `'Admin access required'` / `'Authentication required'`. Catch with:
  ```ts
  if (error instanceof Error &&
      (error.message.includes('Admin access required') || error.message.includes('Authentication required'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  ```
- **Email sends are non-fatal:** `SMTPService.sendEmail(...)` returns `false` (never throws). Surface `emailSent` in the approve response; never let a failed email roll back an approval.
- **Composite uniqueness:** `User` is unique on `[email, companyId]`. Existence checks use `prisma.user.findFirst({ where: { email, companyId } })` (exact email, matching `app/api/admin/users/route.ts`).

## File Structure

**Create:**
- `prisma/migrations/20260710120000_add_signup_requests/migration.sql` — enum + table.
- `lib/urls.ts` — `buildFirmBaseUrl(subdomain)` (firm-subdomain URL from `NEXTAUTH_URL`/`ROOT_DOMAIN`).
- `lib/urls.test.ts`
- `lib/signup.ts` — `SignupService` (createRequest / approve / reject).
- `lib/signup.test.ts`
- `lib/email-templates/signup-invite.ts` — `generateSignupInviteEmail`.
- `lib/email-templates/signup-invite.test.ts`
- `lib/email-templates/signup-admin-notice.ts` — `generateSignupAdminNotice`.
- `lib/email-templates/signup-rejected.ts` — `generateSignupRejectedEmail`.
- `app/api/auth/signup/route.ts` — public POST.
- `app/api/auth/signup/route.test.ts`
- `app/api/admin/access-requests/[id]/approve/route.ts` — admin POST.
- `app/api/admin/access-requests/[id]/approve/route.test.ts`
- `app/api/admin/access-requests/[id]/reject/route.ts` — admin POST.
- `app/api/admin/access-requests/[id]/reject/route.test.ts`
- `app/signup/page.tsx` — public form.
- `app/admin/access-requests/page.tsx` — server-component review queue.
- `app/admin/access-requests/review-actions.tsx` — client approve/reject controls.

**Modify:**
- `prisma/schema.prisma` — add `SignupStatus` enum + `SignupRequest` model.
- `app/admin/modern-admin-nav.tsx` — add "Access Requests" nav item.
- `app/login/page.tsx` — add a "Request access" link to `/signup`.
- `.env.example` — document optional `ROOT_DOMAIN`.

---

### Task 1: Data model + migration

**Files:**
- Modify: `prisma/schema.prisma` (after the `WhatsappMessage` model / near other enums)
- Create: `prisma/migrations/20260710120000_add_signup_requests/migration.sql`

**Interfaces:**
- Produces: Prisma model `SignupRequest` and enum `SignupStatus` (`PENDING | APPROVED | REJECTED`) available on `prisma.signupRequest` and importable as `SignupStatus` from `@prisma/client`.

- [ ] **Step 1: Add the enum + model to `prisma/schema.prisma`**

Append near the other enums (e.g. below `enum WhatsappAgentMode`):

```prisma
enum SignupStatus {
  PENDING
  APPROVED
  REJECTED
}
```

Append at the end of the models section:

```prisma
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

- [ ] **Step 2: Hand-author the migration SQL**

Create `prisma/migrations/20260710120000_add_signup_requests/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "signup_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "note" TEXT,
    "status" "SignupStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "mappedCompanyId" TEXT,
    "createdUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signup_requests_status_createdAt_idx" ON "signup_requests"("status", "createdAt");
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx prisma generate`
Expected: "Generated Prisma Client" with no schema errors. (No DB connection needed for `generate`; `migrate deploy` runs at deploy time.)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260710120000_add_signup_requests
git commit -m "feat: add SignupRequest model and migration"
```

---

### Task 2: Firm-subdomain URL helper

**Files:**
- Create: `lib/urls.ts`
- Test: `lib/urls.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `buildFirmBaseUrl(subdomain: string): string` — returns `https://{subdomain}.{root}` in production, or the raw `NEXTAUTH_URL` base on localhost/IP (dev has no subdomain routing).

- [ ] **Step 1: Write the failing test**

`lib/urls.test.ts`:

```ts
import { describe, it, expect, afterEach } from '@jest/globals'
import { buildFirmBaseUrl } from './urls'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

describe('buildFirmBaseUrl', () => {
  it('derives firm subdomain from an apex NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = 'https://propfirmstech.com'
    delete process.env.ROOT_DOMAIN
    expect(buildFirmBaseUrl('acme')).toBe('https://acme.propfirmstech.com')
  })

  it('derives firm subdomain when NEXTAUTH_URL is on the admin subdomain', () => {
    process.env.NEXTAUTH_URL = 'https://admin.propfirmstech.com'
    delete process.env.ROOT_DOMAIN
    expect(buildFirmBaseUrl('acme')).toBe('https://acme.propfirmstech.com')
  })

  it('honors an explicit ROOT_DOMAIN override', () => {
    process.env.NEXTAUTH_URL = 'https://portal.example.io'
    process.env.ROOT_DOMAIN = 'example.io'
    expect(buildFirmBaseUrl('acme')).toBe('https://acme.example.io')
  })

  it('falls back to the raw base on localhost (no subdomain routing in dev)', () => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    delete process.env.ROOT_DOMAIN
    expect(buildFirmBaseUrl('acme')).toBe('http://localhost:3000')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/urls.test.ts`
Expected: FAIL — `Cannot find module './urls'`.

- [ ] **Step 3: Write minimal implementation**

`lib/urls.ts`:

```ts
/**
 * Build the base URL for a firm's own subdomain (e.g. https://acme.propfirmstech.com).
 *
 * Used for invite links so the new user's first login lands on their firm's
 * subdomain and is therefore tenant-scoped (see middleware tenant resolution).
 *
 * Root domain resolution: ROOT_DOMAIN env wins; otherwise the last two labels
 * of the NEXTAUTH_URL host. On localhost/IP there is no subdomain routing, so
 * we return the raw base URL unchanged (dev).
 */
export function buildFirmBaseUrl(subdomain: string): string {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = new URL(base)
  const host = url.hostname
  const isLocal = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)
  if (isLocal) return base.replace(/\/$/, '')

  const root = process.env.ROOT_DOMAIN || host.split('.').slice(-2).join('.')
  const portPart = url.port ? `:${url.port}` : ''
  return `${url.protocol}//${subdomain}.${root}${portPart}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/urls.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Document the optional env var**

Add to `.env.example` (near `NEXTAUTH_URL`):

```
# Optional. Registrable root domain used to build firm-subdomain invite links
# (e.g. "propfirmstech.com"). If unset, derived from the last two labels of NEXTAUTH_URL.
ROOT_DOMAIN=
```

- [ ] **Step 6: Commit**

```bash
git add lib/urls.ts lib/urls.test.ts .env.example
git commit -m "feat: add buildFirmBaseUrl helper for firm-subdomain invite links"
```

---

### Task 3: SignupService.createRequest (public submission + guard)

**Files:**
- Create: `lib/signup.ts`
- Test: `lib/signup.test.ts`

**Interfaces:**
- Produces:
  - `interface CreateSignupInput { name: string; email: string; firmName: string; note?: string }`
  - `SignupService.createRequest(input: CreateSignupInput): Promise<{ created: boolean }>` — `created:false` when a duplicate PENDING request exists or another request for that email was created within the cooldown window.
  - Exported constants `SIGNUP_COOLDOWN_MINUTES = 10`, `INVITE_EXPIRY_DAYS = 7`.

- [ ] **Step 1: Write the failing test**

`lib/signup.test.ts`:

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { SignupService } from './signup'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    signupRequest: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    company: { findUnique: jest.fn() },
  },
}))
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('SignupService.createRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a PENDING request when none exists', async () => {
    ;(mockPrisma.signupRequest.findFirst as jest.Mock).mockResolvedValue(null as any)
    ;(mockPrisma.signupRequest.create as jest.Mock).mockResolvedValue({ id: 'r1' } as any)

    const res = await SignupService.createRequest({ name: 'A', email: 'a@x.com', firmName: 'Acme' })

    expect(res).toEqual({ created: true })
    expect(mockPrisma.signupRequest.create).toHaveBeenCalledWith({
      data: { name: 'A', email: 'a@x.com', firmName: 'Acme', note: null },
    })
  })

  it('does NOT create when a PENDING request already exists for the email', async () => {
    ;(mockPrisma.signupRequest.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'existing', status: 'PENDING' } as any)

    const res = await SignupService.createRequest({ name: 'A', email: 'a@x.com', firmName: 'Acme' })

    expect(res).toEqual({ created: false })
    expect(mockPrisma.signupRequest.create).not.toHaveBeenCalled()
  })

  it('does NOT create when another request for the email is within the cooldown window', async () => {
    // 1st findFirst = PENDING check (none), 2nd findFirst = cooldown check (recent found)
    ;(mockPrisma.signupRequest.findFirst as jest.Mock)
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 'recent' } as any)

    const res = await SignupService.createRequest({ name: 'A', email: 'a@x.com', firmName: 'Acme' })

    expect(res).toEqual({ created: false })
    expect(mockPrisma.signupRequest.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/signup.test.ts`
Expected: FAIL — `Cannot find module './signup'`.

- [ ] **Step 3: Write minimal implementation**

`lib/signup.ts`:

```ts
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

export const SIGNUP_COOLDOWN_MINUTES = 10
export const INVITE_EXPIRY_DAYS = 7

export interface CreateSignupInput {
  name: string
  email: string
  firmName: string
  note?: string
}

/**
 * Self-signup + admin-review business logic. Kept out of the route handlers so
 * it is unit-testable and reused by any future entry point.
 */
export class SignupService {
  /** Public: record an access request. Silently no-ops on duplicate/cooldown. */
  static async createRequest(input: CreateSignupInput): Promise<{ created: boolean }> {
    const emailFilter = { equals: input.email, mode: 'insensitive' as const }

    const existingPending = await prisma.signupRequest.findFirst({
      where: { email: emailFilter, status: 'PENDING' },
    })
    if (existingPending) return { created: false }

    const cutoff = new Date(Date.now() - SIGNUP_COOLDOWN_MINUTES * 60 * 1000)
    const recent = await prisma.signupRequest.findFirst({
      where: { email: emailFilter, createdAt: { gt: cutoff } },
    })
    if (recent) return { created: false }

    await prisma.signupRequest.create({
      data: {
        name: input.name,
        email: input.email,
        firmName: input.firmName,
        note: input.note ?? null,
      },
    })
    return { created: true }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/signup.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/signup.ts lib/signup.test.ts
git commit -m "feat: SignupService.createRequest with dup/cooldown guard"
```

---

### Task 4: SignupService.approve (provision user + invite token)

**Files:**
- Modify: `lib/signup.ts`
- Test: `lib/signup.test.ts` (add a describe block)

**Interfaces:**
- Consumes: `INVITE_EXPIRY_DAYS` from Task 3.
- Produces:
  - `SignupService.approve(requestId: string, companyId: string, adminUserId: string): Promise<ApproveResult>`
  - `interface ApproveResult { token: string; expiryDays: number; alreadyExisted: boolean; user: { id: string; name: string; email: string }; company: { id: string; name: string; subdomain: string } }`
  - Throws `Error('Request not found')`, `Error('Request already reviewed')`, `Error('Invalid company')`.

- [ ] **Step 1: Write the failing test** (append to `lib/signup.test.ts`)

```ts
describe('SignupService.approve', () => {
  beforeEach(() => jest.clearAllMocks())

  const pendingReq = { id: 'r1', name: 'A', email: 'a@x.com', firmName: 'Acme', status: 'PENDING' }
  const company = { id: 'c1', name: 'Acme LLC', subdomain: 'acme', isActive: true }

  it('creates a CLIENT user with an invite token when none exists', async () => {
    ;(mockPrisma.signupRequest.findUnique as jest.Mock).mockResolvedValue(pendingReq as any)
    ;(mockPrisma.company.findUnique as jest.Mock).mockResolvedValue(company as any)
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null as any)
    ;(mockPrisma.user.create as jest.Mock).mockResolvedValue({ id: 'u1', name: 'A', email: 'a@x.com' } as any)
    ;(mockPrisma.signupRequest.update as jest.Mock).mockResolvedValue({} as any)

    const res = await SignupService.approve('r1', 'c1', 'admin1')

    expect(res.alreadyExisted).toBe(false)
    expect(res.token).toMatch(/^[a-f0-9]{64}$/)
    expect(res.company.subdomain).toBe('acme')
    const createArg = (mockPrisma.user.create as jest.Mock).mock.calls[0][0] as any
    expect(createArg.data.role).toBe('CLIENT')
    expect(createArg.data.companyId).toBe('c1')
    expect(createArg.data.isActive).toBe(true)
    expect(createArg.data.resetPasswordToken).toBe(res.token)
    expect(mockPrisma.signupRequest.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({ status: 'APPROVED', mappedCompanyId: 'c1', createdUserId: 'u1', reviewedById: 'admin1' }),
    })
  })

  it('re-issues a token to an existing user instead of duplicating', async () => {
    ;(mockPrisma.signupRequest.findUnique as jest.Mock).mockResolvedValue(pendingReq as any)
    ;(mockPrisma.company.findUnique as jest.Mock).mockResolvedValue(company as any)
    ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u9', name: 'A', email: 'a@x.com' } as any)
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'u9', name: 'A', email: 'a@x.com' } as any)
    ;(mockPrisma.signupRequest.update as jest.Mock).mockResolvedValue({} as any)

    const res = await SignupService.approve('r1', 'c1', 'admin1')

    expect(res.alreadyExisted).toBe(true)
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
    expect(mockPrisma.user.update).toHaveBeenCalled()
  })

  it('throws when the request is not PENDING', async () => {
    ;(mockPrisma.signupRequest.findUnique as jest.Mock).mockResolvedValue({ ...pendingReq, status: 'APPROVED' } as any)
    await expect(SignupService.approve('r1', 'c1', 'admin1')).rejects.toThrow('Request already reviewed')
  })

  it('throws when the company is missing or inactive', async () => {
    ;(mockPrisma.signupRequest.findUnique as jest.Mock).mockResolvedValue(pendingReq as any)
    ;(mockPrisma.company.findUnique as jest.Mock).mockResolvedValue(null as any)
    await expect(SignupService.approve('r1', 'c1', 'admin1')).rejects.toThrow('Invalid company')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/signup.test.ts`
Expected: FAIL — `SignupService.approve is not a function`.

- [ ] **Step 3: Add the `approve` method to `SignupService`** (inside the class in `lib/signup.ts`)

```ts
  /** Admin: approve a request, provision a CLIENT user, and mint an invite token. */
  static async approve(requestId: string, companyId: string, adminUserId: string) {
    const req = await prisma.signupRequest.findUnique({ where: { id: requestId } })
    if (!req) throw new Error('Request not found')
    if (req.status !== 'PENDING') throw new Error('Request already reviewed')

    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company || !company.isActive) throw new Error('Invalid company')

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    // Reuse the composite-unique check pattern: email is unique per company.
    const existing = await prisma.user.findFirst({ where: { email: req.email, companyId } })

    let user: { id: string; name: string; email: string }
    let alreadyExisted: boolean

    if (existing) {
      alreadyExisted = true
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { resetPasswordToken: token, resetPasswordExpiresAt: expiresAt },
        select: { id: true, name: true, email: true },
      })
    } else {
      alreadyExisted = false
      // Random, unusable password — the real one is set via the invite link.
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
      user = await prisma.user.create({
        data: {
          name: req.name,
          email: req.email,
          password: randomPassword,
          role: 'CLIENT',
          companyId,
          isActive: true,
          resetPasswordToken: token,
          resetPasswordExpiresAt: expiresAt,
        },
        select: { id: true, name: true, email: true },
      })
    }

    await prisma.signupRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedById: adminUserId,
        reviewedAt: new Date(),
        mappedCompanyId: companyId,
        createdUserId: user.id,
      },
    })

    return {
      token,
      expiryDays: INVITE_EXPIRY_DAYS,
      alreadyExisted,
      user,
      company: { id: company.id, name: company.name, subdomain: company.subdomain },
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/signup.test.ts`
Expected: PASS (all createRequest + approve tests).

- [ ] **Step 5: Commit**

```bash
git add lib/signup.ts lib/signup.test.ts
git commit -m "feat: SignupService.approve provisions user and invite token"
```

---

### Task 5: SignupService.reject

**Files:**
- Modify: `lib/signup.ts`
- Test: `lib/signup.test.ts` (add a describe block)

**Interfaces:**
- Produces: `SignupService.reject(requestId: string, adminUserId: string, reason?: string): Promise<{ request: { id: string; name: string; email: string; firmName: string } }>`. Throws `Error('Request not found')`, `Error('Request already reviewed')`.

- [ ] **Step 1: Write the failing test** (append to `lib/signup.test.ts`)

```ts
describe('SignupService.reject', () => {
  beforeEach(() => jest.clearAllMocks())

  it('marks a PENDING request REJECTED with reviewer + reason', async () => {
    ;(mockPrisma.signupRequest.findUnique as jest.Mock).mockResolvedValue(
      { id: 'r1', name: 'A', email: 'a@x.com', firmName: 'Acme', status: 'PENDING' } as any)
    ;(mockPrisma.signupRequest.update as jest.Mock).mockResolvedValue({} as any)

    const res = await SignupService.reject('r1', 'admin1', 'Not a real firm')

    expect(res.request.email).toBe('a@x.com')
    expect(mockPrisma.signupRequest.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({ status: 'REJECTED', reviewedById: 'admin1', rejectionReason: 'Not a real firm' }),
    })
  })

  it('throws when the request is not PENDING', async () => {
    ;(mockPrisma.signupRequest.findUnique as jest.Mock).mockResolvedValue({ id: 'r1', status: 'REJECTED' } as any)
    await expect(SignupService.reject('r1', 'admin1')).rejects.toThrow('Request already reviewed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/signup.test.ts`
Expected: FAIL — `SignupService.reject is not a function`.

- [ ] **Step 3: Add the `reject` method** (inside the class in `lib/signup.ts`)

```ts
  /** Admin: reject a request, optionally recording a reason. */
  static async reject(requestId: string, adminUserId: string, reason?: string) {
    const req = await prisma.signupRequest.findUnique({ where: { id: requestId } })
    if (!req) throw new Error('Request not found')
    if (req.status !== 'PENDING') throw new Error('Request already reviewed')

    await prisma.signupRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedById: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: reason ?? null,
      },
    })

    return { request: { id: req.id, name: req.name, email: req.email, firmName: req.firmName } }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/signup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/signup.ts lib/signup.test.ts
git commit -m "feat: SignupService.reject"
```

---

### Task 6: Email templates (invite, admin-notice, rejected)

**Files:**
- Create: `lib/email-templates/signup-invite.ts`
- Create: `lib/email-templates/signup-admin-notice.ts`
- Create: `lib/email-templates/signup-rejected.ts`
- Test: `lib/email-templates/signup-invite.test.ts`

**Interfaces:**
- Produces:
  - `generateSignupInviteEmail(data: { userName: string; firmName: string; inviteLink: string; expiryDays: number }): { subject: string; html: string; text: string }`
  - `generateSignupAdminNotice(data: { name: string; email: string; firmName: string; note?: string | null; reviewLink: string }): { subject: string; html: string; text: string }`
  - `generateSignupRejectedEmail(data: { userName: string; firmName: string; reason?: string | null }): { subject: string; html: string; text: string }`

- [ ] **Step 1: Write the failing test**

`lib/email-templates/signup-invite.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals'
import { generateSignupInviteEmail } from './signup-invite'

describe('generateSignupInviteEmail', () => {
  it('includes the invite link, firm name, and expiry in body + subject', () => {
    const out = generateSignupInviteEmail({
      userName: 'Jane',
      firmName: 'Acme LLC',
      inviteLink: 'https://acme.propfirmstech.com/reset-password?token=abc',
      expiryDays: 7,
    })
    expect(out.subject).toMatch(/PropFirmsTech/i)
    expect(out.html).toContain('https://acme.propfirmstech.com/reset-password?token=abc')
    expect(out.html).toContain('Acme LLC')
    expect(out.html).toContain('7 days')
    expect(out.text).toContain('https://acme.propfirmstech.com/reset-password?token=abc')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/email-templates/signup-invite.test.ts`
Expected: FAIL — `Cannot find module './signup-invite'`.

- [ ] **Step 3: Write the invite template**

`lib/email-templates/signup-invite.ts` (mirrors the structure of `password-reset.ts`, welcome framing):

```ts
/**
 * Signup Invite Email — sent when an admin approves an access request.
 * Reuses the password-reset link flow (the inviteLink points at
 * /reset-password?token=... on the firm's subdomain).
 */
export interface SignupInviteEmailData {
  userName: string
  firmName: string
  inviteLink: string
  expiryDays: number
}

export function generateSignupInviteEmail(data: SignupInviteEmailData) {
  const { userName, firmName, inviteLink, expiryDays } = data
  const subject = 'Your access is approved — set your password | PropFirmsTech Support Portal'

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Set your password</title></head>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr><td align="center" style="padding:40px 0;">
            <table role="presentation" style="width:600px;border-collapse:collapse;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px 8px 0 0;">
                <h1 style="margin:0;color:#fff;font-size:26px;font-weight:bold;">Welcome to ${firmName}'s support portal</h1>
              </td></tr>
              <tr><td style="padding:40px;">
                <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">Hi ${userName},</p>
                <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
                  Your request to join the <strong>${firmName}</strong> support team on the PropFirmsTech Support Portal has been approved.
                  Set your password to activate your personal login:
                </p>
                <table role="presentation" style="width:100%;border-collapse:collapse;margin:30px 0;"><tr><td align="center">
                  <a href="${inviteLink}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;">Set Your Password</a>
                </td></tr></table>
                <p style="margin:20px 0;color:#666;font-size:14px;line-height:1.6;">Or copy and paste this link into your browser:</p>
                <p style="margin:0 0 20px;padding:12px;background:#f8f9fa;border-radius:4px;word-break:break-all;font-size:14px;color:#667eea;">${inviteLink}</p>
                <div style="margin:30px 0;padding:16px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;">
                  <p style="margin:0;color:#856404;font-size:14px;line-height:1.6;"><strong>⚠️ Important:</strong> This link expires in ${expiryDays} days. If you didn't request access, you can ignore this email.</p>
                </div>
              </td></tr>
              <tr><td style="padding:30px 40px;background:#f8f9fa;border-radius:0 0 8px 8px;border-top:1px solid #e9ecef;">
                <p style="margin:0;color:#999;font-size:12px;line-height:1.6;text-align:center;">PropFirmsTech Support Portal</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `

  const text = `Welcome to ${firmName}'s support portal

Hi ${userName},

Your request to join the ${firmName} support team on the PropFirmsTech Support Portal has been approved.

Set your password to activate your personal login:

${inviteLink}

⚠️ Important: This link expires in ${expiryDays} days. If you didn't request access, you can ignore this email.

---
PropFirmsTech Support Portal`.trim()

  return { subject, html, text }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest lib/email-templates/signup-invite.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the admin-notice + rejected templates**

`lib/email-templates/signup-admin-notice.ts`:

```ts
/** Admin notice — sent to super-admins when a new access request arrives. */
export interface SignupAdminNoticeData {
  name: string
  email: string
  firmName: string
  note?: string | null
  reviewLink: string
}

export function generateSignupAdminNotice(data: SignupAdminNoticeData) {
  const { name, email, firmName, note, reviewLink } = data
  const subject = `New access request: ${name} (${firmName})`
  const notePart = note ? `\n\nNote from applicant:\n${note}` : ''
  const text = `A new support-portal access request is awaiting review.

Name:  ${name}
Email: ${email}
Firm:  ${firmName}${notePart}

Review it here: ${reviewLink}

---
PropFirmsTech Support Portal`.trim()

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
      <h2 style="margin:0 0 16px;">New access request awaiting review</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td style="padding:4px 0;"><strong>${name}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="padding:4px 0;">${email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Firm</td><td style="padding:4px 0;">${firmName}</td></tr>
      </table>
      ${note ? `<p style="margin:16px 0;padding:12px;background:#f8f9fa;border-radius:4px;font-size:14px;">${note}</p>` : ''}
      <p style="margin:24px 0;"><a href="${reviewLink}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Review request</a></p>
    </div>
  `
  return { subject, html, text }
}
```

`lib/email-templates/signup-rejected.ts`:

```ts
/** Optional applicant email — sent only when an admin rejects with a reason. */
export interface SignupRejectedEmailData {
  userName: string
  firmName: string
  reason?: string | null
}

export function generateSignupRejectedEmail(data: SignupRejectedEmailData) {
  const { userName, firmName, reason } = data
  const subject = 'Update on your PropFirmsTech Support Portal access request'
  const reasonPart = reason ? `\n\nReason: ${reason}` : ''
  const text = `Hi ${userName},

Thank you for your interest. We were unable to approve your access request for ${firmName} at this time.${reasonPart}

If you believe this is a mistake, please reply to this email or contact your firm's administrator.

---
PropFirmsTech Support Portal`.trim()

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
      <p>Hi ${userName},</p>
      <p>Thank you for your interest. We were unable to approve your access request for <strong>${firmName}</strong> at this time.</p>
      ${reason ? `<p style="padding:12px;background:#f8f9fa;border-radius:4px;"><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this is a mistake, please reply to this email or contact your firm's administrator.</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">PropFirmsTech Support Portal</p>
    </div>
  `
  return { subject, html, text }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/email-templates/signup-invite.ts lib/email-templates/signup-invite.test.ts lib/email-templates/signup-admin-notice.ts lib/email-templates/signup-rejected.ts
git commit -m "feat: signup invite, admin-notice, and rejection email templates"
```

---

### Task 7: Public `POST /api/auth/signup`

**Files:**
- Create: `app/api/auth/signup/route.ts`
- Test: `app/api/auth/signup/route.test.ts`

**Interfaces:**
- Consumes: `SignupService.createRequest` (Task 3), `generateSignupAdminNotice` (Task 6), `SMTPService.sendEmail`, `prisma.user.findMany`.
- Produces: `POST` handler. Body `{ name, email, firmName, note? }`. Returns `200 { message }` generic on valid input (created or not); `400 { error, details }` on validation failure.

- [ ] **Step 1: Write the failing test**

`app/api/auth/signup/route.test.ts`:

```ts
import { NextRequest } from 'next/server'
import { POST } from './route'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/signup')
jest.mock('@/lib/services/smtp')
jest.mock('@/lib/prisma', () => ({ prisma: { user: { findMany: jest.fn() } } }))

const mockCreate = SignupService.createRequest as jest.MockedFunction<typeof SignupService.createRequest>
const mockSend = SMTPService.sendEmail as jest.MockedFunction<typeof SMTPService.sendEmail>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

function req(body: unknown) {
  return new NextRequest('http://localhost/api/auth/signup', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockPrisma.user.findMany as jest.Mock).mockResolvedValue([] as any)
    mockSend.mockResolvedValue(true)
  })

  it('accepts a valid request and returns a generic success', async () => {
    mockCreate.mockResolvedValue({ created: true })
    const res = await POST(req({ name: 'Jane', email: 'jane@acme.com', firmName: 'Acme' }))
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith({ name: 'Jane', email: 'jane@acme.com', firmName: 'Acme', note: undefined })
  })

  it('returns the same generic success even when the service no-ops (duplicate)', async () => {
    mockCreate.mockResolvedValue({ created: false })
    const res = await POST(req({ name: 'Jane', email: 'jane@acme.com', firmName: 'Acme' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.message).toMatch(/review/i)
  })

  it('rejects invalid input with 400', async () => {
    const res = await POST(req({ name: '', email: 'not-an-email', firmName: '' }))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest app/api/auth/signup/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the route**

`app/api/auth/signup/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { generateSignupAdminNotice } from '@/lib/email-templates/signup-admin-notice'
import { prisma } from '@/lib/prisma'

const GENERIC_MESSAGE =
  'Thanks — your request has been submitted. If approved, we\'ll email you a link to set your password.'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  firmName: z.string().min(1, 'Firm name is required'),
  note: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = parsed.data
    const { created } = await SignupService.createRequest(data)

    // Notify super-admins (best-effort, non-fatal). Only on a genuinely new request.
    if (created) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { email: true },
        })
        if (admins.length > 0) {
          const reviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/access-requests`
          const email = generateSignupAdminNotice({
            name: data.name,
            email: data.email,
            firmName: data.firmName,
            note: data.note ?? null,
            reviewLink,
          })
          await Promise.all(
            admins.map((a) =>
              SMTPService.sendEmail({ to: a.email, subject: email.subject, html: email.html, text: email.text }),
            ),
          )
        }
      } catch (notifyError) {
        console.error('Failed to notify admins of new signup request:', notifyError)
      }
    }

    // Always the same response (anti-enumeration).
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 })
  } catch (error) {
    console.error('Signup request error:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest app/api/auth/signup/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/signup
git commit -m "feat: public POST /api/auth/signup with admin notification"
```

---

### Task 8: Admin `POST /api/admin/access-requests/[id]/approve`

**Files:**
- Create: `app/api/admin/access-requests/[id]/approve/route.ts`
- Test: `app/api/admin/access-requests/[id]/approve/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (returns a session with `session.user.id`), `SignupService.approve` (Task 4), `buildFirmBaseUrl` (Task 2), `generateSignupInviteEmail` (Task 6), `SMTPService.sendEmail`.
- Produces: `POST(request, { params: { id } })`. Body `{ companyId }`. Returns `200 { message, userId, emailSent, alreadyExisted }`; `400` invalid company / missing companyId; `409` already reviewed; `403` non-admin; `404` not found.

- [ ] **Step 1: Write the failing test**

`app/api/admin/access-requests/[id]/approve/route.test.ts`:

```ts
import { NextRequest } from 'next/server'
import { POST } from './route'
import { requireAdmin } from '@/lib/auth-helpers'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'

jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/signup')
jest.mock('@/lib/services/smtp')

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>
const mockApprove = SignupService.approve as jest.MockedFunction<typeof SignupService.approve>
const mockSend = SMTPService.sendEmail as jest.MockedFunction<typeof SMTPService.sendEmail>

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/access-requests/r1/approve', {
    method: 'POST', body: JSON.stringify(body),
  })
}

describe('POST /api/admin/access-requests/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } } as any)
    mockSend.mockResolvedValue(true)
  })

  it('approves and reports the email was sent', async () => {
    mockApprove.mockResolvedValue({
      token: 'a'.repeat(64), expiryDays: 7, alreadyExisted: false,
      user: { id: 'u1', name: 'Jane', email: 'jane@acme.com' },
      company: { id: 'c1', name: 'Acme', subdomain: 'acme' },
    } as any)

    const res = await POST(req({ companyId: 'c1' }), { params: { id: 'r1' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.emailSent).toBe(true)
    expect(mockApprove).toHaveBeenCalledWith('r1', 'c1', 'admin1')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when companyId is missing', async () => {
    const res = await POST(req({}), { params: { id: 'r1' } })
    expect(res.status).toBe(400)
    expect(mockApprove).not.toHaveBeenCalled()
  })

  it('returns 409 when the request was already reviewed', async () => {
    mockApprove.mockRejectedValue(new Error('Request already reviewed'))
    const res = await POST(req({ companyId: 'c1' }), { params: { id: 'r1' } })
    expect(res.status).toBe(409)
  })

  it('returns 403 for a non-admin caller', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Admin access required'))
    const res = await POST(req({ companyId: 'c1' }), { params: { id: 'r1' } })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest "app/api/admin/access-requests/[id]/approve/route.test.ts"`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the route**

`app/api/admin/access-requests/[id]/approve/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { generateSignupInviteEmail } from '@/lib/email-templates/signup-invite'
import { buildFirmBaseUrl } from '@/lib/urls'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const body = await request.json().catch(() => ({}))
    const companyId = typeof body?.companyId === 'string' ? body.companyId.trim() : ''
    if (!companyId) {
      return NextResponse.json(
        { error: 'Validation failed', details: { companyId: ['Please select a firm to map this user to'] } },
        { status: 400 },
      )
    }

    const result = await SignupService.approve(params.id, companyId, session.user.id)

    const inviteLink = `${buildFirmBaseUrl(result.company.subdomain)}/reset-password?token=${result.token}`
    const email = generateSignupInviteEmail({
      userName: result.user.name,
      firmName: result.company.name,
      inviteLink,
      expiryDays: result.expiryDays,
    })
    const emailSent = await SMTPService.sendEmail({
      to: result.user.email, subject: email.subject, html: email.html, text: email.text,
    })

    return NextResponse.json(
      {
        message: result.alreadyExisted
          ? 'User already existed for this firm — a fresh invite link was sent.'
          : 'User created and invite sent.',
        userId: result.user.id,
        alreadyExisted: result.alreadyExisted,
        emailSent,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof Error &&
        (error.message.includes('Admin access required') || error.message.includes('Authentication required'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Request already reviewed') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'Request not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'Invalid company') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Approve access request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest "app/api/admin/access-requests/[id]/approve/route.test.ts"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/access-requests/[id]/approve"
git commit -m "feat: admin approve access-request route (provision + invite)"
```

---

### Task 9: Admin `POST /api/admin/access-requests/[id]/reject`

**Files:**
- Create: `app/api/admin/access-requests/[id]/reject/route.ts`
- Test: `app/api/admin/access-requests/[id]/reject/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `SignupService.reject` (Task 5), `generateSignupRejectedEmail` (Task 6), `SMTPService.sendEmail`.
- Produces: `POST(request, { params: { id } })`. Body `{ reason? }`. Returns `200 { message, emailSent }`; `409` already reviewed; `404` not found; `403` non-admin. Sends applicant email only when a non-empty reason is given.

- [ ] **Step 1: Write the failing test**

`app/api/admin/access-requests/[id]/reject/route.test.ts`:

```ts
import { NextRequest } from 'next/server'
import { POST } from './route'
import { requireAdmin } from '@/lib/auth-helpers'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'

jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/signup')
jest.mock('@/lib/services/smtp')

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>
const mockReject = SignupService.reject as jest.MockedFunction<typeof SignupService.reject>
const mockSend = SMTPService.sendEmail as jest.MockedFunction<typeof SMTPService.sendEmail>

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/access-requests/r1/reject', {
    method: 'POST', body: JSON.stringify(body),
  })
}

describe('POST /api/admin/access-requests/[id]/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin1', role: 'ADMIN' } } as any)
    mockReject.mockResolvedValue({ request: { id: 'r1', name: 'Jane', email: 'jane@acme.com', firmName: 'Acme' } } as any)
    mockSend.mockResolvedValue(true)
  })

  it('rejects and emails the applicant when a reason is given', async () => {
    const res = await POST(req({ reason: 'Not a real firm' }), { params: { id: 'r1' } })
    expect(res.status).toBe(200)
    expect(mockReject).toHaveBeenCalledWith('r1', 'admin1', 'Not a real firm')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('rejects WITHOUT emailing when no reason is given', async () => {
    const res = await POST(req({}), { params: { id: 'r1' } })
    expect(res.status).toBe(200)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns 409 when already reviewed', async () => {
    mockReject.mockRejectedValue(new Error('Request already reviewed'))
    const res = await POST(req({ reason: 'x' }), { params: { id: 'r1' } })
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest "app/api/admin/access-requests/[id]/reject/route.test.ts"`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write the route**

`app/api/admin/access-requests/[id]/reject/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { generateSignupRejectedEmail } from '@/lib/email-templates/signup-rejected'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : undefined

    const { request: rejected } = await SignupService.reject(params.id, session.user.id, reason)

    let emailSent = false
    if (reason) {
      const email = generateSignupRejectedEmail({
        userName: rejected.name, firmName: rejected.firmName, reason,
      })
      emailSent = await SMTPService.sendEmail({
        to: rejected.email, subject: email.subject, html: email.html, text: email.text,
      })
    }

    return NextResponse.json({ message: 'Request rejected.', emailSent }, { status: 200 })
  } catch (error) {
    if (error instanceof Error &&
        (error.message.includes('Admin access required') || error.message.includes('Authentication required'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Request already reviewed') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'Request not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('Reject access request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx jest "app/api/admin/access-requests/[id]/reject/route.test.ts"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/access-requests/[id]/reject"
git commit -m "feat: admin reject access-request route"
```

---

### Task 10: Public `/signup` page

**Files:**
- Create: `app/signup/page.tsx`
- Modify: `app/login/page.tsx` (add a "Request access" link)

**Interfaces:**
- Consumes: `POST /api/auth/signup` (Task 7).
- Produces: the public signup UI. No jest test (page components are verified via the dev-server preview, matching this repo's practice for form pages).

- [ ] **Step 1: Create the signup page** (mirrors `app/forgot-password/page.tsx` styling)

`app/signup/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Public self-signup page. Submits an access request that a super-admin reviews.
 * On approval the applicant receives an emailed link to set their password.
 */
export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', firmName: '', note: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          firmName: form.firmName,
          note: form.note || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
        setMessage({ type: 'success', text: data.message || 'Request submitted.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Please check your details and try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Request Access</h1>
            <p className="text-gray-600">
              Ask to join your firm&apos;s support team. We&apos;ll review your request and email you a link to set your password.
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input id="name" type="text" value={form.name} onChange={update('name')} required
                  placeholder="Jane Doe" className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Work Email</label>
                <input id="email" type="email" value={form.email} onChange={update('email')} required
                  placeholder="you@yourfirm.com" className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="firmName" className="block text-sm font-medium text-gray-700 mb-2">Firm / Company Name</label>
                <input id="firmName" type="text" value={form.firmName} onChange={update('firmName')} required
                  placeholder="Acme Prop Trading" className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">Anything we should know? (optional)</label>
                <textarea id="note" value={form.note} onChange={update('note')} rows={3}
                  placeholder="Your role, who referred you, etc." className={inputClass} disabled={isLoading} />
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isLoading ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}

          <div className="text-center pt-4 border-t border-gray-200">
            <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add a "Request access" link on the login page**

In `app/login/page.tsx`, near the existing forgot-password / footer links, add:

```tsx
<Link href="/signup" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
  Request access
</Link>
```

(Ensure `import Link from 'next/link'` exists at the top — add it if missing.)

- [ ] **Step 3: Verify in the browser**

Start the dev server via the preview tooling, load `/signup`, submit a request, and confirm the generic success message renders and a `POST /api/auth/signup` returns 200 in the network panel. Also load `/login` and confirm the "Request access" link navigates to `/signup`.

- [ ] **Step 4: Commit**

```bash
git add app/signup/page.tsx app/login/page.tsx
git commit -m "feat: public /signup page and login link"
```

---

### Task 11: Admin review queue page + actions

**Files:**
- Create: `app/admin/access-requests/page.tsx`
- Create: `app/admin/access-requests/review-actions.tsx`
- Modify: `app/admin/modern-admin-nav.tsx` (nav item)

**Interfaces:**
- Consumes: `prisma.signupRequest.findMany`, `prisma.company.findMany`, `POST …/approve` (Task 8), `POST …/reject` (Task 9).
- Produces: the admin review UI. No jest test (verified via preview, per repo practice).

- [ ] **Step 1: Add the nav item**

In `app/admin/modern-admin-nav.tsx`:
- Add `UserPlus` to the `lucide-react` import list (line 8-11 block).
- Add to `NAV_ITEMS` (after the Users entry):
```tsx
  { href: '/admin/access-requests', label: 'Access Requests', icon: UserPlus },
```

- [ ] **Step 2: Create the review-actions client component**

`app/admin/access-requests/review-actions.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Company { id: string; name: string }
interface Props { requestId: string; companies: Company[] }

/** Approve (map to firm) / reject controls for one pending request row. */
export default function ReviewActions({ requestId, companies }: Props) {
  const router = useRouter()
  const [companyId, setCompanyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approve = async () => {
    if (!companyId) { setError('Pick a firm first'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/access-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Approve failed'); return }
      if (data.emailSent === false) setError('Approved, but the invite email failed to send (check SMTP).')
      router.refresh()
    } catch { setError('Approve failed') } finally { setBusy(false) }
  }

  const reject = async () => {
    const reason = window.prompt('Optional reason for rejection (emailed to the applicant if provided):') ?? undefined
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/access-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { reason } : {}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reject failed'); return }
      router.refresh()
    } catch { setError('Reject failed') } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <select
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        disabled={busy}
        className="px-3 py-2 border border-line rounded-md bg-bg-elev text-sm text-ink"
      >
        <option value="">Map to firm…</option>
        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={approve} disabled={busy}
          className="px-3 py-2 rounded-md bg-ink text-bg text-sm font-medium disabled:opacity-50">Approve</button>
        <button onClick={reject} disabled={busy}
          className="px-3 py-2 rounded-md border border-line text-sm text-ink disabled:opacity-50">Reject</button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Create the review queue page**

`app/admin/access-requests/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import ReviewActions from './review-actions'

export const dynamic = 'force-dynamic'

/** Super-admin review queue for self-signup access requests. */
export default async function AccessRequestsPage() {
  const [pending, recent, companies] = await Promise.all([
    prisma.signupRequest.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
    prisma.signupRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { reviewedAt: 'desc' },
      take: 25,
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-8 max-w-5xl">
      <section>
        <h2 className="font-display text-lg text-ink mb-1">Pending ({pending.length})</h2>
        <p className="text-sm text-ink-mute mb-4">Map each applicant to a firm to approve, or reject the request.</p>

        {pending.length === 0 ? (
          <p className="text-sm text-ink-mute">No pending requests.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((r) => (
              <div key={r.id} className="p-4 rounded-lg border border-line bg-bg-elev">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{r.name} · <span className="text-ink-mute">{r.email}</span></div>
                    <div className="text-sm text-ink-soft mt-0.5">Firm (as typed): <strong>{r.firmName}</strong></div>
                    {r.note && <div className="text-sm text-ink-mute mt-1">“{r.note}”</div>}
                    <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint mt-2">
                      {new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                    </div>
                  </div>
                  <ReviewActions requestId={r.id} companies={companies} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-3">Recently reviewed</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-mute">Nothing reviewed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-mute border-b border-line">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Firm typed</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 text-ink">{r.name}</td>
                    <td className="py-2 pr-4 text-ink-soft">{r.email}</td>
                    <td className="py-2 pr-4 text-ink-soft">{r.firmName}</td>
                    <td className="py-2 pr-4">
                      <span className={r.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Verify in the browser**

With the dev server running and logged in as an ADMIN, load `/admin/access-requests`. Confirm: the nav shows "Access Requests"; a request submitted via `/signup` appears under Pending; selecting a firm + Approve moves it to "Recently reviewed" as APPROVED; Reject works and (with a reason) reports success. Confirm a non-admin visiting the page is redirected (existing admin-layout guard).

- [ ] **Step 5: Commit**

```bash
git add app/admin/access-requests app/admin/modern-admin-nav.tsx
git commit -m "feat: admin access-requests review queue"
```

---

### Task 12: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && npm test`
Expected: all suites pass, including the new `lib/urls`, `lib/signup`, `lib/email-templates/signup-invite`, and the three new route tests.

- [ ] **Step 3: End-to-end manual smoke (dev server)**

1. Submit `/signup` as a new applicant.
2. As ADMIN, open `/admin/access-requests`, map to a firm, Approve.
3. Confirm the approve response reports `emailSent` (or a clear SMTP warning if unconfigured).
4. Open the invite link (`/reset-password?token=…`), set a password (min 8), and confirm redirect to `/login`.
5. Log in with the new individual credentials on the firm's subdomain.

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: verification pass for self-signup feature"
```

---

## Self-Review

**Spec coverage:**
- Public signup form + API → Tasks 7, 10. ✅
- `SignupRequest` table + status → Task 1. ✅
- Dup/cooldown abuse guard → Task 3. ✅
- Admin review queue + nav → Task 11. ✅
- Approve → provision CLIENT user + invite token, map firm → Tasks 4, 8. ✅
- Reject (+ optional applicant email) → Tasks 5, 9. ✅
- Invite reuses reset-password flow, firm-subdomain link → Tasks 2, 6, 8. ✅
- Admin-notify on new request → Tasks 6, 7. ✅
- Email non-fatal + `emailSent` surfaced → Tasks 8, 11. ✅
- `requireAdmin` catch gotcha avoided → Tasks 8, 9 (Global Constraints). ✅
- ROOT_DOMAIN open item resolved → Task 2. ✅

**Placeholder scan:** No TBD/TODO; every code + test step contains full content. ✅

**Type consistency:** `SignupService.createRequest/approve/reject` signatures and the `ApproveResult` shape are consistent across Tasks 3-5 and consumed identically in Tasks 7-9. `buildFirmBaseUrl` signature consistent between Task 2 and Task 8. Email template function names match between Task 6 and their consumers. ✅

**Note on page tests:** `/signup` and `/admin/access-requests` have no jest tests — the repo verifies form/page components via the running app, and the global jest env is `node`. Both are covered by browser-preview verification steps and the Task 12 smoke test.
