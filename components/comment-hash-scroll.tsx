'use client'

import { useEffect } from 'react'
import { focusComment, parseCommentHash } from '@/lib/comment-anchor'

/** Scrolls to and flashes the comment named in the URL fragment, on load and whenever the fragment changes. */
export function CommentHashScroll() {
  useEffect(() => {
    const go = (smooth: boolean) => {
      const anchorId = parseCommentHash(window.location.hash)
      if (anchorId) focusComment(anchorId, smooth)
    }
    go(false)
    const onHashChange = () => go(true)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return null
}
