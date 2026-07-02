'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CompanyActiveToggle({
  companyId,
  active,
  usersCount,
}: {
  companyId: string
  active: boolean
  usersCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    const next = !active
    const verb = next ? 'Activate' : 'Deactivate'
    const msg = next
      ? `Activate this company and re-enable its ${usersCount} user${usersCount === 1 ? '' : 's'}?`
      : `Deactivate this company? This disables login for all ${usersCount} of its user${usersCount === 1 ? '' : 's'} and hides it from dashboard escalations.`
    if (!confirm(`${verb} company\n\n${msg}`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
      if (!res.ok) throw new Error('failed')
      router.refresh()
    } catch {
      alert('Failed to update company')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      title={active ? 'Deactivate company' : 'Activate company'}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition disabled:opacity-50',
        active
          ? 'border-line text-ink-mute hover:text-danger hover:border-danger/40'
          : 'border-ok/40 text-ok hover:bg-ok/5',
      )}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
      {active ? 'Deactivate' : 'Activate'}
    </button>
  )
}
