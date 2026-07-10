import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { generateSignupRejectedEmail } from '@/lib/email-templates/signup-rejected'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : undefined

    const { request: rejected } = await SignupService.reject(params.id, session.user.id, reason)

    let emailSent = false
    if (reason) {
      const email = generateSignupRejectedEmail({
        userName: rejected.name, firmName: rejected.firmName, reason,
      })
      emailSent = await SMTPService.sendEmail({
        to: rejected.email, subject: email.subject, html: email.html, text: email.text,
      })
    }

    return NextResponse.json({ message: 'Request rejected.', emailSent }, { status: 200 })
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
    console.error('Reject access request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
