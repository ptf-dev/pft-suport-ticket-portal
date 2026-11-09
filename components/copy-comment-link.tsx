'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { commentAnchorId, commentLink, focusComment } from '@/lib/comment-anchor'
import { cn } from '@/lib/utils'

export function CopyCommentLink({ commentId, className }: { commentId: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    const url = commentLink(window.location.href, commentId)
    // Also move the link into the address bar and flash the comment, so the click
    // is visible and still works when the browser refuses clipboard access.
    window.history.replaceState(window.history.state, '', url)
    focusComment(commentAnchorId(commentId), true)
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
    } catch {
      setState('failed')
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2200)
  }

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={copy}
        title="Copy link to this comment"
        aria-label="Copy link to this comment"
        className={cn('inline-flex items-center gap-1 rounded text-ink-mute hover:text-ink transition-colors', className)}
      >
        {state === 'copied' ? <Check className="h-3.5 w-3.5 text-ok" strokeWidth={2} /> : <Link2 className="h-3.5 w-3.5" />}
        {state === 'copied' && <span className="font-mono text-[10px] uppercase tracking-widest text-ok">Copied</span>}
        {state === 'failed' && <span className="font-mono text-[10px] uppercase tracking-widest text-warn">Copy it from the address bar</span>}
      </button>
      <span className="sr-only" aria-live="polite">{state === 'copied' ? 'Link copied' : ''}</span>
    </span>
  )
}
