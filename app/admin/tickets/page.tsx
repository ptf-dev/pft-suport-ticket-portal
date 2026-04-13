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
    if (searchParams.status === 'NOT_RESOLVED') {
      where.status = { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] as TicketStatus[] }
    } else if (searchParams.status === 'ACTIVE_ONLY') {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] as TicketStatus[] }
    } else {
      where.status = searchParams.status as TicketStatus
    }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View and manage tickets across all companies
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
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
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
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
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🎫</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {ticket.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            #{ticket.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {ticket.createdBy.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm transition-colors"
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Showing {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
