import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage tickets across all companies
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin/tickets/new">
            <Button className="shadow-md hover:shadow-lg transition-shadow">
              <span className="mr-2">➕</span>
              New Ticket
            </Button>
          </Link>
          <TicketFilters
            companies={companies}
            currentFilters={{
              company: searchParams.company,
              status: searchParams.status,
              priority: searchParams.priority,
            }}
          />
        </div>
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
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🎫</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No tickets found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
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
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {ticket.company.name}
                      </div>
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

                    {/* Created By */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-white">
                            {ticket.createdBy.name?.charAt(0).toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white font-medium leading-tight">
                          {ticket.createdBy.name}
                        </div>
                      </div>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
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
