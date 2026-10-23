import { displayJid, formatTranscript, type ThreadMessage } from './whatsapp-transcript'

const at = (iso: string) => new Date(iso)
const rows: ThreadMessage[] = [
  { senderName: 'Nicola Berardi', senderJid: '41798651901@c.us', body: 'we need a Reports tab', createdAt: at('2026-10-23T14:29:00Z'), filterReason: 'mention_only_skip' },
  { senderName: null, senderJid: '41798651901@c.us', body: 'because at this stage we have no CSV', createdAt: at('2026-10-23T14:31:00Z'), filterReason: 'mention_only_skip' },
  { senderName: 'Bob', senderJid: '4915551234@c.us', body: 'Got it, opened a feature request. (TCR-206)\nhttps://portal.propfirmstech.com/portal/tickets/abc', createdAt: at('2026-10-23T14:45:00Z'), filterReason: 'bot_echo' },
  { senderName: 'Bob', senderJid: '4915551234@c.us', body: '(empty)', createdAt: at('2026-10-23T14:46:00Z'), filterReason: 'body_too_short' },
]

describe('displayJid', () => {
  it('turns a phone jid into a number and leaves names alone', () => {
    expect(displayJid('41798651901@c.us')).toBe('+41798651901')
    expect(displayJid('someone@lid')).toBe('someone')
    expect(displayJid('')).toBe('unknown')
  })
})

describe('formatTranscript', () => {
  it('renders sender, time and body as a quoted markdown block, skipping bot confirmations and empties', () => {
    const out = formatTranscript('TradingCult x PFT', rows)
    expect(out).toContain('**WhatsApp conversation** — TradingCult x PFT, last 2 messages')
    expect(out).toContain('> **Nicola Berardi** · 23 Oct, 14:29 UTC\n> we need a Reports tab')
    expect(out).toContain('> **+41798651901** · 23 Oct, 14:31 UTC')
    expect(out).not.toContain('TCR-206')
    expect(out).not.toContain('(empty)')
  })

  it('returns nothing when there is nothing worth showing', () => {
    expect(formatTranscript('g', [rows[2], rows[3]])).toBe('')
  })

  it('keeps multi-line bodies inside the quote', () => {
    const out = formatTranscript('g', [{ ...rows[0], body: 'line one\nline two' }])
    expect(out).toContain('> line one\n> line two')
  })
})
