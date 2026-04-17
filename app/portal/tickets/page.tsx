import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import { InteractiveTicketBoard } from './interactive-ticket-board'
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

export default async function PortalTicketsPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; order?: string; view?: string }
}) {
  const session = await requireClient()
  const companyId = session.user.companyId!

  const view = searchParams.view ?? 'board'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'createdAt') : 'createdAt'
  const order = searchParams.order === 'asc' ? 'asc' : 'desc'
  const orderBy = applyDir(SORT_MAP[sortKey], order)

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where: { companyId } }),
    prisma.ticket.findMany({
      where: { companyId },
      orderBy: view === 'board' ? { createdAt: 'desc' } : orderBy,
      skip: view === 'board' ? 0 : (page - 1) * PAGE_SIZE,
      take: view === 'board' ? undefined : PAGE_SIZE,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { comments: true, images: true } },
      },
    }),
  ])

  const currentSort  = searchParams.sort ?? 'createdAt'
  const currentOrder = (order) as 'asc' | 'desc'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tickets</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">All support requests for your company</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Link href="/portal/tickets?view=board">
              <Button variant={view === 'board' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Board
              </Button>
            </Link>
            <Link href="/portal/tickets?view=table">
              <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table
              </Button>
            </Link>
          </div>
          <Link href="/portal/tickets/new">
            <Button className="shadow-md hover:shadow-lg transition-shadow">
              <span className="mr-2">➕</span>New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {view === 'board' ? (
        <InteractiveTicketBoard tickets={tickets} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <tr>
                <SortableTh column="title"     label="Ticket"     currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="status"    label="Status"     currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="priority"  label="Priority"   currentSort={currentSort} currentOrder={currentOrder} />
                <SortableTh column="createdBy" label="Created By" currentSort={currentSort} currentOrder={currentOrder} />
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Activity</th>
                <SortableTh column="createdAt" label="Created"    currentSort={currentSort} currentOrder={currentOrder} />
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🎫</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No tickets yet</p>
                      <Link href="/portal/tickets/new">
                        <Button size="sm" variant="outline">Create your first ticket</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          ticket.priority === 'URGENT' ? 'bg-red-500' :
                          ticket.priority === 'HIGH'   ? 'bg-orange-500' :
                          ticket.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 block">
                            {ticket.title}
                          </Link>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">#{ticket.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        ticket.status === 'OPEN' ? 'destructive' : ticket.status === 'IN_PROGRESS' ? 'default' :
                        ticket.status === 'WAITING_CLIENT' ? 'warning' : ticket.status === 'RESOLVED' ? 'success' : 'secondary'
                      } className="font-semibold text-xs whitespace-nowrap">
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ticket.priority === 'URGENT' ? 'destructive' : ticket.priority === 'HIGH' ? 'warning' : 'secondary'}
                        className="font-semibold text-xs">
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-white">{ticket.createdBy.name?.charAt(0).toUpperCase() ?? '?'}</span>
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white font-medium">{ticket.createdBy.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {ticket._count.comments > 0 && <span>💬 {ticket._count.comments}</span>}
                        {ticket._count.images > 0 && <span>📎 {ticket._count.images}</span>}
                        {ticket._count.comments === 0 && ticket._count.images === 0 && <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm transition-colors">
                        View
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {total} ticket{total !== 1 ? 's' : ''} total
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
