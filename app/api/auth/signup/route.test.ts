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
    expect(data.message).toMatch(/review|submitted|password/i)
  })

  it('rejects invalid input with 400', async () => {
    const res = await POST(req({ name: '', email: 'not-an-email', firmName: '' }))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
