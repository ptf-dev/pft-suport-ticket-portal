import { NextRequest, NextResponse } from 'next/server'
import { PasswordResetService } from '@/lib/password-reset'
import { SMTPService } from '@/lib/services/smtp'
import { generatePasswordResetEmail } from '@/lib/email-templates/password-reset'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/forgot-password
 * 
 * Request a password reset link
 * 
 * Body:
 * - email: string (required)
 * 
 * Returns:
 * - 200: Success message (always, to prevent email enumeration)
 * - 400: Invalid request
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Request password reset (generates token)
    const result = await PasswordResetService.requestPasswordReset(email)

    // If token was generated (user exists), send email
    if (result.success && result.error) {
      const token = result.error // Token is passed in error field internally
      
      // Get user details for email
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
          isActive: true,
        },
      })

      if (user) {
        // Generate reset link
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const resetLink = `${baseUrl}/reset-password?token=${token}`

        // Generate email content
        const emailContent = generatePasswordResetEmail({
          userName: user.name,
          resetLink,
          expiryHours: 1,
        })

        // Send email
        const emailSent = await SMTPService.sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })

        if (!emailSent) {
          console.error('Failed to send password reset email to:', email)
          // Don't reveal email sending failure to prevent enumeration
        }
      }
    }

    // Always return success message to prevent email enumeration
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
