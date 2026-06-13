'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TicketStatus, TicketPriority, Role } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import { RestoreTicketButton } from './restore-ticket-button'
import { BoardBulkBar, type AdminUserLite, type SprintLite, type BulkAction } from './board-bulk-bar'
import { priorityMeta, priorityLabel } from '@/lib/priorities'
import { isBoomerang, boomerangMeta } from '@/lib/boomerang'
import { TicketIcon, CalendarClock, ExternalLink, Undo2, CheckSquare, Square, MinusSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableTicket {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: Date | string
  updatedAt: Date | string
  scheduledDate?: Date | string | null
  bounceCount?: number | null
  reopenedByRole?: Role | null
  company: { name: string }
  createdBy: { name: string | null }
  assignedTo?: { id?: string; name: string | null } | null
  _count: { comments: number; images: number; activities: number }
}

interface TicketTableProps {
  tickets: TableTicket[]
  showDeleted: boolean
  currentSort: string
  currentOrder: 'asc' | 'desc'
  multiSort?: string
  total: number
  page: number
  pageSize: number
}

function timeAgo(d: Date): { label: string; fresh: boolean } {
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return { label: 'just now', fresh: true }
  if (mins < 60) return { label: `${mins}m`, fresh: true }
  if (hours < 24) return { label: `${hours}h`, fresh: hours < 6 }
  if (days < 30) return { label: `${days}d`, fresh: false }
  const months = Math.floor(days / 30)
  return { label: `${months}mo`, fresh: false }
}

export function TicketTable({ tickets, showDeleted, currentSort, currentOrder, multiSort, total, page, pageSize }: TicketTableProps) {
  const router = useRouter()
  const selectable = !showDeleted
  const [localTickets, setLocalTickets] = useState(tickets)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adminUsers, setAdminUsers] = useState<AdminUserLite[]>([])
  const [sprints, setSprints] = useState<SprintLite[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    setLocalTickets(tickets)
    setSelected(new Set())
  }, [tickets])

  useEffect(() => {
    if (!selectable) return
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
  }, [selectable])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allSelected = localTickets.length > 0 && selected.size === localTickets.length
  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size === localTickets.length ? new Set() : new Set(localTickets.map((t) => t.id))))
  }, [localTickets])

  const runBulk = useCallback(
    async (a: BulkAction) => {
      const ids = Array.from(selected)
      if (ids.length === 0) return
      const snapshot = localTickets
      setBulkBusy(true)
      if (a.action === 'delete' || a.action === 'archive') {
        setLocalTickets((prev) => prev.filter((t) => !selected.has(t.id)))
      }
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
    [selected, localTickets, router],
  )

  const colSpan = selectable ? 9 : 8

  return (
    <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line-soft">
          <thead className="bg-bg-sunken">
            <tr>
              {selectable && (
                <th className="px-3 py-3 w-10">
                  <button type="button" onClick={toggleAll} aria-label="Select all" className={cn('transition-colors', allSelected ? 'text-accent' : 'text-ink-mute hover:text-ink')}>
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : selected.size > 0 ? <MinusSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
              <SortableTh column="title"      label="Ticket"      currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <SortableTh column="company"    label="Company"     currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <SortableTh column="status"     label="Status"      currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <SortableTh column="priority"   label="Priority"    currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <SortableTh column="assignedTo" label="Assigned"    currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <SortableTh column="createdAt"  label="Created"     currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <SortableTh column="updatedAt"  label="Last active" currentSort={currentSort} currentOrder={currentOrder} multiSort={multiSort} />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {localTickets.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <TicketIcon className="w-10 h-10 text-ink-faint" strokeWidth={1.2} />
                    <p className="font-display text-2xl tracking-tightest text-ink">Nothing here.</p>
                    <p className="text-xs text-ink-mute">Try another activity window or clear your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              localTickets.map((ticket) => {
                const ago = timeAgo(new Date(ticket.updatedAt))
                const bmrang = isBoomerang(ticket)
                const bm = bmrang ? boomerangMeta(ticket.reopenedByRole ?? null, ticket.bounceCount ?? 0) : null
                const isSel = selected.has(ticket.id)
                return (
                  <tr
                    key={ticket.id}
                    className={cn(
                      'group transition-colors',
                      isSel ? 'bg-accent-soft' : bmrang ? (bm!.tone === 'danger' ? 'bg-danger-soft' : 'bg-warn-soft') : 'hover:bg-bg-sunken',
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-4">
                        <button type="button" onClick={() => toggle(ticket.id)} aria-label={isSel ? 'Deselect' : 'Select'} className={cn('transition-colors', isSel ? 'text-accent' : 'text-ink-mute hover:text-ink')}>
                          {isSel ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${priorityMeta(ticket.priority).dotClass}`} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-ink hover:text-accent transition-colors line-clamp-1 block">
                            {ticket.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-ink-mute">
                            {bmrang && (
                              <span className={cn('inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-semibold not-italic', bm!.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn')} title="Bounced back from Waiting — client disagreed it was resolved">
                                <Undo2 className="w-3 h-3" strokeWidth={2} />
                                {bm!.label}{bm!.suffix}
                              </span>
                            )}
                            <span>#{ticket.id.slice(0, 8)}</span>
                            {ticket._count.comments > 0 && <span>· {ticket._count.comments} msg</span>}
                            {ticket._count.activities > 0 && <span>· {ticket._count.activities} events</span>}
                            {ticket.scheduledDate && (
                              <span className="inline-flex items-center gap-1 text-accent">
                                <CalendarClock className="w-3 h-3" />
                                {new Date(ticket.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-ink">{ticket.company.name}</div>
                      <div className="text-xs text-ink-mute mt-0.5">{ticket.createdBy.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={
                        ticket.status === 'OPEN' ? 'destructive' :
                        ticket.status === 'BLOCKED' ? 'destructive' :
                        ticket.status === 'IN_PROGRESS' ? 'info' :
                        ticket.status === 'WAITING_CLIENT' ? 'warning' :
                        ticket.status === 'RESOLVED' ? 'success' : 'secondary'
                      }>
                        {ticket.status === 'IN_PROGRESS' ? 'In prog' : ticket.status === 'WAITING_CLIENT' ? 'Waiting' : ticket.status.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={priorityMeta(ticket.priority).badgeVariant}>{priorityLabel(ticket.priority)}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-ink text-bg flex items-center justify-center text-[10px] font-semibold">
                            {ticket.assignedTo.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div className="text-sm text-ink">{ticket.assignedTo.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-faint italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-ink tabular-nums">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-ink-mute font-mono uppercase tracking-widest mt-0.5">{timeAgo(new Date(ticket.createdAt)).label} old</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {ago.fresh && (
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-pulse" />
                          </span>
                        )}
                        <div>
                          <div className={`text-sm font-medium tabular-nums ${ago.fresh ? 'text-pulse' : 'text-ink'}`}>{ago.label} ago</div>
                          <div className="text-[10px] text-ink-mute font-mono uppercase tracking-widest">
                            {new Date(ticket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      {showDeleted ? (
                        <RestoreTicketButton ticketId={ticket.id} />
                      ) : (
                        <Link href={`/admin/tickets/${ticket.id}`} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-mute hover:text-ink">
                          <ExternalLink className="w-4 h-4 inline" />
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination total={total} page={page} pageSize={pageSize} />

      {selectable && (
        <BoardBulkBar
          count={selected.size}
          adminUsers={adminUsers}
          sprints={sprints}
          busy={bulkBusy}
          onAction={runBulk}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  )
}
