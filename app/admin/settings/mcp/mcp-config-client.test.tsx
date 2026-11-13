import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { McpConfigClient } from './mcp-config-client'

// Jest compiles JSX with the classic runtime, which expects React in scope;
// the component itself relies on Next's automatic runtime.
;(globalThis as any).React = React

// Server-rendering the initial state needs no DOM and no testing library, and
// the initial state is what matters here: it is what an admin sees before
// clicking anything.
const render = (apiKey: string | null) =>
  renderToStaticMarkup(
    <McpConfigClient apiKey={apiKey} baseUrl="https://x.test" toolNames={['list_tickets', 'set_status']} />,
  )

describe('McpConfigClient', () => {
  describe('with no key configured', () => {
    it('explains where to set it and that a redeploy is needed', () => {
      const html = render(null)
      expect(html).toContain('Not configured')
      expect(html).toContain('MCP_API_KEY')
      expect(html).toContain('Coolify')
      expect(html).toContain('redeploy')
    })

    it.each(['null', ''])('renders no command or bearer header (key %p)', (k) => {
      const html = render(k === '' ? '' : null)
      expect(html).not.toContain('claude mcp add')
      expect(html).not.toContain('Bearer')
      expect(html).not.toContain('Reveal')
      expect(html).not.toContain('Copy')
    })
  })

  describe('with a key configured', () => {
    const KEY = 'SECRETMIDDLE-0123456789-wxyz'

    it('does not contain the key in the initial markup, only its masked form', () => {
      const html = render(KEY)
      expect(html).not.toContain(KEY)
      expect(html).not.toContain('SECRETMIDDLE')
      expect(html).toContain('wxyz')
      expect(html).toContain('Reveal')
    })

    it('shows the command, the endpoint, the tool names and both warnings', () => {
      const html = render(KEY)
      expect(html).toContain('claude mcp add --transport http')
      expect(html).toContain('https://x.test/api/mcp')
      expect(html).toContain('list_tickets')
      expect(html).toContain('set_status')
      expect(html).toContain('admin-wide')
      expect(html).toContain('PFT AI Agent (Bot)')
      expect(html).not.toContain('&lt;key&gt;')
    })
  })
})
