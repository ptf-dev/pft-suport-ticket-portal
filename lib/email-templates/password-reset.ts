/**
 * Password Reset Email Template
 * 
 * Generates HTML and text versions of password reset email
 */

export interface PasswordResetEmailData {
  userName: string
  resetLink: string
  expiryHours: number
}

export function generatePasswordResetEmail(data: PasswordResetEmailData) {
  const { userName, resetLink, expiryHours } = data

  const subject = 'Reset Your Password - PropFirmsTech Support Portal'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Reset Your Password
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password for your PropFirmsTech Support Portal account. 
                      Click the button below to create a new password:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      Or copy and paste this link into your browser:
                    </p>
                    
                    <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 14px; color: #667eea;">
                      ${resetLink}
                    </p>
                    
                    <div style="margin: 30px 0; padding: 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                      <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Important:</strong> This link will expire in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}. 
                        If you didn't request a password reset, you can safely ignore this email.
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      If you're having trouble clicking the button, copy and paste the URL above into your web browser.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; line-height: 1.6; text-align: center;">
                      This email was sent from PropFirmsTech Support Portal
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                      If you didn't request this email, please ignore it or contact support if you have concerns.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `
Reset Your Password

Hi ${userName},

We received a request to reset your password for your PropFirmsTech Support Portal account.

To reset your password, click the link below or copy and paste it into your browser:

${resetLink}

⚠️ Important: This link will expire in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.

If you didn't request a password reset, you can safely ignore this email.

---
PropFirmsTech Support Portal
If you didn't request this email, please ignore it or contact support if you have concerns.
  `.trim()

  return { subject, html, text }
}
