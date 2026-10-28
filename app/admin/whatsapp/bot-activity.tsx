import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

const DECISION: Record<string, { label: string; tone: string }> = {
  create_ticket:     { label: 'Ticket opened',      tone: 'text-ok' },
  comment_on_ticket: { label: 'Commented',          tone: 'text-ok' },
  ignore:            { label: 'Ignored by model',   tone: 'text-warn' },
  processing:        { label: 'Processing',         tone: 'text-info' },
  rate_limited:      { label: 'LLM rate-limited',   tone: 'text-danger' },
  error:             { label: 'Error',              tone: 'text-danger' },
  mention_only_skip: { label: 'Not tagged',         tone: 'text-ink-faint' },
  group_unmapped:    { label: 'Group not mapped',   tone: 'text-warn' },
  group_disabled:    { label: 'Group disabled',     tone: 'text-warn' },
  bot_echo:          { label: "Bot's own message",  tone: 'text-ink-faint' },
  body_too_short:    { label: 'Too short',          tone: 'text-ink-faint' },
  dm_silent:         { label: 'DM (silent)',        tone: 'text-ink-faint' },
  dm_from_bot:       { label: 'DM from bot',        tone: 'text-ink-faint' },
}

/** Why the bot did or did not act on each of the last messages — the first place to look when "the ticket was not created". */
export async function BotActivity() {
  const messages = await prisma.whatsappMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, groupJid: true, senderName: true, senderJid: true, body: true, wasMentioned: true, filterReason: true, agentAction: true, ticketId: true, createdAt: true },
  })
  const ticketIds = messages.map((m) => m.ticketId).filter((id): id is string => Boolean(id))
  const [groups, tickets] = await Promise.all([
    prisma.whatsappGroup.findMany({ select: { groupJid: true, name: true } }),
    ticketIds.length ? prisma.ticket.findMany({ where: { id: { in: ticketIds } }, select: { id: true, key: true } }) : Promise.resolve([]),
  ])
  const groupName = new Map(groups.map((g) => [g.groupJid, g.name]))
  const ticketKey = new Map(tickets.map((t) => [t.id, t.key]))

  return (
    <section className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-display text-2xl tracking-tightest text-ink">Bot activity</h2>
        <p className="text-xs text-ink-mute mt-1">Last 30 messages the bot saw and what it decided. Start here when a tag did not produce a ticket.</p>
      </div>
      <div className="rule mx-5" />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line-soft">
          <thead className="bg-bg-sunken">
            <tr>
              {['When', 'Chat', 'From', 'Message', 'Tagged', 'Decision', 'Ticket'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mute whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {messages.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-mute">No messages yet.</td></tr>
            ) : messages.map((m) => {
              const code = m.filterReason ?? m.agentAction ?? 'processing'
              const decision = DECISION[code] ?? { label: code, tone: 'text-ink-soft' }
              const chat = groupName.get(m.groupJid) ?? (m.groupJid.endsWith('@g.us') ? 'Unmapped group' : 'Direct message')
              const key = m.ticketId ? ticketKey.get(m.ticketId) ?? m.ticketId.slice(0, 8) : null
              return (
                <tr key={m.id} className="hover:bg-bg-sunken transition-colors align-top">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-ink-mute">
                    {new Date(m.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink whitespace-nowrap max-w-[180px] truncate">{chat}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{m.senderName?.trim() || m.senderJid.split('@')[0]}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft min-w-[280px] max-w-[480px]">
                    <span className="line-clamp-2">{m.body}</span>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{m.wasMentioned ? <span className="text-ink">Yes</span> : <span className="text-ink-faint">No</span>}</td>
                  <td className={cn('px-4 py-3 text-sm whitespace-nowrap font-medium', decision.tone)}>{decision.label}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {m.ticketId ? (
                      <Link href={`/admin/tickets/${m.ticketId}`} className="font-mono text-accent hover:text-accent-ink">{key}</Link>
                    ) : <span className="text-ink-faint">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
