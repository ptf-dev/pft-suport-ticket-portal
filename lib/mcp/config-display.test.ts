import { KEY_PLACEHOLDER, connectCommand, maskKey } from './config-display'

const key = (n: number) => 'abcdefghijklmnopqrstuvwxyz'.repeat(3).slice(0, n)
const dots = (s: string) => s.split('').filter((c) => c === '•').length

describe('maskKey', () => {
  it('masks all but the last four characters', () => {
    expect(maskKey('abcdefghijklmnop')).toBe('••••••••••••mnop')
  })

  it('masks a short key without revealing it', () => {
    expect(maskKey('abc')).not.toContain('abc')
    expect(maskKey('abcdefgh')).not.toContain('efgh')
  })

  it('never discloses the length of a key under 8 characters', () => {
    expect(maskKey(key(0))).toBe(maskKey(key(7)))
    expect(maskKey(key(1))).toBe(maskKey(key(5)))
  })

  it('returns a mask, not an empty string, for an empty key', () => {
    expect(maskKey('')).not.toBe('')
    expect(dots(maskKey(''))).toBe(8)
  })

  it.each([8, 11, 12, 13, 15])('fully masks a %i-character key', (n) => {
    const masked = maskKey(key(n))
    expect(masked).toBe('•'.repeat(masked.length))
    expect(masked).not.toContain(key(n).slice(-4))
  })

  it('reveals only the last four characters from 16 characters up', () => {
    const k16 = key(16)
    expect(maskKey(k16)).toBe('•'.repeat(12) + k16.slice(-4))
    const k17 = key(17)
    expect(maskKey(k17)).toBe('•'.repeat(13) + k17.slice(-4))
  })

  it('hides the middle of a long key', () => {
    const k = 'SECRETMIDDLE' + 'x'.repeat(40) + 'tail'
    const masked = maskKey(k)
    expect(masked).not.toContain('SECRET')
    expect(masked).not.toContain('xxxx')
    expect(masked.endsWith('tail')).toBe(true)
    expect(masked).toHaveLength(k.length)
  })
})

describe('connectCommand', () => {
  it('builds a connect command carrying no key', () => {
    const cmd = connectCommand('https://portal.propfirmstech.com')
    expect(cmd).toContain('claude mcp add --transport http')
    expect(cmd).toContain('https://portal.propfirmstech.com/api/mcp')
    expect(cmd).toContain('Authorization: Bearer')
  })

  it('tolerates a trailing slash on the base URL', () => {
    expect(connectCommand('https://x.test/')).toContain('https://x.test/api/mcp')
    expect(connectCommand('https://x.test//')).not.toContain('//api')
  })

  it('carries exactly one placeholder, which substitution replaces', () => {
    const cmd = connectCommand('https://x.test')
    expect(cmd.split(KEY_PLACEHOLDER)).toHaveLength(2)
    const filled = cmd.replace(KEY_PLACEHOLDER, 'REALKEY')
    expect(filled).toContain('Bearer REALKEY"')
    expect(filled).not.toContain(KEY_PLACEHOLDER)
  })
})
