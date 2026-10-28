import { explicitTicketIntent, fallbackTicketTitle, fallbackTicketDescription } from './ticket-intent'

describe('explicitTicketIntent', () => {
  it('recognises the trigger words in any position and case', () => {
    expect(explicitTicketIntent('@Bob Feature request: add a status filter')?.category).toBe('Feature Request')
    expect(explicitTicketIntent('BUG REPORT - payout page crashes')?.category).toBe('Bug Report')
    expect(explicitTicketIntent('can you log this as a new ticket please')?.category).toBe('Other')
    expect(explicitTicketIntent('#feature dark mode for the trader dashboard')?.category).toBe('Feature Request')
    expect(explicitTicketIntent('bug: login loops')?.category).toBe('Bug Report')
    expect(explicitTicketIntent('@Bob pls summarise above chat and create a ticket')?.category).toBe('Other')
    expect(explicitTicketIntent('ticket pls')?.category).toBe('Other')
    expect(explicitTicketIntent('@Bob can you open a ticket for the sales overview totals')?.category).toBe('Other')
  })

  it('ignores plain conversation', () => {
    expect(explicitTicketIntent('@Bob any update on the payout?')).toBeNull()
    expect(explicitTicketIntent('the feature works now, thanks')).toBeNull()
    expect(explicitTicketIntent('that bug is gone')).toBeNull()
  })

  it('prefers bug over feature when both words appear', () => {
    expect(explicitTicketIntent('bug report in the feature request form')?.category).toBe('Bug Report')
  })
})

describe('fallbackTicketTitle', () => {
  const feature = { label: 'feature request', category: 'Feature Request' }

  it('drops the mention and trigger words and keeps the first sentence', () => {
    expect(fallbackTicketTitle('@4915551234 Feature request: add a status filter to the accounts list. We scroll a lot.', feature))
      .toBe('Add a status filter to the accounts list.')
  })

  it('caps very long messages', () => {
    const title = fallbackTicketTitle('bug report ' + 'x'.repeat(300), { label: 'bug report', category: 'Bug Report' })
    expect(title.length).toBeLessThanOrEqual(90)
  })

  it('names meta requests after the thread instead of echoing them', () => {
    expect(fallbackTicketTitle('@Bob pls summarise above chat and create a ticket', { label: 'ticket', category: 'Other' }))
      .toBe('Request from WhatsApp thread')
    expect(fallbackTicketTitle('@Bob #ticket', { label: 'ticket', category: 'Other' })).toBe('Request from WhatsApp thread')
    expect(fallbackTicketTitle('@Bob feature request, the one above', feature)).toBe('Feature Request from WhatsApp thread')
  })
})

describe('fallbackTicketDescription', () => {
  const thread = '- Nicola: we need a Reports tab\n- Bob: walk me through it'

  it('uses the quoted message when the trigger replies to one', () => {
    expect(fallbackTicketDescription('@Bob feature request', 'Add a Reports tab with registrations and purchases', thread))
      .toBe('@Bob feature request\n\nReplying to:\nAdd a Reports tab with registrations and purchases')
  })

  it('falls back to the recent thread when the trigger message is only the tag', () => {
    expect(fallbackTicketDescription('@Bob feature request based on the chat', null, thread))
      .toBe('@Bob feature request based on the chat\n\nRecent thread:\n' + thread)
  })

  it('keeps a self-contained message as is', () => {
    const msg = '@Bob feature request: add a status filter to the accounts list so we stop scrolling'
    expect(fallbackTicketDescription(msg, null, thread)).toBe(msg)
  })
})
