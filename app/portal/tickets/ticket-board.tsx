'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { TicketStatus, TicketPriority } from '@prisma/client'

interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string | null
  createdAt: Date
  createdBy: {
    name: string | null
  }
  _count: {
    comments: number
    images: number
  }
}

interface TicketBoardProps {
  tickets: Ticket[]
}

const STATUS_COLUMNS = [
  { status: 'OPEN' as TicketStatus, label: 'Open', variant: 'destructive' as const },
  { status: 'IN_PROGRESS' as TicketStatus, label: 'In Progress', variant: 'default' as const },
  { status: 'WAITING_CLIENT' as TicketStatus, label: 'Waiting for You', variant: 'warning' as const },
  { status: 'RESOLVED' as TicketStatus, label: 'Resolved', variant: 'success' as const },
  { status: 'CLOSED' as TicketStatus, label: 'Closed', variant: 'secondary' as const },
]

export function TicketBoard({ tickets }: TicketBoardProps) {
  // Group tickets by status
  const ticketsByStatus = STATUS_COLUMNS.map(column => ({
    ...column,
    tickets: tickets.filter(t => t.status === column.status),
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {ticketsByStatus.map(column => (
        <div key={column.status} className="flex flex-col">
          {/* Column Header */}
          <div className="mb-4 pb-3 border-b-2 border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{column.label}</h3>
              <Badge variant={column.variant} className="ml-2 font-semibold">
                {column.tickets.length}
              </Badge>
            </div>
          </div>

          {/* Column Cards */}
          <div className="space-y-3 flex-1 min-h-[200px]">
            {column.tickets.length === 0 ? (
              <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-sm text-gray-400 font-medium">No tickets</p>
              </div>
            ) : (
              column.tickets.map(ticket => (
                <Link key={ticket.id} href={`/portal/tickets/${ticket.id}`}>
                  <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary-500">
                    <CardContent className="pt-4 pb-4">
                      {/* Priority Badge */}
                      <div className="mb-3">
                        <Badge
                          variant={
                            ticket.priority === 'URGENT'
                              ? 'destructive'
                              : ticket.priority === 'HIGH'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-xs font-semibold"
                        >
                          {ticket.priority}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
                        {ticket.title}
                      </h4>

                      {/* Description Preview */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>

                      {/* Category */}
                      {ticket.category && (
                        <div className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full mb-3">
                          <span>📁</span>
                          <span className="font-medium">{ticket.category}</span>
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          {ticket._count.comments > 0 && (
                            <span className="flex items-center gap-1 font-medium">
                              💬 {ticket._count.comments}
                            </span>
                          )}
                          {ticket._count.images > 0 && (
                            <span className="flex items-center gap-1 font-medium">
                              📎 {ticket._count.images}
                            </span>
                          )}
                        </div>
                        <span className="font-medium">
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Ticket ID */}
                      <div className="text-xs text-gray-400 mt-2 font-mono">
                        #{ticket.id.slice(0, 8)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
