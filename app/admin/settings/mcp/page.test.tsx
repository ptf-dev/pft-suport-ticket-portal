import React from 'react'
import { requireAdmin } from '@/lib/auth-helpers'
import { TOOLS } from '@/lib/mcp/tools'
import McpSettingsPage from './page'
import { McpConfigClient } from './mcp-config-client'

jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: jest.fn() }))
// tools.ts imports the ticket operations, which reach for Prisma.
jest.mock('@/lib/mcp/operations', () => ({}))

// Same classic-runtime reason as in mcp-config-client.test.tsx.
;(globalThis as any).React = React

const mockedRequireAdmin = requireAdmin as jest.Mock
const ENV = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  mockedRequireAdmin.mockResolvedValue(undefined)
  process.env = { ...ENV }
})
afterAll(() => {
  process.env = ENV
})

// The page returns a React element tree without rendering it, so its props can
// be read directly: find the McpConfigClient element and return them.
function clientProps(node: any): any {
  if (!node || typeof node !== 'object') return undefined
  if (node.type === McpConfigClient) return node.props
  const kids = node.props?.children
  for (const k of Array.isArray(kids) ? kids : [kids]) {
    const found = clientProps(k)
    if (found) return found
  }
  return undefined
}

describe('McpSettingsPage', () => {
  it('calls requireAdmin before anything is read', async () => {
    process.env.MCP_API_KEY = 'k'.repeat(20)
    await McpSettingsPage()
    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1)
  })

  it('exposes nothing when requireAdmin rejects', async () => {
    process.env.MCP_API_KEY = 'k'.repeat(20)
    mockedRequireAdmin.mockRejectedValue(new Error('redirect'))
    await expect(McpSettingsPage()).rejects.toThrow('redirect')
  })

  it('takes tool names from TOOLS, not a copy', async () => {
    const props = clientProps(await McpSettingsPage())
    expect(props.toolNames).toEqual(TOOLS.map((t) => t.name))
  })

  it('passes a null key when MCP_API_KEY is unset or empty', async () => {
    delete process.env.MCP_API_KEY
    expect(clientProps(await McpSettingsPage()).apiKey).toBeNull()
    process.env.MCP_API_KEY = ''
    expect(clientProps(await McpSettingsPage()).apiKey).toBeNull()
  })

  it('derives the base URL from NEXTAUTH_URL, falling back to production', async () => {
    process.env.NEXTAUTH_URL = 'https://staging.test/'
    expect(clientProps(await McpSettingsPage()).baseUrl).toBe('https://staging.test')
    delete process.env.NEXTAUTH_URL
    expect(clientProps(await McpSettingsPage()).baseUrl).toBe('https://portal.propfirmstech.com')
  })
})
