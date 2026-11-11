import { formatEventMessage } from './webhook-relay-message'

const relay = 'Acme Firm'

function purchase(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    event: 'purchase_completed',
    data: { amount: 199, currency: 'USD', email: 'trader@example.com', ...extra },
  })
}

function monthLine(raw: string): string | undefined {
  const { message } = formatEventMessage(relay, raw, null, null)
  return message.split('\n').find((l) => l.startsWith('📅'))
}

describe('formatEventMessage — current-month revenue', () => {
  it('renders the month line under the firm total', () => {
    const { message } = formatEventMessage(
      relay,
      purchase({ firmTotalRevenueUsd: 12051.34, firmTotalUsers: 479, firmRevenueThisMonthUsd: 1840.52 }),
      null,
      null
    )
    expect(message).toContain('📊 Firm total: $12,051.34 USD · 479 users\n📅 This month: $1,840.52 USD')
  })

  it('prints $0.00 for a zero month — first sale of the month is not "missing"', () => {
    expect(monthLine(purchase({ firmTotalRevenueUsd: 500, firmRevenueThisMonthUsd: 0 }))).toBe('📅 This month: $0.00 USD')
  })

  it('omits the line entirely when the field is absent', () => {
    const { message } = formatEventMessage(relay, purchase({ firmTotalRevenueUsd: 500, firmTotalUsers: 12 }), null, null)
    expect(message).not.toContain('📅')
    expect(message).not.toMatch(/undefined|NaN/)
    expect(message.endsWith('📊 Firm total: $500.00 USD · 12 users')).toBe(true)
  })

  it('ignores a non-numeric value rather than rendering it', () => {
    expect(monthLine(purchase({ firmTotalRevenueUsd: 500, firmRevenueThisMonthUsd: '1840.52' }))).toBeUndefined()
  })

  it('still renders the month line when the firm total is missing', () => {
    expect(monthLine(purchase({ firmRevenueThisMonthUsd: 1840.52 }))).toBe('📅 This month: $1,840.52 USD')
  })

  it('leaves the rest of the message untouched', () => {
    const base = formatEventMessage(relay, purchase({ firmTotalRevenueUsd: 500 }), null, null).message
    const withMonth = formatEventMessage(relay, purchase({ firmTotalRevenueUsd: 500, firmRevenueThisMonthUsd: 40 }), null, null).message
    expect(withMonth).toBe(`${base}\n📅 This month: $40.00 USD`)
  })

  it('does not reach the relay-tracked total fallback when only the month is sent', () => {
    const { message } = formatEventMessage(relay, purchase({ firmRevenueThisMonthUsd: 40 }), null, { totalRevenue: 1000, eventCount: 5 })
    expect(message).not.toContain('Total revenue')
    expect(message).toContain('📅 This month: $40.00 USD')
  })

  it('is purchase-only — a generic event does not grow a month line', () => {
    const raw = JSON.stringify({ event: 'user_registered', data: { email: 'a@b.c', firmRevenueThisMonthUsd: 40 } })
    const { message } = formatEventMessage(relay, raw, null, null)
    expect(message).not.toContain('📅')
  })
})
