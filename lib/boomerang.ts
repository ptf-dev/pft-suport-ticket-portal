import type { Role, TicketStatus } from '@prisma/client'

/**
 * "Boomerang" tickets — opened, moved to WAITING_CLIENT (dev thought it was
 * handled), then bounced back to OPEN/IN_PROGRESS because the client disagreed.
 *
 * These are the highest-frustration tickets: the dev team considered them done,
 * the client did not. They must not get lost behind brand-new tickets, so we
 * surface them with a badge, a row tint, and a top-of-column sort.
 *
 * Detection is backed by the `bounceCount` / `reopenedAt` / `reopenedByRole`
 * fields on Ticket, which are maintained in `ActivityService.statusChanged`
 * (and backfilled from `ticket_activities`). A ticket only *reads* as a
 * boomerang while it is currently active — once it is resolved/closed again the
 * badge disappears, though the historical `bounceCount` is kept.
 */

export type BoomerangTicket = {
  status: TicketStatus
  bounceCount?: number | null
  reopenedByRole?: Role | null
}

/** The status transition that defines a bounce: client was asked, sent it back. */
export function isBounceTransition(from: string, to: string): boolean {
  return from === 'WAITING_CLIENT' && (to === 'OPEN' || to === 'IN_PROGRESS')
}

/** True when a ticket is currently a boomerang that needs dev attention. */
export function isBoomerang(t: BoomerangTicket): boolean {
  return (t.bounceCount ?? 0) > 0 && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
}

export type BoomerangMeta = {
  /** Short label for the badge. */
  label: string
  /** "·2×" multiplier suffix, empty when bounced only once. */
  suffix: string
  /** Severity tone: a client reopen is the real frustration signal (danger). */
  tone: 'danger' | 'warn'
}

/**
 * Badge copy + tone. A CLIENT-driven reopen (the client rejected our fix) is the
 * loud red signal; a dev/system reopen is the quieter amber one.
 */
export function boomerangMeta(role?: Role | null, count = 0): BoomerangMeta {
  const byClient = role === 'CLIENT'
  return {
    label: byClient ? 'Client reopened' : 'Reopened',
    suffix: count > 1 ? ` ·${count}×` : '',
    tone: byClient ? 'danger' : 'warn',
  }
}
