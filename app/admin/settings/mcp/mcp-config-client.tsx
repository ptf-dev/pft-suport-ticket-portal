'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { connectCommand, maskKey, KEY_PLACEHOLDER } from '@/lib/mcp/config-display'

interface Props {
  apiKey: string | null
  baseUrl: string
  toolNames: string[]
}

const CARD = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6'

export function McpConfigClient({ apiKey, baseUrl, toolNames }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<'key' | 'command' | null>(null)

  const endpoint = `${baseUrl}/api/mcp`

  if (!apiKey) {
    // No command is rendered at all: one with an empty or placeholder key
    // would look usable and fail with a 401.
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p className="font-semibold">Not configured</p>
        <p>
          The MCP endpoint is disabled because no API key is set. Add{' '}
          <code className="font-mono">MCP_API_KEY</code> as an environment variable in Coolify, then
          redeploy for it to take effect.
        </p>
      </div>
    )
  }

  const copy = async (what: 'key' | 'command', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  const shownKey = revealed ? apiKey : maskKey(apiKey)
  // The replacer must be a function: as a string it is a replacement pattern,
  // so a dollar sequence in the key — MCP_API_KEY is hand-typed in Coolify —
  // would silently rewrite the command instead of being pasted into it.
  const shownCommand = connectCommand(baseUrl).replace(KEY_PLACEHOLDER, () => shownKey)
  const realCommand = () => connectCommand(baseUrl).replace(KEY_PLACEHOLDER, () => apiKey)

  return (
    <>
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
        <span>✅</span> Configured: the MCP endpoint is accepting connections
      </div>

      <div className={`${CARD} space-y-4`}>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{endpoint}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">API key</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-sm text-gray-900 dark:text-white break-all">{shownKey}</code>
            <Button type="button" variant="outline" size="sm" onClick={() => setRevealed(v => !v)}>
              {revealed ? 'Hide' : 'Reveal'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copy('key', apiKey)}>
              {copied === 'key' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Connect Claude Code</h2>
        <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre">
{shownCommand}
        </pre>
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => copy('command', realCommand())}>
            {copied === 'command' ? 'Copied' : 'Copy command'}
          </Button>
        </div>
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tools</h2>
        <div className="flex flex-wrap gap-2">
          {toolNames.map(name => (
            <code
              key={name}
              className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-xs font-mono text-gray-700 dark:text-gray-300"
            >
              {name}
            </code>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Tickets filed this way show as &quot;PFT AI Agent (Bot)&quot;.</p>
        <p>
          The key is admin-wide: it can read and write every company&apos;s tickets. Treat it like a
          password.
        </p>
      </div>
    </>
  )
}
