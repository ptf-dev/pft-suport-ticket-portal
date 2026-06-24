'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SprintOption {
  id: string
  name: string
  status: string
}

export function TicketSprintForm({
  ticketId,
  currentSprintId,
  sprints,
}: {
  ticketId: string
  currentSprintId: string | null
  sprints: SprintOption[]
}) {
  const router = useRouter()
  const [value, setValue] = useState(currentSprintId ?? '')
  const [busy, setBusy] = useState(false)

  const change = async (next: string) => {
    const prev = value
    setValue(next)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [ticketId], action: 'sprint', value: next || null }),
      })
      if (!res.ok) throw new Error('failed')
      router.refresh()
    } catch {
      setValue(prev)
      alert('Failed to change sprint')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <select
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className={cn(
          'w-full h-9 px-3 text-sm rounded-md border border-line bg-bg-elev text-ink cursor-pointer',
          'focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50',
        )}
      >
        <option value="">Backlog (no sprint)</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}{s.status === 'ACTIVE' ? ' · active' : ''}
          </option>
        ))}
      </select>
      {busy && <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-ink-mute" />}
    </div>
  )
}
