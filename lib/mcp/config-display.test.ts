import { connectCommand, maskKey } from './config-display'

describe('config-display', () => {
  it('masks all but the last four characters', () => {
    expect(maskKey('abcdefghijklmnop')).toBe('••••••••••••mnop')
  })

  it('masks a short key without revealing it', () => {
    expect(maskKey('abc')).not.toContain('abc')
    expect(maskKey('abcdefgh')).not.toContain('efgh')
  })

  it('builds a connect command carrying no key', () => {
    const cmd = connectCommand('https://portal.propfirmstech.com')
    expect(cmd).toContain('claude mcp add --transport http')
    expect(cmd).toContain('https://portal.propfirmstech.com/api/mcp')
    expect(cmd).toContain('Authorization: Bearer')
  })

  it('tolerates a trailing slash on the base URL', () => {
    expect(connectCommand('https://x.test/')).toContain('https://x.test/api/mcp')
  })
})
