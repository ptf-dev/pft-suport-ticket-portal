import { escalationCutoff, LOW_PRIORITY_ESCALATION_DAYS, UNRESOLVED_STATUSES } from './escalation'

describe('escalationCutoff', () => {
  it('is exactly the SLA window before the given time', () => {
    const now = new Date('2026-08-10T12:00:00.000Z')
    expect(escalationCutoff(now).toISOString()).toBe('2026-07-31T12:00:00.000Z')
  })

  it('defaults to the low-priority SLA of 10 days', () => {
    expect(LOW_PRIORITY_ESCALATION_DAYS).toBe(10)
    const now = new Date('2026-08-10T12:00:00.000Z')
    expect(escalationCutoff(now)).toEqual(escalationCutoff(now, 10))
  })

  it('accepts an override window', () => {
    const now = new Date('2026-08-10T00:00:00.000Z')
    expect(escalationCutoff(now, 1).toISOString()).toBe('2026-08-09T00:00:00.000Z')
  })

  // A ticket created exactly 10 days ago has not yet passed the window; the
  // query uses `createdAt < cutoff`, so the boundary must be exclusive.
  it('puts a ticket created exactly at the boundary outside the stale set', () => {
    const now = new Date('2026-08-10T12:00:00.000Z')
    const cutoff = escalationCutoff(now)
    const createdExactlyTenDaysAgo = new Date('2026-07-31T12:00:00.000Z')
    expect(createdExactlyTenDaysAgo < cutoff).toBe(false)

    const createdASecondEarlier = new Date('2026-07-31T11:59:59.000Z')
    expect(createdASecondEarlier < cutoff).toBe(true)
  })
})

describe('UNRESOLVED_STATUSES', () => {
  it('covers outstanding work only — resolved and closed tickets are never escalated', () => {
    expect(UNRESOLVED_STATUSES).toEqual(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT'])
    expect(UNRESOLVED_STATUSES).not.toContain('RESOLVED')
    expect(UNRESOLVED_STATUSES).not.toContain('CLOSED')
  })
})
