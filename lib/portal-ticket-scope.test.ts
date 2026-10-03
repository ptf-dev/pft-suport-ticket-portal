import { isReportedByMe, reporterHref } from './portal-ticket-scope'

describe('isReportedByMe', () => {
  it('is on only for reporter=me', () => {
    expect(isReportedByMe({ reporter: 'me' })).toBe(true)
    expect(isReportedByMe({})).toBe(false)
    expect(isReportedByMe({ reporter: 'someone-else' })).toBe(false)
    expect(isReportedByMe({ reporter: ['me', 'me'] })).toBe(false)
  })
})

describe('reporterHref', () => {
  it('adds the reporter scope to a bare path', () => {
    expect(reporterHref('/portal/tickets', {}, true)).toBe('/portal/tickets?reporter=me')
  })

  it('returns the bare path when clearing the only param', () => {
    expect(reporterHref('/portal/tickets', { reporter: 'me' }, false)).toBe('/portal/tickets')
  })

  it('keeps view, search and sort when switching scope', () => {
    const current = { view: 'table', search: 'payout delay', sort: 'priority', order: 'asc' }
    expect(reporterHref('/portal/tickets', current, true)).toBe(
      '/portal/tickets?view=table&search=payout+delay&sort=priority&order=asc&reporter=me',
    )
    expect(reporterHref('/portal/tickets', { ...current, reporter: 'me' }, false)).toBe(
      '/portal/tickets?view=table&search=payout+delay&sort=priority&order=asc',
    )
  })

  it('resets pagination because the result set changes', () => {
    expect(reporterHref('/portal/tickets', { view: 'table', page: '4' }, true)).toBe(
      '/portal/tickets?view=table&reporter=me',
    )
  })

  it('ignores empty and repeated params', () => {
    expect(reporterHref('/portal', { search: '', sort: ['title', 'status'] }, true)).toBe('/portal?reporter=me')
  })
})
