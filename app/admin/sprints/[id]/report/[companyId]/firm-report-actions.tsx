'use client'

import { useState } from 'react'
import { Copy, Check, Mail } from 'lucide-react'

export function FirmReportActions({ summary, email, subject }: { summary: string; email: string | null; subject: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`
    : null

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
      >
        {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy summary'}
      </button>
      {mailto && (
        <a
          href={mailto}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-accent text-accent-ink text-sm font-medium hover:opacity-90 transition"
        >
          <Mail className="w-4 h-4" /> Email client
        </a>
      )}
    </div>
  )
}
