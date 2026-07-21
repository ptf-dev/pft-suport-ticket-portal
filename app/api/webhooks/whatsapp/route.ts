import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyWebhookSignature, sendGroupText, getBotIdentity, downloadWahaMedia, startTyping, stopTyping } from '@/lib/integrations/waha'
import { runWhatsappAgent, RateLimitError } from '@/lib/agents/whatsapp-agent'
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE } from '@/lib/attachments'

export const dynamic = 'force-dynamic'

interface WahaWebhookPayload {
  event: string
  session: string
  payload: any
  id?: string
}

async function recordMessage(row: {
  waMessageId: string
  groupJid: string
  senderJid: string
  senderName: string | null
  body: string
  wasMentioned: boolean
  filterReason: string | null
  processed: boolean
  agentAction?: string | null
  ticketId?: string | null
  replyText?: string | null
}) {
  try {
    await prisma.whatsappMessage.upsert({
      where: { waMessageId: row.waMessageId },
      create: {
        waMessageId: row.waMessageId,
        groupJid: row.groupJid,
        senderJid: row.senderJid,
        senderName: row.senderName,
        body: row.body,
        wasMentioned: row.wasMentioned,
        filterReason: row.filterReason,
        processed: row.processed,
        agentAction: row.agentAction ?? null,
        ticketId: row.ticketId ?? null,
        replyText: row.replyText ?? null,
      },
      update: {
        wasMentioned: row.wasMentioned,
        filterReason: row.filterReason,
        processed: row.processed,
        agentAction: row.agentAction ?? undefined,
        ticketId: row.ticketId ?? undefined,
        replyText: row.replyText ?? undefined,
      },
    })
  } catch (err) {
    console.error('[whatsapp-webhook] recordMessage failed', err)
  }
}

// WAHA can deliver the same event more than once (e.g. a global env-level webhook
// plus a session-level webhook both firing, or retries on slow responses). Any code
// path that SENDS something must first claim the message atomically; only the claim
// winner may act. Re-claim is allowed for rows the bot never acted on (agentAction
// null — e.g. a message edited to add a mention), failed rows ('error'), and stale
// 'processing' rows from a crashed handler. Staleness is judged on claimedAt, which
// every claim refreshes — never createdAt, which would make every re-claim of an old
// row instantly "stale" again and let both duplicate deliveries win.
const CLAIM_STALE_MS = 10 * 60 * 1000

async function claimMessage(row: {
  waMessageId: string
  groupJid: string
  senderJid: string
  senderName: string | null
  body: string
  wasMentioned: boolean
}): Promise<boolean> {
  const now = new Date()
  try {
    await prisma.whatsappMessage.create({
      data: { ...row, filterReason: null, processed: false, agentAction: 'processing', claimedAt: now },
    })
    return true
  } catch (err) {
    // Only a unique violation on waMessageId means "row already exists — try to
    // re-claim". Any other failure must propagate so the handler 500s and WAHA
    // retries; swallowing it here would silently drop the message forever.
    const isUniqueViolation = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
    if (!isUniqueViolation) {
      console.error('[whatsapp-webhook] claimMessage create failed (non-unique error), rethrowing', err)
      throw err
    }
    const res = await prisma.whatsappMessage.updateMany({
      where: {
        waMessageId: row.waMessageId,
        OR: [
          { agentAction: null },
          { agentAction: 'error' },
          { agentAction: 'processing', claimedAt: { lt: new Date(now.getTime() - CLAIM_STALE_MS) } },
          { agentAction: 'processing', claimedAt: null },
        ],
      },
      data: { agentAction: 'processing', processed: false, body: row.body, wasMentioned: row.wasMentioned, claimedAt: now },
    })
    return res.count > 0
  }
}

interface WahaMediaHint {
  messageId: string
  mediaUrl?: string
  mimetype?: string
  filename?: string
}

function extractMediaHint(msg: any, waMessageId: string): WahaMediaHint | null {
  if (!msg) return null
  // The image is often on a quoted/replied-to message ("@Bob create a ticket of
  // this" replying to an earlier image), not on the triggering message itself —
  // WAHA exposes that as msg.replyTo with its own hasMedia/media. Prefer the
  // triggering message's own media; fall back to the quoted message's.
  const own = { hasMedia: Boolean(msg.hasMedia ?? msg.media ?? msg._data?.media), media: msg.media ?? msg._data?.media, id: waMessageId }
  const quoted = msg.replyTo?.hasMedia ? { hasMedia: true, media: msg.replyTo.media, id: msg.replyTo.id ?? waMessageId } : null
  const source = own.hasMedia ? own : quoted
  if (!source) return null
  const media = source.media ?? {}
  const mediaUrl: string | undefined = media.url ?? msg.mediaUrl ?? undefined
  const mimetype: string | undefined = media.mimetype ?? media.mimeType ?? msg.mimetype ?? msg.mimeType
  const filename: string | undefined = media.filename ?? msg.filename
  return { messageId: source.id, mediaUrl, mimetype, filename }
}

