import { prisma } from '@/lib/prisma'
import { ActivityService } from '@/lib/services/activity'
import type { TicketPriority, TicketStatus } from '@prisma/client'

/**
 * SLA breach ladder.
 *
 * Each priority carries a turnaround we publish to clients. A ticket still
 * unresolved after that window has missed the commitment and is bumped to the
 * next tier so it resurfaces.
 *
 * `hours` mirrors the upper bound of the published turnaround in
 * lib/priorities.ts. LOW deliberately jumps straight to HIGH rather than
 * stepping through MEDIUM — that is the specific promise made to clients
 * ("a low priority ticket after 10 days becomes high"). Everything else steps
 * up one tier.
 *
 * null = no escalation: BACKLOG carries no commitment, and ULTRA_URGENT is
 * already the top of the scale.
 */
export const SLA_POLICY: Record<TicketPriority, { hours: number; escalateTo: TicketPriority } | null> = {
  BACKLOG: null,
  LOW: { hours: 10 * 24, escalateTo: 'HIGH' },
  MEDIUM: { hours: 7 * 24, escalateTo: 'HIGH' },
  HIGH: { hours: 5 * 24, escalateTo: 'EXTRA_HIGH' },
  EXTRA_HIGH: { hours: 2 * 24, escalateTo: 'URGENT' },
  URGENT: { hours: 24, escalateTo: 'ULTRA_URGENT' },
  ULTRA_URGENT: null,
}

/** Kept for the original low-priority promise, which the policy above encodes. */
export const LOW_PRIORITY_ESCALATION_DAYS = 10

/**
 * When the ladder came into force.
 *
 * The policy does not judge time served before it existed. Without this, the
 * pre-existing backlog — much of it sitting 1000+ hours at one priority —
 * would escalate on the first run and climb a tier per day until nearly every
 * open ticket was top priority, which would destroy the signal the ladder is
 * meant to create. Tickets older than this date effectively start their clock
 * here; anything created or re-prioritised afterwards behaves normally.
 */
export const SLA_POLICY_EFFECTIVE_FROM = new Date('2026-08-10T09:30:00.000Z')

/** Statuses that still count as outstanding work. */
export const UNRESOLVED_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT']

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface EscalatedTicket {
  id: string
  key: string | null
  title: string
  from: TicketPriority
  to: TicketPriority
  hoursAtPriority: number
}

export interface EscalationResult {
  escalated: number
  tickets: EscalatedTicket[]
}

/**
 * Whether a ticket sitting at `priority` since `since` has breached its SLA.
 *
 * The clock runs from when the ticket ENTERED its current priority, not from
 * creation. Measuring from creation would make an escalated ticket instantly
 * breach every tier above it — a 40-day-old ticket would climb from LOW to
 * ULTRA_URGENT on consecutive runs. Resetting the clock on each escalation
 * gives each tier its own full window.
 */
export function isBreached(priority: TicketPriority, since: Date, now: Date): boolean {
  const policy = SLA_POLICY[priority]
  if (!policy) return false
  return now.getTime() - slaClockStart(since).getTime() >= policy.hours * HOUR_MS
}

/**
 * Start of the SLA clock: when the ticket entered its current priority, or the
 * policy's effective date, whichever is later.
 */
export function slaClockStart(since: Date): Date {
  return since > SLA_POLICY_EFFECTIVE_FROM ? since : SLA_POLICY_EFFECTIVE_FROM
}

/**
 * Escalate every unresolved ticket that has overrun the SLA for its current
 * priority.
 *
 * Runs at most one tier per ticket per invocation, so a neglected ticket climbs
 * gradually rather than jumping to the top in a single pass.
 */
export async function escalateBreachedTickets(now: Date = new Date()): Promise<EscalationResult> {
  const escalatable = (Object.keys(SLA_POLICY) as TicketPriority[]).filter((p) => SLA_POLICY[p] !== null)

  const candidates = await prisma.ticket.findMany({
    where: {
      priority: { in: escalatable },
      status: { in: UNRESOLVED_STATUSES },
      isDeleted: false,
    },
    select: {
      id: true,
      key: true,
      title: true,
      priority: true,
      createdAt: true,
      // When the ticket last changed priority — the start of the current SLA clock.
      activities: {
        where: { type: 'PRIORITY_CHANGED' },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const tickets: EscalatedTicket[] = []

  for (const ticket of candidates) {
    const policy = SLA_POLICY[ticket.priority]
    if (!policy) continue

    const since = ticket.activities[0]?.createdAt ?? ticket.createdAt
    if (!isBreached(ticket.priority, since, now)) continue

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: policy.escalateTo },
      })
      // actorId is null: this is the system acting, not a person.
      await ActivityService.log({
        ticketId: ticket.id,
        actorId: null,
        type: 'PRIORITY_CHANGED',
        fromValue: ticket.priority,
        toValue: policy.escalateTo,
        message: `Auto-escalated: SLA overrun — unresolved for ${formatWindow(policy.hours)} at ${ticket.priority} priority`,
      })
      tickets.push({
        id: ticket.id,
        key: ticket.key,
        title: ticket.title,
        from: ticket.priority,
        to: policy.escalateTo,
        hoursAtPriority: Math.floor((now.getTime() - slaClockStart(since).getTime()) / HOUR_MS),
      })
    } catch (err) {
      // One bad ticket must not stop the rest of the run.
      console.error('[escalation] failed to escalate ticket', ticket.id, err)
    }
  }

  return { escalated: tickets.length, tickets }
}

function formatWindow(hours: number): string {
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

/** @deprecated superseded by the full ladder; retained so existing callers keep working. */
export const escalateStaleLowPriorityTickets = escalateBreachedTickets

export function escalationCutoff(now: Date, days = LOW_PRIORITY_ESCALATION_DAYS): Date {
  return new Date(now.getTime() - days * DAY_MS)
}
