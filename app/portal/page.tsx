import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TicketStatus } from '@prisma/client'
import { priorityMeta, priorityLabel } from '@/lib/priorities'
import { DashboardSearch } from './dashboard-search'
import { ArrowUpRight, Plus, TicketIcon } from 'lucide-react'
import Link from 'next/link'

/**
 * Client Portal Dashboard
 * Requirements: 6.1, 6.2
 *
 * Displays:
 * - Summary statistics scoped to client's company
 * - List of recent tickets for the company
 */
export default async function PortalDashboard({
  searchParams,
}: {
  searchParams: { sort?: string; order?: string; search?: string }
}) {
  const session = await requireClient()
  const companyId = session.user.companyId!

  const SORT_MAP: Record<string, object> = {
    title:     { title: 'asc' },
    status:    { status: 'asc' },
    priority:  { priority: 'asc' },
    createdAt: { createdAt: 'asc' },
  }
  function applyDir(obj: any, dir: string): any {
    const r: any = {}
    for (const k of Object.keys(obj)) r[k] = typeof obj[k] === 'object' ? applyDir(obj[k], dir) : dir
    return r
  }
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'createdAt') : 'createdAt'
  const order   = searchParams.order === 'asc' ? 'asc' : 'desc'
  const orderBy = applyDir(SORT_MAP[sortKey], order)
  const currentSort  = searchParams.sort ?? 'createdAt'
  const currentOrder = (order) as 'asc' | 'desc'

  // Build where clause with search
  const ticketWhere: any = { companyId, isDeleted: false }
  if (searchParams.search) {
    ticketWhere.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  // Get ticket counts by status for this company
  const [totalTickets, openTickets, inProgressTickets, resolvedTickets] = await Promise.all([
    prisma.ticket.count({ where: { companyId, isDeleted: false } }),
    prisma.ticket.count({ where: { companyId, status: TicketStatus.OPEN, isDeleted: false } }),
    prisma.ticket.count({ where: { companyId, status: TicketStatus.IN_PROGRESS, isDeleted: false } }),
    prisma.ticket.count({ where: { companyId, status: TicketStatus.RESOLVED, isDeleted: false } }),
  ])

  // Get recent tickets for this company
  const recentTickets = await prisma.ticket.findMany({
    where: ticketWhere,
    take: 10,
    orderBy,
    include: {
      createdBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  })

  const activeCount = openTickets + inProgressTickets
  const resolvedPct = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Your tickets, <em className="italic text-accent">at a glance.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            Client portal
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/portal/tickets/new">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> New ticket
            </Button>
          </Link>
          <Link href="/portal/tickets">
            <Button variant="default" size="sm" className="gap-2">
              All tickets <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line rounded-xl overflow-hidden border border-line">
        <StatCell label="Total tickets" value={totalTickets} sub={`${activeCount} still active`} />
        <StatCell label="Open" value={openTickets} sub="awaiting our team" tone={openTickets > 0 ? 'text-danger' : 'text-ink'} />
        <StatCell label="In progress" value={inProgressTickets} sub="being worked on" tone={inProgressTickets > 0 ? 'text-info' : 'text-ink'} />
        <StatCell label="Resolved" value={resolvedTickets} sub={totalTickets > 0 ? `${resolvedPct}% of all tickets` : 'none yet'} tone={resolvedTickets > 0 ? 'text-ok' : 'text-ink'} />
      </section>

      <section className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
        <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="font-display text-2xl tracking-tightest text-ink">Recent tickets</h2>
            <p className="text-xs text-ink-mute mt-1">Your latest support requests, newest first.</p>
          </div>
          <Link href="/portal/tickets" className="text-xs font-mono uppercase tracking-widest text-ink-mute hover:text-ink inline-flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rule mx-6" />
        <div className="px-6 py-5 space-y-4">
          <DashboardSearch />

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="min-w-full divide-y divide-line-soft">
              <thead className="bg-bg-sunken">
                <tr>
                  <SortableTh column="title"     label="Ticket"   currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="status"    label="Status"   currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="priority"  label="Priority" currentSort={currentSort} currentOrder={currentOrder} />
                  <th className="px-6 py-3 text-left text-xs font-semibold text-ink-mute uppercase tracking-wider">Assigned To</th>
                  <SortableTh column="createdAt" label="Created"  currentSort={currentSort} currentOrder={currentOrder} />
                  <th className="px-6 py-3 text-right text-xs font-semibold text-ink-mute uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <TicketIcon className="w-10 h-10 text-ink-faint" strokeWidth={1.2} />
                        <p className="font-display text-2xl tracking-tightest text-ink">No tickets yet.</p>
                        <Link href="/portal/tickets/new" className="text-sm font-medium text-accent hover:text-accent-ink">
                          Create your first ticket
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="group transition-colors hover:bg-bg-sunken">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${priorityMeta(ticket.priority).dotClass}`} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/portal/tickets/${ticket.id}`} className="font-medium text-ink hover:text-accent transition-colors line-clamp-1 block">
                              {ticket.title}
                            </Link>
                            <div className="mt-1 text-[11px] font-mono text-ink-mute">#{ticket.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            ticket.status === 'OPEN'
                              ? 'destructive'
                              : ticket.status === 'BLOCKED'
                              ? 'destructive'
                              : ticket.status === 'IN_PROGRESS'
                              ? 'info'
                              : ticket.status === 'WAITING_CLIENT'
                              ? 'warning'
                              : ticket.status === 'RESOLVED'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={priorityMeta(ticket.priority).badgeVariant}>
                          {priorityLabel(ticket.priority)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ticket.assignedTo?.name ? (
                          <span className="text-sm text-ink">{ticket.assignedTo.name}</span>
                        ) : (
                          <span className="text-xs italic text-ink-faint">Not yet assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink tabular-nums">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/portal/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-ink transition-colors"
                        >
                          View <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCell({
  label, value, sub, tone,
}: {
  label: string
  value: number
  sub?: string
  tone?: string
}) {
  return (
    <div className="bg-bg-elev p-5">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{label}</div>
      <div className={`font-display text-5xl tracking-tightest leading-none tabular-nums ${tone ?? 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="mt-2 text-xs text-ink-mute">{sub}</div>}
    </div>
  )
}
