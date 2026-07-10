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
