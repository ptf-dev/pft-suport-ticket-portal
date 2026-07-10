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
