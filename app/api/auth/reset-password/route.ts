import { NextRequest, NextResponse } from 'next/server'
import { PasswordResetService } from '@/lib/password-reset'

/**
 * POST /api/auth/reset-password
 * 
 * Reset password using token
 * 
 * Body:
 * - token: string (required) - Reset token from email
 * - password: string (required) - New password
 * 
 * Returns:
 * - 200: Password reset successful
 * - 400: Invalid request or token
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Reset password
    const result = await PasswordResetService.resetPassword(token, password)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.message,
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * 
 * Validate reset token
 * 
 * Query params:
 * - token: string (required) - Reset token to validate
 * 
 * Returns:
 * - 200: Token is valid
 * - 400: Token is invalid or expired
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      )
    }

    // Validate token
    const user = await PasswordResetService.validateResetToken(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
    })
  } catch (error) {
    console.error('Validate token error:', error)
    return NextResponse.json(
      { error: 'An error occurred while validating the token' },
      { status: 500 }
    )
  }
}
