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
