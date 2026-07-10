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
}
