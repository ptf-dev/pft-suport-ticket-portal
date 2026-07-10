/**
 * Build the base URL for a firm's own subdomain (e.g. https://acme.propfirmstech.com).
 *
 * Used for invite links so the new user's first login lands on their firm's
 * subdomain and is therefore tenant-scoped (see middleware tenant resolution).
 *
 * Root domain resolution: ROOT_DOMAIN env wins; otherwise the last two labels
 * of the NEXTAUTH_URL host. On localhost/IP there is no subdomain routing, so
 * we return the raw base URL unchanged (dev).
 */
export function buildFirmBaseUrl(subdomain: string): string {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = new URL(base)
  const host = url.hostname
  const isLocal = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)
  if (isLocal) return base.replace(/\/$/, '')

  const root = process.env.ROOT_DOMAIN || host.split('.').slice(-2).join('.')
  const portPart = url.port ? `:${url.port}` : ''
  return `${url.protocol}//${subdomain}.${root}${portPart}`
}
