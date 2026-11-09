export const COMMENT_ANCHOR_PREFIX = 'comment-'

const HIGHLIGHT_CLASS = 'comment-target'
const HIGHLIGHT_MS = 2600 // a little longer than the 2.4s animation in globals.css

const highlightTimers = new WeakMap<Element, number>()

export function commentAnchorId(commentId: string): string {
  return `${COMMENT_ANCHOR_PREFIX}${commentId}`
}

/** "#comment-abc" (or "comment-abc") gives "comment-abc"; any other hash, or one that cannot be decoded, gives null. */
export function parseCommentHash(hash: string): string | null {
  let value = hash.startsWith('#') ? hash.slice(1) : hash
  try {
    value = decodeURIComponent(value)
  } catch {
    return null
  }
  return value.length > COMMENT_ANCHOR_PREFIX.length && value.startsWith(COMMENT_ANCHOR_PREFIX) ? value : null
}

/** The page the reader is on, with the fragment replaced by this comment's anchor. */
export function commentLink(pageHref: string, commentId: string): string {
  const url = new URL(pageHref)
  url.hash = commentAnchorId(commentId)
  return url.toString()
}

/**
 * Flashes the comment, and scrolls it into view only if it is not already visible; false when it is not on the page.
 * The browser (and Next.js on client navigation) already jumps to a #fragment, top-aligned and honouring
 * scroll-margin, so this must not re-centre it: a late native jump would undo that and fight the page.
 */
export function focusComment(anchorId: string, smooth: boolean): boolean {
  const el = document.getElementById(anchorId)
  if (!el) return false
  el.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  el.classList.remove(HIGHLIGHT_CLASS)
  void el.offsetWidth // restart the animation when the same link is used twice in a row
  el.classList.add(HIGHLIGHT_CLASS)
  // A timer rather than animationend: it still cleans up when animations are off or the tab is not painting.
  window.clearTimeout(highlightTimers.get(el))
  highlightTimers.set(el, window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS))
  return true
}
