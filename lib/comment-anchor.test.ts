import { commentAnchorId, commentLink, parseCommentHash } from './comment-anchor'

describe('commentAnchorId', () => {
  it('prefixes the comment id', () => {
    expect(commentAnchorId('cmv123')).toBe('comment-cmv123')
  })
})

describe('parseCommentHash', () => {
  it('accepts a comment fragment with or without the leading #', () => {
    expect(parseCommentHash('#comment-cmv123')).toBe('comment-cmv123')
    expect(parseCommentHash('comment-cmv123')).toBe('comment-cmv123')
  })

  it('ignores other fragments, empty ones and a bare prefix', () => {
    expect(parseCommentHash('')).toBeNull()
    expect(parseCommentHash('#')).toBeNull()
    expect(parseCommentHash('#description')).toBeNull()
    expect(parseCommentHash('#comment-')).toBeNull()
  })

  it('does not throw on malformed percent-encoding', () => {
    expect(parseCommentHash('#comment-%E0%A4%A')).toBeNull()
  })
})

describe('commentLink', () => {
  it('adds the anchor to the current page and keeps path and query', () => {
    expect(commentLink('https://portal.propfirmstech.com/portal/tickets/t1', 'c9'))
      .toBe('https://portal.propfirmstech.com/portal/tickets/t1#comment-c9')
    expect(commentLink('https://portal.propfirmstech.com/admin/tickets/t1?tab=x', 'c9'))
      .toBe('https://portal.propfirmstech.com/admin/tickets/t1?tab=x#comment-c9')
  })

  it('replaces an anchor that is already there', () => {
    expect(commentLink('https://portal.propfirmstech.com/portal/tickets/t1#comment-old', 'new'))
      .toBe('https://portal.propfirmstech.com/portal/tickets/t1#comment-new')
  })
})
