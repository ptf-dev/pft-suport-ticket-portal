import type { SprintStatus, TicketStatus, TicketPriority } from '@prisma/client'
import { ticketSla } from '@/lib/sla'

/** Badge variant per sprint status (see components/ui/badge.tsx). */
export const SPRINT_STATUS_META: Record<SprintStatus, { label: string; badge: string; dot: string }> = {
  PLANNED:   { label: 'Planned',   badge: 'secondary', dot: 'bg-ink-faint' },
  ACTIVE:    { label: 'Active',    badge: 'info',       dot: 'bg-info' },
  COMPLETED: { label: 'Completed', badge: 'success',    dot: 'bg-ok' },
}

/** A ticket is "done" if resolved/closed or already archived. */
export function isDone(t: { status: TicketStatus; archivedAt?: Date | string | null }): boolean {
  return t.status === 'RESOLVED' || t.status === 'CLOSED' || t.archivedAt != null
}

export interface SprintReportRow {
  companyId: string
  companyName: string
  total: number
  done: number
  inProgress: number
  todo: number
  /** Average resolution time (hours) across done tickets that have a resolvedAt. */
  avgResolutionHours: number | null
  /** Unfinished tickets currently past their SLA target. */
  breaches: number
}

interface ReportTicket {
  companyId: string
  company: { name: string }
  status: TicketStatus
  priority: TicketPriority
  createdAt: Date | string
  updatedAt?: Date | string | null
  resolvedAt?: Date | string | null
  archivedAt?: Date | string | null
}

export interface SprintReport {
  rows: SprintReportRow[]
  totals: Omit<SprintReportRow, 'companyId' | 'companyName'>
}

/** Group sprint tickets by prop firm and compute delivery metrics. */
export function buildSprintReport(tickets: ReportTicket[], now: number = Date.now()): SprintReport {
  const byCompany = new Map<string, ReportTicket[]>()
  for (const t of tickets) {
    const arr = byCompany.get(t.companyId)
    if (arr) arr.push(t)
    else byCompany.set(t.companyId, [t])
  }

  const rows: SprintReportRow[] = []
  for (const [companyId, list] of Array.from(byCompany.entries())) {
    let done = 0
    let inProgress = 0
    let todo = 0
    let breaches = 0
    let resSum = 0
    let resCount = 0
    for (const t of list) {
      if (isDone(t)) {
        done++
        if (t.resolvedAt) {
          resSum += new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()
          resCount++
        }
      } else {
        if (t.status === 'IN_PROGRESS') inProgress++
        else todo++
        const sla = ticketSla({ priority: t.priority, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt }, now)
        if (sla.state === 'breach') breaches++
      }
    }
    rows.push({
      companyId,
      companyName: list[0].company.name,
      total: list.length,
      done,
      inProgress,
      todo,
      avgResolutionHours: resCount > 0 ? resSum / resCount / 3_600_000 : null,
      breaches,
    })
  }

  rows.sort((a, b) => b.total - a.total || a.companyName.localeCompare(b.companyName))

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total
      acc.done += r.done
      acc.inProgress += r.inProgress
      acc.todo += r.todo
      acc.breaches += r.breaches
      return acc
    },
    { total: 0, done: 0, inProgress: 0, todo: 0, breaches: 0, avgResolutionHours: null as number | null },
  )

  // Overall avg resolution, weighted across all done+resolved tickets.
  let allSum = 0
  let allCount = 0
  for (const t of tickets) {
    if (isDone(t) && t.resolvedAt) {
      allSum += new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()
      allCount++
    }
  }
  totals.avgResolutionHours = allCount > 0 ? allSum / allCount / 3_600_000 : null

  return { rows, totals }
}

/** "27h" or "3.2d" style for resolution times. */
export function formatHours(h: number | null): string {
  if (h == null) return '—'
  if (h < 48) return `${Math.round(h)}h`
  return `${(h / 24).toFixed(1)}d`
}

/** Completion percentage for a sprint progress bar. */
export function sprintProgress(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}
