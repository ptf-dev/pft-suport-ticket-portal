'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, X, ChevronDown, Pin, Forward, CalendarDays, HelpCircle, AlarmClock, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { PRIORITY_ORDER, priorityLabel } from '@/lib/priorities'
import { SavedViews } from './saved-views'

interface TicketFiltersProps {
  companies: { id: string; name: string; isActive?: boolean }[]
  currentFilters: {
    company?: string
    status?: string
    priority?: string
    assignedTo?: string
    search?: string
    dateFilter?: string
    startDate?: string
    endDate?: string
    scheduleFilter?: string
    scheduleDate?: string
    sla?: string
    sprint?: string
  }
}

const STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']
const PRIORITIES = PRIORITY_ORDER
const VIRTUAL_STATUSES = [
  { value: 'NOT_RESOLVED', label: 'Not Resolved' },
  { value: 'ACTIVE_ONLY', label: 'Active (excl. Waiting & Resolved)' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DELETED', label: 'Deleted' },
]

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  active,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  active: boolean
}) {
  return (
    <label className="relative group inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none h-8 pl-3 pr-8 text-xs rounded-md cursor-pointer font-medium transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ink',
          active
            ? 'border border-ink bg-ink text-bg'
            : 'border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40',
        )}
      >
        {!active && <option value="">{label}</option>}
        {children}
      </select>
      <ChevronDown className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none',
        active ? 'text-bg' : 'text-ink-mute group-hover:text-ink',
      )} />
    </label>
  )
}

function Chip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-ink text-bg border border-ink'
          : 'bg-bg-elev text-ink-soft hover:text-ink border border-line hover:border-ink/40',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function TicketFilters({ companies, currentFilters }: TicketFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [sprints, setSprints] = useState<{ id: string; name: string }[]>([])
  const [searchInput, setSearchInput] = useState(currentFilters.search || '')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [scheduleDate, setScheduleDate] = useState(currentFilters.scheduleDate || '')

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : []))
      .then((users: AdminUser[]) => setAdminUsers(users.filter((u) => u.role === 'ADMIN' && u.isActive)))
      .catch(() => {})
    fetch('/api/admin/sprints')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string; status: string }[]) =>
        setSprints(list.filter((s) => s.status !== 'COMPLETED').map((s) => ({ id: s.id, name: s.name }))),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    setSearchInput(currentFilters.search || '')
  }, [currentFilters.search])

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set('search', value)
        else params.delete('search')
        params.set('page', '1')
        router.push(`/admin/tickets?${params.toString()}`)
      }, 400)
    },
    [router, searchParams],
  )

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const toggleSla = (mode: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === currentFilters.sla) params.delete('sla')
    else params.set('sla', mode)
    params.set('page', '1')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const toggleScheduleFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('scheduleDate')
    if (filter === currentFilters.scheduleFilter) params.delete('scheduleFilter')
    else params.set('scheduleFilter', filter)
    params.set('page', '1')
    setScheduleDate('')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const applyScheduleDate = () => {
    if (!scheduleDate) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('scheduleFilter')
    params.set('scheduleDate', scheduleDate)
    params.set('page', '1')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString())
    ;[
      'company',
      'status',
      'priority',
      'assignedTo',
      'search',
      'dateFilter',
      'startDate',
      'endDate',
      'scheduleFilter',
      'scheduleDate',
      'sla',
      'sprint',
    ].forEach((k) => params.delete(k))
    params.set('page', '1')
    setSearchInput('')
    setScheduleDate('')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const activeCount = [
    currentFilters.company,
    currentFilters.status,
    currentFilters.priority,
    currentFilters.assignedTo,
    currentFilters.search,
    currentFilters.scheduleFilter,
    currentFilters.scheduleDate,
    currentFilters.sla,
    currentFilters.sprint,
  ].filter(Boolean).length

  return (
    <div className="bg-bg-elev border border-line rounded-xl shadow-card overflow-hidden">
      <SavedViews />
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line-soft">
        <Search className="w-4 h-4 text-ink-mute shrink-0" />
        <input
          type="text"
          placeholder="Search by ID, title, or description…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-faint"
        />
        {searchInput && (
          <button
            onClick={() => handleSearchChange('')}
            className="text-ink-mute hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <FilterSelect
          label="Company"
          value={currentFilters.company || ''}
          onChange={(v) => update('company', v)}
          active={!!currentFilters.company}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.isActive === false ? ' · deactivated' : ''}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Status"
          value={currentFilters.status || ''}
          onChange={(v) => update('status', v)}
          active={!!currentFilters.status}
        >
          <optgroup label="Quick">
            {VIRTUAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </optgroup>
          <optgroup label="Specific">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>
            ))}
          </optgroup>
        </FilterSelect>

        <FilterSelect
          label="Priority"
          value={currentFilters.priority || ''}
          onChange={(v) => update('priority', v)}
          active={!!currentFilters.priority}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{priorityLabel(p)}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Assignee"
          value={currentFilters.assignedTo || ''}
          onChange={(v) => update('assignedTo', v)}
          active={!!currentFilters.assignedTo}
        >
          <option value="unassigned">Unassigned</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </FilterSelect>

        {sprints.length > 0 && (
          <FilterSelect
            label="Sprint"
            value={currentFilters.sprint || ''}
            onChange={(v) => update('sprint', v)}
            active={!!currentFilters.sprint}
          >
            <option value="none">Backlog (no sprint)</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </FilterSelect>
        )}

        <div className="h-5 w-px bg-line mx-1" />

        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute self-center">
          Scheduled
        </span>
        <Chip
          active={currentFilters.scheduleFilter === 'today'}
          onClick={() => toggleScheduleFilter('today')}
          icon={<Pin className="w-3 h-3" />}
        >
          Today
        </Chip>
        <Chip
          active={currentFilters.scheduleFilter === 'tomorrow'}
          onClick={() => toggleScheduleFilter('tomorrow')}
          icon={<Forward className="w-3 h-3" />}
        >
          Tomorrow
        </Chip>
        <Chip
          active={currentFilters.scheduleFilter === 'thisWeek'}
          onClick={() => toggleScheduleFilter('thisWeek')}
          icon={<CalendarDays className="w-3 h-3" />}
        >
          Week
        </Chip>
        <Chip
          active={currentFilters.scheduleFilter === 'unscheduled'}
          onClick={() => toggleScheduleFilter('unscheduled')}
          icon={<HelpCircle className="w-3 h-3" />}
        >
          Unscheduled
        </Chip>

        <DatePicker
          compact
          value={scheduleDate}
          onChange={(v) => {
            setScheduleDate(v)
            const params = new URLSearchParams(searchParams.toString())
            params.delete('scheduleFilter')
            if (v) params.set('scheduleDate', v)
            else params.delete('scheduleDate')
            params.set('page', '1')
            router.push(`/admin/tickets?${params.toString()}`)
          }}
          placeholder="Pick date"
        />

        <div className="h-5 w-px bg-line mx-1" />

        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute self-center">
          SLA
        </span>
        <Chip
          active={currentFilters.sla === 'breach'}
          onClick={() => toggleSla('breach')}
          icon={<AlarmClock className="w-3 h-3" />}
        >
          Overdue
        </Chip>
        <Chip
          active={currentFilters.sla === 'risk'}
          onClick={() => toggleSla('risk')}
          icon={<Clock className="w-3 h-3" />}
        >
          At risk
        </Chip>

        {activeCount > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
              {activeCount} active
            </span>
            <button
              onClick={clear}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-line bg-bg text-ink-soft hover:text-ink hover:border-ink/40 text-xs font-medium transition"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
