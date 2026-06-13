'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

export function SprintCreateForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName(''); setGoal(''); setStartDate(''); setEndDate(''); setError(null)
  }

  const submit = async () => {
    setError(null)
    if (!name.trim() || !startDate || !endDate) {
      setError('Name, start and end dates are required.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), goal: goal.trim() || undefined, startDate, endDate }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to create sprint')
      }
      reset()
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create sprint')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-accent-ink font-medium text-sm hover:opacity-90 transition"
      >
        <Plus className="w-4 h-4" /> New sprint
      </button>
    )
  }

  const inputCls = 'h-9 px-3 text-sm rounded-md border border-line bg-bg-elev text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink w-full'

  return (
    <div className="bg-bg-elev border border-line rounded-xl shadow-card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Name</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 12 — June cycle" />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Goal (optional)</span>
          <input className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Clear payout + KYC backlog" />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Start</span>
          <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">End</span>
          <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
        </label>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className={cn('inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-accent-ink font-medium text-sm hover:opacity-90 transition disabled:opacity-50')}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create sprint
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => { reset(); setOpen(false) }}
          className="h-9 px-3 rounded-md border border-line text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
