'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TicketStatus, TicketPriority, Role } from '@prisma/client'
import { GripVertical, MessageSquare, Paperclip, Folder, Undo2, AlarmClock, CheckSquare, Square, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { priorityMeta, priorityLabel, priorityRank } from '@/lib/priorities'
import { isBoomerang, boomerangMeta } from '@/lib/boomerang'
import { ticketSla, slaSeverity, type SlaResult } from '@/lib/sla'
import { BoardBulkBar, type AdminUserLite, type SprintLite, type BulkAction } from '@/app/admin/tickets/board-bulk-bar'

interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string | null
  createdAt: Date | string
  updatedAt?: Date | string | null
  bounceCount?: number | null
  reopenedByRole?: Role | null
  createdBy: {
    name: string | null
  }
  assignedTo?: {
    id?: string
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

type SortMode = 'sla' | 'updated' | 'oldest' | 'priority'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'sla',      label: 'SLA risk' },
  { value: 'updated',  label: 'Recently active' },
  { value: 'oldest',   label: 'Oldest untouched' },
  { value: 'priority', label: 'Priority' },
]

const SLA_PILL: Record<SlaResult['state'], string> = {
  breach: 'bg-danger/10 text-danger border-danger/20',
  risk:   'bg-warn/10 text-warn border-warn/20',
  ok:     'bg-mute text-ink-mute border-line',
  none:   '',
}

function ts(d: Date | string | null | undefined): number {
  return d ? new Date(d).getTime() : 0
}

