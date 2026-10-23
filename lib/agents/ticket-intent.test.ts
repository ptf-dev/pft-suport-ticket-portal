import { explicitTicketIntent, fallbackTicketTitle } from './ticket-intent'

describe('explicitTicketIntent', () => {
  it('recognises the trigger words in any position and case', () => {
    expect(explicitTicketIntent('@Bob Feature request: add a status filter')?.category).toBe('Feature Request')
    expect(explicitTicketIntent('BUG REPORT - payout page crashes')?.category).toBe('Bug Report')
    expect(explicitTicketIntent('can you log this as a new ticket please')?.category).toBe('Other')
    expect(explicitTicketIntent('#feature dark mode for the trader dashboard')?.category).toBe('Feature Request')
    expect(explicitTicketIntent('bug: login loops')?.category).toBe('Bug Report')
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

  it('falls back to the category when nothing is left', () => {
    expect(fallbackTicketTitle('@Bob #ticket', { label: 'ticket', category: 'Other' })).toBe('Other')
  })
})
