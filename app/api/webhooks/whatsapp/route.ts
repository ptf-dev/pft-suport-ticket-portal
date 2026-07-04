import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, sendGroupText, getBotIdentity } from '@/lib/integrations/waha'
import { runWhatsappAgent, runFreeChatStandalone } from '@/lib/agents/whatsapp-agent'

export const dynamic = 'force-dynamic'

interface WahaWebhookPayload {
  event: string
  session: string
  payload: any
  id?: string
}

const UNMAPPED_FALLBACK_REPLY = "hey 👋 (bot not linked to a company here — free chat only, no support)"

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
      },
      update: {
        wasMentioned: row.wasMentioned,
        filterReason: row.filterReason,
        processed: row.processed,
        agentAction: row.agentAction ?? undefined,
        ticketId: row.ticketId ?? undefined,
      },
    })
  } catch (err) {
    console.error('[whatsapp-webhook] recordMessage failed', err)
  }
}

async function handleDirectMessage(input: {
  chatId: string
  body: string
  waMessageId: string
  senderJid: string
  senderName: string | null
  fromMe: boolean
}): Promise<NextResponse> {
  const { chatId, body, waMessageId, senderJid, senderName, fromMe } = input
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
    let reply: string | null = null
    try {
      reply = await runFreeChatStandalone({
        groupName: `DM with ${senderName ?? chatId}`,
        senderName,
        body,
        recentMessages: context,
      })
    } catch (err) {
      console.error('[whatsapp-webhook] DM free-chat failed', err)
    }
    if (reply && user.autoReply) {
      try {
        await sendGroupText(chatId, reply)
      } catch (err) {
        console.error('[whatsapp-webhook] DM reply send failed', err)
      }
    }
    await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: reply ? 'dm_free_chat' : 'dm_free_chat_failed' })
    return NextResponse.json({ ok: true, action: reply ? 'dm_free_chat' : 'dm_free_chat_failed' })
  }

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

    await recordMessage({
      ...baseRow,
      filterReason: null,
      processed: true,
      agentAction: `dm_${result.action}`,
      ticketId: result.ticketId ?? null,
    })
    return NextResponse.json({ ok: true, action: `dm_${result.action}`, ticketId: result.ticketId })
  } catch (err) {
    console.error('[whatsapp-webhook] DM agent failed', err)
    await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'error' })
    return NextResponse.json({ ok: false, error: 'DM agent failure' }, { status: 500 })
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
  const isDirect = chatId.endsWith('@c.us') || chatId.endsWith('@s.whatsapp.net')
  if (!isGroup && !isDirect) {
    return NextResponse.json({ ok: true, ignored: 'unknown chat type' })
  }

  const body: string = msg?.body ?? msg?.text ?? ''
  const waMessageId: string = msg?.id ?? `${chatId}-${Date.now()}`
  const senderJid: string = msg?.participant ?? msg?.author ?? msg?.from ?? ''
  const senderName: string | null = msg?.notifyName ?? msg?._data?.notifyName ?? null
  const fromMe = Boolean(msg?.fromMe)

  if (isDirect) {
    return handleDirectMessage({ chatId, body, waMessageId, senderJid, senderName, fromMe })
  }

  const groupJid = chatId

  const bot = await getBotIdentity().catch(() => null)
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
      let reply: string | null = null
      try {
        reply = await runFreeChatStandalone({
          groupName,
          senderName,
          body,
          recentMessages: context,
        })
      } catch (err) {
        console.error('[whatsapp-webhook] unmapped-group free-chat failed', err)
      }
      const finalReply = reply || UNMAPPED_FALLBACK_REPLY
      try {
        await sendGroupText(groupJid, finalReply)
      } catch (err) {
        console.error('[whatsapp-webhook] unmapped-group reply send failed', err)
      }
      await recordMessage({
        ...baseRow,
        filterReason: reason,
        processed: true,
        agentAction: reply ? 'unmapped_free_chat' : 'unmapped_fallback_reply',
      })
      return NextResponse.json({ ok: true, action: reply ? 'unmapped_free_chat' : 'unmapped_fallback_reply' })
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

  await recordMessage({ ...baseRow, filterReason: null, processed: false })

  try {
    const result = await runWhatsappAgent({
      group,
      senderJid,
      senderName,
      body,
      waMessageId,
      wasMentioned: mentionsBot,
    })

    if (result.reply && group.autoReply) {
      try {
        await sendGroupText(groupJid, result.reply)
      } catch (err) {
        console.error('[whatsapp-webhook] sendGroupText failed', err)
      }
    }

    await recordMessage({
      ...baseRow,
      filterReason: null,
      processed: true,
      agentAction: result.action,
      ticketId: result.ticketId ?? null,
    })

    return NextResponse.json({ ok: true, action: result.action, ticketId: result.ticketId })
  } catch (err) {
    console.error('[whatsapp-webhook] agent failed', err)
    await recordMessage({ ...baseRow, filterReason: null, processed: true, agentAction: 'error' })
    return NextResponse.json({ ok: false, error: 'Agent failure' }, { status: 500 })
  }
}
