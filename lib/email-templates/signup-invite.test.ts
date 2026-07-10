import { describe, it, expect } from '@jest/globals'
import { generateSignupInviteEmail } from './signup-invite'

describe('generateSignupInviteEmail', () => {
  it('includes the invite link, firm name, and expiry in body + subject', () => {
    const out = generateSignupInviteEmail({
      userName: 'Jane',
      firmName: 'Acme LLC',
      inviteLink: 'https://acme.propfirmstech.com/reset-password?token=abc',
      expiryDays: 7,
    })
    expect(out.subject).toMatch(/PropFirmsTech/i)
    expect(out.html).toContain('https://acme.propfirmstech.com/reset-password?token=abc')
    expect(out.html).toContain('Acme LLC')
    expect(out.html).toContain('7 days')
    expect(out.text).toContain('https://acme.propfirmstech.com/reset-password?token=abc')
  })
})
