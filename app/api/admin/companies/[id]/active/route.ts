import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/companies/[id]/active
 * Toggle a company active/inactive and cascade the same state to all of its
 * users (deactivating a firm disables login for its whole team; an inactive
 * company is also skipped by the dashboard escalation resolver).
 * Body: { active: boolean }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const active = body?.active
    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const [, usersRes] = await prisma.$transaction([
      prisma.company.update({ where: { id: params.id }, data: { isActive: active } }),
      prisma.user.updateMany({ where: { companyId: params.id }, data: { isActive: active } }),
    ])

    return NextResponse.json({ ok: true, active, users: usersRes.count })
  } catch (error) {
    console.error('Failed to toggle company active state', error)
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}
