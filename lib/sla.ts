import type { TicketPriority, TicketStatus } from '@prisma/client'

/**
 * SLA / aging model.
 *
 * There is no stored SLA field on a ticket. We derive a target turnaround from
 * the ticket's priority (see lib/priorities.ts `turnover`) and measure elapsed
 * time since `createdAt` for any ticket that is not yet settled
 * (RESOLVED / CLOSED). This gives us:
 *   - a per-ticket SLA state for UI badges (`ticketSla`)
 *   - a Prisma `where` fragment for server-side filtering (`slaConditions`)
 *
 * Targets are the upper bound of each priority's turnover window.
 */

const HOUR = 3_600_000

/** Target turnaround in hours per priority. `null` = no commitment. */
export const SLA_TARGET_HOURS: Record<TicketPriority, number | null> = {
  BACKLOG: null,
  LOW: 240, // 10 days
  MEDIUM: 168, // 7 days
  HIGH: 120, // 5 days
  EXTRA_HIGH: 48, // 2 days
  URGENT: 24, // 1 day
  ULTRA_URGENT: 2, // 2 hours
}

/** Statuses that stop the SLA clock — work is settled. */
export const SETTLED_STATUSES: TicketStatus[] = ['RESOLVED', 'CLOSED']

/** Unresolved statuses — the ones an SLA clock can run against. */
export const UNRESOLVED_STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'BLOCKED',
  'WAITING_CLIENT',
]

export type SlaState = 'none' | 'ok' | 'risk' | 'breach'

export interface SlaResult {
  state: SlaState
  /** Target turnaround in hours, or null when none applies. */
  targetHours: number | null
  /** ms since createdAt. */
  ageMs: number
  /** ms since updatedAt (time untouched). */
  idleMs: number
  /** ms past the target deadline (>0 only when breached). */
  overdueMs: number
  /** Short human label for a badge, e.g. "Overdue 3d", "Due soon", "Idle 12d". */
  label: string | null
}

interface SlaInput {
  priority: TicketPriority
  status: TicketStatus
  createdAt: Date | string
  updatedAt?: Date | string | null
}

const RISK_RATIO = 0.75
/** Idle threshold (ms) above which we surface an "Idle Nd" hint on healthy tickets. */
const IDLE_HINT_MS = 7 * 24 * HOUR

/** Compact duration, e.g. 280000000 -> "3d", 9000000 -> "2h", 120000 -> "2m". */
export function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(ms / HOUR)
  const days = Math.floor(ms / (24 * HOUR))
  if (days >= 1) {
    const remH = Math.floor((ms - days * 24 * HOUR) / HOUR)
    return remH > 0 && days < 3 ? `${days}d ${remH}h` : `${days}d`
  }
  if (hours >= 1) return `${hours}h`
  if (mins >= 1) return `${mins}m`
  return 'now'
}

/** Compute the SLA state of a single ticket against `now` (defaults to Date.now()). */
export function ticketSla(input: SlaInput, now: number = Date.now()): SlaResult {
  const created = new Date(input.createdAt).getTime()
  const updated = input.updatedAt ? new Date(input.updatedAt).getTime() : created
  const ageMs = Math.max(0, now - created)
  const idleMs = Math.max(0, now - updated)
  const target = SLA_TARGET_HOURS[input.priority]

  // Settled or no committed turnaround -> no active SLA pressure.
  if (SETTLED_STATUSES.includes(input.status) || target == null) {
    return { state: 'none', targetHours: target, ageMs, idleMs, overdueMs: 0, label: null }
  }

  const targetMs = target * HOUR
  const ratio = ageMs / targetMs

  if (ratio >= 1) {
    const overdueMs = ageMs - targetMs
    return {
      state: 'breach',
      targetHours: target,
      ageMs,
      idleMs,
      overdueMs,
      label: `Overdue ${formatDuration(overdueMs)}`,
    }
  }
  if (ratio >= RISK_RATIO) {
    return {
      state: 'risk',
      targetHours: target,
      ageMs,
      idleMs,
      overdueMs: 0,
      label: `Due in ${formatDuration(targetMs - ageMs)}`,
    }
  }
  // Healthy, but flag if it has gone quiet for a while.
  if (idleMs >= IDLE_HINT_MS) {
    return {
      state: 'ok',
      targetHours: target,
      ageMs,
      idleMs,
      overdueMs: 0,
      label: `Idle ${formatDuration(idleMs)}`,
    }
  }
  return { state: 'ok', targetHours: target, ageMs, idleMs, overdueMs: 0, label: null }
}

/**
 * Severity rank for sorting — higher = more urgent.
 * breach (3) > risk (2) > ok (1) > none (0).
 */
export function slaSeverity(state: SlaState): number {
  return state === 'breach' ? 3 : state === 'risk' ? 2 : state === 'ok' ? 1 : 0
}

/**
 * Build a Prisma `where` fragment (an array meant for `where.AND`) that matches
 * unresolved tickets whose age crosses the SLA threshold.
 *   - 'breach' -> age >= target
 *   - 'risk'   -> age >= 75% of target (includes breached)
 *
 * Returns conditions to push into `where.AND` so it composes with any existing
 * `where.OR` (e.g. text search) without clobbering it.
 */
export function slaConditions(mode: 'risk' | 'breach', now: Date = new Date()): object[] {
  const ratio = mode === 'breach' ? 1 : RISK_RATIO
  const ms = now.getTime()
  const or = (Object.keys(SLA_TARGET_HOURS) as TicketPriority[])
    .filter((p) => SLA_TARGET_HOURS[p] != null)
    .map((p) => ({
      priority: p,
      createdAt: { lt: new Date(ms - SLA_TARGET_HOURS[p]! * HOUR * ratio) },
    }))
  return [{ status: { in: UNRESOLVED_STATUSES } }, { OR: or }]
}
