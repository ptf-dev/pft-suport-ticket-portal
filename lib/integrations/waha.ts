import { createHmac, timingSafeEqual } from 'crypto'

const WAHA_URL = process.env.WAHA_URL?.trim()
const WAHA_API_KEY = process.env.WAHA_API_KEY?.trim()
const WAHA_WEBHOOK_SECRET = process.env.WAHA_WEBHOOK_SECRET?.trim()
const WAHA_SESSION = process.env.WAHA_SESSION?.trim() || 'default'

export function isWahaConfigured(): boolean {
  return Boolean(WAHA_URL && WAHA_API_KEY)
}

async function wahaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!WAHA_URL || !WAHA_API_KEY) throw new Error('WAHA not configured')
  return fetch(`${WAHA_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': WAHA_API_KEY,
      ...(init.headers ?? {}),
    },
  })
}

export async function sendGroupText(groupJid: string, text: string): Promise<void> {
  const res = await wahaFetch(`/api/sendText`, {
    method: 'POST',
    body: JSON.stringify({ session: WAHA_SESSION, chatId: groupJid, text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WAHA sendText failed ${res.status}: ${body.slice(0, 200)}`)
  }
}

export interface WahaGroup {
  id: string
  name: string
  participants: number
}

export async function listGroups(): Promise<WahaGroup[]> {
  const res = await wahaFetch(`/api/${WAHA_SESSION}/groups?limit=200`)
  if (!res.ok) return []
  const data: any = await res.json().catch(() => null)
  if (!data) return []
  const rows: any[] = Array.isArray(data) ? data : Object.values(data)
  return rows.map((g: any) => ({
    id: typeof g.id === 'string' ? g.id : (g.id?._serialized ?? ''),
    name: g.subject ?? g.name ?? (typeof g.id === 'string' ? g.id : g.id?._serialized ?? ''),
    participants: typeof g.size === 'number'
      ? g.size
      : Array.isArray(g.participants) ? g.participants.length : (g.groupMetadata?.participants?.length ?? 0),
  })).filter((g) => g.id.endsWith('@g.us'))
}

export interface WahaSessionStatus {
  status: string
  qr?: string
}

export async function getSessionStatus(): Promise<WahaSessionStatus | null> {
  const res = await wahaFetch(`/api/sessions/${WAHA_SESSION}`)
  if (!res.ok) return null
  const data: any = await res.json().catch(() => null)
  if (!data) return null
  return { status: data.status ?? 'UNKNOWN' }
}

let _botIdCache: { id: string; phone: string; lid: string } | null = null

export async function getBotIdentity(): Promise<{ id: string; phone: string; lid: string } | null> {
  if (_botIdCache) return _botIdCache
  const res = await wahaFetch(`/api/sessions/${WAHA_SESSION}`)
  if (!res.ok) return null
  const data: any = await res.json().catch(() => null)
  const me = data?.me
  if (!me) return null
  const rawId: string = me.id ?? ''
  const phone = rawId.split('@')[0].replace(/^\+/, '')
  const lid = (me.lid ?? '').split('@')[0]
  _botIdCache = { id: rawId, phone, lid }
  return _botIdCache
}

export async function getSessionQr(): Promise<string | null> {
  const res = await wahaFetch(`/api/${WAHA_SESSION}/auth/qr?format=image`)
  if (!res.ok) return null
  const buf = await res.arrayBuffer()
  return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!WAHA_WEBHOOK_SECRET) return true
  if (!signature) return false
  const hmac = createHmac('sha512', WAHA_WEBHOOK_SECRET).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(hmac)
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}
