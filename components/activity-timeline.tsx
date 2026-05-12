import { ActivityType } from '@prisma/client'
import {
  Sparkles, Pencil, Trash2, RotateCcw, ArrowRight, UserPlus, UserMinus,
  CalendarClock, CalendarX, Tag, MessageSquare, MessageSquareOff,
  MessageSquareQuote, ImagePlus, ImageOff, Link2, Link2Off, AtSign, Activity,
} from 'lucide-react'
import { ReactNode } from 'react'

type ActivityEntry = {
  id: string
  type: ActivityType
  fromValue: string | null
  toValue: string | null
  message: string | null
  createdAt: Date
  actor: { name: string | null; role: 'ADMIN' | 'CLIENT' } | null
}

const META: Record<ActivityType, { icon: ReactNode; tone: string; verb: string }> = {
  CREATED:          { icon: <Sparkles className="w-3.5 h-3.5" />,           tone: 'text-pulse',  verb: 'created this ticket' },
  EDITED:           { icon: <Pencil className="w-3.5 h-3.5" />,             tone: 'text-ink',    verb: 'edited' },
  DELETED:          { icon: <Trash2 className="w-3.5 h-3.5" />,             tone: 'text-danger', verb: 'deleted the ticket' },
  RESTORED:         { icon: <RotateCcw className="w-3.5 h-3.5" />,          tone: 'text-ok',     verb: 'restored the ticket' },
  STATUS_CHANGED:   { icon: <ArrowRight className="w-3.5 h-3.5" />,         tone: 'text-accent', verb: 'changed status' },
  PRIORITY_CHANGED: { icon: <ArrowRight className="w-3.5 h-3.5" />,         tone: 'text-warn',   verb: 'changed priority' },
  ASSIGNED:         { icon: <UserPlus className="w-3.5 h-3.5" />,           tone: 'text-info',   verb: 'assigned' },
  UNASSIGNED:       { icon: <UserMinus className="w-3.5 h-3.5" />,          tone: 'text-ink-mute', verb: 'unassigned' },
  SCHEDULED:        { icon: <CalendarClock className="w-3.5 h-3.5" />,      tone: 'text-accent', verb: 'scheduled' },
  UNSCHEDULED:      { icon: <CalendarX className="w-3.5 h-3.5" />,          tone: 'text-ink-mute', verb: 'cleared schedule' },
  CATEGORY_CHANGED: { icon: <Tag className="w-3.5 h-3.5" />,                tone: 'text-ink',    verb: 'changed category' },
  COMMENTED:        { icon: <MessageSquare className="w-3.5 h-3.5" />,      tone: 'text-ink',    verb: 'commented' },
  COMMENT_EDITED:   { icon: <Pencil className="w-3.5 h-3.5" />,             tone: 'text-ink-mute', verb: 'edited a comment' },
  COMMENT_DELETED:  { icon: <MessageSquareOff className="w-3.5 h-3.5" />,   tone: 'text-ink-mute', verb: 'deleted a comment' },
  INTERNAL_NOTE:    { icon: <MessageSquareQuote className="w-3.5 h-3.5" />, tone: 'text-warn',   verb: 'added an internal note' },
  IMAGE_UPLOADED:   { icon: <ImagePlus className="w-3.5 h-3.5" />,          tone: 'text-ink',    verb: 'attached' },
  IMAGE_DELETED:    { icon: <ImageOff className="w-3.5 h-3.5" />,           tone: 'text-ink-mute', verb: 'removed' },
  RELATION_ADDED:   { icon: <Link2 className="w-3.5 h-3.5" />,              tone: 'text-info',   verb: 'linked' },
  RELATION_REMOVED: { icon: <Link2Off className="w-3.5 h-3.5" />,           tone: 'text-ink-mute', verb: 'unlinked' },
  MENTIONED:        { icon: <AtSign className="w-3.5 h-3.5" />,             tone: 'text-accent', verb: 'mentioned' },
}

