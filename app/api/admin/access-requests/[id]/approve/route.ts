import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { generateSignupInviteEmail } from '@/lib/email-templates/signup-invite'
import { buildFirmBaseUrl } from '@/lib/urls'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const body = await request.json().catch(() => ({}))
    const companyId = typeof body?.companyId === 'string' ? body.companyId.trim() : ''
    if (!companyId) {
      return NextResponse.json(
        { error: 'Validation failed', details: { companyId: ['Please select a firm to map this user to'] } },
        { status: 400 },
      )
    }

    const result = await SignupService.approve(params.id, companyId, session.user.id)

    const inviteLink = `${buildFirmBaseUrl(result.company.subdomain)}/reset-password?token=${result.token}`
    const email = generateSignupInviteEmail({
      userName: result.user.name,
      firmName: result.company.name,
      inviteLink,
      expiryDays: result.expiryDays,
    })
    const emailSent = await SMTPService.sendEmail({
      to: result.user.email, subject: email.subject, html: email.html, text: email.text,
    })

    return NextResponse.json(
      {
        message: result.alreadyExisted
          ? 'User already existed for this firm — a fresh invite link was sent.'
          : 'User created and invite sent.',
        userId: result.user.id,
        alreadyExisted: result.alreadyExisted,
        emailSent,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof Error &&
        (error.message.includes('Admin access required') || error.message.includes('Authentication required'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Request already reviewed') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'Request not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'Invalid company') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Approve access request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
