'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DeleteCompanyButton({
  companyId,
  companyName,
  ticketCount,
  userCount,
  companies,
}: {
  companyId: string
  companyName: string
  ticketCount: number
  userCount: number
  companies: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reassignTo, setReassignTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsReassign = ticketCount > 0 || userCount > 0

  const del = async () => {
    if (needsReassign && !reassignTo) {
      setError('Pick a company to move the tickets and users to.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsReassign ? { reassignTo } : {}),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to delete company')
      }
      router.push('/admin/companies')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete company')
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setReassignTo(''); setOpen(true) }}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-danger/40 text-danger hover:bg-danger/5 text-sm font-medium transition"
      >
        <Trash2 className="w-4 h-4" /> Delete company
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md bg-bg-elev border border-line rounded-xl shadow-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl tracking-tightest text-ink">Delete company</h3>
              <button type="button" onClick={() => !busy && setOpen(false)} className="text-ink-mute hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-ink-soft">
              Delete <strong className="text-ink">{companyName}</strong>? This cannot be undone.
            </p>

            {needsReassign ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-mute">
                  It has <strong className="text-ink">{ticketCount}</strong> ticket{ticketCount === 1 ? '' : 's'} and{' '}
                  <strong className="text-ink">{userCount}</strong> user{userCount === 1 ? '' : 's'}. Move them to:
                </p>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-md border border-line bg-bg-elev text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                >
                  <option value="">Select a company…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-ink-mute">No tickets or users attached — safe to remove.</p>
            )}

            {error && <p className="text-xs text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={del}
                className={cn('inline-flex items-center gap-2 h-9 px-4 rounded-md bg-danger text-bg font-medium text-sm hover:opacity-90 transition disabled:opacity-50')}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="h-9 px-3 rounded-md border border-line text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
