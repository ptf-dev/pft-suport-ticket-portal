import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SignupService } from '@/lib/signup'
import { SMTPService } from '@/lib/services/smtp'
import { generateSignupAdminNotice } from '@/lib/email-templates/signup-admin-notice'
import { prisma } from '@/lib/prisma'

const GENERIC_MESSAGE =
  'Thanks — your request has been submitted. If approved, we\'ll email you a link to set your password.'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  firmName: z.string().min(1, 'Firm name is required'),
  note: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = parsed.data
    const { created } = await SignupService.createRequest(data)

    // Notify super-admins (best-effort, non-fatal). Only on a genuinely new request.
    if (created) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { email: true },
        })
        if (admins.length > 0) {
          const reviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/access-requests`
          const email = generateSignupAdminNotice({
            name: data.name,
            email: data.email,
            firmName: data.firmName,
            note: data.note ?? null,
            reviewLink,
          })
          await Promise.all(
            admins.map((a) =>
              SMTPService.sendEmail({ to: a.email, subject: email.subject, html: email.html, text: email.text }),
            ),
          )
        }
      } catch (notifyError) {
        console.error('Failed to notify admins of new signup request:', notifyError)
      }
    }

    // Always the same response (anti-enumeration).
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 })
  } catch (error) {
    console.error('Signup request error:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 })
  }
}
