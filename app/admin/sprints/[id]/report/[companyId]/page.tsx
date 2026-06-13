import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, CircleDot, ExternalLink, Clock } from 'lucide-react'
import { priorityLabel, priorityMeta } from '@/lib/priorities'
import { isDone, SPRINT_STATUS_META } from '@/lib/sprints'
import type { SprintStatus, TicketStatus } from '@prisma/client'
import { FirmReportActions } from './firm-report-actions'

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  WAITING_CLIENT: 'Waiting on client',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

function statusBadgeVariant(s: TicketStatus) {
  return s === 'OPEN' || s === 'BLOCKED' ? 'destructive'
    : s === 'IN_PROGRESS' ? 'info'
    : s === 'WAITING_CLIENT' ? 'warning'
    : s === 'RESOLVED' ? 'success' : 'secondary'
}

export default async function FirmSprintReportPage({ params }: { params: { id: string; companyId: string } }) {
  await requireAdmin()

  const [sprint, company] = await Promise.all([
    prisma.sprint.findUnique({ where: { id: params.id } }),
    prisma.company.findUnique({ where: { id: params.companyId }, select: { id: true, name: true, subdomain: true, contactEmail: true } }),
  ])
  if (!sprint || !company) notFound()

  const tickets = await prisma.ticket.findMany({
    where: { sprintId: params.id, companyId: params.companyId, isDeleted: false },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true, title: true, status: true, priority: true,
      createdAt: true, resolvedAt: true, archivedAt: true,
      assignedTo: { select: { name: true } },
    },
  })

  const delivered = tickets.filter((t) => isDone(t))
  // Waiting on the client = done on our side, ball in their court — not "in progress".
  const awaiting = tickets.filter((t) => !isDone(t) && t.status === 'WAITING_CLIENT')
  const inProgress = tickets.filter((t) => !isDone(t) && t.status !== 'WAITING_CLIENT')
  const meta = SPRINT_STATUS_META[sprint.status as SprintStatus]

  // Client-facing ticket URL on the firm's tenant subdomain.
  const clientBase = company.subdomain ? `https://${company.subdomain}.propfirmstech.com` : ''
  const clientUrl = (id: string) => (clientBase ? `${clientBase}/portal/tickets/${id}` : `#${id.slice(0, 8)}`)

  // Plain-text summary for copy / email.
  const line = (t: { id: string; title: string }, statusText: string) =>
    `- ${t.title} — ${statusText}${clientBase ? `\n  ${clientUrl(t.id)}` : ` (#${t.id.slice(0, 8)})`}`
  const subject = `${company.name} — ${sprint.name} update`
  const summary = [
    subject,
    `${fmt(sprint.startDate)} – ${fmt(sprint.endDate)}`,
    '',
    `Delivered (${delivered.length}):`,
    ...(delivered.length ? delivered.map((t) => line(t, STATUS_LABEL[t.status])) : ['- (none yet)']),
    '',
    `Awaiting your reply (${awaiting.length}):`,
    ...(awaiting.length ? awaiting.map((t) => line(t, 'Done — awaiting your reply')) : ['- (none)']),
    '',
    `In progress (${inProgress.length}):`,
    ...(inProgress.length ? inProgress.map((t) => line(t, STATUS_LABEL[t.status])) : ['- (none)']),
  ].join('\n')

  const Section = ({ title, icon, list, accent }: { title: string; icon: React.ReactNode; list: typeof tickets; accent: string }) => (
    <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line-soft">
        <span className={accent}>{icon}</span>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">{title}</h2>
        <span className="font-mono text-xs text-ink-mute tabular-nums">{list.length}</span>
      </div>
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-mute">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {list.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${priorityMeta(t.priority).dotClass}`} />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/tickets/${t.id}`} className="text-sm text-ink hover:text-accent transition-colors line-clamp-1 inline-flex items-center gap-1">
                  {t.title}
                  <ExternalLink className="w-3 h-3 text-ink-faint shrink-0" />
                </Link>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-mute">
                  <span className="font-mono">#{t.id.slice(0, 8)}</span>
                  <span>· {priorityLabel(t.priority)}</span>
                  {t.assignedTo?.name && <span>· {t.assignedTo.name}</span>}
                  {t.resolvedAt && <span>· resolved {fmt(t.resolvedAt)}</span>}
                </div>
              </div>
              <Badge variant={statusBadgeVariant(t.status)}>{STATUS_LABEL[t.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Link href={`/admin/sprints/${sprint.id}/report`} className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-ink transition-colors">
        <ArrowLeft className="w-3 h-3" /> Back to report
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={meta.badge as any}>{meta.label}</Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
              {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl tracking-tightest text-ink leading-none">
            {company.name} — <em className="italic text-accent">{sprint.name}</em>
          </h1>
          <p className="mt-1 text-xs text-ink-mute">
            {delivered.length} delivered · {awaiting.length} awaiting your reply · {inProgress.length} in progress · {tickets.length} total this sprint
          </p>
        </div>
        <FirmReportActions summary={summary} email={company.contactEmail} subject={subject} />
      </header>

      <Section title="Delivered" icon={<CheckCircle2 className="w-4 h-4" />} list={delivered} accent="text-ok" />
      <Section title="Awaiting your reply" icon={<Clock className="w-4 h-4" />} list={awaiting} accent="text-warn" />
      <Section title="In progress" icon={<CircleDot className="w-4 h-4" />} list={inProgress} accent="text-info" />
    </div>
  )
}
