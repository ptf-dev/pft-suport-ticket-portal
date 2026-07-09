import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, sendGroupText, getBotIdentity, downloadWahaMedia, startTyping, stopTyping } from '@/lib/integrations/waha'
import { runWhatsappAgent, runFreeChatStandalone, RateLimitError } from '@/lib/agents/whatsapp-agent'

const RATE_LIMIT_REPLY = "⚠️ LLM rate limit reached — try again in a minute."
const DM_HANDOFF_THRESHOLD = 6
const DM_HANDOFF_REPLY = "Hey — just a heads up, I'm a lightweight AI assistant here, not the real Bob. For anything that needs a real look, hang tight and an actual human will get back to you when they see this."
const GROUP_DISABLED_NOTICE = "Hey — I'm actually turned off for this group right now (an admin disabled me in the WhatsApp settings). Flip \"Enabled\" back on in the admin panel and I'll pick support back up."
const GROUP_DISABLED_NOTICE_COOLDOWN_MS = 60 * 60 * 1000
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

async function wasLastRateLimited(chatId: string): Promise<boolean> {
  const last = await prisma.whatsappMessage.findFirst({
    where: { groupJid: chatId, processed: true },
    orderBy: { createdAt: 'desc' },
    select: { agentAction: true },
  })
  return last?.agentAction === 'rate_limited'
}

interface WahaMediaHint {
  messageId: string
  mediaUrl?: string
  mimetype?: string
  filename?: string
}

