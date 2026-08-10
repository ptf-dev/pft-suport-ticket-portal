// Drives the same endpoints the MCP `create_ticket` tool uses, over HTTPS.
// Run: node --env-file=.env temp/mcp-remote.mjs <command> [jsonArgs]
const BASE = process.env.TICKETING_BASE_URL || 'https://portal.propfirmstech.com'
const KEY = process.env.MCP_API_KEY || process.env.TICKETING_API_KEY
if (!KEY) { console.error('NO_KEY: MCP_API_KEY not found in env'); process.exit(2) }

const H = { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const cmd = process.argv[2]
const body = process.argv[3] ? JSON.parse(process.argv[3]) : null

async function main() {
  if (cmd === 'companies') {
    const r = await fetch(`${BASE}/api/mcp/companies`, { headers: H })
    console.log('HTTP', r.status)
    console.log(await r.text())
  } else if (cmd === 'create') {
    const r = await fetch(`${BASE}/api/mcp/tickets/create`, {
      method: 'POST', headers: H, body: JSON.stringify(body),
    })
    console.log('HTTP', r.status)
    console.log(await r.text())
  } else {
    console.error('unknown command', cmd); process.exit(1)
  }
}
main().catch(e => { console.error('ERR', e.message); process.exit(1) })
