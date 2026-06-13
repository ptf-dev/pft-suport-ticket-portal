'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, X } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'

function toInput(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10)
}

export function SprintEdit({
  id,
  name: name0,
  goal: goal0,
  startDate: start0,
  endDate: end0,
}: {
  id: string
  name: string
  goal: string | null
  startDate: Date | string
  endDate: Date | string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(name0)
  const [goal, setGoal] = useState(goal0 ?? '')
  const [startDate, setStartDate] = useState(toInput(start0))
  const [endDate, setEndDate] = useState(toInput(end0))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openForm = () => {
    setName(name0); setGoal(goal0 ?? ''); setStartDate(toInput(start0)); setEndDate(toInput(end0))
    setError(null); setOpen(true)
  }

  const save = async () => {
    setError(null)
    if (!name.trim() || !startDate || !endDate) { setError('Name, start and end dates are required.'); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/sprints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), goal: goal.trim(), startDate, endDate }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save')
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'h-9 px-3 text-sm rounded-md border border-line bg-bg-elev text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink w-full'

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
      >
        <Pencil className="w-4 h-4" /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md bg-bg-elev border border-line rounded-xl shadow-lg p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl tracking-tightest text-ink">Edit sprint</h3>
              <button type="button" onClick={() => !busy && setOpen(false)} className="text-ink-mute hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Name</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Goal (optional)</span>
              <input className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Start</span>
                <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
              </label>
              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">End</span>
                <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
              </label>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-accent-ink font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
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
