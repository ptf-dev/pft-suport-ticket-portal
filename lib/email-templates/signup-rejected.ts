/** Optional applicant email — sent only when an admin rejects with a reason. */
export interface SignupRejectedEmailData {
  userName: string
  firmName: string
  reason?: string | null
}

export function generateSignupRejectedEmail(data: SignupRejectedEmailData) {
  const { userName, firmName, reason } = data
  const subject = 'Update on your PropFirmsTech Support Portal access request'
  const reasonPart = reason ? `\n\nReason: ${reason}` : ''
  const text = `Hi ${userName},

Thank you for your interest. We were unable to approve your access request for ${firmName} at this time.${reasonPart}

If you believe this is a mistake, please reply to this email or contact your firm's administrator.

---
PropFirmsTech Support Portal`.trim()

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
      <p>Hi ${userName},</p>
      <p>Thank you for your interest. We were unable to approve your access request for <strong>${firmName}</strong> at this time.</p>
      ${reason ? `<p style="padding:12px;background:#f8f9fa;border-radius:4px;"><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this is a mistake, please reply to this email or contact your firm's administrator.</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">PropFirmsTech Support Portal</p>
    </div>
  `
  return { subject, html, text }
}
