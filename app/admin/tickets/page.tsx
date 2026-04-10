import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { TicketStatus, TicketPriority } from '@prisma/client'
import Link from 'next/link'
import { TicketFilters } from './ticket-filters'

/**
 * Admin Tickets List Page
 * Requirements: 7.2, 7.3
 * 
 * Displays all tickets with filterable columns for:
 * - Company
 * - TicketStatus
 * - TicketPriority
 */
export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { company?: string; status?: string; priority?: string }
}) {
  // Protect route - admin only
  await requireAdmin()

  // Build filter conditions
  const where: any = {}
  
  if (searchParams.company) {
    where.companyId = searchParams.company
  }
  
  if (searchParams.status) {
    where.status = searchParams.status as TicketStatus
  }
  
  if (searchParams.priority) {
    where.priority = searchParams.priority as TicketPriority
  }

  // Query tickets with filters
  const tickets = await prisma.ticket.findMany({
    where,
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

  // Get all companies for filter dropdown
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage tickets across all companies
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
        <TicketFilters
          companies={companies}
          currentFilters={{
            company: searchParams.company,
            status: searchParams.status,
            priority: searchParams.priority,
          }}
        />
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-white">
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
                  Created By
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
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🎫</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500">No tickets found</p>
                      <p className="text-xs text-gray-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
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
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.company.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {ticket.createdBy.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
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
      </div>

      {/* Summary */}
      {tickets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              Showing {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
