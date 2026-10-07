import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'next-auth.session-token'
const STASH_COOKIE = 'next-auth.impersonator-token'

export const EXIT_IMPERSONATION_PATH = '/api/impersonation/exit'

/** How long "Back to admin" keeps working after an admin starts viewing as a client. */
export const IMPERSONATOR_STASH_MAX_AGE = 12 * 60 * 60

/** NextAuth prefixes its cookie with __Secure- on https; follow whatever the browser already holds. */
export function authCookies(request: NextRequest) {
  const secure = request.cookies.has(`__Secure-${SESSION_COOKIE}`)
  return {
    secure,
    session: secure ? `__Secure-${SESSION_COOKIE}` : SESSION_COOKIE,
    stash: secure ? `__Secure-${STASH_COOKIE}` : STASH_COOKIE,
  }
}

export function cookieOptions(secure: boolean, maxAge: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge }
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Viewing as a client is read-only: every API write is refused except NextAuth itself and leaving the view. */
export function isBlockedWhileImpersonating(method: string, pathname: string): boolean {
  if (!WRITE_METHODS.has(method.toUpperCase())) return false
  if (!pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/api/auth/')) return false
  if (pathname === EXIT_IMPERSONATION_PATH) return false
  return true
}
