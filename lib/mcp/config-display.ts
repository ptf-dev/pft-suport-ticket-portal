/**
 * Pure helpers for the MCP settings page. Deliberately free of JSX and
 * 'use client' so the node-env Jest test can import them without pulling in
 * React.
 */

export const KEY_PLACEHOLDER = '<key>'

const MASK = '•'
// Below this length, showing even a four-character tail would reveal a large
// share of the key, so short keys are masked completely.
const MIN_LENGTH_FOR_TAIL = 12

export function maskKey(key: string): string {
  if (key.length < MIN_LENGTH_FOR_TAIL) return MASK.repeat(Math.max(key.length, 8))
  return MASK.repeat(key.length - 4) + key.slice(-4)
}

/**
 * The command carries a placeholder rather than the key, so the string is safe
 * to build anywhere; the page substitutes the real or masked key at render.
 */
export function connectCommand(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return [
    'claude mcp add --transport http pft-portal \\',
    `  ${base}/api/mcp \\`,
    `  --header "Authorization: Bearer ${KEY_PLACEHOLDER}"`,
  ].join('\n')
}
