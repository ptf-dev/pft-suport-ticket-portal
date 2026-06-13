import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BarChart3, ArrowLeft } from 'lucide-react'
import { InteractiveTicketBoard } from '@/app/portal/tickets/interactive-ticket-board'
import { SPRINT_STATUS_META, isDone, sprintProgress } from '@/lib/sprints'
import { priorityLabel } from '@/lib/priorities'
import type { SprintStatus } from '@prisma/client'
import { SprintActions } from './sprint-actions'
import { SprintBacklog } from './sprint-backlog'
import { SprintEdit } from './sprint-edit'

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function SprintDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin()

  const sprint = await prisma.sprint.findUnique({ where: { id: params.id } })
  if (!sprint) notFound()

  const [tickets, backlog] = await Promise.all([
    prisma.ticket.findMany({
      where: { sprintId: params.id, isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true, images: true, activities: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { sprintId: null, isDeleted: false, archivedAt: null, status: { notIn: ['RESOLVED', 'CLOSED'] } },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      include: { company: { select: { name: true } } },
    }),
  ])

  const total = tickets.length
  const done = tickets.filter((t) => isDone(t)).length
  const pct = sprintProgress(done, total)
  const meta = SPRINT_STATUS_META[sprint.status as SprintStatus]

  return (
    <div className="space-y-6">
      <Link href="/admin/sprints" className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-ink transition-colors">
        <ArrowLeft className="w-3 h-3" /> All sprints
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={meta.badge as any}>{meta.label}</Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
              {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl tracking-tightest text-ink leading-none">{sprint.name}</h1>
          {sprint.goal && <p className="mt-1.5 text-sm text-ink-mute max-w-2xl">{sprint.goal}</p>}
          <div className="mt-3 flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-ink-mute">
            <span>{done}/{total} done · {pct}%</span>
            <span>{backlog.length} in backlog</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/admin/sprints/${sprint.id}/report`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
          >
            <BarChart3 className="w-4 h-4" /> Report
          </Link>
          <SprintEdit id={sprint.id} name={sprint.name} goal={sprint.goal} startDate={sprint.startDate} endDate={sprint.endDate} />
          <SprintActions id={sprint.id} status={sprint.status} />
        </div>
      </header>

      <SprintBacklog
        sprintId={sprint.id}
        tickets={backlog.map((t) => ({
          id: t.id,
          title: t.title,
          companyName: t.company.name,
          priority: priorityLabel(t.priority),
        }))}
      />

      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute mb-2">In this sprint</h2>
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 bg-bg-elev border border-line rounded-xl text-center">
            <p className="font-display text-xl tracking-tightest text-ink">Nothing planned yet.</p>
            <p className="text-xs text-ink-mute">Add tickets from the backlog above, or bulk-assign from the Tickets board.</p>
          </div>
        ) : (
          <InteractiveTicketBoard tickets={tickets} basePath="/admin/tickets" />
        )}
      </div>
    </div>
  )
}
