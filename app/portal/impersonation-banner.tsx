'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Eye, Undo2 } from 'lucide-react'

interface ImpersonationBannerProps {
  userName: string
  companyName: string
  adminName: string
}

export function ImpersonationBanner({ userName, companyName, adminName }: ImpersonationBannerProps) {
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(false)

  const backToAdmin = async () => {
    setBusy(true)
    const res = await fetch('/api/impersonation/exit', { method: 'POST' }).catch(() => null)
    if (res?.ok) {
      window.location.assign('/admin/users')
      return
    }
    setExpired(true)
    setBusy(false)
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 md:px-8 py-2 bg-warn-soft border-b border-warn/40 text-sm text-ink shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 text-warn shrink-0" strokeWidth={2} />
        <span className="min-w-0">
          {adminName}, you are viewing the portal as <strong className="font-semibold">{userName}</strong> ({companyName}).
          Read-only: changes are blocked.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {expired && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs underline underline-offset-2 text-ink-soft hover:text-ink"
          >
            Admin session expired. Sign in again
          </button>
        )}
        <button
          type="button"
          onClick={backToAdmin}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-ink text-bg text-xs font-medium hover:bg-ink/90 disabled:opacity-50"
        >
          <Undo2 className="w-3.5 h-3.5" strokeWidth={2} /> Back to admin
        </button>
      </div>
    </div>
  )
}
