/** Admin notice — sent to super-admins when a new access request arrives. */
export interface SignupAdminNoticeData {
  name: string
  email: string
  firmName: string
  note?: string | null
  reviewLink: string
}

export function generateSignupAdminNotice(data: SignupAdminNoticeData) {
  const { name, email, firmName, note, reviewLink } = data
  const subject = `New access request: ${name} (${firmName})`
  const notePart = note ? `\n\nNote from applicant:\n${note}` : ''
  const text = `A new support-portal access request is awaiting review.

Name:  ${name}
Email: ${email}
Firm:  ${firmName}${notePart}

Review it here: ${reviewLink}

---
PropFirmsTech Support Portal`.trim()

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
      <h2 style="margin:0 0 16px;">New access request awaiting review</h2>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td style="padding:4px 0;"><strong>${name}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="padding:4px 0;">${email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Firm</td><td style="padding:4px 0;">${firmName}</td></tr>
      </table>
      ${note ? `<p style="margin:16px 0;padding:12px;background:#f8f9fa;border-radius:4px;font-size:14px;">${note}</p>` : ''}
      <p style="margin:24px 0;"><a href="${reviewLink}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Review request</a></p>
    </div>
  `
  return { subject, html, text }
}
