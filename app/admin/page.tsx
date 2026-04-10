import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketStatus, TicketPriority } from '@prisma/client'
import Link from 'next/link'

/**
 * Admin Dashboard Page
 * Requirements: 7.1
 * 
 * Displays:
 * - Overview cards with ticket counts grouped by status
 * - Table of 10 most recent tickets across all companies
 */
export default async function AdminDashboard() {
  // Protect route - admin only
  await requireAdmin()

  // Get ticket counts by status
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

  // Get 10 most recent tickets across all companies
  const recentTickets = await prisma.ticket.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      company: {
        select: { name: true },
      },
      createdBy: {
        select: { name: true },
      },
    },
  })

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Open Tickets */}
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
            <div className="text-3xl font-bold text-gray-900 mb-1">{statusCounts.OPEN}</div>
            <div className="text-sm font-medium text-gray-600">Open Tickets</div>
          </CardContent>
        </Card>

        {/* In Progress */}
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
            <div className="text-3xl font-bold text-gray-900 mb-1">{statusCounts.IN_PROGRESS}</div>
            <div className="text-sm font-medium text-gray-600">In Progress</div>
          </CardContent>
        </Card>

        {/* Waiting Client */}
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
            <div className="text-3xl font-bold text-gray-900 mb-1">{statusCounts.WAITING_CLIENT}</div>
            <div className="text-sm font-medium text-gray-600">Waiting Client</div>
          </CardContent>
        </Card>

        {/* Resolved */}
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
            <div className="text-3xl font-bold text-gray-900 mb-1">{statusCounts.RESOLVED}</div>
            <div className="text-sm font-medium text-gray-600">Resolved</div>
          </CardContent>
        </Card>

        {/* Closed */}
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
            <div className="text-3xl font-bold text-gray-900 mb-1">{statusCounts.CLOSED}</div>
            <div className="text-sm font-medium text-gray-600">Closed</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card className="shadow-md">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Tickets</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Latest support requests across all companies</p>
            </div>
            <Link href="/admin/tickets">
              <Button variant="outline" size="sm">
                View All →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-3xl">📭</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500">No tickets found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg">🎫</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 line-clamp-1">
                              {ticket.title}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              #{ticket.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.company.name}
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
                          className="font-medium"
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
                          className="font-medium"
                        >
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                        >
                          View →
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