async function attachMediaToTicket(ticketId: string, hint: WahaMediaHint): Promise<{ ok: boolean; reason?: string }> {
  const dl = await downloadWahaMedia(hint)
  if (!dl) return { ok: false, reason: 'download_failed' }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(dl.mimeType)) {
    return { ok: false, reason: `unsupported_mime:${dl.mimeType}` }
  }
  if (dl.buffer.length > MAX_ATTACHMENT_SIZE) {
    return { ok: false, reason: 'too_large' }
  }
  const dir = join(process.cwd(), 'public', 'uploads', 'tickets', ticketId)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  const safeName = (dl.filename || `wa-${hint.messageId}`).replace(/[^a-zA-Z0-9.-]/g, '_')
  const filename = `${Date.now()}-${safeName}`
  const filepath = join(dir, filename)
  await writeFile(filepath, dl.buffer)
  await prisma.ticketImage.create({
    data: {
      ticketId,
      filename,
      url: `/api/uploads/tickets/${ticketId}/${filename}`,
      size: dl.buffer.length,
      mimeType: dl.mimeType,
    },
  })
  return { ok: true }
}

async function handleDirectMessage(input: {
  chatId: string
  body: string
  waMessageId: string
  senderJid: string
  senderName: string | null
  fromMe: boolean
  msg: any
}): Promise<NextResponse> {
  const { chatId, body, waMessageId, senderJid, senderName, fromMe, msg } = input
  const baseRow = {
    waMessageId,
    groupJid: chatId,
    senderJid: senderJid || chatId,
    senderName,
    body: body || '(empty)',
    wasMentioned: true,
  }

  if (fromMe) {
    await recordMessage({ ...baseRow, filterReason: 'dm_from_bot', processed: true })
    return NextResponse.json({ ok: true, ignored: 'dm from bot' })
  }

  // DMs are record-only: the bot never auto-replies in private chats. Messages are
  // still logged and the contact tracked so the admin panel shows who reached out,
  // and outbound ticket notifications (whatsapp-notify) remain unaffected.
  await prisma.whatsappUser.upsert({
    where: { waJid: chatId },
    create: { waJid: chatId, displayName: senderName, lastSeenAt: new Date() },
    update: { displayName: senderName ?? undefined, lastSeenAt: new Date() },
  })
  await recordMessage({ ...baseRow, filterReason: 'dm_silent', processed: true })
  return NextResponse.json({ ok: true, ignored: 'dm silent' })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-hmac')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: WahaWebhookPayload
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.event !== 'message' && event.event !== 'message.edited') {
    return NextResponse.json({ ok: true, ignored: `event=${event.event}` })
  }

  const msg = event.payload
  if (event.event === 'message.edited') {
    console.warn('[whatsapp-webhook] message.edited received, reprocessing with new content:', JSON.stringify(msg).slice(0, 500))
  }
  const chatId: string = msg?.from ?? msg?.chatId ?? ''
  const isGroup = chatId.endsWith('@g.us')
  const isDirect = chatId.endsWith('@c.us') || chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@lid')
  if (!isGroup && !isDirect) {
    console.warn('[whatsapp-webhook] unrecognized chat type, dropping:', chatId)
    return NextResponse.json({ ok: true, ignored: 'unknown chat type' })
  }

  const body: string = msg?.body ?? msg?.text ?? ''
  const waMessageId: string = msg?.id ?? `${chatId}-${Date.now()}`
  const senderJid: string = msg?.participant ?? msg?.author ?? msg?.from ?? ''
  const senderName: string | null = msg?.notifyName ?? msg?._data?.notifyName ?? null
  const fromMe = Boolean(msg?.fromMe)

  if (isDirect) {
    return handleDirectMessage({ chatId, body, waMessageId, senderJid, senderName, fromMe, msg })
  }

  const groupJid = chatId

  const bot = await getBotIdentity().catch((err) => {
    console.error('[whatsapp-webhook] getBotIdentity failed, mention detection disabled for this message', err)
    return null
  })
  const mentionedIds: string[] = Array.isArray(msg?.mentionedIds)
    ? msg.mentionedIds
    : Array.isArray(msg?._data?.contextInfo?.mentionedJid)
    ? msg._data.contextInfo.mentionedJid
    : []
  const mentionsBot: boolean = bot ? Boolean(
    mentionedIds.some((m: string) => m.startsWith(`${bot.phone}@`) || (bot.lid && m.startsWith(`${bot.lid}@`)))
    || (bot.phone && body.includes(`@${bot.phone}`))
    || (bot.lid && body.includes(`@${bot.lid}`))
  ) : false

  const baseRow = {
    waMessageId,
    groupJid,
    senderJid,
    senderName,
    body: body || '(empty)',
    wasMentioned: mentionsBot,
  }

  if (!body || body.trim().length < 3) {
    await recordMessage({ ...baseRow, filterReason: 'body_too_short', processed: true })
    return NextResponse.json({ ok: true, ignored: 'empty or too short' })
  }

  if (fromMe && !mentionsBot) {
    await recordMessage({ ...baseRow, filterReason: 'bot_echo', processed: true })
    return NextResponse.json({ ok: true, ignored: 'bot reply echo' })
  }

  const group = await prisma.whatsappGroup.findUnique({
    where: { groupJid },
    include: { company: { select: { name: true } } },
  })

  // Unmapped or disabled groups get no reply of any kind — not a notice, not chat.
  // The bot only ever speaks via ticket confirmations and status-change
  // notifications; there's nothing useful it can say here, so stay silent.
  if (!group || !group.enabled) {
    const reason = !group ? 'group_unmapped' : 'group_disabled'
    await recordMessage({ ...baseRow, filterReason: reason, processed: true })
    return NextResponse.json({ ok: true, ignored: reason })
  }

  // The bot is strictly mention-gated in every group (the agent also enforces this).
  // Skipping here keeps non-mention rows at agentAction null, so editing a message
  // to add @Bob later still triggers a fresh claim + reprocess.
  if (!mentionsBot) {
    await recordMessage({ ...baseRow, filterReason: 'mention_only_skip', processed: true })
    return NextResponse.json({ ok: true, ignored: 'not mentioned' })
  }

  if (!(await claimMessage(baseRow))) {
    return NextResponse.json({ ok: true, ignored: 'duplicate' })
  }

  if (group.autoReply) await startTyping(groupJid)
  try {
    const result = await runWhatsappAgent({
      group,
      senderJid,
      senderName,
      body,
      waMessageId,
      wasMentioned: mentionsBot,
    })

    // The bot's only chat output is a ticket create/comment confirmation (the ticket
    // key + link) — that's not chatter, it's the core function, so it always sends
    // regardless of Auto-reply and regardless of any human reply in the meantime
    // (a human's chat message doesn't convey the ticket key/link the confirmation
    // does). There is no other reply path anymore, so nothing here needs suppressing.
    if (result.reply) {
      try {
        await sendGroupText(groupJid, result.reply)
      } catch (err) {
        console.error('[whatsapp-webhook] sendGroupText failed', err)
      }
    }

    const mediaHint = extractMediaHint(msg, waMessageId)
    if (mediaHint && result.ticketId) {
      const attach = await attachMediaToTicket(result.ticketId, mediaHint).catch((err) => {
        console.error('[whatsapp-webhook] group media attach failed', err); return { ok: false, reason: 'exception' } as const
      })
      if (!attach.ok) console.warn('[whatsapp-webhook] group media not attached:', attach.reason)
    }

    await recordMessage({
      ...baseRow,
      filterReason: null,
      processed: true,
      agentAction: result.action,
      ticketId: result.ticketId ?? null,
      replyText: result.reply ?? null,
    })

    return NextResponse.json({ ok: true, action: result.action, ticketId: result.ticketId })
  } catch (err) {
    if (err instanceof RateLimitError) {
      // Silent — no chat text, just record it. 'rate_limited' is not in
      // claimMessage's re-claim OR list, so this row is NOT auto-retried on the
      // next duplicate delivery; it needs a fresh inbound message (or edit) to
      // reprocess. That's fine here since there's nothing to retry towards but
      // silence anyway.
      await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'rate_limited' })
      return NextResponse.json({ ok: true, action: 'rate_limited' })
    }
    console.error('[whatsapp-webhook] agent failed', err)
    await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'error' })
    return NextResponse.json({ ok: false, error: 'Agent failure' }, { status: 500 })
  } finally {
    if (group.autoReply) await stopTyping(groupJid)
  }
}
