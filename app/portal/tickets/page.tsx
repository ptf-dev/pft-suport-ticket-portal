import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import { InteractiveTicketBoard } from './interactive-ticket-board'
import { TicketSearch } from './ticket-search'
import { ReporterFilter } from '../reporter-filter'
import { isReportedByMe } from '@/lib/portal-ticket-scope'
import { priorityMeta, priorityLabel } from '@/lib/priorities'
import { ArrowUpRight, LayoutGrid, MessageSquare, Paperclip, Plus, Rows3, TicketIcon } from 'lucide-react'
import Link from 'next/link'

const PAGE_SIZE = 20

const SORT_MAP: Record<string, object> = {
  title:     { title: 'asc' },
  status:    { status: 'asc' },
  priority:  { priority: 'asc' },
  createdBy: { createdBy: { name: 'asc' } },
  createdAt: { createdAt: 'asc' },
}

function applyDir(obj: any, dir: string): any {
  const r: any = {}
  for (const k of Object.keys(obj)) r[k] = typeof obj[k] === 'object' ? applyDir(obj[k], dir) : dir
  return r
}

function statusVariant(status: string) {
  switch (status) {
    case 'OPEN':
    case 'BLOCKED':
      return 'destructive' as const
    case 'IN_PROGRESS':
      return 'info' as const
    case 'WAITING_CLIENT':
      return 'warning' as const
    case 'RESOLVED':
      return 'success' as const
    default:
      return 'secondary' as const
  }
}

export default async function PortalTicketsPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; order?: string; view?: string; search?: string; reporter?: string }
}) {
  const session = await requireClient()
  const companyId = session.user.companyId!

  const watchedTicketIds = await prisma.ticketWatcher.findMany({
    where: { userId: session.user.id },
    select: { ticketId: true },
  }).then(rows => rows.map(r => r.ticketId))

  const view = searchParams.view ?? 'board'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'createdAt') : 'createdAt'
  const order = searchParams.order === 'asc' ? 'asc' : 'desc'
  const orderBy = applyDir(SORT_MAP[sortKey], order)

  // Build where clause: own company tickets merged with watched cross-firm tickets
  const where: any = {
    OR: [
      { companyId, isDeleted: false },
      ...(watchedTicketIds.length > 0
        ? [{ id: { in: watchedTicketIds }, isDeleted: false }]
        : []),
    ],
  }
  if (searchParams.search) {
    where.AND = [
      {
        OR: [
          { title: { contains: searchParams.search, mode: 'insensitive' } },
          { description: { contains: searchParams.search, mode: 'insensitive' } },
        ],
      },
    ]
  }

  const mine = isReportedByMe(searchParams)
  const mineWhere = { ...where, createdById: session.user.id }

  const [allCount, mineCount, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: mineWhere }),
    prisma.ticket.findMany({
      where: mine ? mineWhere : where,
      orderBy: view === 'board' ? { createdAt: 'desc' } : orderBy,
      skip: view === 'board' ? 0 : (page - 1) * PAGE_SIZE,
      take: view === 'board' ? undefined : PAGE_SIZE,
      include: {
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { comments: true, images: true } },
      },
    }),
  ])

  const total = mine ? mineCount : allCount
  const currentSort  = searchParams.sort ?? 'createdAt'
  const currentOrder = (order) as 'asc' | 'desc'
  const reporterQuery = mine ? '&reporter=me' : ''
  const reporterFilter = (
    <ReporterFilter pathname="/portal/tickets" searchParams={searchParams} allCount={allCount} mineCount={mineCount} />
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Every request, <em className="italic text-accent">one place.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute truncate">
            Client portal · {mine ? 'Reported by you' : 'All tickets'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <div className="inline-flex rounded-lg border border-line p-0.5">
            <Link href={`/portal/tickets?view=board${reporterQuery}`}>
              <Button variant={view === 'board' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <LayoutGrid className="w-4 h-4" />Board
              </Button>
            </Link>
            <Link href={`/portal/tickets?view=table${reporterQuery}`}>
              <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <Rows3 className="w-4 h-4" />Table
              </Button>
            </Link>
          </div>
          <Link href="/portal/tickets/new">
            <Button variant="accent" className="gap-2">
              <Plus className="w-4 h-4" />New ticket
            </Button>
          </Link>
        </div>
      </header>

      {view === 'table' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <TicketSearch />
          </div>
          {reporterFilter}
        </div>
      )}

      {view === 'board' ? (
        <InteractiveTicketBoard tickets={tickets} toolbarEnd={reporterFilter} />
      ) : (
        <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line-soft">
              <thead className="bg-bg-sunken">
                <tr>
                  <SortableTh column="title"     label="Ticket"     currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="status"    label="Status"     currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="priority"  label="Priority"   currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="createdBy" label="Created by" currentSort={currentSort} currentOrder={currentOrder} />
                  <th className="px-6 py-3 text-left text-xs font-semibold text-ink-mute uppercase tracking-wider">Activity</th>
                  <SortableTh column="createdAt" label="Created"    currentSort={currentSort} currentOrder={currentOrder} />
                  <th className="px-6 py-3 text-right text-xs font-semibold text-ink-mute uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <TicketIcon className="w-10 h-10 text-ink-faint" strokeWidth={1.2} />
                        <p className="font-display text-2xl tracking-tightest text-ink">
                          {mine ? 'No tickets reported by you.' : 'No tickets yet.'}
                        </p>
                        <Link href="/portal/tickets/new" className="text-sm font-medium text-accent hover:text-accent-ink">
                          Create your first ticket
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="group transition-colors hover:bg-bg-sunken">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${priorityMeta(ticket.priority).dotClass}`} />
                          <div className="min-w-0">
                            <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noopener noreferrer"
                              className="font-medium text-ink hover:text-accent transition-colors line-clamp-1 block">
                              {ticket.title}
                            </Link>
                            <div className="mt-1 text-[11px] font-mono text-ink-mute">
                              {ticket.key ?? `#${ticket.id.slice(0, 8)}`}
                              {ticket.companyId !== companyId && (
                                <span className="ml-2 text-info">
                                  Watching · {ticket.company?.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusVariant(ticket.status)}>
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={priorityMeta(ticket.priority).badgeVariant}>
                          {priorityLabel(ticket.priority)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-ink text-bg flex items-center justify-center text-xs font-medium shrink-0">
                            {ticket.createdBy.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div className="text-sm text-ink">{ticket.createdBy.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs text-ink-mute tabular-nums">
                          {ticket._count.comments > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" strokeWidth={1.75} />{ticket._count.comments}
                            </span>
                          )}
                          {ticket._count.images > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="w-3 h-3" strokeWidth={1.75} />{ticket._count.images}
                            </span>
                          )}
                          {ticket._count.comments === 0 && ticket._count.images === 0 && <span className="text-ink-faint">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink tabular-nums">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-ink transition-colors">
                          View <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination total={total} page={page} pageSize={PAGE_SIZE} />
        </div>
      )}

      {total > 0 && (
        <div className="bg-bg-elev border border-line rounded-xl shadow-card px-5 py-4 flex items-center gap-3">
          <TicketIcon className="w-4 h-4 text-ink-mute" strokeWidth={1.75} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            <span className="text-ink tabular-nums">{total}</span> ticket{total !== 1 ? 's' : ''} {mine ? 'reported by you' : 'total'}
          </span>
        </div>
      )}
    </div>
  )
}
