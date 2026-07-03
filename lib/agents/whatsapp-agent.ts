import { prisma } from '@/lib/prisma'
import { uniqueTicketKey } from '@/lib/ticket-key'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'
import type { WhatsappGroup } from '@prisma/client'

const LLM_PROVIDER = (process.env.WHATSAPP_LLM_PROVIDER?.trim() || 'deepseek') as 'anthropic' | 'openai-compat'
const LLM_API_KEY = process.env.WHATSAPP_LLM_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim()
const LLM_BASE_URL = process.env.WHATSAPP_LLM_BASE_URL?.trim() || 'https://api.deepseek.com'
const LLM_MODEL = process.env.WHATSAPP_LLM_MODEL?.trim() || 'deepseek-chat'
const AGENT_BOT_EMAIL = 'whatsapp-bot@propfirmstech.com'
const PORTAL_URL = (process.env.PORTAL_PUBLIC_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || '').replace(/\/$/, '')

function ticketLink(ticketId: string): string {
  return PORTAL_URL ? `${PORTAL_URL}/portal/tickets/${ticketId}` : ''
}

const SYSTEM_PROMPT_PASSIVE = `You are the PFT Support Bot, an AI agent lurking in a WhatsApp group for clients of {companyName}.

You are in PASSIVE mode — no one tagged you. Only act on clear support signals.

RULES:
- Only act when: (a) an issue/bug is described that clearly needs a ticket, or (b) someone asks about a specific ticket key/status.
- For everything else — casual chatter, greetings, off-topic — call ignore_message.
- When creating a ticket: confirm in the group with the ticket key (e.g., "Opened FTM-042").
- Keep replies short.
- Share only public ticket status, never internal notes.

Current group: {groupName}
Company: {companyName} (companyId: {companyId})
Open tickets in this company (last 10):
{recentTickets}

Referenced tickets (details for any ticket key mentioned in this message):
{referencedTickets}

Recent messages (oldest→newest):
{recentMessages}

New message from {senderName}: {messageText}

Decide the next action using exactly ONE tool call.`

const SYSTEM_PROMPT_MENTIONED = `You are the PFT Support Bot, an AI agent in a WhatsApp group for clients of {companyName}.

You were @-tagged — someone is talking to YOU. ALWAYS engage. Never ignore.

GENERAL RULES:
- Reply helpfully to whatever they ask — questions, chit-chat, opinions, jokes, technical help, product questions.
- Keep replies SHORT and conversational — WhatsApp chat, not email.
- Share only public ticket status, never internal notes.
- Match the language the user wrote in.
- Never say "As an AI" or disclaim being a bot. Be direct.

TICKET-CREATION RULES (this is the important one — you WILL get spammed):
- DO NOT open tickets carelessly. Skepticism is the default.
- Almost always prefer reply_only over create_ticket. Ask clarifying questions first.
- Before you may call create_ticket, the request MUST have ALL of:
  1. A concrete problem/feature described (not "fix stuff", "make it better")
  2. Enough context to be actionable (what page/feature/product; what happened vs what should)
  3. Either steps to reproduce OR a clear feature-request outcome
- If any of the above is missing → reply_only asking ONE focused follow-up question.
- If the message is a joke / test / gibberish / vibes ("fix the batapim", "brr brr", memes) → reply_only, playful pushback. NEVER a ticket.
- If the same person spam-tags with low-signal messages → reply_only politely deflecting; do NOT open tickets.
- Look at Recent messages — if you (or your previous asks) already gathered enough info in this thread AND the user has now confirmed / provided details → create_ticket is fine.
- Look at Existing open tickets — if a similar ticket already exists, add via comment_on_ticket instead of creating a duplicate.

WHEN YOU DO create_ticket:
- Set a specific, searchable title (imperative or noun phrase; no emoji; no "fix", no "help").
- Description: 2-4 lines summarizing the reporter's message. Include reproduction steps if given.
- Priority: default MEDIUM. HIGH/URGENT only if the reporter clearly indicates blocking/outage/money/security.
- replyText: short "Got it, opened X" (bot code appends the ticket key + link).

TICKET LOOKUPS (this is important):
- If the user references any ticket by key (e.g. "PFT-045", "NSF-015", "the login one"), full details for referenced keys are pre-loaded below (status, priority, last 3 public comments).
- Use those details to answer status questions accurately. Never invent status.
- If the user reports a NEW piece of info on an existing referenced ticket → comment_on_ticket with their input as the comment.
- If the user just asks status → reply_only with the ticket's current status + a short summary of the latest public comment.
- If a referenced key came back as "no matching tickets found" → tell the user that key doesn't exist, don't pretend it does.
- Recognize soft references too: "the withdrawal bug", "that outage" — scan Open tickets list for a title match; if unsure, ask which ticket they mean.

Current group: {groupName}
Company: {companyName} (companyId: {companyId})
Open tickets in this company (last 10):
{recentTickets}

Referenced tickets (details for any ticket key mentioned in this message):
{referencedTickets}

Recent messages (oldest→newest):
{recentMessages}

@ mention from {senderName}: {messageText}

Reply now using exactly ONE tool call (reply_only, create_ticket, or comment_on_ticket).`

