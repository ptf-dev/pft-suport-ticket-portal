import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

/**
 * Password Reset Service
 * 
 * Handles password reset token generation, validation, and password updates
 */

export interface PasswordResetResult {
  success: boolean
  message: string
  error?: string
}

export class PasswordResetService {
  // Token expires in 1 hour
  private static readonly TOKEN_EXPIRY_HOURS = 1
  
  /**
   * Generate a secure random token
   * @returns 32-byte hex token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Request password reset - generates token and stores it
   * @param email - User's email address
   * @returns Result with success status
   */
  static async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      // Find user by email (case-insensitive)
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
          isActive: true,
        },
      })

      // Always return success to prevent email enumeration
      // Don't reveal whether the email exists or not
      if (!user) {
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        }
      }

      // Generate reset token
      const resetToken = this.generateToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS)

      // Store token in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpiresAt: expiresAt,
        },
      })

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Include token for email sending (not exposed to client)
        error: resetToken, // Using error field to pass token internally
      }
    } catch (error) {
      console.error('Password reset request error:', error)
      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Validate reset token
   * @param token - Reset token from URL
   * @returns User if token is valid, null otherwise
   */
  static async validateResetToken(token: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpiresAt: {
            gt: new Date(), // Token must not be expired
          },
          isActive: true,
        },
      })

      return user
    } catch (error) {
      console.error('Token validation error:', error)
      return null
    }
  }

  /**
   * Reset password using token
   * @param token - Reset token from URL
   * @param newPassword - New password (plain text, will be hashed)
   * @returns Result with success status
   */
  static async resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      // Validate token and get user
      const user = await this.validateResetToken(token)

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token. Please request a new password reset.',
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
      })

      return {
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.',
      }
    } catch (error) {
      console.error('Password reset error:', error)
      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Clear expired reset tokens (cleanup job)
   * Should be run periodically
   */
  static async clearExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.user.updateMany({
        where: {
          resetPasswordExpiresAt: {
            lt: new Date(),
          },
          resetPasswordToken: {
            not: null,
          },
        },
        data: {
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
      })

      return result.count
    } catch (error) {
      console.error('Clear expired tokens error:', error)
      return 0
    }
  }
}
