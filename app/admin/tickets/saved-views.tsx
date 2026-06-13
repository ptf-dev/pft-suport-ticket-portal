'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bookmark, BookmarkPlus, X, Inbox, UserX, AlarmClock, Flame, Clock, Star, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'pft.savedViews.v1'

// Params that define a "view" — everything except pagination / table layout.
const VIEW_PARAMS = [
  'company', 'status', 'priority', 'assignedTo', 'search',
  'activity', 'dateFilter', 'startDate', 'endDate',
  'scheduleFilter', 'scheduleDate', 'sla',
] as const

interface SavedView {
  id: string
  name: string
  query: string
}

interface Preset {
  name: string
  query: string
  icon: React.ReactNode
}

const PRESETS: Preset[] = [
  { name: 'Needs triage', query: 'status=OPEN&assignedTo=unassigned', icon: <Inbox className="w-3 h-3" /> },
  { name: 'Unassigned',   query: 'assignedTo=unassigned&status=NOT_RESOLVED', icon: <UserX className="w-3 h-3" /> },
  { name: 'Overdue',      query: 'sla=breach', icon: <AlarmClock className="w-3 h-3" /> },
  { name: 'At risk',      query: 'sla=risk', icon: <Clock className="w-3 h-3" /> },
  { name: 'Urgent',       query: 'priority=URGENT&status=NOT_RESOLVED', icon: <Flame className="w-3 h-3" /> },
  { name: 'Stale 30d+',   query: 'activity=stale&status=NOT_RESOLVED', icon: <Clock className="w-3 h-3" /> },
  { name: 'Archived',     query: 'status=ARCHIVED', icon: <Archive className="w-3 h-3" /> },
]

/** Normalize a query string to its view-defining params, sorted — for active matching. */
function normalize(qs: string): string {
  const p = new URLSearchParams(qs)
  const pairs: string[] = []
  for (const k of VIEW_PARAMS) {
    const v = p.get(k)
    if (v) pairs.push(`${k}=${v}`)
  }
  return pairs.sort().join('&')
}

function makeId(name: string, existing: SavedView[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'view'
  let id = base
  let n = 1
  while (existing.some((v) => v.id === id)) id = `${base}-${++n}`
  return id
}

export function SavedViews() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [views, setViews] = useState<SavedView[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setViews(JSON.parse(raw))
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  const persist = useCallback((next: SavedView[]) => {
    setViews(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [])

  const currentNorm = normalize(searchParams.toString())

  const apply = useCallback((query: string) => {
    const view = searchParams.get('view')
    const params = new URLSearchParams(query)
    if (view) params.set('view', view)
    params.set('page', '1')
    router.push(`/admin/tickets?${params.toString()}`)
  }, [router, searchParams])

  const saveCurrent = useCallback(() => {
    const norm = normalize(searchParams.toString())
    if (!norm) return
    const name = typeof window !== 'undefined' ? window.prompt('Name this view') : null
    if (!name?.trim()) return
    const view: SavedView = { id: makeId(name.trim(), views), name: name.trim(), query: norm }
    persist([...views.filter((v) => v.query !== norm), view])
  }, [searchParams, views, persist])

  const remove = useCallback((id: string) => {
    persist(views.filter((v) => v.id !== id))
  }, [views, persist])

  const hasActiveFilters = currentNorm.length > 0
  const alreadySaved = views.some((v) => v.query === currentNorm) || PRESETS.some((p) => normalize(p.query) === currentNorm)

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-line-soft">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mr-0.5">
        <Bookmark className="w-3 h-3" />
        Views
      </span>

      {PRESETS.map((p) => {
        const active = normalize(p.query) === currentNorm
        return (
          <button
            key={p.name}
            type="button"
            onClick={() => apply(p.query)}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors border',
              active
                ? 'bg-ink text-bg border-ink'
                : 'bg-bg-elev text-ink-soft hover:text-ink border-line hover:border-ink/40',
            )}
          >
            {p.icon}
            {p.name}
          </button>
        )
      })}

      {loaded && views.length > 0 && <div className="h-5 w-px bg-line mx-0.5" />}

      {loaded && views.map((v) => {
        const active = v.query === currentNorm
        return (
          <span
            key={v.id}
            className={cn(
              'group inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-md text-xs font-medium transition-colors border',
              active
                ? 'bg-ink text-bg border-ink'
                : 'bg-bg-elev text-ink-soft border-line hover:border-ink/40',
            )}
          >
            <button type="button" onClick={() => apply(v.query)} className="inline-flex items-center gap-1.5">
              <Star className={cn('w-3 h-3', active ? 'text-bg' : 'text-accent')} />
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => remove(v.id)}
              className={cn('rounded p-0.5 transition-colors', active ? 'text-bg/70 hover:text-bg' : 'text-ink-faint hover:text-danger')}
              aria-label={`Delete view ${v.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )
      })}

      {hasActiveFilters && !alreadySaved && (
        <button
          type="button"
          onClick={saveCurrent}
          className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-line text-ink-mute hover:text-ink hover:border-ink/40 text-xs font-medium transition"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          Save view
        </button>
      )}
    </div>
  )
}
