import { prisma } from '@/lib/prisma'
import { uniqueTicketKey } from '@/lib/ticket-key'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'
import { getSouls } from './soul'
import { findLikelyDuplicateTicket } from '@/lib/ticket-duplicate'
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

export class RateLimitError extends Error {
  constructor(msg = 'LLM rate limited') { super(msg); this.name = 'RateLimitError' }
}

const LANGUAGE_RULE = `LANGUAGE:
- Detect the language of the incoming message and REPLY IN THAT LANGUAGE.
- Common languages in these groups: English, Albanian (Shqip), German (Deutsch), Portuguese (BR), Spanish, Italian.
- Albanian examples: "përshëndetje" → hello. Reply in fluent Albanian if user writes Albanian.
- German examples: "hallo, geht's dir gut?" → reply in fluent German.
- If user mixes languages, follow their dominant language.
- Never explain that you translated. Just reply in their language.`

const SYSTEM_PROMPT_MENTIONED = `You are the PFT Support Bot, a ticket-only WhatsApp integration for {companyName}. You are NOT a chat assistant.

You were @-tagged. You have exactly two possible outcomes: log something, or do nothing. You never send a chat reply — no banter, no clarifying questions, no status answers, no "got it, tell me more". If you can't act, stay silent; a human will follow up.

${LANGUAGE_RULE}

WHEN TO create_ticket:
- The message describes a real, concrete problem or request with enough detail to act on: what's wrong, and either (a) a symptom + comparison ("works on X, breaks on Y"), or (b) an account/ticket ID + specific symptom + something they already tried (the failed attempt IS the repro step).
- That bar is deliberately low — don't hold out for more polish once it's cleared. An account number + a specific symptom + "tried X, nothing happened" is already enough. Never ask a follow-up question instead of logging it.
- If a message bundles multiple sub-issues and at least one clears the bar, create_ticket for that one now — the rest can go in the description as "also mentioned: ...".
- Also check Recent messages: if an earlier message in this thread plus this one together clear the bar, create_ticket.

WHEN TO comment_on_ticket instead:
- The message clearly relates to an existing open ticket — either references a key directly, or matches one in Open tickets / Referenced tickets below closely enough that opening a new ticket would just be a duplicate.

WHEN TO ignore_message (the default — most messages land here):
- Greetings, banter, opinions, jokes, gibberish, spam-tags, vague asks with no actionable detail ("fix stuff", "check please" with nothing else), pure status questions ("any update on X?"), or anything that doesn't clear the create_ticket bar above.
- Never invent a substitute action. If in doubt, ignore — silence costs nothing; a wrong ticket or an unwanted reply does.

WHEN YOU DO create_ticket:
- Set a specific, searchable title (imperative or noun phrase; no emoji; no "fix", no "help").
- Description: 2-4 lines summarizing the reporter's message. Include reproduction steps if given.
- Priority: default MEDIUM. HIGH/URGENT only if the reporter clearly indicates blocking/outage/money/security.
- replyText: short "Got it, opened X" (bot code appends the ticket key + link). This is a confirmation, not a conversation opener — don't ask a question in it.

Never invent ticket status or details. Don't substitute your own technical guesses or DIY troubleshooting speculation ("could be an iframe permissions issue, try checking...") for actually logging it — you have no access to the codebase or infra to diagnose it for real, and a plausible-sounding guess isn't a fix. That's a job for whoever picks up the ticket.

Current group: {groupName}
Company: {companyName} (companyId: {companyId})
Open tickets in this company (last 10):
{recentTickets}

Referenced tickets (details for any ticket key mentioned in this message):
{referencedTickets}

Recent messages (oldest→newest):
{recentMessages}

@ mention from {senderName}: {messageText}

Reply now using exactly ONE tool call (create_ticket, comment_on_ticket, or ignore_message).`

interface AgentInput {
  group: WhatsappGroup & { company: { name: string } }
  senderJid: string
  senderName: string | null
  body: string
  waMessageId: string
  wasMentioned?: boolean
}

interface AgentResult {
  action: 'ignore' | 'create_ticket' | 'comment_on_ticket'
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

function toOpenAiTools(tools: typeof TOOLS) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }))
}