interface AgentInput {
  group: WhatsappGroup & { company: { name: string } }
  senderJid: string
  senderName: string | null
  body: string
  waMessageId: string
  wasMentioned?: boolean
}

interface AgentResult {
  action: 'ignore' | 'reply' | 'create_ticket' | 'comment_on_ticket'
  reply?: string
  ticketId?: string
}

const TOOLS = [
  {
    name: 'ignore_message',
    description: 'Do nothing. Use for greetings, casual chatter, or off-topic messages.',
    input_schema: {
      type: 'object' as const,
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  },
  {
    name: 'reply_only',
    description: 'Reply in the group without creating a ticket. Use for questions the bot can answer directly or clarifying questions.',
    input_schema: {
      type: 'object' as const,
      properties: { text: { type: 'string', description: 'Short reply text (under 300 chars).' } },
      required: ['text'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Open a new support ticket. Use when a real issue/bug/request is described.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        category: { type: 'string' },
        replyText: { type: 'string', description: 'Short confirmation message to send back to the group.' },
      },
      required: ['title', 'description', 'priority', 'replyText'],
    },
  },
  {
    name: 'comment_on_ticket',
    description: 'Add a comment to an existing open ticket. Use when the message clearly relates to an ongoing ticket.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticketKey: { type: 'string' },
        comment: { type: 'string' },
        replyText: { type: 'string' },
      },
      required: ['ticketKey', 'comment', 'replyText'],
    },
  },
]

async function getBotUserId(): Promise<string> {
  const existing = await prisma.user.findFirst({ where: { email: AGENT_BOT_EMAIL } })
  if (existing) return existing.id
  const created = await prisma.user.create({
    data: {
      email: AGENT_BOT_EMAIL,
      name: 'PFT WhatsApp Bot',
      password: 'whatsapp-bot-no-login',
      role: 'ADMIN',
      isActive: true,
    },
  })
  return created.id
}

const TICKET_KEY_RE = /\b[A-Z]{2,5}-\d{1,6}\b/g

async function loadReferencedTickets(companyId: string, body: string): Promise<string> {
  const keys = Array.from(new Set((body.toUpperCase().match(TICKET_KEY_RE) ?? []))).slice(0, 5)
  if (!keys.length) return '(none referenced)'
  const tickets = await prisma.ticket.findMany({
    where: { companyId, key: { in: keys } },
    select: {
      key: true, title: true, status: true, priority: true, updatedAt: true, resolvedAt: true,
      comments: {
        where: { internal: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { author: { select: { name: true } }, message: true, createdAt: true },
      },
    },
  })
  if (!tickets.length) return `(no matching tickets found for keys: ${keys.join(', ')})`
  return tickets.map((t) => {
    const commentSummary = t.comments.length
      ? t.comments.reverse().map((c) => `    ${c.author.name}: ${c.message.slice(0, 200)}`).join('\n')
      : '    (no public comments)'
    return `- ${t.key} [${t.status} · ${t.priority}] ${t.title}\n  updated: ${t.updatedAt.toISOString()}${t.resolvedAt ? ` · resolved: ${t.resolvedAt.toISOString()}` : ''}\n  Last public comments:\n${commentSummary}`
  }).join('\n')
}

async function loadContext(group: WhatsappGroup, body: string): Promise<{ recentTickets: string; recentMessages: string; referencedTickets: string }> {
  const [tickets, messages, referencedTickets] = await Promise.all([
    prisma.ticket.findMany({
      where: { companyId: group.companyId, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { key: true, title: true, status: true, priority: true },
    }),
    prisma.whatsappMessage.findMany({
      where: { groupJid: group.groupJid },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { senderName: true, body: true, agentAction: true },
    }),
    loadReferencedTickets(group.companyId, body),
  ])
  return {
    recentTickets: tickets.length
      ? tickets.map((t) => `- ${t.key} [${t.status} · ${t.priority}] ${t.title}`).join('\n')
      : '(none)',
    recentMessages: messages.length
      ? messages.reverse().map((m) => `- ${m.senderName ?? 'unknown'}: ${m.body.slice(0, 200)}`).join('\n')
      : '(none)',
    referencedTickets,
  }
}

function toOpenAiTools() {
  return TOOLS.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }))
}

async function callAnthropic(prompt: string): Promise<{ name: string; input: any } | null> {
  if (!LLM_API_KEY) throw new Error('WHATSAPP_LLM_API_KEY not configured')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': LLM_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1024,
      tools: TOOLS,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const data = await res.json()
  const content = data?.content
  if (!Array.isArray(content)) return null
  const toolUse = content.find((c: any) => c.type === 'tool_use')
  if (!toolUse) return null
  return { name: toolUse.name, input: toolUse.input ?? {} }
}

async function callOpenAiCompatOnce(prompt: string): Promise<Response> {
  return fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1024,
      tools: toOpenAiTools(),
      tool_choice: 'required',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
}

