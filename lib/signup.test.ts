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
