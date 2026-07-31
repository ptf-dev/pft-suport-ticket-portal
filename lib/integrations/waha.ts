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

export async function startTyping(chatId: string): Promise<void> {
  try {
    await wahaFetch(`/api/startTyping`, {
      method: 'POST',
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })
  } catch (err) {
    console.error('[waha] startTyping failed', err)
  }
}

export async function stopTyping(chatId: string): Promise<void> {
  try {
    await wahaFetch(`/api/stopTyping`, {
      method: 'POST',
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })
  } catch (err) {
    console.error('[waha] stopTyping failed', err)
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

/**
 * Restart the WAHA session and wait for it to reach SCAN_QR_CODE.
 *
 * WAHA only serves a QR for a short window after a restart (~60-90s), then
 * drops back to FAILED. Without this, the admin page could only ever *read*
 * status, so the QR window had to be opened out-of-band and was almost always
 * expired by the time anyone looked.
 *
 * Session config (webhooks, HMAC key, NOWEB store) is held by WAHA across
 * restarts, and group→company mappings live in our own database keyed by
 * groupJid — neither is touched here.
 */
export async function restartSession(): Promise<WahaSessionStatus | null> {
  const res = await wahaFetch(`/api/sessions/${WAHA_SESSION}/restart`, { method: 'POST' })
  if (!res.ok) return null

  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((r) => setTimeout(r, 2000))
    const status = await getSessionStatus()
    if (!status) continue
    if (status.status === 'SCAN_QR_CODE' || status.status === 'WORKING') return status
  }
  return getSessionStatus()
}

/**
 * Request a phone-number pairing code — the alternative to scanning a QR.
 * Only valid while the session is in SCAN_QR_CODE.
 */
export async function requestPairingCode(phoneNumber: string): Promise<string | null> {
  const res = await wahaFetch(`/api/${WAHA_SESSION}/auth/request-code`, {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: phoneNumber.replace(/[^0-9]/g, '') }),
  })
  if (!res.ok) return null
  const data: any = await res.json().catch(() => null)
  return data?.code ?? null
}

export interface WahaMediaBytes {
  buffer: Buffer
  mimeType: string
  filename: string
}

export async function downloadWahaMedia(input: {
  messageId: string
  mediaUrl?: string
  mimetype?: string
  filename?: string
}): Promise<WahaMediaBytes | null> {
  if (!WAHA_URL || !WAHA_API_KEY) return null

  // WAHA's own media.url in webhook payloads is self-referential (e.g.
  // "http://localhost:3000/api/files/default/<id>.jpg") — that host is WAHA's own
  // container, unreachable from here. The path itself (/api/files/{session}/{id}.ext,
  // WAHA's real local-storage serving route) is correct, so rewrite just the origin
  // to the actual configured WAHA_URL instead of guessing at other endpoints (WAHA
  // has no /messages/{id}/download route — confirmed 404 on this WAHA version).
  const attempts: string[] = []
  if (input.mediaUrl) {
    try {
      const u = new URL(input.mediaUrl)
      const rewritten = new URL(u.pathname + u.search, WAHA_URL).toString()
      attempts.push(rewritten)
    } catch {
      attempts.push(input.mediaUrl)
    }
  }

  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        headers: { 'X-Api-Key': WAHA_API_KEY, Accept: 'application/octet-stream, application/json;q=0.5' },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data: any = await res.json().catch(() => null)
        const b64 = data?.data ?? data?.base64 ?? data?.body
        if (typeof b64 === 'string' && b64.length > 0) {
          return {
            buffer: Buffer.from(b64, 'base64'),
            mimeType: data?.mimetype ?? input.mimetype ?? 'application/octet-stream',
            filename: data?.filename ?? input.filename ?? `waha-${input.messageId}`,
          }
        }
        continue
      }
      const arr = await res.arrayBuffer()
      const buffer = Buffer.from(arr)
      if (buffer.length === 0) continue
      return {
        buffer,
        mimeType: input.mimetype ?? contentType.split(';')[0].trim() ?? 'application/octet-stream',
        filename: input.filename ?? `waha-${input.messageId}`,
      }
    } catch (err) {
      console.warn('[waha] downloadWahaMedia attempt failed', url, err)
    }
  }
  return null
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
