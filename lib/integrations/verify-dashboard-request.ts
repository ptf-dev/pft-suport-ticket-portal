import { NextRequest } from 'next/server'

/**
 * Authenticate server-to-server calls from pft-backend (same secret as rule-checker / Super-Admin sync).
 */
export function verifyDashboardIntegrationRequest(request: NextRequest): boolean {
  const secret = request.headers.get('x-super-admin-secret')
  const expected = process.env.SUPER_ADMIN_SHARED_SECRET?.trim()
  return Boolean(expected && secret && secret === expected)
}

export function dashboardIntegrationUnauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized — invalid or missing x-super-admin-secret' },
    { status: 401 }
  )
}
