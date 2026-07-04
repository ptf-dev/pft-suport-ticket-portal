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
  const groupJid: string = msg?.from ?? msg?.chatId ?? ''
  if (!groupJid.endsWith('@g.us')) {
    return NextResponse.json({ ok: true, ignored: 'not a group message' })
  }

  const body: string = msg?.body ?? msg?.text ?? ''
  const waMessageId: string = msg?.id ?? `${groupJid}-${Date.now()}`
  const senderJid: string = msg?.participant ?? msg?.author ?? msg?.from ?? ''
  const senderName: string | null = msg?.notifyName ?? msg?._data?.notifyName ?? null
  const fromMe = Boolean(msg?.fromMe)

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
