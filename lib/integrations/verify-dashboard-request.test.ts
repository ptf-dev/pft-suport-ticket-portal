import { NextRequest } from 'next/server'
import { verifyDashboardIntegrationRequest } from './verify-dashboard-request'

describe('verifyDashboardIntegrationRequest', () => {
  const original = process.env.SUPER_ADMIN_SHARED_SECRET

  afterEach(() => {
    process.env.SUPER_ADMIN_SHARED_SECRET = original
  })

  it('rejects when secret is missing on portal', () => {
    delete process.env.SUPER_ADMIN_SHARED_SECRET
    const request = new NextRequest('http://localhost/api/integrations/dashboard/escalate', {
      headers: { 'x-super-admin-secret': 'test' },
    })
    expect(verifyDashboardIntegrationRequest(request)).toBe(false)
  })

  it('rejects when header does not match', () => {
    process.env.SUPER_ADMIN_SHARED_SECRET = 'expected'
    const request = new NextRequest('http://localhost/api/integrations/dashboard/escalate', {
      headers: { 'x-super-admin-secret': 'wrong' },
    })
    expect(verifyDashboardIntegrationRequest(request)).toBe(false)
  })

  it('accepts matching secret', () => {
    process.env.SUPER_ADMIN_SHARED_SECRET = 'expected'
    const request = new NextRequest('http://localhost/api/integrations/dashboard/escalate', {
      headers: { 'x-super-admin-secret': 'expected' },
    })
    expect(verifyDashboardIntegrationRequest(request)).toBe(true)
  })
})
