'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { TicketStatus, TicketPriority } from '@prisma/client'
import { GripVertical, MessageSquare, Paperclip, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  assignedTo?: {
    name: string | null
  } | null
  _count: {
    comments: number
    images: number
  }
}

interface TicketBoardProps {
  tickets: Ticket[]
  basePath?: string
}

const STATUS_COLUMNS: {
  status: TicketStatus
  label: string
  dot: string
  hover: string
}[] = [
  { status: 'OPEN',           label: 'Open',           dot: 'bg-danger',    hover: 'border-danger' },
  { status: 'IN_PROGRESS',    label: 'In progress',    dot: 'bg-info',      hover: 'border-info' },
  { status: 'BLOCKED',        label: 'Blocked',        dot: 'bg-danger',    hover: 'border-danger' },
  { status: 'WAITING_CLIENT', label: 'Waiting',        dot: 'bg-warn',      hover: 'border-warn' },
  { status: 'RESOLVED',       label: 'Resolved',       dot: 'bg-ok',        hover: 'border-ok' },
  { status: 'CLOSED',         label: 'Closed',         dot: 'bg-ink-faint', hover: 'border-ink-faint' },
]

const PRIORITY_BAR: Record<TicketPriority, string> = {
  URGENT: 'bg-danger',
  HIGH:   'bg-warn',
  MEDIUM: 'bg-accent',
  LOW:    'bg-ink-faint',
}

export function InteractiveTicketBoard({ tickets, basePath = '/portal/tickets' }: TicketBoardProps) {
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null)
  const [localTickets, setLocalTickets] = useState(tickets)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const ticketsByStatus = STATUS_COLUMNS.map((column) => ({
    ...column,
    tickets: localTickets.filter((t) => t.status === column.status),
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

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: TicketStatus) => {
      e.preventDefault()
      if (!draggedTicket) return

      const ticket = localTickets.find((t) => t.id === draggedTicket)
      if (!ticket || ticket.status === newStatus) {
        setDraggedTicket(null)
        setDragOverColumn(null)
        return
      }

      setLocalTickets((prev) =>
        prev.map((t) => (t.id === draggedTicket ? { ...t, status: newStatus } : t)),
      )
      setIsUpdating(draggedTicket)

      try {
        const apiPath = basePath.startsWith('/admin') ? '/api/admin/tickets' : '/api/portal/tickets'
        const response = await fetch(`${apiPath}/${draggedTicket}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!response.ok) throw new Error('Failed to update ticket')
      } catch (error) {
        console.error('Failed to update ticket:', error)
        setLocalTickets((prev) =>
          prev.map((t) => (t.id === draggedTicket ? { ...t, status: ticket.status } : t)),
        )
      } finally {
        setIsUpdating(null)
        setDraggedTicket(null)
        setDragOverColumn(null)
      }
    },
    [draggedTicket, localTickets, basePath],
  )

  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
        {ticketsByStatus.map((column) => {
          const isDragTarget = dragOverColumn === column.status
          return (
            <section
              key={column.status}
              onDragOver={(e) => handleDragOver(e, column.status)}
              onDrop={(e) => handleDrop(e, column.status)}
              onDragLeave={() => setDragOverColumn(null)}
              className={cn(
                'flex flex-col shrink-0 w-[280px] snap-start rounded-xl border bg-bg-sunken/40 transition-colors',
                isDragTarget ? `${column.hover} bg-bg-sunken` : 'border-line',
              )}
            >
              <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-line-soft">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', column.dot)} />
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft truncate">
                    {column.label}
                  </h3>
                </div>
                <span className="font-mono text-xs tabular-nums text-ink-mute">
                  {column.tickets.length}
                </span>
              </header>

              <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                {column.tickets.length === 0 ? (
                  <div
                    className={cn(
                      'flex items-center justify-center h-24 rounded-lg border border-dashed text-[11px] uppercase tracking-widest text-ink-faint transition-colors',
                      isDragTarget ? 'border-ink text-ink-soft' : 'border-line',
                    )}
                  >
                    {isDragTarget ? 'Drop here' : 'Empty'}
                  </div>
                ) : (
                  column.tickets.map((ticket) => (
                    <article
                      key={ticket.id}
                      draggable
                      onDragStart={() => handleDragStart(ticket.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group relative rounded-lg bg-bg-elev border border-line overflow-hidden',
                        'hover:border-ink/30 hover:shadow-soft transition-all cursor-grab active:cursor-grabbing',
                        draggedTicket === ticket.id && 'opacity-40',
                        isUpdating === ticket.id && 'animate-pulse',
                      )}
                    >
                      <span
                        className={cn('absolute inset-y-0 left-0 w-0.5', PRIORITY_BAR[ticket.priority])}
                        aria-hidden
                      />
                      <GripVertical
                        className="absolute top-2 right-1.5 w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden
                      />

                      <div className="pl-3 pr-3 py-2.5">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                            #{ticket.id.slice(0, 6)}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                            {ticket.priority.toLowerCase()}
                          </span>
                        </div>

                        <Link href={`${basePath}/${ticket.id}`} className="block">
                          <h4 className="text-sm font-medium text-ink leading-snug line-clamp-2 hover:text-accent transition-colors">
                            {ticket.title}
                          </h4>
                        </Link>

                        <p className="mt-1.5 text-xs text-ink-mute line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>

                        {ticket.category && (
                          <div className="inline-flex items-center gap-1 mt-2 text-[10px] text-ink-mute bg-mute px-1.5 py-0.5 rounded">
                            <Folder className="w-2.5 h-2.5" strokeWidth={1.75} />
                            <span className="font-medium">{ticket.category}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-line-soft">
                          {ticket.assignedTo ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-4 h-4 rounded-full bg-ink text-bg flex items-center justify-center text-[9px] font-semibold shrink-0">
                                {ticket.assignedTo.name?.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <span className="text-[11px] text-ink-soft truncate">
                                {ticket.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] italic text-ink-faint">Unassigned</span>
                          )}
                          <div className="flex items-center gap-2 shrink-0 text-[10px] text-ink-mute tabular-nums">
                            {ticket._count.comments > 0 && (
                              <span className="inline-flex items-center gap-0.5">
                                <MessageSquare className="w-2.5 h-2.5" strokeWidth={1.75} />
                                {ticket._count.comments}
                              </span>
                            )}
                            {ticket._count.images > 0 && (
                              <span className="inline-flex items-center gap-0.5">
                                <Paperclip className="w-2.5 h-2.5" strokeWidth={1.75} />
                                {ticket._count.images}
                              </span>
                            )}
                            <span className="font-mono">
                              {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
