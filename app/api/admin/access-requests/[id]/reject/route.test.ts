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
