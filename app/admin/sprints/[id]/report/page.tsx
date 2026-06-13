import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { buildSprintReport, formatHours, SPRINT_STATUS_META } from '@/lib/sprints'
import type { SprintStatus } from '@prisma/client'

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function SprintReportPage({ params }: { params: { id: string } }) {
  await requireAdmin()

  const sprint = await prisma.sprint.findUnique({ where: { id: params.id } })
  if (!sprint) notFound()

  const tickets = await prisma.ticket.findMany({
    where: { sprintId: params.id, isDeleted: false },
    select: {
      companyId: true,
      company: { select: { name: true } },
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      archivedAt: true,
    },
  })

  const report = buildSprintReport(tickets)
  const meta = SPRINT_STATUS_META[sprint.status as SprintStatus]

  return (
    <div className="space-y-6">
      <Link href={`/admin/sprints/${sprint.id}`} className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-ink transition-colors">
        <ArrowLeft className="w-3 h-3" /> Back to sprint
      </Link>

      <header>
        <div className="flex items-center gap-2">
          <Badge variant={meta.badge as any}>{meta.label}</Badge>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
          </span>
        </div>
        <h1 className="mt-2 font-display text-2xl tracking-tightest text-ink leading-none">
          {sprint.name} — <em className="italic text-accent">report</em>
        </h1>
        <p className="mt-1 text-xs text-ink-mute">Delivery by prop firm. Avg resolution measured from ticket creation to resolved.</p>
      </header>

      <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line-soft text-sm">
            <thead className="bg-bg-sunken">
              <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                <th className="px-4 py-3">Prop firm</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Done</th>
                <th className="px-4 py-3 text-right">In progress</th>
                <th className="px-4 py-3 text-right">To do</th>
                <th className="px-4 py-3 text-right">Avg resolution</th>
                <th className="px-4 py-3 text-right">SLA breaches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {report.rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-ink-mute">No tickets in this sprint yet.</td></tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.companyId} className="group hover:bg-bg-sunken transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/sprints/${sprint.id}/report/${r.companyId}`} className="inline-flex items-center gap-1.5 text-ink font-medium hover:text-accent transition-colors">
                        {r.companyName}
                        <ArrowRight className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{r.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ok">{r.done}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-info">{r.inProgress}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{r.todo}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{formatHours(r.avgResolutionHours)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.breaches > 0 ? 'text-danger font-medium' : 'text-ink-mute'}`}>{r.breaches}</td>
                  </tr>
                ))
              )}
            </tbody>
            {report.rows.length > 0 && (
              <tfoot className="bg-bg-sunken border-t border-line">
                <tr className="font-medium text-ink">
                  <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-mute">All firms</td>
                  <td className="px-4 py-3 text-right tabular-nums">{report.totals.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ok">{report.totals.done}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-info">{report.totals.inProgress}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{report.totals.todo}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatHours(report.totals.avgResolutionHours)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${report.totals.breaches > 0 ? 'text-danger' : ''}`}>{report.totals.breaches}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
