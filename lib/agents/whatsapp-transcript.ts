export interface ThreadMessage {
  senderName: string | null
  senderJid: string
  body: string
  createdAt: Date
  filterReason: string | null
}

/** "4179…@c.us" → "+4179…"; anything non-numeric stays as is. */
export function displayJid(jid: string): string {
  const local = jid.split('@')[0] ?? ''
  return /^\d{6,}$/.test(local) ? `+${local}` : local || 'unknown'
}

function isBotConfirmation(m: ThreadMessage): boolean {
  return m.filterReason === 'bot_echo' && /\/portal\/tickets\//.test(m.body)
}

/** Markdown block of the recent group thread, oldest first, appended under the agent's summary. */
export function formatTranscript(groupName: string, rows: ThreadMessage[], maxChars = 1500): string {
  const lines = rows
    .filter((m) => !isBotConfirmation(m) && m.body.trim() && m.body.trim() !== '(empty)')
    .map((m) => {
      const when = m.createdAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      const who = m.senderName?.trim() || displayJid(m.senderJid)
      const body = m.body.trim().slice(0, maxChars).replace(/\n/g, '\n> ')
      return `> **${who}** · ${when} UTC\n> ${body}`
    })
  if (!lines.length) return ''
  return `\n\n---\n**WhatsApp conversation** — ${groupName}, last ${lines.length} message${lines.length === 1 ? '' : 's'}\n\n${lines.join('\n>\n')}`
}