function groupByDay(entries: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  for (const e of entries) {
    const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0)
    let key: string
    if (d.getTime() === today.getTime()) key = 'Today'
    else if (d.getTime() === yesterday.getTime()) key = 'Yesterday'
    else key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }
  return groups
}

function renderDetail(e: ActivityEntry): ReactNode {
  const meta = META[e.type]
  const actor = e.actor?.name ?? 'Someone'
  const lower = meta.verb

  if (e.type === 'STATUS_CHANGED' || e.type === 'PRIORITY_CHANGED') {
    return (
      <>
        <strong className="text-ink">{actor}</strong> {lower}{' '}
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">{e.fromValue?.replace(/_/g, ' ')}</span>
        {' → '}
        <span className={`font-mono text-[11px] uppercase tracking-wider ${meta.tone}`}>{e.toValue?.replace(/_/g, ' ')}</span>
      </>
    )
  }
  if (e.type === 'ASSIGNED') {
    return <><strong className="text-ink">{actor}</strong> {lower} this to <strong className="text-ink">{e.toValue}</strong></>
  }
  if (e.type === 'UNASSIGNED') {
    return <><strong className="text-ink">{actor}</strong> {lower}{e.fromValue ? <> (was <span className="text-ink-soft">{e.fromValue}</span>)</> : null}</>
  }
  if (e.type === 'SCHEDULED') {
    const to = e.toValue ? new Date(e.toValue) : null
    return <><strong className="text-ink">{actor}</strong> {lower} for <strong className="text-accent">{to?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></>
  }
  if (e.type === 'CATEGORY_CHANGED') {
    return <><strong className="text-ink">{actor}</strong> {lower} to <span className="font-mono text-xs">{e.toValue ?? '(none)'}</span></>
  }
  if (e.type === 'COMMENTED' || e.type === 'INTERNAL_NOTE') {
    return (
      <>
        <strong className="text-ink">{actor}</strong> {lower}
        {e.message && (
          <div className="mt-1.5 border-l-2 border-line-soft pl-3 text-ink-soft italic line-clamp-2">
            &ldquo;{e.message}&rdquo;
          </div>
        )}
      </>
    )
  }
  if (e.type === 'EDITED') {
    return <><strong className="text-ink">{actor}</strong> {lower} {e.message ?? 'this ticket'}</>
  }
  if (e.type === 'IMAGE_UPLOADED' || e.type === 'IMAGE_DELETED') {
    const name = e.toValue || e.fromValue
    return <><strong className="text-ink">{actor}</strong> {lower}{' '}<span className="font-mono text-xs">{name}</span></>
  }
  if (e.type === 'RELATION_ADDED' || e.type === 'RELATION_REMOVED') {
    return <><strong className="text-ink">{actor}</strong> {lower} as <span className="font-mono text-[11px] uppercase tracking-wider">{(e.toValue ?? e.fromValue)?.replace(/_/g, ' ')}</span></>
  }
  return <><strong className="text-ink">{actor}</strong> {lower}</>
}

export function ActivityTimeline({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-ink-mute">
        No activity recorded yet.
      </div>
    )
  }

  const groups = groupByDay(activities)

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([dayLabel, entries]) => (
        <section key={dayLabel}>
          <div className="flex items-center gap-3 mb-3">
            <h4 className="font-display text-sm uppercase tracking-[0.2em] text-ink-mute">
              {dayLabel}
            </h4>
            <div className="flex-1 h-px bg-line-soft" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              {entries.length} {entries.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          <ol className="relative space-y-3 pl-6 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-line-soft">
            {entries.map((e) => {
              const meta = META[e.type]
              return (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-bg-elev border border-line ${meta.tone}`}>
                    {meta.icon}
                  </span>
                  <div className="text-sm text-ink-soft">
                    {renderDetail(e)}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                    {new Date(e.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {e.actor?.role === 'ADMIN' && <span className="ml-2">· ops</span>}
                    {e.actor?.role === 'CLIENT' && <span className="ml-2">· client</span>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
