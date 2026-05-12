import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketStatus } from '@prisma/client'
import Link from 'next/link'
import { ArrowUpRight, CalendarClock, Flame, TrendingUp } from 'lucide-react'
import { ActivityTimeline } from '@/components/activity-timeline'
import { bucketToWhere } from '@/lib/activity-buckets'

const STATUS_META: Record<TicketStatus, { label: string; tone: string; accent: string }> = {
  OPEN:           { label: 'Open',           tone: 'text-danger', accent: 'bg-danger' },
  IN_PROGRESS:    { label: 'In progress',    tone: 'text-info',   accent: 'bg-info' },
  BLOCKED:        { label: 'Blocked',        tone: 'text-danger', accent: 'bg-danger' },
  WAITING_CLIENT: { label: 'Waiting client', tone: 'text-warn',   accent: 'bg-warn' },
  RESOLVED:       { label: 'Resolved',       tone: 'text-ok',     accent: 'bg-ok' },
  CLOSED:         { label: 'Closed',         tone: 'text-ink-mute', accent: 'bg-ink-faint' },
}

export default async function AdminDashboard() {
  await requireAdmin()

  const todayRange = bucketToWhere('today')
  const yesterdayRange = bucketToWhere('yesterday')
  const weekRange = bucketToWhere('thisWeek')

  const [
    openCount, inProgressCount, blockedCount, waitingCount, resolvedCount, closedCount,
    todayActivity, yesterdayActivity, weekActivity,
    urgentCount, unassignedOpenCount,
    todayFeed,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.OPEN, isDeleted: false } }),
    prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS, isDeleted: false } }),
    prisma.ticket.count({ where: { status: TicketStatus.BLOCKED, isDeleted: false } }),
    prisma.ticket.count({ where: { status: TicketStatus.WAITING_CLIENT, isDeleted: false } }),
    prisma.ticket.count({ where: { status: TicketStatus.RESOLVED, isDeleted: false } }),
    prisma.ticket.count({ where: { status: TicketStatus.CLOSED, isDeleted: false } }),
    prisma.ticket.count({ where: { isDeleted: false, updatedAt: todayRange } }),
    prisma.ticket.count({ where: { isDeleted: false, updatedAt: yesterdayRange } }),
    prisma.ticket.count({ where: { isDeleted: false, updatedAt: weekRange } }),
    prisma.ticket.count({ where: { isDeleted: false, priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    prisma.ticket.count({ where: { isDeleted: false, assignedToId: null, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    prisma.ticketActivity.findMany({
      where: { createdAt: todayRange },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true, role: true } },
        ticket: { select: { id: true, title: true, company: { select: { name: true } } } },
      },
    }),
  ])

  const statusCounts = {
    OPEN: openCount, IN_PROGRESS: inProgressCount, BLOCKED: blockedCount,
    WAITING_CLIENT: waitingCount, RESOLVED: resolvedCount, CLOSED: closedCount,
  }
  const totalActive = openCount + inProgressCount + blockedCount + waitingCount
  const totalTickets = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const velocity = yesterdayActivity === 0 ? null : ((todayActivity - yesterdayActivity) / Math.max(1, yesterdayActivity)) * 100

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            <span className="inline-block h-px w-6 bg-ink-mute/50" />
            <span>Command center</span>
          </div>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[0.92] tracking-tightest text-ink">
            Good to see you.<br />
            <em className="font-display italic text-accent">Here&apos;s the pulse.</em>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/tickets?activity=today">
            <Button variant="outline" size="sm" className="gap-2">
              <Flame className="w-4 h-4" /> Today&apos;s tickets
            </Button>
          </Link>
          <Link href="/admin/tickets">
            <Button variant="default" size="sm" className="gap-2">
              All tickets <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-line rounded-xl overflow-hidden border border-line">
        <StatCell
          label="Today"
          value={todayActivity}
          sub={velocity !== null ? `${velocity > 0 ? '+' : ''}${velocity.toFixed(0)}% vs yesterday` : 'no comparison yet'}
          tone={velocity !== null && velocity > 0 ? 'text-pulse' : 'text-ink'}
          live
        />
        <StatCell label="This week" value={weekActivity} sub={`${Math.round((weekActivity / Math.max(1, totalTickets)) * 100)}% of portfolio`} />
        <StatCell label="Active backlog" value={totalActive} sub={`${totalTickets} total in system`} />
        <StatCell label="Urgent" value={urgentCount} sub="unresolved & urgent" tone="text-danger" />
        <StatCell label="Unassigned" value={unassignedOpenCount} sub="active & no owner" tone={unassignedOpenCount > 0 ? 'text-warn' : 'text-ink'} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
          <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
            <h2 className="font-display text-2xl tracking-tightest text-ink">Status mix</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Live distribution</span>
          </div>
          <div className="rule mx-6" />
          <div className="px-6 py-5 space-y-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-bg-sunken">
              {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => {
                const c = statusCounts[s]
                if (c === 0 || totalTickets === 0) return null
                const pct = (c / totalTickets) * 100
                return (
                  <span
                    key={s}
                    title={`${STATUS_META[s].label}: ${c}`}
                    className={`${STATUS_META[s].accent} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                )
              })}
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
                <li key={s} className="flex items-center gap-2 group">
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[s].accent}`} />
                  <span className="text-sm text-ink-soft flex-1">{STATUS_META[s].label}</span>
                  <span className="font-mono tabular-nums text-sm text-ink">{statusCounts[s]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
          <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
            <h2 className="font-display text-2xl tracking-tightest text-ink">Needs you</h2>
          </div>
          <div className="rule mx-6" />
          <div className="px-6 py-5 space-y-3">
            <QuickLink href="/admin/tickets?activity=today" label="Today's movement" value={todayActivity} accent />
            <QuickLink href="/admin/tickets?priority=URGENT&status=NOT_RESOLVED" label="Urgent unresolved" value={urgentCount} />
            <QuickLink href="/admin/tickets?assignedTo=unassigned&status=NOT_RESOLVED" label="Unassigned & open" value={unassignedOpenCount} />
            <QuickLink href="/admin/tickets?status=WAITING_CLIENT" label="Waiting on client" value={waitingCount} />
            <QuickLink href="/admin/tickets?scheduleFilter=today" label="Scheduled today" value={0} icon={<CalendarClock className="w-3.5 h-3.5" />} />
          </div>
        </div>
      </section>

      <section className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
        <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="font-display text-2xl tracking-tightest text-ink">Today at a glance</h2>
            <p className="text-xs text-ink-mute mt-1">Every move across every ticket, oldest last.</p>
          </div>
          <Link href="/admin/tickets?activity=today" className="text-xs font-mono uppercase tracking-widest text-ink-mute hover:text-ink inline-flex items-center gap-1">
            See tickets <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rule mx-6" />
        <div className="px-6 py-5">
          {todayFeed.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-mute">Quiet so far today.</div>
          ) : (
            <ul className="space-y-3">
              {todayFeed.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm group">
                  <span className="font-mono tabular-nums text-[10px] uppercase tracking-widest text-ink-faint w-16 shrink-0">
                    {new Date(a.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span className="text-ink-soft flex-1 truncate">
                    <strong className="text-ink">{a.actor?.name ?? 'System'}</strong>{' '}
                    <span className="font-mono text-[11px] uppercase tracking-wider text-accent">{a.type.replace(/_/g, ' ').toLowerCase()}</span>{' '}
                    on{' '}
                    <Link href={`/admin/tickets/${a.ticketId}`} className="text-ink hover:text-accent font-medium">
                      {a.ticket?.title}
                    </Link>
                    <span className="text-ink-mute"> · {a.ticket?.company.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCell({
  label, value, sub, tone, live,
}: {
  label: string
  value: number
  sub?: string
  tone?: string
  live?: boolean
}) {
  return (
    <div className="bg-bg-elev p-5 relative">
      <div className="flex items-center gap-2 mb-3">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pulse" />
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{label}</span>
      </div>
      <div className={`font-display text-5xl tracking-tightest leading-none tabular-nums ${tone ?? 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="mt-2 text-xs text-ink-mute">{sub}</div>}
    </div>
  )
}

function QuickLink({
  href, label, value, accent, icon,
}: {
  href: string
  label: string
  value: number
  accent?: boolean
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between py-2 border-b border-line-soft last:border-0 -mx-2 px-2 rounded-md hover:bg-mute transition-colors"
    >
      <span className="flex items-center gap-2 text-sm text-ink-soft group-hover:text-ink">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className={`font-mono tabular-nums text-base ${accent ? 'text-accent' : 'text-ink'}`}>{value}</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink transition-colors" />
      </span>
    </Link>
  )
}
