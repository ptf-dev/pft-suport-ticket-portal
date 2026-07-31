'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { RefreshCw, Trash2, MessageCircle, QrCode } from 'lucide-react'

interface Company { id: string; name: string }
type AgentMode = 'SUPPORT' | 'HYBRID' | 'FREE_CHAT'

interface MappedGroup {
  id: string
  groupJid: string
  name: string
  enabled: boolean
  autoTicket: boolean
  autoReply: boolean
  mentionOnly: boolean
  agentMode: AgentMode
  notifyOnStatusChange: boolean
  company: { id: string; name: string }
}
interface WaGroup { id: string; name: string; participants: number }
interface SessionInfo { configured: boolean; status: string; qr?: string | null }
interface WebhookRelay {
  id: string
  name: string
  groupJid: string
  secret: string | null
  enabled: boolean
  lastEventAt: string | null
}
interface DmUser {
  id: string
  waJid: string
  displayName: string | null
  companyId: string | null
  enabled: boolean
  agentMode: AgentMode
  autoTicket: boolean
  autoReply: boolean
  lastSeenAt: string | null
  company: { id: string; name: string } | null
}

export function WhatsappGroupsClient({ companies }: { companies: Company[] }) {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [mapped, setMapped] = useState<MappedGroup[]>([])
  const [waGroups, setWaGroups] = useState<WaGroup[]>([])
  const [users, setUsers] = useState<DmUser[]>([])
  const [relays, setRelays] = useState<WebhookRelay[]>([])
  const [newRelayName, setNewRelayName] = useState('')
  const [newRelayGroup, setNewRelayGroup] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<Record<string, string>>({})

  const load = async () => {
    setRefreshing(true)
    const [sessionRes, groupsRes, usersRes, relaysRes] = await Promise.all([
      fetch('/api/admin/whatsapp/session', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/admin/whatsapp/groups', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ mapped: [], waGroups: [] })),
      fetch('/api/admin/whatsapp/users', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ users: [] })),
      fetch('/api/admin/whatsapp/relays', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ relays: [] })),
    ])
    setSession(sessionRes)
    setMapped(groupsRes.mapped ?? [])
    setWaGroups(groupsRes.waGroups ?? [])
    setUsers(usersRes.users ?? [])
    setRelays(relaysRes.relays ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  const createRelay = async () => {
    if (!newRelayName.trim() || !newRelayGroup) return
    await fetch('/api/admin/whatsapp/relays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRelayName.trim(), groupJid: newRelayGroup }),
    })
    setNewRelayName('')
    setNewRelayGroup('')
    load()
  }

  const patchRelay = async (id: string, patch: any) => {
    await fetch(`/api/admin/whatsapp/relays/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    load()
  }

  const removeRelay = async (id: string) => {
    if (!confirm('Delete this webhook relay? External systems posting to its URL will start getting 404s.')) return
    await fetch(`/api/admin/whatsapp/relays/${id}`, { method: 'DELETE' })
    load()
  }

  const patchUser = async (id: string, patch: any) => {
    await fetch(`/api/admin/whatsapp/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    load()
  }

  const removeUser = async (id: string) => {
    if (!confirm('Delete this DM user record? Bot will treat future messages as new.')) return
    await fetch(`/api/admin/whatsapp/users/${id}`, { method: 'DELETE' })
    load()
  }

  useEffect(() => { load() }, [])

  // The QR only stays valid for a few seconds at a time and the pairing window
  // itself closes after ~a minute — poll while it's open so the code on screen
  // is always the live one, and so a successful scan flips to WORKING on its own.
  useEffect(() => {
    if (session?.status !== 'SCAN_QR_CODE') return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [session?.status])

  const reconnect = async () => {
    setReconnecting(true)
    setPairingCode(null)
    try {
      const res = await fetch('/api/admin/whatsapp/session/reconnect', {
        method: 'POST',
      }).then((r) => r.json()).catch(() => null)
      if (res?.pairingCode) setPairingCode(res.pairingCode)
      if (res?.qr) setSession((prev) => (prev ? { ...prev, status: res.status, qr: res.qr } : prev))
    } finally {
      setReconnecting(false)
      load()
    }
  }

  const mappedJids = new Set(mapped.map((g) => g.groupJid))
  const unmapped = waGroups.filter((g) => !mappedJids.has(g.id))

  const mapGroup = async (waGroup: WaGroup) => {
    const companyId = selectedCompanies[waGroup.id]
    if (!companyId) return
    await fetch('/api/admin/whatsapp/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupJid: waGroup.id, name: waGroup.name, companyId }),
    })
    setSelectedCompanies((prev) => { const n = { ...prev }; delete n[waGroup.id]; return n })
    load()
  }

  const patch = async (id: string, patch: Partial<MappedGroup>) => {
    await fetch(`/api/admin/whatsapp/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Unmap this group?')) return
    await fetch(`/api/admin/whatsapp/groups/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <p className="text-sm text-ink-mute">Loading…</p>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5" />WhatsApp session</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
            {session?.configured && session.status !== 'WORKING' && (
              <Button size="sm" onClick={reconnect} disabled={reconnecting} className="gap-2">
                <QrCode className={`w-4 h-4 ${reconnecting ? 'animate-pulse' : ''}`} />
                {reconnecting ? 'Opening…' : 'Reconnect'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!session?.configured && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 text-sm text-amber-800 dark:text-amber-200">
              WAHA_URL / WAHA_API_KEY not configured. Add env vars and redeploy.
            </div>
          )}
          {session?.configured && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={session.status === 'WORKING' ? 'success' : session.status === 'SCAN_QR_CODE' ? 'warning' : 'secondary'}>
                  {session.status}
                </Badge>
                {session.status === 'SCAN_QR_CODE' && (
                  <span className="text-xs text-ink-mute">Pairing window open — auto-refreshing</span>
                )}
              </div>

              {session.status !== 'WORKING' && session.status !== 'SCAN_QR_CODE' && (
                <p className="text-sm text-ink-mute">
                  Not connected. Hit <strong>Reconnect</strong> to open a pairing window, then scan the QR (or use the
                  pairing code) within about a minute. Group mappings and settings below are stored here and are not
                  affected by reconnecting.
                </p>
              )}

              {session.status === 'SCAN_QR_CODE' && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center gap-2">
                  {session.qr ? (
                    <>
                      <QrCode className="w-4 h-4 text-ink-mute" />
                      <p className="text-sm text-ink-mute">WhatsApp → Linked devices → Link a device → scan</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={session.qr} alt="QR code" className="w-64 h-64" />
                    </>
                  ) : (
                    <p className="text-sm text-ink-mute">Waiting for QR…</p>
                  )}
                  {pairingCode && (
                    <p className="text-sm">
                      Or &quot;Link with phone number instead&quot; and enter:{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 font-mono">{pairingCode}</code>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mapped groups ({mapped.length})</CardTitle></CardHeader>
        <CardContent>
          {mapped.length === 0 ? (
            <p className="text-sm text-ink-mute">No groups mapped yet.</p>
          ) : (
            <div className="space-y-3">
              {mapped.map((g) => (
                <div key={g.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{g.name}</div>
                      <div className="text-xs text-ink-mute font-mono truncate">{g.groupJid.replace('@g.us', '')}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove(g.id)} className="text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <label className="flex flex-col text-xs text-ink-mute gap-1 md:w-64">
                      <span>Company</span>
                      <Select
                        value={g.company.id}
                        onChange={(e) => patch(g.id, { companyId: e.target.value } as any)}
                        className="text-sm"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col text-xs text-ink-mute gap-1 md:w-48" title="Informational — the bot currently always runs strict, mention-gated support behavior regardless of mode.">
                      <span>Mode</span>
                      <Select
                        value={g.agentMode}
                        onChange={(e) => patch(g.id, { agentMode: e.target.value as AgentMode } as any)}
                        className="text-sm"
                      >
                        <option value="SUPPORT">Support (strict)</option>
                        <option value="HYBRID">Hybrid (default)</option>
                        <option value="FREE_CHAT">Free chat (no tickets)</option>
                      </Select>
                    </label>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={g.enabled} onChange={(e) => patch(g.id, { enabled: e.target.checked })} />
                        <span>Enabled</span>
                      </label>
                      <label className="flex items-center gap-2" title="Off = the bot does nothing at all when tagged in this group. The bot never chats, only creates/comments on tickets.">
                        <input type="checkbox" checked={g.autoTicket} onChange={(e) => patch(g.id, { autoTicket: e.target.checked })} />
                        <span>Auto-ticket</span>
                      </label>
                      <label className="flex items-center gap-2" title="Inert for message content — the bot has no chat replies to gate. Only affects whether the WhatsApp typing indicator shows.">
                        <input type="checkbox" checked={g.autoReply} onChange={(e) => patch(g.id, { autoReply: e.target.checked })} />
                        <span>Auto-reply</span>
                      </label>
                      <label className="flex items-center gap-2" title="Informational — the bot now only ever acts when @-mentioned, in every group.">
                        <input type="checkbox" checked={g.mentionOnly} onChange={(e) => patch(g.id, { mentionOnly: e.target.checked })} />
                        <span>Mention-only</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={g.notifyOnStatusChange} onChange={(e) => patch(g.id, { notifyOnStatusChange: e.target.checked })} />
                        <span>Notify on status change</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Available WhatsApp groups ({unmapped.length})</CardTitle></CardHeader>
        <CardContent>
          {session?.status !== 'WORKING' ? (
            <p className="text-sm text-ink-mute">Groups list becomes available once the session is WORKING.</p>
          ) : unmapped.length === 0 ? (
            <p className="text-sm text-ink-mute">All discovered groups are already mapped.</p>
          ) : (
            <div className="space-y-3">
              {unmapped.map((g) => (
                <div key={g.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{g.name || '(no name)'}</div>
                    <div className="text-xs text-ink-mute font-mono truncate">
                      {g.id.replace('@g.us', '')} · {g.participants} members
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={selectedCompanies[g.id] ?? ''}
                      onChange={(e) => setSelectedCompanies((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      className="text-sm w-full md:w-56"
                    >
                      <option value="">Select company…</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                    <Button size="sm" onClick={() => mapGroup(g)} disabled={!selectedCompanies[g.id]}>Map</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Direct-message users ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-ink-mute mb-3">The bot is silent in DMs — private messages are logged here but never auto-answered. The toggles below only affect outbound ticket notifications and record-keeping.</p>
          {users.length === 0 ? (
            <p className="text-sm text-ink-mute">No one has DM&apos;d the bot yet. When they do, they&apos;ll appear here.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{u.displayName || '(unknown name)'}</div>
                      <div className="text-xs text-ink-mute font-mono truncate">
                        {u.waJid.replace(/@(c\.us|s\.whatsapp\.net)$/, '')}
                        {u.lastSeenAt ? ` · last seen ${new Date(u.lastSeenAt).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeUser(u.id)} className="text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <label className="flex flex-col text-xs text-ink-mute gap-1 md:w-64">
                      <span>Company (empty = free chat)</span>
                      <Select
                        value={u.companyId ?? ''}
                        onChange={(e) => patchUser(u.id, { companyId: e.target.value || null })}
                        className="text-sm"
                      >
                        <option value="">— Free chat, no support —</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col text-xs text-ink-mute gap-1 md:w-48">
                      <span>Mode</span>
                      <Select
                        value={u.agentMode}
                        onChange={(e) => patchUser(u.id, { agentMode: e.target.value })}
                        className="text-sm"
                      >
                        <option value="SUPPORT">Support (strict)</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="FREE_CHAT">Free chat (no tickets)</option>
                      </Select>
                    </label>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={u.enabled} onChange={(e) => patchUser(u.id, { enabled: e.target.checked })} />
                        <span>Enabled</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={u.autoTicket} onChange={(e) => patchUser(u.id, { autoTicket: e.target.checked })} />
                        <span>Auto-ticket</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={u.autoReply} onChange={(e) => patchUser(u.id, { autoReply: e.target.checked })} />
                        <span>Auto-reply</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Webhook relays ({relays.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-mute">
            Give an external dashboard (sales webhooks, CRM, payments) a relay URL and it&apos;ll post its events here —
            each event is forwarded as a message to the WhatsApp group you pick. Set the relay&apos;s secret as the
            HMAC-SHA256 signing secret on the sender (sent as <code>X-Webhook-Signature</code>).
          </p>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={newRelayName}
              onChange={(e) => setNewRelayName(e.target.value)}
              placeholder="Relay name (e.g. ForRealFunding sales)"
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
            <Select value={newRelayGroup} onChange={(e) => setNewRelayGroup(e.target.value)} className="text-sm md:w-72">
              <option value="">Target group…</option>
              {mapped.map((g) => (
                <option key={g.groupJid} value={g.groupJid}>{g.name}</option>
              ))}
            </Select>
            <Button size="sm" onClick={createRelay} disabled={!newRelayName.trim() || !newRelayGroup}>Create relay</Button>
          </div>

          {relays.length > 0 && (
            <div className="space-y-3">
              {relays.map((r) => (
                <div key={r.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="text-xs text-ink-mute truncate">
                        {r.lastEventAt ? `Last event ${new Date(r.lastEventAt).toLocaleString()}` : 'No events received yet'}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeRelay(r.id)} className="text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-mute w-20 shrink-0">Webhook URL</span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 truncate flex-1">
                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/relay/${r.id}`}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/relay/${r.id}`)}>Copy</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-mute w-20 shrink-0">Secret</span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 truncate flex-1">{r.secret ?? '(none)'}</code>
                      {r.secret && (
                        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(r.secret!)}>Copy</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => { if (confirm('Rotate secret? The sender must be updated with the new one.')) patchRelay(r.id, { rotateSecret: true }) }}>Rotate</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex flex-col text-xs text-ink-mute gap-1 md:w-72">
                        <span>Target group</span>
                        <Select value={r.groupJid} onChange={(e) => patchRelay(r.id, { groupJid: e.target.value })} className="text-sm">
                          {!mapped.some((g) => g.groupJid === r.groupJid) && (
                            <option value={r.groupJid}>{r.groupJid}</option>
                          )}
                          {mapped.map((g) => (
                            <option key={g.groupJid} value={g.groupJid}>{g.name}</option>
                          ))}
                        </Select>
                      </label>
                      <label className="flex items-center gap-2 mt-4">
                        <input type="checkbox" checked={r.enabled} onChange={(e) => patchRelay(r.id, { enabled: e.target.checked })} />
                        <span>Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
