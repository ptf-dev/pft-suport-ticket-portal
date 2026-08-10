import {
  SLA_POLICY,
  SLA_POLICY_EFFECTIVE_FROM,
  slaClockStart,
  isBreached,
  escalationCutoff,
  LOW_PRIORITY_ESCALATION_DAYS,
  UNRESOLVED_STATUSES,
} from './escalation'
import { PRIORITY_VALUES } from '@/lib/priorities'
import type { TicketPriority } from '@prisma/client'

const NOW = new Date('2026-10-01T12:00:00.000Z') // well after SLA_POLICY_EFFECTIVE_FROM, so window tests aren't clamped
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000)
const daysAgo = (d: number) => hoursAgo(d * 24)

describe('SLA_POLICY', () => {
  it('covers every priority in the enum', () => {
    for (const p of PRIORITY_VALUES) {
      expect(SLA_POLICY).toHaveProperty(p)
    }
  })

  it('exempts the tiers that carry no commitment or cannot go higher', () => {
    expect(SLA_POLICY.BACKLOG).toBeNull()
    expect(SLA_POLICY.ULTRA_URGENT).toBeNull()
  })

  it('keeps the client-facing promise that Low becomes High after 10 days', () => {
    expect(SLA_POLICY.LOW).toEqual({ hours: 10 * 24, escalateTo: 'HIGH' })
    expect(LOW_PRIORITY_ESCALATION_DAYS).toBe(10)
  })

  it('always escalates upward, never sideways or down', () => {
    const rank = (p: TicketPriority) => PRIORITY_VALUES.indexOf(p as (typeof PRIORITY_VALUES)[number])
    for (const p of PRIORITY_VALUES) {
      const policy = SLA_POLICY[p]
      if (!policy) continue
      expect(rank(policy.escalateTo)).toBeGreaterThan(rank(p))
    }
  })

  // Windows must shrink as urgency rises, otherwise a ticket could escalate
  // into a tier that is more forgiving than the one it came from.
  it('uses a tighter window at each higher priority', () => {
    const windows = PRIORITY_VALUES.map((p) => SLA_POLICY[p]?.hours).filter((h): h is number => h != null)
    const sortedDesc = [...windows].sort((a, b) => b - a)
    expect(windows).toEqual(sortedDesc)
  })

  it('terminates — following the ladder always reaches a non-escalating tier', () => {
    for (const start of PRIORITY_VALUES) {
      let current: TicketPriority = start
      let hops = 0
      while (SLA_POLICY[current] && hops < 10) {
        current = SLA_POLICY[current]!.escalateTo
        hops++
      }
      expect(SLA_POLICY[current]).toBeNull()
    }
  })
})

describe('isBreached', () => {
  it('is false before the window closes and true once it does', () => {
    expect(isBreached('LOW', daysAgo(9), NOW)).toBe(false)
    expect(isBreached('LOW', daysAgo(10), NOW)).toBe(true)
    expect(isBreached('LOW', daysAgo(11), NOW)).toBe(true)
  })

  it('applies each tier its own window', () => {
    expect(isBreached('MEDIUM', daysAgo(6), NOW)).toBe(false)
    expect(isBreached('MEDIUM', daysAgo(7), NOW)).toBe(true)
    expect(isBreached('HIGH', daysAgo(4), NOW)).toBe(false)
    expect(isBreached('HIGH', daysAgo(5), NOW)).toBe(true)
    expect(isBreached('EXTRA_HIGH', daysAgo(1), NOW)).toBe(false)
    expect(isBreached('EXTRA_HIGH', daysAgo(2), NOW)).toBe(true)
    expect(isBreached('URGENT', hoursAgo(23), NOW)).toBe(false)
    expect(isBreached('URGENT', hoursAgo(24), NOW)).toBe(true)
  })

  it('never escalates exempt tiers, however old', () => {
    expect(isBreached('BACKLOG', daysAgo(365), NOW)).toBe(false)
    expect(isBreached('ULTRA_URGENT', daysAgo(365), NOW)).toBe(false)
  })

  // The clock restarts on each escalation. Measuring from creation would let a
  // long-neglected ticket climb every tier on consecutive runs.
  it('measures from entry into the current priority, not from creation', () => {
    const justEscalated = hoursAgo(1)
    expect(isBreached('HIGH', justEscalated, NOW)).toBe(false)
  })
})

describe('grandfathering (SLA_POLICY_EFFECTIVE_FROM)', () => {
  it('starts the clock at the effective date for anything older', () => {
    const longBeforePolicy = new Date('2026-05-01T00:00:00.000Z')
    expect(slaClockStart(longBeforePolicy)).toEqual(SLA_POLICY_EFFECTIVE_FROM)
  })

  it('leaves the clock alone for tickets touched after the policy took effect', () => {
    const afterPolicy = new Date(SLA_POLICY_EFFECTIVE_FROM.getTime() + 60 * 60 * 1000)
    expect(slaClockStart(afterPolicy)).toEqual(afterPolicy)
  })

  // The whole point: a 1000-hour-old backlog ticket must not escalate on the
  // first run just because the policy arrived.
  it('does not escalate the pre-existing backlog immediately', () => {
    const ancient = new Date('2026-05-01T00:00:00.000Z')
    const justAfterPolicy = new Date(SLA_POLICY_EFFECTIVE_FROM.getTime() + 60 * 60 * 1000)
    expect(isBreached('URGENT', ancient, justAfterPolicy)).toBe(false)
    expect(isBreached('HIGH', ancient, justAfterPolicy)).toBe(false)
  })

  it('still escalates once the window elapses after the effective date', () => {
    const ancient = new Date('2026-05-01T00:00:00.000Z')
    const oneDayAfterPolicy = new Date(SLA_POLICY_EFFECTIVE_FROM.getTime() + 25 * 60 * 60 * 1000)
    expect(isBreached('URGENT', ancient, oneDayAfterPolicy)).toBe(true)
    // High gets 5 days, so a single day is not enough.
    expect(isBreached('HIGH', ancient, oneDayAfterPolicy)).toBe(false)
  })
})

describe('escalationCutoff', () => {
  it('is exactly the window before the given time', () => {
    expect(escalationCutoff(NOW).toISOString()).toBe('2026-09-21T12:00:00.000Z')
  })
})

describe('UNRESOLVED_STATUSES', () => {
  it('covers outstanding work only — resolved and closed are never escalated', () => {
    expect(UNRESOLVED_STATUSES).toEqual(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT'])
  })
})
