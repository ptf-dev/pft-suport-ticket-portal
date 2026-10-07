import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { authCookies, cookieOptions, IMPERSONATOR_STASH_MAX_AGE } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[id]/impersonate
 * Swaps the admin's session for a read-only client session of the given user and
 * keeps the admin's own session in a second cookie so "Back to admin" can restore it.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let session
  try {
    session = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, companyId: true },
  })
  if (!target || target.role !== 'CLIENT' || !target.companyId) {
    return NextResponse.json({ error: 'Only client users can be viewed this way' }, { status: 400 })
  }

  const cookies = authCookies(request)
  const adminToken = request.cookies.get(cookies.session)?.value
  const secret = process.env.NEXTAUTH_SECRET
  if (!adminToken || !secret) {
    return NextResponse.json({ error: 'No admin session to return to' }, { status: 401 })
  }

  const clientToken = await encode({
    secret,
    maxAge: IMPERSONATOR_STASH_MAX_AGE,
    token: {
      sub: target.id,
      id: target.id,
      name: target.name,
      email: target.email,
      role: 'CLIENT',
      companyId: target.companyId,
      impersonatorId: session.user.id,
      impersonatorName: session.user.name,
    },
  })

  console.info(`[impersonation] ${session.user.email} started viewing the portal as ${target.email}`)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookies.stash, adminToken, cookieOptions(cookies.secure, IMPERSONATOR_STASH_MAX_AGE))
  response.cookies.set(cookies.session, clientToken, cookieOptions(cookies.secure, IMPERSONATOR_STASH_MAX_AGE))
  return response
}
