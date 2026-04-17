import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TicketStatus } from '@prisma/client'
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
  searchParams: { sort?: string; order?: string }
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

  // Get ticket counts by status for this company
  const [totalTickets, openTickets, inProgressTickets, resolvedTickets] = await Promise.all([
    prisma.ticket.count({ where: { companyId } }),
    prisma.ticket.count({ where: { companyId, status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { companyId, status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { companyId, status: TicketStatus.RESOLVED } }),
  ])

  // Get recent tickets for this company
  const recentTickets = await prisma.ticket.findMany({
    where: { companyId },
    take: 10,
    orderBy,
    include: { createdBy: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Overview of your support tickets
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{openTickets}</div>
            <Badge variant="destructive" className="mt-2">
              OPEN
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{inProgressTickets}</div>
            <Badge variant="default" className="mt-2">
              IN PROGRESS
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{resolvedTickets}</div>
            <Badge variant="success" className="mt-2">
              RESOLVED
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Tickets</CardTitle>
          <Link
            href="/portal/tickets"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 font-medium"
          >
            View All Tickets →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <SortableTh column="title"     label="Ticket"   currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="status"    label="Status"   currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="priority"  label="Priority" currentSort={currentSort} currentOrder={currentOrder} />
                  <SortableTh column="createdAt" label="Created"  currentSort={currentSort} currentOrder={currentOrder} />
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      No tickets found. <Link href="/portal/tickets/new" className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300">Create your first ticket</Link>
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {ticket.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          #{ticket.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            ticket.status === 'OPEN'
                              ? 'destructive'
                              : ticket.status === 'IN_PROGRESS'
                              ? 'default'
                              : ticket.status === 'WAITING_CLIENT'
                              ? 'warning'
                              : ticket.status === 'RESOLVED'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            ticket.priority === 'URGENT'
                              ? 'destructive'
                              : ticket.priority === 'HIGH'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/portal/tickets/${ticket.id}`}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
