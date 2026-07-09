import { prisma } from '@/lib/prisma'
import { uniqueTicketKey } from '@/lib/ticket-key'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'
import { getSouls } from './soul'
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

const FREE_CHAT_STANDALONE_PROMPT = `You are Bob, a friendly WhatsApp companion in a group called "{groupName}".

You are NOT here as a support agent. No tickets. No product help. Just casual chat.

WHO YOU ARE — this is your soul. Embody it completely, in every reply:
{soul}

RULES:
- Reply warm and casual. Match the group's energy.
- Have opinions. Have humor. Emojis fine when they fit.
- Never say "As an AI" — just be Bob.
- Reply length matches the message — a quick quip gets a quick reply, a real question or story gets a real answer. Don't pad, don't artificially cut yourself short.

LANGUAGE:
- Detect the language of the incoming message and REPLY IN THAT LANGUAGE.
- Common: English, Albanian (Shqip), German (Deutsch), Portuguese, Spanish, Italian.
- "di shqip ti" → answer in Albanian; "hallo, geht's dir gut?" → answer in German.
- Never explain that you translated.

Recent messages in this group (oldest→newest):
{recentMessages}

New message from {senderName}: {messageText}

Reply naturally in one message, whatever length fits.`

export type FreeChatResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'rate_limit' | 'no_key' | 'error' }

export async function runFreeChatStandalone(input: {
  groupName: string
  senderName: string | null
  body: string
  recentMessages: string
}): Promise<FreeChatResult> {
  if (!LLM_API_KEY) return { ok: false, reason: 'no_key' }
  const prompt = FREE_CHAT_STANDALONE_PROMPT
    .replace('{soul}', getSouls().personal)
    .replace(/\{groupName\}/g, input.groupName || 'the group')
    .replace('{recentMessages}', input.recentMessages || '(no context)')
    .replace('{senderName}', input.senderName ?? 'unknown')
    .replace('{messageText}', input.body)
  try {
    const res = await callChatText(prompt)
    if (!res) return { ok: false, reason: 'error' }
    return { ok: true, text: res }
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.warn('[whatsapp-agent] free-chat rate limited')
      return { ok: false, reason: 'rate_limit' }
    }
    console.error('[whatsapp-agent] free-chat standalone failed', err)
    return { ok: false, reason: 'error' }
  }
}

async function callChatTextOnce(prompt: string): Promise<Response> {
  return fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
}

export class RateLimitError extends Error {
  constructor(msg = 'LLM rate limited') { super(msg); this.name = 'RateLimitError' }
}

