'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import type { SprintStatus } from '@prisma/client'

export function SprintActions({ id, status }: { id: string; status: SprintStatus }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const call = async (fn: () => Promise<Response>, key: string) => {
    setBusy(key)
    try {
      const res = await fn()
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Action failed')
        return
      }
      if (key === 'complete') {
        const j = await res.json().catch(() => ({}))
        alert(`Sprint completed — ${j.archived ?? 0} archived, ${j.carried ?? 0} carried back to backlog.`)
      }
      if (key === 'delete') { router.push('/admin/sprints'); return }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const patch = (body: object) =>
    fetch(`/api/admin/sprints/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  return (
    <div className="flex items-center gap-2">
      {status === 'PLANNED' && (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => call(() => patch({ status: 'ACTIVE' }), 'start')}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-ink text-bg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {busy === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Start sprint
        </button>
      )}
      {status === 'ACTIVE' && (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            if (!confirm('Complete this sprint? Resolved tickets get archived; unfinished ones go back to the backlog.')) return
            call(() => fetch(`/api/admin/sprints/${id}/complete`, { method: 'POST' }), 'complete')
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-ok text-bg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {busy === 'complete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Complete sprint
        </button>
      )}
      <button
        type="button"
        disabled={!!busy}
        onClick={() => {
          if (!confirm('Delete this sprint? Its tickets return to the backlog. This cannot be undone.')) return
          call(() => fetch(`/api/admin/sprints/${id}`, { method: 'DELETE' }), 'delete')
        }}
        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-line text-danger hover:border-danger/50 hover:bg-danger/5 transition disabled:opacity-50"
        title="Delete sprint"
      >
        {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
