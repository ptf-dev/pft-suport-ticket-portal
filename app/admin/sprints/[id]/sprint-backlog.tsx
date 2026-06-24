'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Loader2, Layers, CheckSquare, Square, ExternalLink, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BacklogTicket {
  id: string
  title: string
  companyName: string
  priority: string
}

export function SprintBacklog({
  sprintId,
  tickets,
  nextSprint,
}: {
  sprintId: string
  tickets: BacklogTicket[]
  nextSprint?: { id: string; name: string } | null
}) {
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

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id))
  const toggleAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSel = filtered.length > 0 && filtered.every((t) => next.has(t.id))
      filtered.forEach((t) => (allSel ? next.delete(t.id) : next.add(t.id)))
      return next
    })
  }, [filtered])

  const addTo = useCallback(
    async (targetId: string) => {
      if (selected.size === 0) return
      setBusy(true)
      try {
        const res = await fetch('/api/admin/tickets/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selected), action: 'sprint', value: targetId }),
        })
        if (!res.ok) throw new Error('Failed')
        setSelected(new Set())
        router.refresh()
      } catch {
        alert('Failed to move tickets')
      } finally {
        setBusy(false)
      }
    },
    [selected, router],
  )

  return (
    <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-line-soft">
        <h2 className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          <Layers className="w-3.5 h-3.5" /> Backlog
          <span className="text-ink-mute">({tickets.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={toggleAllFiltered}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-xs font-medium transition disabled:opacity-40"
          >
            {allFilteredSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {allFilteredSelected ? 'Clear' : 'Select all'}
          </button>
          {nextSprint && (
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => addTo(nextSprint.id)}
              title={`Add to ${nextSprint.name}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-xs font-medium transition disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Add{selected.size > 0 ? ` ${selected.size}` : ''} to next
            </button>
          )}
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => addTo(sprintId)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-accent-ink text-xs font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add{selected.size > 0 ? ` ${selected.size}` : ''} to sprint
          </button>
        </div>
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
              <li key={t.id} className={cn('group flex items-center transition-colors', isSel ? 'bg-accent-soft' : 'hover:bg-bg-sunken')}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex items-center gap-3 px-4 py-2 text-left flex-1 min-w-0"
                >
                  <span className={cn('h-4 w-4 shrink-0 rounded border flex items-center justify-center', isSel ? 'bg-accent border-accent' : 'border-line')}>
                    {isSel && <span className="h-1.5 w-1.5 rounded-sm bg-accent-ink" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink truncate">{t.title}</span>
                    <span className="block text-[11px] text-ink-mute">{t.companyName}</span>
                  </span>
                </button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute shrink-0 px-2">{t.priority}</span>
                <a
                  href={`/admin/tickets/${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open ticket in new tab"
                  className="shrink-0 px-3 py-2 text-ink-faint hover:text-accent transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
