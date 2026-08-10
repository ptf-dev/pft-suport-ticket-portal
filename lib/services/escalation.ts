import { prisma } from '@/lib/prisma'
import { ActivityService } from '@/lib/services/activity'
import type { TicketPriority, TicketStatus } from '@prisma/client'

/**
 * Clients are promised a 7–10 day turnaround on LOW priority tickets. A LOW
 * ticket still open past that window has missed the commitment, so it is
 * escalated to HIGH to pull it back into view.
 */
export const LOW_PRIORITY_ESCALATION_DAYS = 10

/** Statuses that still count as outstanding work. */
export const UNRESOLVED_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT']

const DAY_MS = 24 * 60 * 60 * 1000

export interface EscalatedTicket {
  id: string
  key: string | null
  title: string
  ageDays: number
}

export interface EscalationResult {
  escalated: number
  tickets: EscalatedTicket[]
}

/** Cutoff before which a LOW ticket is considered to have missed its SLA. */
export function escalationCutoff(now: Date, days = LOW_PRIORITY_ESCALATION_DAYS): Date {
  return new Date(now.getTime() - days * DAY_MS)
}

/**
 * Escalate every LOW ticket that has been open longer than the SLA window.
 *
 * Age is measured from creation, because the promise to the client is a
 * turnaround time — a ticket being actively discussed still breaches the
 * commitment if it is unresolved on day 11.
 *
 * Naturally idempotent: an escalated ticket is HIGH afterwards, so it no
 * longer matches the LOW filter and cannot be escalated twice.
 */
export async function escalateStaleLowPriorityTickets(now: Date = new Date()): Promise<EscalationResult> {
  const cutoff = escalationCutoff(now)

  const stale = await prisma.ticket.findMany({
    where: {
      priority: 'LOW' as TicketPriority,
      status: { in: UNRESOLVED_STATUSES },
      isDeleted: false,
      createdAt: { lt: cutoff },
    },
    select: { id: true, key: true, title: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const tickets: EscalatedTicket[] = []

  for (const ticket of stale) {
    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: 'HIGH' as TicketPriority },
      })
      // actorId is null: this is the system acting, not a person.
      await ActivityService.log({
        ticketId: ticket.id,
        actorId: null,
        type: 'PRIORITY_CHANGED',
        fromValue: 'LOW',
        toValue: 'HIGH',
        message: `Auto-escalated: still open after ${LOW_PRIORITY_ESCALATION_DAYS} days at Low priority`,
      })
      tickets.push({
        id: ticket.id,
        key: ticket.key,
        title: ticket.title,
        ageDays: Math.floor((now.getTime() - ticket.createdAt.getTime()) / DAY_MS),
      })
    } catch (err) {
      // One bad ticket must not stop the rest of the run.
      console.error('[escalation] failed to escalate ticket', ticket.id, err)
    }
  }

  return { escalated: tickets.length, tickets }
}
