export interface TicketIntent {
  /** How the reporter tagged it, for the confirmation text. */
  label: string
  category: string
}

const INTENTS: { pattern: RegExp; label: string; category: string }[] = [
  { pattern: /\bbug\s*report\b|#bug\b|\bbug\s*:/i, label: 'bug report', category: 'Bug Report' },
  { pattern: /\bfeature\s*request\b|#feature\b|\bfeature\s*:/i, label: 'feature request', category: 'Feature Request' },
  {
    // "new ticket", "#ticket", "ticket:", "ticket pls", "create/open/make/log/raise … a ticket", "summarise … ticket"
    pattern: /\bnew\s*ticket\b|#ticket\b|\bticket\s*:|\bticket\s*(pls|please|now)\b|\b(create|open|make|log|raise|file|add|start|generate)\b[\s\w,'-]{0,40}?\btickets?\b|\bsummari[sz]e\b[\s\S]{0,80}\bticket\b|\bticket\b[\s\S]{0,80}\bsummari[sz]e\b/i,
    label: 'ticket',
    category: 'Other',
  },
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
  // "pls summarise above chat and create a ticket" names no issue — title it after the thread instead.
  const meta = cleaned
    .replace(/\b(pls|please|can you|could you|summari[sz]e|create|open|make|log|raise|file|add|start|generate|above|previous|the|this|that|chat|thread|conversation|messages?|exchange|and|a|an|of|it|into|from|for|us|me|now)\b/gi, ' ')
    .replace(/\btickets?\b/gi, ' ')
    .replace(/[^\w]+/g, ' ')
    .trim()
  if (meta.length < 12) return `${intent.category === 'Other' ? 'Request' : intent.category} from WhatsApp thread`
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
