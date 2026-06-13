import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SortableTh } from '@/components/ui/sortable-table-header'
import { TablePagination } from '@/components/ui/table-pagination'
import { TicketStatus, TicketPriority } from '@prisma/client'
import Link from 'next/link'
import { TicketFilters } from './ticket-filters'
import { InteractiveTicketBoard } from '@/app/portal/tickets/interactive-ticket-board'
import { RestoreTicketButton } from './restore-ticket-button'
import { TicketTable } from './ticket-table'
import { ActivityQuickFilter } from '@/components/activity-quick-filter'
import { BUCKET_ORDER, bucketToWhere, type ActivityBucket } from '@/lib/activity-buckets'
import { priorityMeta, priorityLabel } from '@/lib/priorities'
import { isBoomerang, boomerangMeta } from '@/lib/boomerang'
import { slaConditions } from '@/lib/sla'
import { cn } from '@/lib/utils'
import { LayoutGrid, Rows3, Plus, ExternalLink, TicketIcon, CalendarClock, Undo2, Rocket, Archive } from 'lucide-react'

const PAGE_SIZE = 20

const SORT_MAP: Record<string, object> = {
  title:      { title: 'asc' },
  company:    { company: { name: 'asc' } },
  status:     { status: 'asc' },
  priority:   { priority: 'asc' },
  createdBy:  { createdBy: { name: 'asc' } },
  assignedTo: { assignedTo: { name: 'asc' } },
  createdAt:  { createdAt: 'asc' },
  updatedAt:  { updatedAt: 'asc' },
}

function applyOrder(obj: any, dir: string): any {
  const result: any = {}
  for (const k of Object.keys(obj)) {
    result[k] = typeof obj[k] === 'object' ? applyOrder(obj[k], dir) : dir
  }
  return result
}

