'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Loader2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BacklogTicket {
  id: string
  title: string
  companyName: string
  priority: string
}

export function SprintBacklog({ sprintId, tickets }: { sprintId: string; tickets: BacklogTicket[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tickets
    return tickets.filter(
      (t) => t.title.toLowerCase().includes(q) || t.companyName.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
    )
  }, [tickets, query])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const addToSprint = useCallback(async () => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action: 'sprint', value: sprintId }),
      })
      if (!res.ok) throw new Error('Failed')
      setSelected(new Set())
      router.refresh()
    } catch {
      alert('Failed to add tickets to sprint')
    } finally {
      setBusy(false)
    }
  }, [selected, sprintId, router])

  return (
    <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-line-soft">
        <h2 className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          <Layers className="w-3.5 h-3.5" /> Backlog
          <span className="text-ink-mute">({tickets.length})</span>
        </h2>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={addToSprint}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-accent-ink text-xs font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add{selected.size > 0 ? ` ${selected.size}` : ''} to sprint
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-line-soft">
        <Search className="w-3.5 h-3.5 text-ink-mute shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter backlog…"
          className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-ink-mute">Backlog is empty — nothing to plan.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-line-soft">
          {filtered.map((t) => {
            const isSel = selected.has(t.id)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                    isSel ? 'bg-accent-soft' : 'hover:bg-bg-sunken',
                  )}
                >
                  <span className={cn('h-4 w-4 shrink-0 rounded border flex items-center justify-center', isSel ? 'bg-accent border-accent' : 'border-line')}>
                    {isSel && <span className="h-1.5 w-1.5 rounded-sm bg-accent-ink" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink truncate">{t.title}</span>
                    <span className="block text-[11px] text-ink-mute">{t.companyName}</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute shrink-0">{t.priority}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
