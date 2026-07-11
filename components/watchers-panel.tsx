'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Eye, Loader2 } from 'lucide-react'

interface Watcher {
  id: string
  user: {
    id: string
    name: string
    email: string
    company: { name: string } | null
  }
  addedBy: { name: string }
  createdAt: string
}

interface WatchersPanelProps {
  ticketId: string
  isAdmin: boolean
  canAddWatchers: boolean
  currentUserId: string
}

export function WatchersPanel({ ticketId, isAdmin, canAddWatchers, currentUserId }: WatchersPanelProps) {
  const [watchers, setWatchers] = useState<Watcher[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; company: { name: string } | null }>>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchWatchers()
  }, [ticketId])

  async function fetchWatchers() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/watchers`)
      if (res.ok) setWatchers(await res.json())
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function addByEmail() {
    if (!input.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/watchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.trim() }),
      })
      if (res.ok) {
        setInput('')
        setShowAdd(false)
        fetchWatchers()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add watcher')
      }
    } catch {
      setError('Network error')
    } finally {
      setAdding(false)
    }
  }

  async function addById(userId: string) {
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/watchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setInput('')
        setSearchResults([])
        setShowAdd(false)
        fetchWatchers()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add watcher')
      }
    } catch {
      setError('Network error')
    } finally {
      setAdding(false)
    }
  }

  async function searchUsers(query: string) {
    setInput(query)
    if (!isAdmin || query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users/search?search=${encodeURIComponent(query)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        const watcherIds = new Set(watchers.map(w => w.user.id))
        setSearchResults((data.users || data).filter((u: any) => !watcherIds.has(u.id)))
      }
    } catch {
    } finally {
      setSearching(false)
    }
  }

  async function removeWatcher(watcherId: string) {
    try {
      await fetch(`/api/tickets/${ticketId}/watchers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watcherId }),
      })
      fetchWatchers()
    } catch {
    }
  }

  const canRemove = (watcher: Watcher) =>
    isAdmin || canAddWatchers || watcher.user.id === currentUserId

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Watchers
          {watchers.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0">{watchers.length}</Badge>
          )}
        </div>
        {canAddWatchers && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-ink-faint hover:text-accent transition-colors"
            title="Add watcher"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-ink-mute" />
        </div>
      ) : watchers.length === 0 && !showAdd ? (
        <p className="text-xs text-ink-faint py-2">No watchers yet.</p>
      ) : (
        <div className="space-y-2">
          {watchers.map((w) => (
            <div key={w.id} className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-md bg-ink text-bg flex items-center justify-center text-xs font-medium shrink-0">
                {w.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink truncate">{w.user.name}</div>
                <div className="text-[11px] text-ink-mute truncate">
                  {w.user.email}
                  {w.user.company && <span className="ml-1 text-ink-faint">· {w.user.company.name}</span>}
                </div>
              </div>
              {canRemove(w) && (
                <button
                  onClick={() => removeWatcher(w.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-all shrink-0"
                  title="Remove watcher"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="space-y-2 pt-2 border-t border-line-soft">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => isAdmin ? searchUsers(e.target.value) : setInput(e.target.value)}
              placeholder={isAdmin ? 'Search users...' : 'Enter email address'}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAdmin) addByEmail()
                if (e.key === 'Escape') {
                  setShowAdd(false)
                  setInput('')
                  setSearchResults([])
                  setError(null)
                }
              }}
            />
            {!isAdmin && (
              <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={addByEmail} disabled={adding}>
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
              </Button>
            )}
          </div>

          {isAdmin && searchResults.length > 0 && (
            <div className="border border-line rounded-lg overflow-hidden divide-y divide-line-soft">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => addById(user.id)}
                  disabled={adding}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-sunken transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-ink text-bg flex items-center justify-center text-[10px] font-medium shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{user.name}</div>
                    <div className="text-[10px] text-ink-mute truncate">
                      {user.email}
                      {user.company && <span> · {user.company.name}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isAdmin && searching && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-ink-mute">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching...
            </div>
          )}

          <button
            onClick={() => { setShowAdd(false); setInput(''); setSearchResults([]); setError(null) }}
            className="text-xs text-ink-faint hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
