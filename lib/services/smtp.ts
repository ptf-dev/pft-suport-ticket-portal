import nodemailer, { Transporter } from 'nodemailer'
import { EncryptionService } from './encryption'

/**
 * SMTP Service for email sending using nodemailer
 * 
 * Requirements:
 * - 4.2: Test SMTP connection using provided settings
 * - 4.3: Display success message on successful connection
 * - 4.4: Display error message with connection details on failure
 * - 4.6: Complete connection test within 10 seconds or display timeout error
 */

export interface SMTPConnectionOptions {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export interface SMTPTestResult {
  success: boolean
  message: string
  error?: string
  timestamp: Date
}

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export class SMTPService {
  private static readonly CONNECTION_TIMEOUT = 10000 // 10 seconds

  /**
   * Create nodemailer transporter from config
   * @param config - SMTP connection configuration
   * @returns Nodemailer transporter instance
   */
  static createTransporter(config: SMTPConnectionOptions): Transporter {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      connectionTimeout: this.CONNECTION_TIMEOUT,
      greetingTimeout: this.CONNECTION_TIMEOUT,
      socketTimeout: this.CONNECTION_TIMEOUT,
    })
  }

  /**
   * Test SMTP connection
   * Requirement 4.2: Test SMTP connection using provided settings
   * Requirement 4.6: Complete connection test within 10 seconds or display timeout error
   * 
   * @param config - SMTP connection configuration
   * @returns Test result with success status and message
   */
  static async testConnection(config: SMTPConnectionOptions): Promise<SMTPTestResult> {
    const timestamp = new Date()

    try {
      const transporter = this.createTransporter(config)

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout. Please check host and port'))
        }, this.CONNECTION_TIMEOUT)
      })

      // Race between connection verification and timeout
      await Promise.race([
        transporter.verify(),
        timeoutPromise,
      ])

      // Close the transporter
      transporter.close()

      // Requirement 4.3: Display success message on successful connection
      return {
        success: true,
        message: 'Connection successful',
        timestamp,
      }
    } catch (error) {
      // Requirement 4.4: Display error message with connection details on failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Parse common SMTP errors
      let userFriendlyMessage = errorMessage

      if (errorMessage.includes('EAUTH') || errorMessage.includes('Invalid login')) {
        userFriendlyMessage = 'SMTP authentication failed. Please check your username and password'
      } else if (errorMessage.includes('ECONNREFUSED')) {
        userFriendlyMessage = 'Connection refused. Please check the host and port'
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Connection timeout. Please check host and port'
      } else if (errorMessage.includes('ENOTFOUND')) {
        userFriendlyMessage = 'Host not found. Please check the SMTP host address'
      } else if (errorMessage.includes('CERT') || errorMessage.includes('certificate')) {
        userFriendlyMessage = 'SSL/TLS certificate error. Try disabling secure connection or check certificate'
      }

      return {
        success: false,
        message: `Could not connect to SMTP server: ${userFriendlyMessage}`,
        error: errorMessage,
        timestamp,
      }
    }
  }

  /**
   * Send test email
   * Requirement 4.5: Send test email to sender address when connection test succeeds
   * 
   * @param config - SMTP connection configuration
   * @param to - Recipient email address
   * @returns Test result with success status and message
   */
  static async sendTestEmail(config: SMTPConnectionOptions, to: string): Promise<SMTPTestResult> {
    const timestamp = new Date()

    try {
      const transporter = this.createTransporter(config)

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Email sending timeout'))
        }, this.CONNECTION_TIMEOUT)
      })

      // Send test email with timeout
      const info = await Promise.race([
        transporter.sendMail({
          from: `"${config.auth.user}" <${config.auth.user}>`,
          to,
          subject: 'SMTP Configuration Test',
          text: 'This is a test email to verify your SMTP configuration is working correctly.',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>SMTP Configuration Test</h2>
              <p>This is a test email to verify your SMTP configuration is working correctly.</p>
              <p>If you received this email, your SMTP settings are configured properly.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
              <p style="color: #666; font-size: 12px;">
                Sent from PropFirmsTech Support Portal<br>
                ${timestamp.toISOString()}
              </p>
            </div>
          `,
        }),
        timeoutPromise,
      ])

      // Close the transporter
      transporter.close()

      return {
        success: true,
        message: `Test email sent successfully to ${to}`,
        timestamp,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Parse common email sending errors
      let userFriendlyMessage = errorMessage

      if (errorMessage.includes('EAUTH') || errorMessage.includes('Invalid login')) {
        userFriendlyMessage = 'SMTP authentication failed. Please check your username and password'
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Email sending timeout. Please try again'
      } else if (errorMessage.includes('Invalid recipient')) {
        userFriendlyMessage = 'Invalid recipient email address'
      }

      return {
        success: false,
        message: `Failed to send test email: ${userFriendlyMessage}`,
        error: errorMessage,
        timestamp,
      }
    }
  }

  /**
   * Get active SMTP configuration from database
   * @returns Active SMTP configuration or null if none exists
   */
  static async getActiveConfig(): Promise<SMTPConnectionOptions | null> {
    try {
      // Import prisma dynamically to avoid circular dependencies
      const { prisma } = await import('@/lib/prisma')
      
      const settings = await prisma.sMTPSettings.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      })

      if (!settings) {
        return null
      }

      // Decrypt password
      const decryptedPassword = EncryptionService.decrypt(settings.password)

      return {
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.username,
          pass: decryptedPassword,
        },
      }
    } catch (error) {
      console.error('Failed to get active SMTP config:', error)
      return null
    }
  }

  /**
   * Send email using active configuration
   * @param options - Email options (to, subject, text, html)
   * @returns true if email sent successfully, false otherwise
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const config = await this.getActiveConfig()

      if (!config) {
        console.error('No active SMTP configuration found')
        return false
      }

      const transporter = this.createTransporter(config)

      await transporter.sendMail({
        from: `"${config.auth.user}" <${config.auth.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })

      transporter.close()

      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }
}
