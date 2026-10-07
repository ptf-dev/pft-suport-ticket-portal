import { isBlockedWhileImpersonating, EXIT_IMPERSONATION_PATH } from './impersonation'

describe('isBlockedWhileImpersonating', () => {
  it('blocks API writes made while viewing as a client', () => {
    expect(isBlockedWhileImpersonating('POST', '/api/portal/tickets')).toBe(true)
    expect(isBlockedWhileImpersonating('PATCH', '/api/portal/tickets/abc/status')).toBe(true)
    expect(isBlockedWhileImpersonating('DELETE', '/api/portal/tickets/abc/images/img1')).toBe(true)
    expect(isBlockedWhileImpersonating('put', '/api/portal/settings/notifications')).toBe(true)
  })

  it('lets reads through', () => {
    expect(isBlockedWhileImpersonating('GET', '/api/portal/tickets')).toBe(false)
    expect(isBlockedWhileImpersonating('HEAD', '/api/portal/tickets')).toBe(false)
  })

  it('never blocks pages, only API routes', () => {
    expect(isBlockedWhileImpersonating('POST', '/portal/tickets/new')).toBe(false)
  })

  it('keeps sign-out and the exit route usable', () => {
    expect(isBlockedWhileImpersonating('POST', '/api/auth/signout')).toBe(false)
    expect(isBlockedWhileImpersonating('POST', EXIT_IMPERSONATION_PATH)).toBe(false)
  })
})
