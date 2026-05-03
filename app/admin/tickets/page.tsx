import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import { TicketStatus, TicketPriority } from '@prisma/client'
import Link from 'next/link'
import { TicketFilters } from './ticket-filters'
import { InteractiveTicketBoard } from '@/app/portal/tickets/interactive-ticket-board'
import { RestoreTicketButton } from './restore-ticket-button'

const PAGE_SIZE = 20

// Map URL sort keys → Prisma orderBy
const SORT_MAP: Record<string, object> = {
  title:      { title: 'asc' },
  company:    { company: { name: 'asc' } },
  status:     { status: 'asc' },
  priority:   { priority: 'asc' },
  createdBy:  { createdBy: { name: 'asc' } },
  assignedTo: { assignedTo: { name: 'asc' } },
  createdAt:  { createdAt: 'asc' },
  updatedAt:  { updatedAt: 'asc' },
}

// Priority sort order for display purposes
const PRIORITY_ORDER: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 }
const STATUS_ORDER: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, WAITING_CLIENT: 2, RESOLVED: 3, CLOSED: 4 }

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: {
    company?: string
    status?: string
    priority?: string
    assignedTo?: string
    page?: string
    sort?: string
    order?: string
    multiSort?: string
    view?: string
    search?: string
    dateFilter?: string
    startDate?: string
    endDate?: string
  }
}) {
  await requireAdmin()

  const view = searchParams.view ?? 'board'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'createdAt') : 'createdAt'
  const order = searchParams.order === 'asc' ? 'asc' : 'desc'
  const showDeleted = searchParams.status === 'DELETED'
  const multiSort = searchParams.multiSort

  // Build filter conditions
  const where: any = {
    isDeleted: showDeleted ? true : false, // Filter by deleted status
  }
  if (searchParams.company) where.companyId = searchParams.company
  if (searchParams.status && searchParams.status !== 'DELETED') {
    if (searchParams.status === 'NOT_RESOLVED') {
      where.status = { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] as TicketStatus[] }
    } else if (searchParams.status === 'ACTIVE_ONLY') {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] as TicketStatus[] }
    } else {
      where.status = searchParams.status as TicketStatus
    }
  }
  if (searchParams.priority) where.priority = searchParams.priority as TicketPriority
  
  // Assignment filter (Requirements 5.3, 5.4, 5.5)
  if (searchParams.assignedTo === 'unassigned') {
    where.assignedToId = null
  } else if (searchParams.assignedTo) {
    where.assignedToId = searchParams.assignedTo
  }

  // Search filter - search in title, description, and ticket ID
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
      { id: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  // Date filter - filter by last activity (updatedAt)
  if (searchParams.dateFilter === 'lastWeek') {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    where.updatedAt = { gte: lastWeek }
  } else if (searchParams.dateFilter === 'activeWeek') {
    // Get current week (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    where.updatedAt = { gte: monday }
  } else if (searchParams.startDate || searchParams.endDate) {
    // Custom date range
    where.updatedAt = {}
    if (searchParams.startDate) {
      const start = new Date(searchParams.startDate)
      start.setHours(0, 0, 0, 0)
      where.updatedAt.gte = start
    }
    if (searchParams.endDate) {
      const end = new Date(searchParams.endDate)
      end.setHours(23, 59, 59, 999)
      where.updatedAt.lte = end
    }
  }

  // Helper function to apply sort direction to nested objects
  const applyOrder = (obj: any, dir: string): any => {
    const result: any = {}
    for (const k of Object.keys(obj)) {
      result[k] = typeof obj[k] === 'object' ? applyOrder(obj[k], dir) : dir
    }
    return result
  }

  // Build orderBy — replace direction in the sort map entry
  let orderBy: any
  
  if (multiSort) {
    // Multi-column sorting
    const sortColumns = multiSort.split(',').map(s => {
      const [col, ord] = s.split(':')
      return { column: col, order: ord as 'asc' | 'desc' }
    })
    
    // Build array of orderBy objects
    orderBy = sortColumns
      .filter(s => SORT_MAP[s.column]) // Only include valid columns
      .map(s => {
        const baseOrder = SORT_MAP[s.column]
        return applyOrder(baseOrder, s.order)
      })
  } else {
    // Single column sorting (legacy)
    const baseOrder = SORT_MAP[sortKey]
    orderBy = applyOrder(baseOrder, order)
  }

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: view === 'board' ? { createdAt: 'desc' } : orderBy,
      skip: view === 'board' ? 0 : (page - 1) * PAGE_SIZE,
      take: view === 'board' ? undefined : PAGE_SIZE,
      include: {
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true, images: true } },
      },
    }),
  ])

  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const currentSort = searchParams.sort ?? 'createdAt'
  const currentOrder = (searchParams.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage tickets across all companies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Link href="/admin/tickets?view=board">
              <Button variant={view === 'board' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Board
              </Button>
            </Link>
            <Link href="/admin/tickets?view=table">
              <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table
              </Button>
            </Link>
          </div>
          <Link href="/admin/tickets/new">
            <Button className="shadow-md hover:shadow-lg transition-shadow">
              <span className="mr-2">➕</span>
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {view === 'table' && (
        <TicketFilters
          companies={companies}
          currentFilters={{
            company: searchParams.company,
            status: searchParams.status,
            priority: searchParams.priority,
            assignedTo: searchParams.assignedTo,
            search: searchParams.search,
            dateFilter: searchParams.dateFilter,
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
          }}
        />
      )}

      {/* Board or Table View */}
      {view === 'board' ? (
        <InteractiveTicketBoard tickets={tickets} basePath="/admin/tickets" />
      ) : (
        <>
          {/* Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <tr>
                <SortableTh column="title"      label="Ticket"      currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <SortableTh column="company"    label="Company"     currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <SortableTh column="status"     label="Status"      currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <SortableTh column="priority"   label="Priority"    currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <SortableTh column="assignedTo" label="Assigned"    currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <SortableTh column="createdAt"  label="Created"     currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <SortableTh column="updatedAt"  label="Last Active" currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
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
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          ticket.priority === 'URGENT' ? 'bg-red-500' :
                          ticket.priority === 'HIGH'   ? 'bg-orange-500' :
                          ticket.priority === 'MEDIUM' ? 'bg-yellow-500' :
                                                         'bg-gray-400'
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/tickets/${ticket.id}`}
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2 block"
                          >
                            {ticket.title}
                          </Link>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                            #{ticket.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company & Created By */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {ticket.company.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-white">
                              {ticket.createdBy.name?.charAt(0).toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {ticket.createdBy.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
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
                        {ticket.status === 'IN_PROGRESS' ? 'IN PROG' : 
                         ticket.status === 'WAITING_CLIENT' ? 'WAITING' :
                         ticket.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
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

                    {/* Assigned To */}
                    <td className="px-4 py-3">
                      {ticket.assignedToId && !ticket.assignedTo ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Deleted</span>
                      ) : ticket.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">
                              {ticket.assignedTo.name?.charAt(0).toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white font-medium leading-tight truncate">
                            {ticket.assignedTo.name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(() => {
                          const now = new Date()
                          const created = new Date(ticket.createdAt)
                          const diffMs = now.getTime() - created.getTime()
                          const diffMins = Math.floor(diffMs / 60000)
                          const diffHours = Math.floor(diffMs / 3600000)
                          const diffDays = Math.floor(diffMs / 86400000)
                          
                          if (diffMins < 1) return 'just now'
                          if (diffMins < 60) return `${diffMins}m ago`
                          if (diffHours < 24) return `${diffHours}h ago`
                          if (diffDays < 30) return `${diffDays}d ago`
                          return `${Math.floor(diffDays / 30)}mo ago`
                        })()}
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const now = new Date()
                          const updated = new Date(ticket.updatedAt)
                          const diffMs = now.getTime() - updated.getTime()
                          const diffMins = Math.floor(diffMs / 60000)
                          const diffHours = Math.floor(diffMs / 3600000)
                          const diffDays = Math.floor(diffMs / 86400000)
                          
                          let timeAgo = ''
                          let isRecent = false
                          
                          if (diffMins < 1) {
                            timeAgo = 'just now'
                            isRecent = true
                          } else if (diffMins < 60) {
                            timeAgo = `${diffMins}m ago`
                            isRecent = true
                          } else if (diffHours < 24) {
                            timeAgo = `${diffHours}h ago`
                            isRecent = diffHours < 6
                          } else if (diffDays < 30) {
                            timeAgo = `${diffDays}d ago`
                            isRecent = false
                          } else {
                            timeAgo = `${Math.floor(diffDays / 30)}mo ago`
                            isRecent = false
                          }
                          
                          return (
                            <>
                              {isRecent && (
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" title="Recently active" />
                              )}
                              <div className="min-w-0">
                                <div className={`text-sm font-medium ${isRecent ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                  {timeAgo}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {updated.toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric',
                                  })}
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      {showDeleted ? (
                        <RestoreTicketButton ticketId={ticket.id} />
                      ) : (
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          aria-label="Open in new tab"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination total={total} page={page} pageSize={PAGE_SIZE} />
      </div>
        </>
      )}

      {/* Summary */}
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
