import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Rocket, BarChart3, ArrowRight } from 'lucide-react'
import { SPRINT_STATUS_META, sprintProgress } from '@/lib/sprints'
import { SprintCreateForm } from './sprint-create-form'
import { SprintEdit } from './[id]/sprint-edit'
import type { SprintStatus } from '@prisma/client'

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function SprintsPage() {
  await requireAdmin()

  const sprints = await prisma.sprint.findMany({
    include: { _count: { select: { tickets: true } } },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  })
  const ids = sprints.map((s) => s.id)
  const doneGroups = ids.length
    ? await prisma.ticket.groupBy({
        by: ['sprintId'],
        where: { sprintId: { in: ids }, OR: [{ status: { in: ['RESOLVED', 'CLOSED'] } }, { archivedAt: { not: null } }] },
        _count: { _all: true },
      })
    : []
  const doneBy = new Map(doneGroups.map((g) => [g.sprintId, g._count._all]))

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Ship in <em className="italic text-accent">cycles.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute truncate">
            Operations · Sprints
          </span>
        </div>
      </header>

      <SprintCreateForm />

      {sprints.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 bg-bg-elev border border-line rounded-xl">
          <Rocket className="w-10 h-10 text-ink-faint" strokeWidth={1.2} />
          <p className="font-display text-2xl tracking-tightest text-ink">No sprints yet.</p>
          <p className="text-xs text-ink-mute">Create one above, then pull tickets from the backlog.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sprints.map((s) => {
            const total = s._count.tickets
            const done = doneBy.get(s.id) ?? 0
            const pct = sprintProgress(done, total)
            const meta = SPRINT_STATUS_META[s.status as SprintStatus]
            return (
              <div key={s.id} className="group bg-bg-elev border border-line rounded-xl p-4 shadow-card hover:border-ink/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={meta.badge as any}>{meta.label}</Badge>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                    {fmt(s.startDate)} – {fmt(s.endDate)}
                  </span>
                </div>
                <Link href={`/admin/sprints/${s.id}`} className="block mt-2">
                  <h3 className="font-medium text-ink leading-snug hover:text-accent transition-colors line-clamp-1">{s.name}</h3>
                </Link>
                {s.goal && <p className="mt-1 text-xs text-ink-mute line-clamp-2 leading-relaxed">{s.goal}</p>}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-ink-mute mb-1">
                    <span>{done}/{total} done</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-sunken overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line-soft text-xs">
                  <Link href={`/admin/sprints/${s.id}`} className="inline-flex items-center gap-1 text-ink-soft hover:text-accent transition-colors">
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                  <SprintEdit id={s.id} name={s.name} goal={s.goal} startDate={s.startDate} endDate={s.endDate} compact />
                  <Link href={`/admin/sprints/${s.id}/report`} className="inline-flex items-center gap-1 text-ink-mute hover:text-ink transition-colors ml-auto">
                    <BarChart3 className="w-3 h-3" /> Report
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
