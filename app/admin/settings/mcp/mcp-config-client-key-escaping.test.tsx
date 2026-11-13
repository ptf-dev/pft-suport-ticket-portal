import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { maskKey } from '@/lib/mcp/config-display'
import { McpConfigClient } from './mcp-config-client'

// Jest compiles JSX with the classic runtime, which expects React in scope.
;(globalThis as any).React = React

// The copied command is only reachable through the copy button's handler, and
// a server render never fires one. Stubbing Button captures each onClick so a
// test can call it; the state updates that follow are no-ops in the server
// renderer, which is all this needs.
const mockClicks: Array<((...args: any[]) => any) | undefined> = []
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => {
    mockClicks.push(onClick)
    return require('react').createElement('button', { type: 'button' }, children)
  },
}))

// A key an admin could plausibly type into Coolify. Every one of these dollar
// sequences is a String.replace replacement pattern: `$&` expands to the match
// (`<key>`), `` $` `` to everything before it, so a string replacement would
// rewrite the command rather than paste the key into it. Only the last four
// characters survive masking, which is why they carry a sequence too.
const KEY = 'abcdefghijkl$&$`$1'
const BASE_URL = 'https://x.test'

const written: string[] = []

beforeEach(() => {
  mockClicks.length = 0
  written.length = 0
  jest.useFakeTimers() // copy() leaves a 2s reset timer behind
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {
      clipboard: {
        writeText: (text: string) => {
          written.push(text)
          return Promise.resolve()
        },
      },
    },
  })
})

afterEach(() => {
  jest.useRealTimers()
})

const render = () =>
  renderToStaticMarkup(
    <McpConfigClient apiKey={KEY} baseUrl={BASE_URL} toolNames={['list_tickets']} />,
  )

describe('a key containing dollar sequences', () => {
  it('is pasted literally into the masked command', () => {
    const html = render()

    expect(html).toContain(`Bearer ${maskKey(KEY)}`)
    // `` $` `` would have expanded to the command prefix, duplicating it.
    expect(html.match(/claude mcp add/g)).toHaveLength(1)
    expect(html).not.toContain('&lt;key&gt;')
  })

  it('is pasted literally into the copied command', async () => {
    render()

    // Reveal, Copy (key), Copy command — the command is the last of the three.
    const copyCommand = mockClicks[mockClicks.length - 1]!
    await copyCommand()

    expect(written).toHaveLength(1)
    expect(written[0]).toContain(`Bearer ${KEY}"`)
    expect(written[0]).not.toContain('<key>')
    expect(written[0].match(/claude mcp add/g)).toHaveLength(1)
  })

  it('copies the key itself unchanged', async () => {
    render()

    await mockClicks[1]!()

    expect(written).toEqual([KEY])
  })
})
