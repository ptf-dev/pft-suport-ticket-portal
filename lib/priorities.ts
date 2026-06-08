import type { TicketPriority } from '@prisma/client'

/**
 * Single source of truth for ticket priorities.
 *
 * The priority ladder runs from lowest to highest:
 *   Idea/Backlog -> Low -> Medium -> High -> Extra High -> Urgent -> Ultra Urgent
 *
 * `turnover` is the target turnaround time for each level. It is descriptive
 * metadata surfaced in the UI (priority picker, tooltips) — there is no
 * automatic SLA / due-date enforcement tied to it.
 */

/** Badge variants (see components/ui/badge.tsx) used to render a priority. */
export type PriorityBadgeVariant =
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'destructive'

export interface PriorityMeta {
  value: TicketPriority
  /** Human-readable label, e.g. "Idea/Backlog", "Extra High". */
  label: string
  /** Target turnaround, e.g. "7–10 days"; null for backlog (no commitment). */
  turnover: string | null
  /** Sentence shown in the priority picker. */
  description: string
  /** Emoji indicator. */
  icon: string
  /** Badge variant for <Badge variant={...}>. */
  badgeVariant: PriorityBadgeVariant
  /** Tailwind background class for small dot indicators. */
  dotClass: string
  /** Colors for the OpenGraph social image. */
  og: { bg: string; fg: string }
}

/** Canonical order, lowest -> highest. Matches the Postgres enum order. */
export const PRIORITY_VALUES = [
  'BACKLOG',
  'LOW',
  'MEDIUM',
  'HIGH',
  'EXTRA_HIGH',
  'URGENT',
  'ULTRA_URGENT',
] as const

/** Typed view of PRIORITY_VALUES for iteration over TicketPriority. */
export const PRIORITY_ORDER = PRIORITY_VALUES as readonly TicketPriority[]

export const PRIORITY_META: Record<TicketPriority, PriorityMeta> = {
  BACKLOG: {
    value: 'BACKLOG',
    label: 'Idea/Backlog',
    turnover: null,
    description: 'Idea or backlog item — no committed turnaround',
    icon: '💡',
    badgeVariant: 'secondary',
    dotClass: 'bg-ink-faint',
    og: { bg: '#f1f5f9', fg: '#475569' },
  },
  LOW: {
    value: 'LOW',
    label: 'Low',
    turnover: '7–10 days',
    description: 'Low priority — 7–10 day turnaround',
    icon: '🟢',
    badgeVariant: 'success',
    dotClass: 'bg-emerald-500',
    og: { bg: '#dcfce7', fg: '#15803d' },
  },
  MEDIUM: {
    value: 'MEDIUM',
    label: 'Medium',
    turnover: '5–7 days',
    description: 'Normal priority — 5–7 day turnaround',
    icon: '🔵',
    badgeVariant: 'info',
    dotClass: 'bg-sky-500',
    og: { bg: '#dbeafe', fg: '#1d4ed8' },
  },
  HIGH: {
    value: 'HIGH',
    label: 'High',
    turnover: '3–5 days',
    description: 'Important issue — 3–5 day turnaround',
    icon: '🟠',
    badgeVariant: 'warning',
    dotClass: 'bg-amber-500',
    og: { bg: '#fed7aa', fg: '#c2410c' },
  },
  EXTRA_HIGH: {
    value: 'EXTRA_HIGH',
    label: 'Extra High',
    turnover: '2 days',
    description: 'Very important — 2 day turnaround',
    icon: '🟧',
    badgeVariant: 'warning',
    dotClass: 'bg-orange-600',
    og: { bg: '#ffedd5', fg: '#9a3412' },
  },
  URGENT: {
    value: 'URGENT',
    label: 'Urgent',
    turnover: '1 day',
    description: 'Critical issue — 1 day turnaround',
    icon: '🔴',
    badgeVariant: 'destructive',
    dotClass: 'bg-red-600',
    og: { bg: '#fee2e2', fg: '#b91c1c' },
  },
  ULTRA_URGENT: {
    value: 'ULTRA_URGENT',
    label: 'Ultra Urgent',
    turnover: '2 hours',
    description: 'Emergency — 2 hour turnaround',
    icon: '🚨',
    badgeVariant: 'destructive',
    dotClass: 'bg-red-800',
    og: { bg: '#fecaca', fg: '#7f1d1d' },
  },
}

/** Options for <select>/dropdowns, ordered low -> high, with turnover in the label. */
export const PRIORITY_OPTIONS = PRIORITY_ORDER.map((value) => {
  const meta = PRIORITY_META[value]
  return {
    value,
    label: meta.turnover ? `${meta.label} (${meta.turnover})` : meta.label,
  }
})

/** Human-readable label for a priority, with a safe fallback. */
export function priorityLabel(priority: TicketPriority): string {
  return PRIORITY_META[priority]?.label ?? String(priority)
}

/** Metadata for a priority, falling back to MEDIUM for unknown values. */
export function priorityMeta(priority: TicketPriority): PriorityMeta {
  return PRIORITY_META[priority] ?? PRIORITY_META.MEDIUM
}

/** Rank in the ladder (0 = lowest). Returns -1 for unknown values. */
export function priorityRank(priority: TicketPriority): number {
  return PRIORITY_ORDER.indexOf(priority)
}
