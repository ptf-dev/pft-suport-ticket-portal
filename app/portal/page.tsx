import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TicketStatus, TicketPriority } from '@prisma/client'
import Link from 'next/link'

/**
 * Client Portal Dashboard
 * Requirements: 6.1, 6.2
 * 
 * Displays:
 * - Summary statistics scoped to client's company
 * - List of recent tickets for the company
 */
export default async function PortalDashboard() {
  // Protect route - client only
  const session = await requireClient()
  const companyId = session.user.companyId!

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
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { name: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your support tickets
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets}</div>
            <Badge variant="destructive" className="mt-2">
              OPEN
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTickets}</div>
            <Badge variant="default" className="mt-2">
              IN PROGRESS
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTickets}</div>
            <Badge variant="success" className="mt-2">
              RESOLVED
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No tickets found. <Link href="/portal/tickets/new" className="text-primary-600 hover:text-primary-900">Create your first ticket</Link>
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.title}
                        </div>
                        <div className="text-sm text-gray-500">
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
                        <div className="text-sm text-gray-900">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/portal/tickets/${ticket.id}`}
                          className="text-primary-600 hover:text-primary-900"
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
