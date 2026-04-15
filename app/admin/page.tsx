import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketStatus } from '@prisma/client'
import Link from 'next/link'

export default async function AdminDashboard() {
  await requireAdmin()

  const ticketsByStatus = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { status: TicketStatus.WAITING_CLIENT } }),
    prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
    prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
  ])

  const statusCounts = {
    OPEN: ticketsByStatus[0],
    IN_PROGRESS: ticketsByStatus[1],
    WAITING_CLIENT: ticketsByStatus[2],
    RESOLVED: ticketsByStatus[3],
    CLOSED: ticketsByStatus[4],
  }

  const totalTickets = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const recentTickets = await prisma.ticket.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔴</span>
              </div>
              <Badge variant="destructive" className="font-semibold">
                {statusCounts.OPEN > 0 ? `${((statusCounts.OPEN / totalTickets) * 100).toFixed(0)}%` : '0%'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{statusCounts.OPEN}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Tickets</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <Badge variant="default" className="font-semibold">
                {statusCounts.IN_PROGRESS > 0 ? `${((statusCounts.IN_PROGRESS / totalTickets) * 100).toFixed(0)}%` : '0%'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{statusCounts.IN_PROGRESS}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <Badge variant="warning" className="font-semibold">
                {statusCounts.WAITING_CLIENT > 0 ? `${((statusCounts.WAITING_CLIENT / totalTickets) * 100).toFixed(0)}%` : '0%'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{statusCounts.WAITING_CLIENT}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Waiting Client</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <Badge variant="success" className="font-semibold">
                {statusCounts.RESOLVED > 0 ? `${((statusCounts.RESOLVED / totalTickets) * 100).toFixed(0)}%` : '0%'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{statusCounts.RESOLVED}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-gray-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {statusCounts.CLOSED > 0 ? `${((statusCounts.CLOSED / totalTickets) * 100).toFixed(0)}%` : '0%'}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{statusCounts.CLOSED}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Closed</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card className="shadow-md">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Tickets</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Latest support requests across all companies</p>
            </div>
            <Link href="/admin/tickets">
              <Button variant="outline" size="sm">View All →</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ticket</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-3xl">📭</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No tickets found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {/* Ticket */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            ticket.priority === 'URGENT' ? 'bg-red-500' :
                            ticket.priority === 'HIGH'   ? 'bg-orange-500' :
                            ticket.priority === 'MEDIUM' ? 'bg-yellow-500' :
                                                           'bg-gray-400'
                          }`}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/tickets/${ticket.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 block"
                            >
                              {ticket.title}
                            </Link>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                              #{ticket.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.company.name}</div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            ticket.status === 'OPEN'           ? 'destructive' :
                            ticket.status === 'IN_PROGRESS'    ? 'default' :
                            ticket.status === 'WAITING_CLIENT' ? 'warning' :
                            ticket.status === 'RESOLVED'       ? 'success' :
                                                                 'secondary'
                          }
                          className="font-semibold text-xs whitespace-nowrap"
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            ticket.priority === 'URGENT' ? 'destructive' :
                            ticket.priority === 'HIGH'   ? 'warning' :
                                                           'secondary'
                          }
                          className="font-semibold text-xs"
                        >
                          {ticket.priority}
                        </Badge>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                        >
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
        </CardContent>
      </Card>
    </div>
  )
}