export function InteractiveTicketBoard({ tickets, basePath = '/portal/tickets' }: TicketBoardProps) {
  const isAdmin = basePath.startsWith('/admin')
  const router = useRouter()

  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null)
  const [localTickets, setLocalTickets] = useState(tickets)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>(isAdmin ? 'sla' : 'updated')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adminUsers, setAdminUsers] = useState<AdminUserLite[]>([])
  const [sprints, setSprints] = useState<SprintLite[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    setLocalTickets(tickets)
    setSelected(new Set())
  }, [tickets])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : []))
      .then((users: { id: string; name: string | null; role: string; isActive: boolean }[]) =>
        setAdminUsers(users.filter((u) => u.role === 'ADMIN' && u.isActive).map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {})
    fetch('/api/admin/sprints')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string; status: string }[]) =>
        setSprints(list.filter((s) => s.status !== 'COMPLETED').map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => {})
  }, [isAdmin])

  // SLA state per ticket, recomputed when the data set changes.
  const slaById = useMemo(() => {
    const now = Date.now()
    const map = new Map<string, SlaResult>()
    for (const t of localTickets) {
      map.set(t.id, ticketSla({ priority: t.priority, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt }, now))
    }
    return map
  }, [localTickets])

  const sortTickets = useCallback(
    (list: Ticket[]): Ticket[] => {
      const arr = [...list]
      switch (sortMode) {
        case 'updated':
          return arr.sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt))
        case 'oldest':
          return arr.sort((a, b) => (ts(a.updatedAt) || ts(a.createdAt)) - (ts(b.updatedAt) || ts(b.createdAt)))
        case 'priority':
          return arr.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || ts(b.updatedAt) - ts(a.updatedAt))
        case 'sla':
        default:
          return arr.sort((a, b) => {
            const sa = slaById.get(a.id)
            const sb = slaById.get(b.id)
            const sev = slaSeverity(sb?.state ?? 'none') - slaSeverity(sa?.state ?? 'none')
            if (sev !== 0) return sev
            const over = (sb?.overdueMs ?? 0) - (sa?.overdueMs ?? 0)
            if (over !== 0) return over
            return (ts(a.updatedAt) || ts(a.createdAt)) - (ts(b.updatedAt) || ts(b.createdAt))
          })
      }
    },
    [sortMode, slaById],
  )

  const ticketsByStatus = STATUS_COLUMNS.map((column) => ({
    ...column,
    tickets: sortTickets(localTickets.filter((t) => t.status === column.status)),
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

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(localTickets.map((t) => t.id)))
  }, [localTickets])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  // Optimistically mutate a ticket in local state for a bulk action.
  const applyOptimistic = useCallback(
    (ids: Set<string>, a: BulkAction) => {
      setLocalTickets((prev) => {
        if (a.action === 'delete' || a.action === 'archive') return prev.filter((t) => !ids.has(t.id))
        return prev.map((t) => {
          if (!ids.has(t.id)) return t
          if (a.action === 'status') return { ...t, status: a.value }
          if (a.action === 'priority') return { ...t, priority: a.value }
          if (a.action === 'assign') {
            if (a.value === null) return { ...t, assignedTo: null }
            const u = adminUsers.find((x) => x.id === a.value)
            return { ...t, assignedTo: { id: a.value, name: u?.name ?? '…' } }
          }
          return t
        })
      })
    },
    [adminUsers],
  )

  const runBulk = useCallback(
    async (a: BulkAction) => {
      const ids = Array.from(selected)
      if (ids.length === 0) return
      const snapshot = localTickets
      setBulkBusy(true)
      applyOptimistic(selected, a)
      try {
        const res = await fetch('/api/admin/tickets/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, action: a.action, value: a.value }),
        })
        if (!res.ok) throw new Error('Bulk action failed')
        setSelected(new Set())
        router.refresh()
      } catch (err) {
        console.error('Bulk action failed:', err)
        setLocalTickets(snapshot)
      } finally {
        setBulkBusy(false)
      }
    },
    [selected, localTickets, applyOptimistic, router],
  )

  const selectionActive = isAdmin && selected.size > 0

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ListFilter className="w-3.5 h-3.5 text-ink-mute" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">Sort</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="h-8 pl-2 pr-7 text-xs rounded-md cursor-pointer font-medium border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 focus:outline-none focus:ring-1 focus:ring-ink appearance-none"
          >
            {SORT_OPTIONS.filter((o) => isAdmin || o.value !== 'sla').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute tabular-nums">
                {selected.size} selected
              </span>
            )}
            <button
              type="button"
              onClick={selected.size === localTickets.length && localTickets.length > 0 ? clearSelection : selectAllVisible}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-xs font-medium transition"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {selected.size === localTickets.length && localTickets.length > 0 ? 'Clear all' : 'Select all'}
            </button>
          </div>
        )}
      </div>

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
                  column.tickets.map((ticket) => {
                    const bmrang = isBoomerang(ticket)
                    const bm = bmrang ? boomerangMeta(ticket.reopenedByRole, ticket.bounceCount ?? 0) : null
                    const sla = slaById.get(ticket.id)
                    const isSelected = selected.has(ticket.id)
                    return (
                    <article
                      key={ticket.id}
                      draggable
                      onDragStart={() => handleDragStart(ticket.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group relative rounded-lg bg-bg-elev border overflow-hidden',
                        'hover:border-ink/30 hover:shadow-soft transition-all cursor-grab active:cursor-grabbing',
                        isSelected
                          ? 'border-accent ring-1 ring-accent'
                          : bmrang ? (bm!.tone === 'danger' ? 'border-danger' : 'border-warn') : 'border-line',
                        draggedTicket === ticket.id && 'opacity-40',
                        isUpdating === ticket.id && 'animate-pulse',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute inset-y-0 left-0',
                          bmrang ? 'w-1' : 'w-0.5',
                          bmrang ? (bm!.tone === 'danger' ? 'bg-danger' : 'bg-warn') : priorityMeta(ticket.priority).dotClass,
                        )}
                        aria-hidden
                      />
                      {!isAdmin && (
                        <GripVertical
                          className="absolute top-2 right-1.5 w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden
                        />
                      )}

                      <div className="pl-3 pr-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleSelect(ticket.id) }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                'shrink-0 transition-colors',
                                isSelected ? 'text-accent' : 'text-ink-faint hover:text-ink',
                              )}
                              aria-label={isSelected ? 'Deselect ticket' : 'Select ticket'}
                            >
                              {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint shrink-0">
                            #{ticket.id.slice(0, 6)}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute truncate min-w-0">
                            {priorityLabel(ticket.priority)}
                          </span>
                          {isAdmin && sla && sla.state !== 'none' && sla.label && (
                            <span
                              className={cn(
                                'ml-auto shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide',
                                SLA_PILL[sla.state],
                              )}
                              title={`Priority target: ${sla.targetHours}h`}
                            >
                              <AlarmClock className="w-2.5 h-2.5 shrink-0" strokeWidth={2} />
                              {sla.label}
                            </span>
                          )}
                        </div>

                        {bmrang && (
                          <div
                            className={cn(
                              'flex items-center gap-1 mb-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              bm!.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn',
                            )}
                            title="Bounced back from Waiting — client disagreed it was resolved"
                          >
                            <Undo2 className="w-3 h-3" strokeWidth={2} aria-hidden />
                            <span>{bm!.label}{bm!.suffix}</span>
                          </div>
                        )}

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
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>

      {isAdmin && (
        <BoardBulkBar
          count={selectionActive ? selected.size : 0}
          adminUsers={adminUsers}
          sprints={sprints}
          busy={bulkBusy}
          onAction={runBulk}
          onClear={clearSelection}
        />
      )}
    </div>
  )
}
