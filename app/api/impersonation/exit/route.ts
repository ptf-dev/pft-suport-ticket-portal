import { NextRequest, NextResponse } from 'next/server'
import { decode, getToken } from 'next-auth/jwt'
import { authCookies, cookieOptions } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

/**
 * POST /api/impersonation/exit
 * Restores the admin session that was set aside when the admin started viewing as a client.
 * Callable by the impersonated session only; the stashed token must decode to that same admin.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET
  const cookies = authCookies(request)
  const stashed = request.cookies.get(cookies.stash)?.value
  const current = secret ? await getToken({ req: request, secret }) : null

  if (!secret || !stashed || !current?.impersonatorId) {
    return NextResponse.json({ error: 'Not viewing as a user' }, { status: 400 })
  }

  let adminToken
  try {
    adminToken = await decode({ token: stashed, secret })
  } catch {
    adminToken = null
  }
  if (!adminToken || adminToken.role !== 'ADMIN' || adminToken.id !== current.impersonatorId) {
    const response = NextResponse.json({ error: 'Admin session expired, sign in again' }, { status: 401 })
    response.cookies.delete(cookies.stash)
    return response
  }

  console.info(`[impersonation] ${adminToken.email} stopped viewing the portal as ${current.email}`)

  const remaining = typeof adminToken.exp === 'number' ? adminToken.exp - Math.floor(Date.now() / 1000) : 60 * 60
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookies.session, stashed, cookieOptions(cookies.secure, Math.max(60, remaining)))
  response.cookies.delete(cookies.stash)
  return response
}