async function callOpenAiChatText(prompt: string): Promise<string> {
  if (!LLM_API_KEY) throw new Error('WHATSAPP_LLM_API_KEY not configured')
  let res!: Response
  let lastErr = ''
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await callChatTextOnce(prompt)
    } catch (err) {
      lastStatus = 0
      lastErr = String(err)
      const wait = 1200 * (attempt + 1)
      console.warn(`[whatsapp-agent] chat-text network error, retry ${attempt + 1}/3 in ${wait}ms:`, lastErr)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    if (res.ok) break
    lastStatus = res.status
    if (res.status < 500 && res.status !== 429) {
      lastErr = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`LLM text API error ${res.status}: ${lastErr}`)
    }
    lastErr = (await res.text().catch(() => '')).slice(0, 200)
    const wait = 1200 * (attempt + 1)
    console.warn(`[whatsapp-agent] chat-text ${res.status}, retry ${attempt + 1}/3 in ${wait}ms`)
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res || !res.ok) {
    if (lastStatus === 429 || lastStatus === 503) throw new RateLimitError(`LLM ${lastStatus} after retries`)
    throw new Error(`LLM text API error ${lastStatus} after retries: ${lastErr}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) return content.map((c: any) => c?.text ?? '').join('').trim()
  return ''
}

async function callAnthropicTextOnce(prompt: string): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': LLM_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
}

async function callAnthropicText(prompt: string): Promise<string> {
  if (!LLM_API_KEY) throw new Error('WHATSAPP_LLM_API_KEY not configured')
  let res!: Response
  let lastErr = ''
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await callAnthropicTextOnce(prompt)
    } catch (err) {
      lastStatus = 0
      lastErr = String(err)
      const wait = 1200 * (attempt + 1)
      console.warn(`[whatsapp-agent] anthropic-text network error, retry ${attempt + 1}/3 in ${wait}ms:`, lastErr)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    if (res.ok) break
    lastStatus = res.status
    if (res.status < 500 && res.status !== 429) {
      lastErr = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`Anthropic text API error ${res.status}: ${lastErr}`)
    }
    lastErr = (await res.text().catch(() => '')).slice(0, 200)
    const wait = 1200 * (attempt + 1)
    console.warn(`[whatsapp-agent] anthropic-text ${res.status}, retry ${attempt + 1}/3 in ${wait}ms`)
    await new Promise((r) => setTimeout(r, wait))
  }
  if (!res || !res.ok) {
    if (lastStatus === 429 || lastStatus === 503) throw new RateLimitError(`Anthropic ${lastStatus} after retries`)
    throw new Error(`Anthropic text API error ${lastStatus} after retries: ${lastErr}`)
  }
  const data = await res.json()
  const content = data?.content
  if (Array.isArray(content)) return content.map((c: any) => c?.text ?? '').join('').trim()
  return ''
}

async function callChatText(prompt: string): Promise<string> {
  return LLM_PROVIDER === 'anthropic' ? callAnthropicText(prompt) : callOpenAiChatText(prompt)
}

const LANGUAGE_RULE = `LANGUAGE:
- Detect the language of the incoming message and REPLY IN THAT LANGUAGE.
- Common languages in these groups: English, Albanian (Shqip), German (Deutsch), Portuguese (BR), Spanish, Italian.
- Albanian examples: "përshëndetje" → hello. Reply in fluent Albanian if user writes Albanian.
- German examples: "hallo, geht's dir gut?" → reply in fluent German.
- If user mixes languages, follow their dominant language.
- Never explain that you translated. Just reply in their language.`

const SYSTEM_PROMPT_MENTIONED = `You are the PFT Support Bot, an AI agent in a WhatsApp group for clients of {companyName}.

YOUR CHARACTER — this is your soul. Stay in it while you follow the rules below:
{soul}

You were @-tagged — someone is talking to YOU. ALWAYS engage. Never ignore.

GENERAL RULES:
- Reply helpfully to whatever they ask — questions, chit-chat, opinions, jokes, technical help, product questions.
- Match reply length to the message: quick banter or a status check gets a short answer; a real question, explanation, or troubleshooting step gets as much detail as it needs. This is WhatsApp — conversational, not a formal email — but don't truncate a genuinely useful answer just to seem brief.
- Share only public ticket status, never internal notes.
- Never say "As an AI" or disclaim being a bot. Be direct.

${LANGUAGE_RULE}

TICKET-CREATION RULES (this is the important one — you WILL get spammed):
- DO NOT open tickets carelessly. Skepticism is the default.
- Almost always prefer reply_only over create_ticket. Ask clarifying questions first.
- Before you may call create_ticket, the request MUST have ALL of:
  1. A concrete problem/feature described (not "fix stuff", "make it better")
  2. Enough context to be actionable (what page/feature/product; what happened vs what should)
  3. Either steps to reproduce OR a clear feature-request outcome
  A symptom + comparison ("works on X, breaks on Y", "happens when I do X") already satisfies #3 — that IS a reproduction, don't ask for more.
- If any of the above is missing → reply_only asking ONE focused follow-up question.
- Once a report clears that bar, create the ticket. Don't substitute your own technical guesses or DIY troubleshooting speculation ("could be an iframe permissions issue, try checking...") for actually logging it — you have no access to the codebase or infra to diagnose it for real, and a plausible-sounding guess isn't a fix. That's a job for whoever picks up the ticket.
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

CROSS-GROUP RECALL:
- If asked what you said/did in another group, or to relay something to another group's team, use "Your recent replies in other groups" below.
- Only ever share YOUR OWN past replies, never other people's messages from other groups.
- If nothing relevant is there, say so plainly instead of guessing.

Current group: {groupName}
Company: {companyName} (companyId: {companyId})
Open tickets in this company (last 10):
{recentTickets}

Referenced tickets (details for any ticket key mentioned in this message):
{referencedTickets}

Your recent replies in other groups of this company (most recent last):
{crossGroupContext}

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
      properties: { text: { type: 'string', description: 'Reply text — length should match what the message needs, up to ~1500 chars.' } },
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

async function loadCrossGroupContext(companyId: string, currentGroupJid: string): Promise<string> {
  const otherGroups = await prisma.whatsappGroup.findMany({
    where: { companyId, groupJid: { not: currentGroupJid } },
    select: { groupJid: true, name: true },
  })
  if (!otherGroups.length) return '(no other groups)'
  const nameByJid = new Map(otherGroups.map((g) => [g.groupJid, g.name]))
  const replies = await prisma.whatsappMessage.findMany({
    where: { groupJid: { in: otherGroups.map((g) => g.groupJid) }, replyText: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { groupJid: true, replyText: true, createdAt: true },
  })
  if (!replies.length) return '(no recent replies in other groups)'
  return replies.reverse().map((r) =>
    `- [${nameByJid.get(r.groupJid) ?? r.groupJid}] you said: ${(r.replyText ?? '').slice(0, 200)}`
  ).join('\n')
}

async function loadContext(group: WhatsappGroup, body: string): Promise<{ recentTickets: string; recentMessages: string; referencedTickets: string; crossGroupContext: string }> {
  const [tickets, messages, referencedTickets, crossGroupContext] = await Promise.all([
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
    loadCrossGroupContext(group.companyId, group.groupJid),
  ])
  return {
    recentTickets: tickets.length
      ? tickets.map((t) => `- ${t.key} [${t.status} · ${t.priority}] ${t.title}`).join('\n')
      : '(none)',
    recentMessages: messages.length
      ? messages.reverse().map((m) => `- ${m.senderName ?? 'unknown'}: ${m.body.slice(0, 200)}`).join('\n')
      : '(none)',
    referencedTickets,
    crossGroupContext,
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
      max_tokens: 2048,
      tools: toOpenAiTools(),
      tool_choice: 'required',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
}

function isDegenerateCall(call: { name: string; input: any } | null): boolean {
  if (!call) return true
  if (call.name === 'reply_only' || call.name === 'create_ticket') {
    const text = String(call.input?.text ?? call.input?.replyText ?? '').trim()
    if (text.length < 4) return true
  }
  return false
}

async function callOpenAiCompatAttempt(prompt: string): Promise<{ name: string; input: any } | null> {
  if (!LLM_API_KEY) throw new Error('WHATSAPP_LLM_API_KEY not configured')
  let res!: Response
  let lastErr = ''
  let lastStatus = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await callOpenAiCompatOnce(prompt)
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

async function callOpenAiCompat(prompt: string): Promise<{ name: string; input: any } | null> {
  const first = await callOpenAiCompatAttempt(prompt)
  if (!isDegenerateCall(first)) return first
  console.warn('[whatsapp-agent] degenerate reply from LLM, retrying once:', JSON.stringify(first).slice(0, 200))
  const second = await callOpenAiCompatAttempt(prompt)
  return isDegenerateCall(second) ? null : second
}

async function callAgent(prompt: string): Promise<{ name: string; input: any } | null> {
  return LLM_PROVIDER === 'anthropic' ? callAnthropic(prompt) : callOpenAiCompat(prompt)
}

const DUPLICATE_TITLE_THRESHOLD = 0.6

function titleWords(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2))
}

function titleSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let shared = 0
  Array.from(a).forEach((w) => { if (b.has(w)) shared++ })
  return shared / (a.size + b.size - shared)
}

async function findLikelyDuplicateTicket(companyId: string, proposedTitle: string): Promise<{ id: string; key: string | null } | null> {
  if (!proposedTitle.trim()) return null
  const openTickets = await prisma.ticket.findMany({
    where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT'] } },
    select: { id: true, key: true, title: true },
  })
  const proposedWords = titleWords(proposedTitle)
  let best: { id: string; key: string | null } | null = null
  let bestScore = 0
  for (const t of openTickets) {
    const score = titleSimilarity(proposedWords, titleWords(t.title))
    if (score > bestScore) { bestScore = score; best = { id: t.id, key: t.key } }
  }
  return bestScore >= DUPLICATE_TITLE_THRESHOLD ? best : null
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
    .replace('{crossGroupContext}', ctx.crossGroupContext)
    .replace('{recentMessages}', ctx.recentMessages)
    .replace('{senderName}', input.senderName ?? 'unknown')
    .replace('{messageText}', input.body)

  const call = await callAgent(prompt)
  if (!call) return { action: 'ignore' }

  switch (call.name) {
    case 'ignore_message':
      return { action: 'ignore' }
    case 'reply_only':
      return { action: 'reply', reply: String(call.input.text ?? '').slice(0, 1500) }
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
