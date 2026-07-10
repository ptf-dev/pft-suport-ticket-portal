/**
 * Signup Invite Email — sent when an admin approves an access request.
 * Reuses the password-reset link flow (the inviteLink points at
 * /reset-password?token=... on the firm's subdomain).
 */
export interface SignupInviteEmailData {
  userName: string
  firmName: string
  inviteLink: string
  expiryDays: number
}

export function generateSignupInviteEmail(data: SignupInviteEmailData) {
  const { userName, firmName, inviteLink, expiryDays } = data
  const subject = 'Your access is approved — set your password | PropFirmsTech Support Portal'

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Set your password</title></head>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr><td align="center" style="padding:40px 0;">
            <table role="presentation" style="width:600px;border-collapse:collapse;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <tr><td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px 8px 0 0;">
                <h1 style="margin:0;color:#fff;font-size:26px;font-weight:bold;">Welcome to ${firmName}'s support portal</h1>
              </td></tr>
              <tr><td style="padding:40px;">
                <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">Hi ${userName},</p>
                <p style="margin:0 0 20px;color:#333;font-size:16px;line-height:1.6;">
                  Your request to join the <strong>${firmName}</strong> support team on the PropFirmsTech Support Portal has been approved.
                  Set your password to activate your personal login:
                </p>
                <table role="presentation" style="width:100%;border-collapse:collapse;margin:30px 0;"><tr><td align="center">
                  <a href="${inviteLink}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;">Set Your Password</a>
                </td></tr></table>
                <p style="margin:20px 0;color:#666;font-size:14px;line-height:1.6;">Or copy and paste this link into your browser:</p>
                <p style="margin:0 0 20px;padding:12px;background:#f8f9fa;border-radius:4px;word-break:break-all;font-size:14px;color:#667eea;">${inviteLink}</p>
                <div style="margin:30px 0;padding:16px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;">
                  <p style="margin:0;color:#856404;font-size:14px;line-height:1.6;"><strong>⚠️ Important:</strong> This link expires in ${expiryDays} days. If you didn't request access, you can ignore this email.</p>
                </div>
              </td></tr>
              <tr><td style="padding:30px 40px;background:#f8f9fa;border-radius:0 0 8px 8px;border-top:1px solid #e9ecef;">
                <p style="margin:0;color:#999;font-size:12px;line-height:1.6;text-align:center;">PropFirmsTech Support Portal</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `

  const text = `Welcome to ${firmName}'s support portal

Hi ${userName},

Your request to join the ${firmName} support team on the PropFirmsTech Support Portal has been approved.

Set your password to activate your personal login:

${inviteLink}

⚠️ Important: This link expires in ${expiryDays} days. If you didn't request access, you can ignore this email.

---
PropFirmsTech Support Portal`.trim()

  return { subject, html, text }
}
