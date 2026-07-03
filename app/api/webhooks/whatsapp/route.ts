import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, sendGroupText, getBotIdentity } from '@/lib/integrations/waha'
import { runWhatsappAgent } from '@/lib/agents/whatsapp-agent'

export const dynamic = 'force-dynamic'

interface WahaWebhookPayload {
  event: string
  session: string
  payload: any
  id?: string
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

  if (!body || body.trim().length < 3) {
    return NextResponse.json({ ok: true, ignored: 'empty or too short' })
  }

  const group = await prisma.whatsappGroup.findUnique({
    where: { groupJid },
    include: { company: { select: { name: true } } },
  })

  if (!group || !group.enabled) {
    return NextResponse.json({ ok: true, ignored: 'group not mapped or disabled' })
  }

  const bot = await getBotIdentity().catch(() => null)
  const mentionedIds: string[] = Array.isArray(msg?.mentionedIds)
    ? msg.mentionedIds
    : Array.isArray(msg?._data?.contextInfo?.mentionedJid)
    ? msg._data.contextInfo.mentionedJid
    : []
  const mentionsBot = bot ? (
    mentionedIds.some((m: string) => m.startsWith(`${bot.phone}@`) || (bot.lid && m.startsWith(`${bot.lid}@`)))
    || (bot.phone && body.includes(`@${bot.phone}`))
    || (bot.lid && body.includes(`@${bot.lid}`))
  ) : false

  const isBotOwnReply = fromMe && !mentionsBot
  if (isBotOwnReply) {
    return NextResponse.json({ ok: true, ignored: 'bot reply echo' })
  }

  if (group.mentionOnly && !mentionsBot) {
    return NextResponse.json({ ok: true, ignored: 'mention-only mode, bot not tagged' })
  }

  const existing = await prisma.whatsappMessage.findUnique({ where: { waMessageId } })
  if (existing) {
    return NextResponse.json({ ok: true, ignored: 'duplicate' })
  }

  await prisma.whatsappMessage.create({
    data: { waMessageId, groupJid, senderJid, senderName, body, processed: false },
  })

  try {
    const result = await runWhatsappAgent({
      group,
      senderJid,
      senderName,
      body,
      waMessageId,
    })

    if (result.reply && group.autoReply) {
      try {
        await sendGroupText(groupJid, result.reply)
      } catch (err) {
        console.error('[whatsapp-webhook] sendGroupText failed', err)
      }
    }

    await prisma.whatsappMessage.update({
      where: { waMessageId },
      data: { processed: true, agentAction: result.action, ticketId: result.ticketId ?? null },
    })

    return NextResponse.json({ ok: true, action: result.action, ticketId: result.ticketId })
  } catch (err) {
    console.error('[whatsapp-webhook] agent failed', err)
    await prisma.whatsappMessage.update({
      where: { waMessageId },
      data: { processed: true, agentAction: 'error' },
    }).catch(() => {})
    return NextResponse.json({ ok: false, error: 'Agent failure' }, { status: 500 })
  }
}
