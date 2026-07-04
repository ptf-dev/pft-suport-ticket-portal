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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCompanies, setSelectedCompanies] = useState<Record<string, string>>({})

  const load = async () => {
    setRefreshing(true)
    const [sessionRes, groupsRes, usersRes] = await Promise.all([
      fetch('/api/admin/whatsapp/session', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/admin/whatsapp/groups', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ mapped: [], waGroups: [] })),
      fetch('/api/admin/whatsapp/users', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ users: [] })),
    ])
    setSession(sessionRes)
    setMapped(groupsRes.mapped ?? [])
    setWaGroups(groupsRes.waGroups ?? [])
    setUsers(usersRes.users ?? [])
    setLoading(false)
    setRefreshing(false)
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
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
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
              </div>
              {session.status === 'SCAN_QR_CODE' && session.qr && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center gap-2">
                  <QrCode className="w-4 h-4 text-ink-mute" />
                  <p className="text-sm text-ink-mute">Scan with WhatsApp → Linked devices</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={session.qr} alt="QR code" className="w-64 h-64" />
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
                    <label className="flex flex-col text-xs text-ink-mute gap-1 md:w-48" title="SUPPORT = strict tickets. HYBRID = support + chat. FREE_CHAT = casual companion, no tickets.">
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
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={g.autoTicket} onChange={(e) => patch(g.id, { autoTicket: e.target.checked })} />
                        <span>Auto-ticket</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={g.autoReply} onChange={(e) => patch(g.id, { autoReply: e.target.checked })} />
                        <span>Auto-reply</span>
                      </label>
                      <label className="flex items-center gap-2" title="Bot only fires when @-mentioned. Recommended.">
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
          {users.length === 0 ? (
            <p className="text-sm text-ink-mute">No one has DM&apos;d the bot yet. When they do, they&apos;ll appear here — leave unmapped for free chat, or assign a company to route as single-person support.</p>
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
    </div>
  )
}