async function callAnthropic(prompt: string, tools: typeof TOOLS): Promise<{ name: string; input: any } | null> {
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
      tools,
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

async function callOpenAiCompatOnce(prompt: string, tools: typeof TOOLS): Promise<Response> {
  return fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 2048,
      tools: toOpenAiTools(tools),
      tool_choice: 'required',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
}

function isDegenerateCall(call: { name: string; input: any } | null): boolean {
  if (!call) return true
  if (call.name === 'create_ticket') {
    const text = String(call.input?.replyText ?? '').trim()
    if (text.length < 4) return true
  }
  return false
}

async function callOpenAiCompatAttempt(prompt: string, tools: typeof TOOLS): Promise<{ name: string; input: any } | null> {
  if (!LLM_API_KEY) throw new Error('WHATSAPP_LLM_API_KEY not configured')
  let res!: Response
  let lastErr = ''
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await callOpenAiCompatOnce(prompt, tools)
    } catch (err) {
      lastStatus = 0
      lastErr = String(err)
      const wait = 800 * (attempt + 1)
      console.warn(`[whatsapp-agent] LLM network error, retry ${attempt + 1}/3 in ${wait}ms:`, lastErr)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    if (res.ok) break
    lastStatus = res.status
    if (res.status < 500 && res.status !== 429) {
      lastErr = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`LLM API error ${res.status}: ${lastErr}`)
    }
    lastErr = (await res.text().catch(() => '')).slice(0, 200)
    const wait = 800 * (attempt + 1)
    console.warn(`[whatsapp-agent] LLM ${res.status}, retry ${attempt + 1}/3 in ${wait}ms:`, lastErr)
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res || !res.ok) {
    if (lastStatus === 429 || lastStatus === 503) throw new RateLimitError(`LLM ${lastStatus} after retries`)
    throw new Error(`LLM API error ${lastStatus} after retries: ${lastErr}`)
  }
  const data = await res.json().catch(() => null)
  const choice = data?.choices?.[0]
  const call = choice?.message?.tool_calls?.[0]
  if (!call) {
    console.warn('[whatsapp-agent] no tool_call in LLM response:', JSON.stringify(data).slice(0, 400))
    return null
  }
  if (choice?.finish_reason === 'length') {
    console.warn('[whatsapp-agent] tool call truncated (finish_reason=length), discarding:', JSON.stringify(call).slice(0, 300))
    return null
  }
  let parsed: any = {}
  try {
    parsed = typeof call.function?.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function?.arguments ?? {})
  } catch {
    console.warn('[whatsapp-agent] failed to parse tool-call arguments:', String(call.function?.arguments).slice(0, 300))
    parsed = {}
  }
  return { name: call.function?.name ?? '', input: parsed }
}

async function callOpenAiCompat(prompt: string, tools: typeof TOOLS): Promise<{ name: string; input: any } | null> {
  const first = await callOpenAiCompatAttempt(prompt, tools)
  if (!isDegenerateCall(first)) return first
  console.warn('[whatsapp-agent] degenerate reply from LLM, retrying once:', JSON.stringify(first).slice(0, 200))
  const second = await callOpenAiCompatAttempt(prompt, tools)
  return isDegenerateCall(second) ? null : second
}

async function callAgent(prompt: string, tools: typeof TOOLS = TOOLS): Promise<{ name: string; input: any } | null> {
  return LLM_PROVIDER === 'anthropic' ? callAnthropic(prompt, tools) : callOpenAiCompat(prompt, tools)
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

  // Ticket-only, mention-gated bot: no unprompted (passive) chiming in, no free-chat
  // banter. Every agentMode collapses to the same strict support behavior.
  if (!input.wasMentioned) return { action: 'ignore' }

  // Auto-ticket off = the group has nothing left for the bot to do — the only tools
  // are create_ticket/comment_on_ticket, and the bot never chats — so skip the LLM
  // call entirely rather than pay for a call whose only possible outcome is ignore.
  if (input.group.autoTicket === false) return { action: 'ignore' }

  const ctx = await loadContext(input.group, input.body)
  const souls = getSouls()
  const soulText = souls.professional
  const prompt = SYSTEM_PROMPT_MENTIONED
    .replace('{soul}', soulText)
    .replace(/\{companyName\}/g, input.group.company.name)
    .replace(/\{groupName\}/g, input.group.name)
    .replace('{companyId}', input.group.companyId)
    .replace('{recentTickets}', ctx.recentTickets)
    .replace('{referencedTickets}', ctx.referencedTickets)
    .replace('{recentMessages}', ctx.recentMessages)
    .replace('{senderName}', input.senderName ?? 'unknown')
    .replace('{messageText}', input.body)

  const call = await callAgent(prompt, TOOLS)
  if (!call) return { action: 'ignore' }

  switch (call.name) {
    case 'ignore_message':
      return { action: 'ignore' }
    case 'create_ticket': {
      const proposedTitle = String(call.input.title ?? '').trim()
      const duplicate = await findLikelyDuplicateTicket(input.group.companyId, proposedTitle)
      if (duplicate) {
        const mergedComment = `${String(call.input.description ?? '').trim()}\n\n_(Reported again via WhatsApp by ${input.senderName ?? 'unknown'} — looked like a duplicate of this ticket, merged instead of opening a new one.)_`
        const ticketId = await commentOnTicket(duplicate.key ?? '', mergedComment, input.group.companyId, input.senderName)
        if (ticketId) {
          const keyLabel = duplicate.key ?? duplicate.id.slice(0, 8)
          const link = ticketLink(ticketId)
          const body = `Looks like the same issue as ${keyLabel} — added your details there instead of opening a duplicate.`
          return { action: 'comment_on_ticket', reply: link ? `${body}\n${link}` : body, ticketId }
        }
      }
      const ticket = await createTicketFromAgent(input.group, {
        title: proposedTitle,
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
