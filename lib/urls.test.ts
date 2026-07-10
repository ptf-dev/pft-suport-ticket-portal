import { describe, it, expect, afterEach } from '@jest/globals'
import { buildFirmBaseUrl } from './urls'

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD } })

describe('buildFirmBaseUrl', () => {
  it('derives firm subdomain from an apex NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = 'https://propfirmstech.com'
    delete process.env.ROOT_DOMAIN
    expect(buildFirmBaseUrl('acme')).toBe('https://acme.propfirmstech.com')
  })

  it('derives firm subdomain when NEXTAUTH_URL is on the admin subdomain', () => {
    process.env.NEXTAUTH_URL = 'https://admin.propfirmstech.com'
    delete process.env.ROOT_DOMAIN
    expect(buildFirmBaseUrl('acme')).toBe('https://acme.propfirmstech.com')
  })

  it('honors an explicit ROOT_DOMAIN override', () => {
    process.env.NEXTAUTH_URL = 'https://portal.example.io'
    process.env.ROOT_DOMAIN = 'example.io'
    expect(buildFirmBaseUrl('acme')).toBe('https://acme.example.io')
  })

  it('falls back to the raw base on localhost (no subdomain routing in dev)', () => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    delete process.env.ROOT_DOMAIN
    expect(buildFirmBaseUrl('acme')).toBe('http://localhost:3000')
  })
})
