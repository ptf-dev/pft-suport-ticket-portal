'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  basePath?: string // Add basePath prop to make it dynamic
}

const STATUS_COLUMNS = [
  { status: 'OPEN' as TicketStatus, label: 'Open', variant: 'destructive' as const, color: 'bg-red-50 border-red-200' },
  { status: 'IN_PROGRESS' as TicketStatus, label: 'In Progress', variant: 'default' as const, color: 'bg-blue-50 border-blue-200' },
  { status: 'WAITING_CLIENT' as TicketStatus, label: 'Waiting for You', variant: 'warning' as const, color: 'bg-yellow-50 border-yellow-200' },
  { status: 'RESOLVED' as TicketStatus, label: 'Resolved', variant: 'success' as const, color: 'bg-green-50 border-green-200' },
  { status: 'CLOSED' as TicketStatus, label: 'Closed', variant: 'secondary' as const, color: 'bg-gray-50 border-gray-200' },
]

export function InteractiveTicketBoard({ tickets, basePath = '/portal/tickets' }: TicketBoardProps) {
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null)
  const [localTickets, setLocalTickets] = useState(tickets)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // Group tickets by status
  const ticketsByStatus = STATUS_COLUMNS.map(column => ({
    ...column,
    tickets: localTickets.filter(t => t.status === column.status),
  }))

  const handleDragStart = useCallback((ticketId: string) => {
    setDraggedTicket(ticketId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedTicket(null)
    setDragOverColumn(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: TicketStatus) => {
    e.preventDefault()
    
    if (!draggedTicket) return

    const ticket = localTickets.find(t => t.id === draggedTicket)
    if (!ticket || ticket.status === newStatus) {
      setDraggedTicket(null)
      setDragOverColumn(null)
      return
    }

    // Optimistic update
    setLocalTickets(prev => 
      prev.map(t => t.id === draggedTicket ? { ...t, status: newStatus } : t)
    )
    setIsUpdating(draggedTicket)

    try {
      // Update ticket status via API
      const apiPath = basePath.startsWith('/admin') ? '/api/admin/tickets' : '/api/portal/tickets'
      const response = await fetch(`${apiPath}/${draggedTicket}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket')
      }
    } catch (error) {
      // Revert on error
      console.error('Failed to update ticket:', error)
      setLocalTickets(prev => 
        prev.map(t => t.id === draggedTicket ? { ...t, status: ticket.status } : t)
      )
    } finally {
      setIsUpdating(null)
      setDraggedTicket(null)
      setDragOverColumn(null)
    }
  }, [draggedTicket, localTickets])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {ticketsByStatus.map(column => (
        <div 
          key={column.status} 
          className={`flex flex-col rounded-xl border-2 transition-all duration-200 ${
            dragOverColumn === column.status 
              ? `${column.color} border-dashed scale-[1.02] shadow-lg` 
              : 'bg-gray-50/50 border-transparent'
          }`}
          onDragOver={(e) => handleDragOver(e, column.status)}
          onDrop={(e) => handleDrop(e, column.status)}
          onDragLeave={() => setDragOverColumn(null)}
        >
          {/* Column Header */}
          <div className="p-4 pb-3 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  column.status === 'OPEN' ? 'bg-red-500' :
                  column.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                  column.status === 'WAITING_CLIENT' ? 'bg-yellow-500' :
                  column.status === 'RESOLVED' ? 'bg-green-500' :
                  'bg-gray-500'
                }`} />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">
                  {column.label}
                </h3>
              </div>
              <Badge variant={column.variant} className="font-semibold">
                {column.tickets.length}
              </Badge>
            </div>
          </div>

          {/* Column Cards */}
          <div className="p-3 space-y-3 flex-1 min-h-[300px]">
            {column.tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No tickets</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Drag tickets here</p>
              </div>
            ) : (
              column.tickets.map(ticket => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={() => handleDragStart(ticket.id)}
                  onDragEnd={handleDragEnd}
                  className={`group ${draggedTicket === ticket.id ? 'opacity-50' : ''}`}
                >
                  <Card className={`
                    hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-move
                    border-l-4 bg-white dark:bg-gray-800 relative
                    ${ticket.priority === 'URGENT' ? 'border-l-red-500' :
                      ticket.priority === 'HIGH' ? 'border-l-orange-500' :
                      ticket.priority === 'MEDIUM' ? 'border-l-yellow-500' :
                      'border-l-gray-300'}
                    ${isUpdating === ticket.id ? 'animate-pulse' : ''}
                  `}>
                    <CardContent className="p-4">
                      {/* Drag Handle */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </div>
                      </div>

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

                      {/* Title - Clickable */}
                      <Link href={`${basePath}/${ticket.id}`} className="block">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {ticket.title}
                        </h4>
                      </Link>

                      {/* Description Preview */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>

                      {/* Category */}
                      {ticket.category && (
                        <div className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full mb-3">
                          <span>📁</span>
                          <span className="font-medium">{ticket.category}</span>
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
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
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-mono">
                        #{ticket.id.slice(0, 8)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
