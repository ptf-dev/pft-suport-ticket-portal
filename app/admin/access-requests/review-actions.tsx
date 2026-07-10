'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Company { id: string; name: string }
interface Props { requestId: string; companies: Company[] }

/** Approve (map to firm) / reject controls for one pending request row. */
export default function ReviewActions({ requestId, companies }: Props) {
  const router = useRouter()
  const [companyId, setCompanyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approve = async () => {
    if (!companyId) { setError('Pick a firm first'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/access-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Approve failed'); return }
      if (data.emailSent === false) setError('Approved, but the invite email failed to send (check SMTP).')
      router.refresh()
    } catch { setError('Approve failed') } finally { setBusy(false) }
  }

  const reject = async () => {
    const reason = window.prompt('Optional reason for rejection (emailed to the applicant if provided):') ?? undefined
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/access-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { reason } : {}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reject failed'); return }
      router.refresh()
    } catch { setError('Reject failed') } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <select
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        disabled={busy}
        className="px-3 py-2 border border-line rounded-md bg-bg-elev text-sm text-ink"
      >
        <option value="">Map to firm…</option>
        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={approve} disabled={busy}
          className="px-3 py-2 rounded-md bg-ink text-bg text-sm font-medium disabled:opacity-50">Approve</button>
        <button onClick={reject} disabled={busy}
          className="px-3 py-2 rounded-md border border-line text-sm text-ink disabled:opacity-50">Reject</button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