async function callOpenAiCompat(prompt: string): Promise<{ name: string; input: any } | null> {
  if (!LLM_API_KEY) throw new Error('WHATSAPP_LLM_API_KEY not configured')
  let res!: Response
  let lastErr = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await callOpenAiCompatOnce(prompt)
    if (res.ok) break
    if (res.status !== 429 && res.status !== 503) {
      lastErr = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`LLM API error ${res.status}: ${lastErr}`)
    }
    lastErr = (await res.text().catch(() => '')).slice(0, 200)
    const wait = 800 * (attempt + 1)
    console.warn(`[whatsapp-agent] LLM ${res.status}, retry ${attempt + 1}/3 in ${wait}ms:`, lastErr)
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res.ok) throw new Error(`LLM API error ${res.status} after retries: ${lastErr}`)
  const data = await res.json().catch(() => null)
  const message = data?.choices?.[0]?.message
  const call = message?.tool_calls?.[0]
  if (!call) {
    console.warn('[whatsapp-agent] no tool_call in LLM response:', JSON.stringify(data).slice(0, 400))
    return null
  }
  let parsed: any = {}
  try {
    parsed = typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function?.arguments ?? {})
  } catch {
    parsed = {}
  }
  return { name: call.function?.name ?? '', input: parsed }
}

async function callAgent(prompt: string): Promise<{ name: string; input: any } | null> {
  return LLM_PROVIDER === 'anthropic' ? callAnthropic(prompt) : callOpenAiCompat(prompt)
}

async function createTicketFromAgent(
  group: WhatsappGroup & { company: { name: string } },
  input: { title: string; description: string; priority: string; category?: string },
  senderName: string | null,
): Promise<{ id: string; key: string | null }> {
  const botUserId = await getBotUserId()
  const priority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(input.priority) ? input.priority : 'MEDIUM'
  const key = await uniqueTicketKey(group.companyId)
  const sprintId = await autoSprintIdForPriority(priority as any)
  const ticket = await prisma.ticket.create({
    data: {
      key,
      title: input.title.slice(0, 200),
      description: `${input.description}\n\n---\n_Opened from WhatsApp group ${group.name} by ${senderName ?? 'unknown'}._`,
      priority: priority as any,
      category: input.category?.slice(0, 100),
      status: 'OPEN',
      companyId: group.companyId,
      createdById: botUserId,
      sprintId,
    },
    select: { id: true, key: true },
  })
  return ticket
}

async function commentOnTicket(ticketKey: string, comment: string, companyId: string, senderName: string | null): Promise<string | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { key: ticketKey.toUpperCase(), companyId },
    select: { id: true },
  })
  if (!ticket) return null
  const botUserId = await getBotUserId()
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket.id,
      authorId: botUserId,
      message: `${comment}\n\n---\n_From WhatsApp by ${senderName ?? 'unknown'}._`,
      internal: false,
    },
  })
  return ticket.id
}

export async function runWhatsappAgent(input: AgentInput): Promise<AgentResult> {
  if (!LLM_API_KEY) {
    return { action: 'ignore' }
  }

  const ctx = await loadContext(input.group, input.body)
  const template = input.wasMentioned ? SYSTEM_PROMPT_MENTIONED : SYSTEM_PROMPT_PASSIVE
  const prompt = template
    .replace(/\{companyName\}/g, input.group.company.name)
    .replace('{groupName}', input.group.name)
    .replace('{companyId}', input.group.companyId)
    .replace('{recentTickets}', ctx.recentTickets)
    .replace('{referencedTickets}', ctx.referencedTickets)
    .replace('{recentMessages}', ctx.recentMessages)
    .replace('{senderName}', input.senderName ?? 'unknown')
    .replace('{messageText}', input.body)

  const call = await callAgent(prompt)
  if (!call) return { action: 'ignore' }

  switch (call.name) {
    case 'ignore_message':
      return { action: 'ignore' }
    case 'reply_only':
      return { action: 'reply', reply: String(call.input.text ?? '').slice(0, 500) }
    case 'create_ticket': {
      const ticket = await createTicketFromAgent(input.group, {
        title: String(call.input.title ?? '').trim(),
        description: String(call.input.description ?? '').trim(),
        priority: String(call.input.priority ?? 'MEDIUM'),
        category: call.input.category ? String(call.input.category) : undefined,
      }, input.senderName)
      const keyLabel = ticket.key ?? ticket.id.slice(0, 8)
      const link = ticketLink(ticket.id)
      const body = call.input.replyText
        ? `${String(call.input.replyText).slice(0, 300)} (${keyLabel})`
        : `Opened ticket ${keyLabel}.`
      const confirmation = link ? `${body}\n${link}` : body
      return { action: 'create_ticket', reply: confirmation, ticketId: ticket.id }
    }
    case 'comment_on_ticket': {
      const ticketId = await commentOnTicket(
        String(call.input.ticketKey ?? ''),
        String(call.input.comment ?? ''),
        input.group.companyId,
        input.senderName,
      )
      if (!ticketId) return { action: 'ignore' }
      const link = ticketLink(ticketId)
      const body = String(call.input.replyText ?? '').slice(0, 300)
      return { action: 'comment_on_ticket', reply: link ? `${body}\n${link}` : body, ticketId }
    }
    default:
      return { action: 'ignore' }
  }
}