function timeAgo(d: Date): { label: string; fresh: boolean } {
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return { label: 'just now', fresh: true }
  if (mins < 60) return { label: `${mins}m`, fresh: true }
  if (hours < 24) return { label: `${hours}h`, fresh: hours < 6 }
  if (days < 30) return { label: `${days}d`, fresh: false }
  const months = Math.floor(days / 30)
  return { label: `${months}mo`, fresh: false }
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: {
    company?: string
    status?: string
    priority?: string
    assignedTo?: string
    page?: string
    sort?: string
    order?: string
    multiSort?: string
    view?: string
    search?: string
    bounced?: string
    activity?: string
    dateFilter?: string
    startDate?: string
    endDate?: string
    scheduleFilter?: string
    scheduleDate?: string
    sla?: string
    sprint?: string
  }
}) {
  await requireAdmin()

  const view = searchParams.view ?? 'board'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sortKey = SORT_MAP[searchParams.sort ?? ''] ? (searchParams.sort ?? 'updatedAt') : 'updatedAt'
  const order = searchParams.order === 'asc' ? 'asc' : 'desc'
  const showDeleted = searchParams.status === 'DELETED'
  const showArchived = searchParams.status === 'ARCHIVED'
  const multiSort = searchParams.multiSort

  const where: any = { isDeleted: showDeleted }
  // Hide archived tickets from the normal board; show only them in the archive view.
  if (showArchived) where.archivedAt = { not: null }
  else if (!showDeleted) where.archivedAt = null

  if (searchParams.sprint === 'none') where.sprintId = null
  else if (searchParams.sprint) where.sprintId = searchParams.sprint

  if (searchParams.company) where.companyId = searchParams.company
  if (searchParams.status && searchParams.status !== 'DELETED' && searchParams.status !== 'ARCHIVED') {
    if (searchParams.status === 'NOT_RESOLVED') {
      where.status = { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT'] as TicketStatus[] }
    } else if (searchParams.status === 'ACTIVE_ONLY') {
      where.status = { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] as TicketStatus[] }
    } else {
      where.status = searchParams.status as TicketStatus
    }
  }
  if (searchParams.priority) where.priority = searchParams.priority as TicketPriority
  if (searchParams.assignedTo === 'unassigned') where.assignedToId = null
  else if (searchParams.assignedTo) where.assignedToId = searchParams.assignedTo

  // Boomerang filter: reopened-from-WAITING_CLIENT tickets that are active again.
  const bouncedOnly = searchParams.bounced === '1'
  if (bouncedOnly) {
    where.bounceCount = { gt: 0 }
    where.status = { in: ['OPEN', 'IN_PROGRESS'] as TicketStatus[] }
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
      { id: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  const activity = searchParams.activity as ActivityBucket | undefined
  if (activity && BUCKET_ORDER.includes(activity)) {
    where.updatedAt = bucketToWhere(activity)
  } else if (searchParams.dateFilter === 'lastWeek') {
    const lw = new Date(); lw.setDate(lw.getDate() - 7)
    where.updatedAt = { gte: lw }
  } else if (searchParams.dateFilter === 'activeWeek') {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    where.updatedAt = { gte: monday }
  } else if (searchParams.startDate || searchParams.endDate) {
    where.updatedAt = {}
    if (searchParams.startDate) { const s = new Date(searchParams.startDate); s.setHours(0,0,0,0); where.updatedAt.gte = s }
    if (searchParams.endDate) { const e = new Date(searchParams.endDate); e.setHours(23,59,59,999); where.updatedAt.lte = e }
  }

  if (searchParams.scheduleFilter === 'today') {
    const t = new Date(); t.setHours(0,0,0,0); const tm = new Date(t); tm.setDate(tm.getDate()+1)
    where.scheduledDate = { gte: t, lt: tm }
  } else if (searchParams.scheduleFilter === 'tomorrow') {
    const tm = new Date(); tm.setDate(tm.getDate()+1); tm.setHours(0,0,0,0); const da = new Date(tm); da.setDate(da.getDate()+1)
    where.scheduledDate = { gte: tm, lt: da }
  } else if (searchParams.scheduleFilter === 'thisWeek') {
    const now = new Date(); const dow = now.getDay()
    const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1)); mon.setHours(0,0,0,0)
    const sun = new Date(mon); sun.setDate(sun.getDate()+7)
    where.scheduledDate = { gte: mon, lt: sun }
  } else if (searchParams.scheduleFilter === 'unscheduled') {
    where.scheduledDate = null
  } else if (searchParams.scheduleDate) {
    const d = new Date(searchParams.scheduleDate); d.setHours(0,0,0,0); const n = new Date(d); n.setDate(n.getDate()+1)
    where.scheduledDate = { gte: d, lt: n }
  }

  if (searchParams.sla === 'breach' || searchParams.sla === 'risk') {
    where.AND = [...(where.AND ?? []), ...slaConditions(searchParams.sla)]
  }

  let orderBy: any
  if (multiSort) {
    orderBy = multiSort.split(',').map(s => {
      const [col, ord] = s.split(':')
      return { column: col, order: ord as 'asc' | 'desc' }
    }).filter(s => SORT_MAP[s.column]).map(s => applyOrder(SORT_MAP[s.column], s.order))
  } else {
    orderBy = applyOrder(SORT_MAP[sortKey], order)
  }

  const bucketCountsWhere = { ...where }
  delete bucketCountsWhere.updatedAt

  // Active boomerangs (reopened after WAITING_CLIENT) for the attention banner —
  // scoped to the company filter but independent of status/activity/date filters.
  const bouncedWhere: any = {
    isDeleted: false,
    bounceCount: { gt: 0 },
    status: { in: ['OPEN', 'IN_PROGRESS'] as TicketStatus[] },
  }
  if (searchParams.company) bouncedWhere.companyId = searchParams.company

  const [total, tickets, companies, allTotal, bucketCounts, bouncedCount] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      // Board: float boomerangs to the top of each column so they can't get lost.
      orderBy: view === 'board' ? [{ bounceCount: 'desc' }, { updatedAt: 'desc' }] : orderBy,
      skip: view === 'board' ? 0 : (page - 1) * PAGE_SIZE,
      take: view === 'board' ? undefined : PAGE_SIZE,
      include: {
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true, images: true, activities: true } },
      },
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.ticket.count({ where: bucketCountsWhere }),
    Promise.all(BUCKET_ORDER.map(async (k) => ({
      key: k,
      count: await prisma.ticket.count({ where: { ...bucketCountsWhere, updatedAt: bucketToWhere(k) } }),
    }))),
    prisma.ticket.count({ where: bouncedWhere }),
  ])

  const currentSort = searchParams.sort ?? 'updatedAt'
  const currentOrder = (searchParams.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  // Build a tickets URL that keeps every current filter and only changes the
  // given keys (null removes a key). Keeps view + filters in sync when toggling
  // board/table or the bounced banner instead of resetting the page.
  const buildHref = (overrides: Record<string, string | null>): string => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string' && v.length > 0) params.set(k, v)
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `/admin/tickets?${qs}` : '/admin/tickets'
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Every ticket, <em className="italic text-accent">one glance.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute truncate">
            Operations · All tickets
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-line p-0.5">
            <Link href={buildHref({ view: 'board' })}>
              <Button variant={view === 'board' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <LayoutGrid className="w-4 h-4" />Board
              </Button>
            </Link>
            <Link href={buildHref({ view: 'table' })}>
              <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className="gap-2">
                <Rows3 className="w-4 h-4" />Table
              </Button>
            </Link>
          </div>
          <Link href="/admin/sprints">
            <Button variant="outline" size="sm" className="gap-2">
              <Rocket className="w-4 h-4" />Sprints
            </Button>
          </Link>
          <Link href="/admin/tickets?status=ARCHIVED">
            <Button variant={showArchived ? 'default' : 'ghost'} size="sm" className="gap-2">
              <Archive className="w-4 h-4" />Archived
            </Button>
          </Link>
          <Link href="/admin/tickets/new">
            <Button variant="accent" className="gap-2">
              <Plus className="w-4 h-4" />New ticket
            </Button>
          </Link>
        </div>
      </header>

      {bouncedCount > 0 && (
        <Link href={buildHref(bouncedOnly ? { bounced: null, page: null } : { bounced: '1', page: null })} className="block">
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors',
              bouncedOnly
                ? 'border-danger bg-danger-soft text-danger'
                : 'border-line bg-danger-soft text-danger hover:brightness-95',
            )}
          >
            <Undo2 className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span className="font-semibold tabular-nums">{bouncedCount}</span>
            <span>
              ticket{bouncedCount !== 1 ? 's' : ''} bounced back from &ldquo;Waiting&rdquo; — client disagreed it was resolved.{' '}
              {bouncedOnly ? 'Showing these. Click to clear.' : 'Click to prioritise.'}
            </span>
          </div>
        </Link>
      )}

      <ActivityQuickFilter counts={bucketCounts} current={activity} total={allTotal} />

      <TicketFilters
        companies={companies}
        currentFilters={{
          company: searchParams.company,
          status: searchParams.status,
          priority: searchParams.priority,
          assignedTo: searchParams.assignedTo,
          search: searchParams.search,
          dateFilter: searchParams.dateFilter,
          startDate: searchParams.startDate,
          endDate: searchParams.endDate,
          scheduleFilter: searchParams.scheduleFilter,
          scheduleDate: searchParams.scheduleDate,
          sla: searchParams.sla,
        }}
      />

      {view === 'board' ? (
        <InteractiveTicketBoard tickets={tickets} basePath="/admin/tickets" />
      ) : (
        <TicketTable
          tickets={tickets}
          showDeleted={showDeleted}
          currentSort={currentSort}
          currentOrder={currentOrder}
          multiSort={multiSort}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
        />
      )}
    </div>
  )
}
