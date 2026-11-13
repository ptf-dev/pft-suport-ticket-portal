import { requireAdmin } from '@/lib/auth-helpers'
import { TOOLS } from '@/lib/mcp/tools'
import { McpConfigClient } from './mcp-config-client'

// Read env per request: the key is set in Coolify and must never be baked
// into a statically generated page.
export const dynamic = 'force-dynamic'

export default async function McpSettingsPage() {
  await requireAdmin()

  const apiKey = process.env.MCP_API_KEY || null
  const baseUrl = process.env.NEXTAUTH_URL || 'https://portal.propfirmstech.com'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MCP</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Connect Claude to the portal
        </p>
      </div>

      <McpConfigClient
        apiKey={apiKey}
        baseUrl={baseUrl.replace(/\/+$/, '')}
        toolNames={TOOLS.map(t => t.name)}
      />
    </div>
  )
}
