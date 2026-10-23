export interface TicketIntent {
  /** How the reporter tagged it, for the confirmation text. */
  label: string
  category: string
}

const INTENTS: { pattern: RegExp; label: string; category: string }[] = [
  { pattern: /\bbug\s*report\b|#bug\b|\bbug\s*:/i, label: 'bug report', category: 'Bug Report' },
  { pattern: /\bfeature\s*request\b|#feature\b|\bfeature\s*:/i, label: 'feature request', category: 'Feature Request' },
  { pattern: /\bnew\s*ticket\b|#ticket\b|\bticket\s*:/i, label: 'ticket', category: 'Other' },
]

/** A reporter who writes "bug report" / "feature request" / "#ticket" is asking for a ticket, not describing one. */
export function explicitTicketIntent(body: string): TicketIntent | null {
  for (const intent of INTENTS) {
    if (intent.pattern.test(body)) return { label: intent.label, category: intent.category }
  }
  return null
}

/** Title for the no-LLM fallback: the message minus mentions and the trigger words, first sentence, capped. */
export function fallbackTicketTitle(body: string, intent: TicketIntent): string {
  const cleaned = body
    .replace(/@\S+/g, ' ')
    .replace(/#?(bug\s*report|feature\s*request|new\s*ticket)\b|#(bug|feature|ticket)\b|\b(bug|feature|ticket)\s*:/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.\-–—]+/, '')
    .trim()
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned
  const base = (firstSentence || cleaned || intent.category).slice(0, 90).trim()
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * Description for the no-LLM fallback. A trigger message that is just "feature request"
 * carries no content of its own, so lean on what it replies to, else on the recent thread.
 */
export function fallbackTicketDescription(body: string, quotedBody: string | null | undefined, recentThread: string): string {
  const own = body.trim()
  const quoted = quotedBody?.trim()
  if (quoted) return `${own}\n\nReplying to:\n${quoted}`
  const stripped = own.replace(/@\S+/g, ' ').replace(/#?(bug\s*report|feature\s*request|new\s*ticket)\b|#(bug|feature|ticket)\b|\b(bug|feature|ticket)\s*:/gi, ' ').trim()
  if (stripped.length >= 40 || !recentThread.trim() || recentThread.trim() === '(none)') return own
  return `${own}\n\nRecent thread:\n${recentThread.trim()}`
}
