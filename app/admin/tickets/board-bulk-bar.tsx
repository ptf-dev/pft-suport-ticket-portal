'use client'

import { TicketStatus, TicketPriority } from '@prisma/client'
import { X, CheckSquare, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_ORDER, priorityLabel } from '@/lib/priorities'

export interface AdminUserLite {
  id: string
  name: string | null
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'WAITING_CLIENT', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

export type BulkAction =
  | { action: 'status'; value: TicketStatus }
  | { action: 'priority'; value: TicketPriority }
  | { action: 'assign'; value: string | null }
  | { action: 'delete'; value: null }

function BarSelect({
  label,
  onPick,
  disabled,
  children,
}: {
  label: string
  onPick: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      value=""
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value)
        e.currentTarget.value = ''
      }}
      className={cn(
        'h-8 px-2 text-xs rounded-md cursor-pointer font-medium transition-colors',
        'border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40',
        'focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50',
      )}
    >
      <option value="">{label}</option>
      {children}
    </select>
  )
}

export function BoardBulkBar({
  count,
  adminUsers,
  busy,
  onAction,
  onClear,
}: {
  count: number
  adminUsers: AdminUserLite[]
  busy: boolean
  onAction: (a: BulkAction) => void
  onClear: () => void
}) {
  if (count === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-ink/15 bg-bg-elev/95 backdrop-blur px-3 py-2 shadow-lg">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5 text-accent" />}
          <span className="tabular-nums font-semibold">{count}</span>
          <span className="text-ink-mute">selected</span>
        </span>

        <div className="h-5 w-px bg-line" />

        <BarSelect label="Status" disabled={busy} onPick={(v) => onAction({ action: 'status', value: v as TicketStatus })}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </BarSelect>

        <BarSelect label="Priority" disabled={busy} onPick={(v) => onAction({ action: 'priority', value: v as TicketPriority })}>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>{priorityLabel(p)}</option>
          ))}
        </BarSelect>

        <BarSelect label="Assign" disabled={busy} onPick={(v) => onAction({ action: 'assign', value: v === '__unassign__' ? null : v })}>
          <option value="__unassign__">Unassign</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? 'Unknown'}</option>
          ))}
        </BarSelect>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAction({ action: 'delete', value: null })}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-line text-danger hover:border-danger/50 hover:bg-danger/5 text-xs font-medium transition disabled:opacity-50"
          title="Delete selected"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-line" />

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-ink-mute hover:text-ink text-xs font-medium transition"
          title="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