function extractMediaHint(msg: any, waMessageId: string): WahaMediaHint | null {
  if (!msg) return null
  const hasMedia = Boolean(msg.hasMedia ?? msg.media ?? msg._data?.media)
  if (!hasMedia) return null
  const media = msg.media ?? msg._data?.media ?? {}
  const mediaUrl: string | undefined = media.url ?? msg.mediaUrl ?? undefined
  const mimetype: string | undefined = media.mimetype ?? media.mimeType ?? msg.mimetype ?? msg.mimeType
  const filename: string | undefined = media.filename ?? msg.filename
  return { messageId: waMessageId, mediaUrl, mimetype, filename }
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
  if (!body || body.trim().length < 2) {
    await recordMessage({ ...baseRow, filterReason: 'body_too_short', processed: true })
    return NextResponse.json({ ok: true, ignored: 'empty or too short' })
  }

  const existing = await prisma.whatsappMessage.findUnique({ where: { waMessageId } })
  if (existing?.agentAction && existing.agentAction !== 'error') {
    return NextResponse.json({ ok: true, ignored: 'duplicate' })
  }

  const user = await prisma.whatsappUser.upsert({
    where: { waJid: chatId },
    create: { waJid: chatId, displayName: senderName, lastSeenAt: new Date() },
    update: { displayName: senderName ?? undefined, lastSeenAt: new Date() },
    include: { company: { select: { id: true, name: true } } },
  })

  if (!user.enabled) {
    await recordMessage({ ...baseRow, filterReason: 'dm_user_disabled', processed: true })
    return NextResponse.json({ ok: true, ignored: 'dm user disabled' })
  }

  const recentMessages = await prisma.whatsappMessage.findMany({
    where: { groupJid: chatId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { senderName: true, body: true },
  })
  const context = recentMessages.length
    ? recentMessages.reverse().map((m) => `- ${m.senderName ?? 'unknown'}: ${m.body.slice(0, 200)}`).join('\n')
    : '(no context)'

  await recordMessage({ ...baseRow, filterReason: null, processed: false })

  if (!user.company) {
    const alreadyHandedOff = await prisma.whatsappMessage.findFirst({
      where: { groupJid: chatId, agentAction: 'dm_handoff' },
      select: { id: true },
    })
    if (alreadyHandedOff) {
      await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'dm_handoff' })
      return NextResponse.json({ ok: true, action: 'dm_handoff' })
    }
    const priorFreeChatCount = await prisma.whatsappMessage.count({
      where: { groupJid: chatId, agentAction: 'dm_free_chat' },
    })
    if (priorFreeChatCount >= DM_HANDOFF_THRESHOLD) {
      if (user.autoReply) {
        try { await sendGroupText(chatId, DM_HANDOFF_REPLY) } catch (err) { console.error('[whatsapp-webhook] DM handoff send failed', err) }
      }
      await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'dm_handoff', replyText: DM_HANDOFF_REPLY })
      return NextResponse.json({ ok: true, action: 'dm_handoff' })
    }
    if (user.autoReply) await startTyping(chatId)
    const result = await runFreeChatStandalone({
      groupName: `DM with ${senderName ?? chatId}`,
      senderName,
      body,
      recentMessages: context,
    })
    let outgoing: string | null = null
    let action = 'dm_free_chat_failed'
    if (result.ok) {
      outgoing = result.text
      action = 'dm_free_chat'
    } else if (result.reason === 'rate_limit') {
      action = 'rate_limited'
      outgoing = (await wasLastRateLimited(chatId)) ? null : RATE_LIMIT_REPLY
    }
    if (outgoing && user.autoReply) {
      try { await sendGroupText(chatId, outgoing) } catch (err) { console.error('[whatsapp-webhook] DM reply send failed', err) }
    }
    if (user.autoReply) await stopTyping(chatId)
    await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: action })
    return NextResponse.json({ ok: true, action })
  }

  if (user.autoReply) await startTyping(chatId)
  try {
    const syntheticGroup = {
      id: `dm-${user.id}`,
      groupJid: chatId,
      name: `DM: ${senderName ?? chatId}`,
      companyId: user.company.id,
      enabled: true,
      autoTicket: user.autoTicket,
      autoReply: user.autoReply,
      mentionOnly: false,
      agentMode: user.agentMode,
      notifyOnStatusChange: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      company: { name: user.company.name },
    } as any

    const result = await runWhatsappAgent({
      group: syntheticGroup,
      senderJid: senderJid || chatId,
      senderName,
      body,
      waMessageId,
      wasMentioned: true,
    })

    if (result.reply && user.autoReply) {
      try {
        await sendGroupText(chatId, result.reply)
      } catch (err) {
        console.error('[whatsapp-webhook] DM reply send failed', err)
      }
    }

    const mediaHint = extractMediaHint(msg, waMessageId)
    if (mediaHint && result.ticketId) {
      const attach = await attachMediaToTicket(result.ticketId, mediaHint).catch((err) => {
        console.error('[whatsapp-webhook] DM media attach failed', err); return { ok: false, reason: 'exception' } as const
      })
      if (!attach.ok) console.warn('[whatsapp-webhook] DM media not attached:', attach.reason)
    }

    await recordMessage({
      ...baseRow,
      filterReason: null,
      processed: true,
      agentAction: `dm_${result.action}`,
      ticketId: result.ticketId ?? null,
      replyText: result.reply ?? null,
    })
    return NextResponse.json({ ok: true, action: `dm_${result.action}`, ticketId: result.ticketId })
  } catch (err) {
    if (err instanceof RateLimitError) {
      if (user.autoReply && !(await wasLastRateLimited(chatId))) {
        try { await sendGroupText(chatId, RATE_LIMIT_REPLY) } catch {}
      }
      await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'rate_limited' })
      return NextResponse.json({ ok: true, action: 'rate_limited' })
    }
    console.error('[whatsapp-webhook] DM agent failed', err)
    await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'error' })
    return NextResponse.json({ ok: false, error: 'DM agent failure' }, { status: 500 })
  } finally {
    if (user.autoReply) await stopTyping(chatId)
  }
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

  if (event.event !== 'message') {
    return NextResponse.json({ ok: true, ignored: `event=${event.event}` })
  }

  const msg = event.payload
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

  if (!group || !group.enabled) {
    const reason = !group ? 'group_unmapped' : 'group_disabled'

    if (reason === 'group_disabled' && mentionsBot) {
      const lastNotice = await prisma.whatsappMessage.findFirst({
        where: { groupJid, agentAction: 'group_disabled_notice' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      const withinCooldown = lastNotice && Date.now() - lastNotice.createdAt.getTime() < GROUP_DISABLED_NOTICE_COOLDOWN_MS
      if (!withinCooldown) {
        try { await sendGroupText(groupJid, GROUP_DISABLED_NOTICE) } catch (err) { console.error('[whatsapp-webhook] group-disabled notice send failed', err) }
        await recordMessage({ ...baseRow, filterReason: reason, processed: true, agentAction: 'group_disabled_notice', replyText: GROUP_DISABLED_NOTICE })
        return NextResponse.json({ ok: true, action: 'group_disabled_notice' })
      }
      await recordMessage({ ...baseRow, filterReason: reason, processed: true })
      return NextResponse.json({ ok: true, ignored: reason })
    }

    if (mentionsBot) {
      const recentMessages = await prisma.whatsappMessage.findMany({
        where: { groupJid },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { senderName: true, body: true },
      })
      const context = recentMessages.length
        ? recentMessages.reverse().map((m) => `- ${m.senderName ?? 'unknown'}: ${m.body.slice(0, 200)}`).join('\n')
        : '(no context)'
      const groupName = msg?._data?.chat?.name ?? msg?.chat?.name ?? groupJid.replace('@g.us', '')
      await startTyping(groupJid)
      const result = await runFreeChatStandalone({
        groupName,
        senderName,
        body,
        recentMessages: context,
      })
      let outgoing: string | null
      let action: string
      if (result.ok) {
        outgoing = result.text
        action = 'unmapped_free_chat'
      } else if (result.reason === 'rate_limit') {
        action = 'rate_limited'
        outgoing = (await wasLastRateLimited(groupJid)) ? null : RATE_LIMIT_REPLY
      } else {
        outgoing = null
        action = 'unmapped_fallback_reply'
      }
      if (outgoing) {
        try { await sendGroupText(groupJid, outgoing) } catch (err) { console.error('[whatsapp-webhook] unmapped-group reply send failed', err) }
      }
      await stopTyping(groupJid)
      await recordMessage({
        ...baseRow,
        filterReason: reason,
        processed: true,
        agentAction: action,
      })
      return NextResponse.json({ ok: true, action })
    }
    await recordMessage({ ...baseRow, filterReason: reason, processed: true })
    return NextResponse.json({ ok: true, ignored: reason })
  }

  if (group.mentionOnly && !mentionsBot) {
    await recordMessage({ ...baseRow, filterReason: 'mention_only_skip', processed: true })
    return NextResponse.json({ ok: true, ignored: 'mention-only mode, bot not tagged' })
  }

  const existing = await prisma.whatsappMessage.findUnique({ where: { waMessageId } })
  if (existing?.agentAction && existing.agentAction !== 'error') {
    return NextResponse.json({ ok: true, ignored: 'duplicate' })
  }

  const receivedAt = new Date()
  await recordMessage({ ...baseRow, filterReason: null, processed: false })

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

    let suppressedByHuman = false
    if (result.reply && group.autoReply) {
      const humanRepliedMeanwhile = await prisma.whatsappMessage.findFirst({
        where: { groupJid, filterReason: 'bot_echo', createdAt: { gt: receivedAt } },
        select: { id: true },
      })
      if (humanRepliedMeanwhile) {
        suppressedByHuman = true
        console.warn('[whatsapp-webhook] human replied while agent was processing, suppressing bot reply in', groupJid)
      } else {
        try {
          await sendGroupText(groupJid, result.reply)
        } catch (err) {
          console.error('[whatsapp-webhook] sendGroupText failed', err)
        }
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
      agentAction: suppressedByHuman ? 'suppressed_human_replied' : result.action,
      ticketId: result.ticketId ?? null,
      replyText: suppressedByHuman ? null : (result.reply ?? null),
    })

    return NextResponse.json({ ok: true, action: suppressedByHuman ? 'suppressed_human_replied' : result.action, ticketId: result.ticketId })
  } catch (err) {
    if (err instanceof RateLimitError) {
      if (group.autoReply && !(await wasLastRateLimited(groupJid))) {
        try { await sendGroupText(groupJid, RATE_LIMIT_REPLY) } catch {}
      }
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
