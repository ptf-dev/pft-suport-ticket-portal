'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { CalendarClock, Pin, Forward, CalendarDays, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduleTicketModalProps {
  ticketId: string
  ticketTitle: string
  currentScheduledDate: Date | null
  onClose: () => void
}

function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ScheduleTicketModal({
  ticketId,
  ticketTitle,
  currentScheduledDate,
  onClose,
}: ScheduleTicketModalProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(
    currentScheduledDate ? toISODate(new Date(currentScheduledDate)) : '',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const getQuickDate = (days: number): string => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return toISODate(date)
  }

  const today = getQuickDate(0)
  const tomorrow = getQuickDate(1)
  const nextWeek = getQuickDate(7)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: selectedDate || null }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update schedule')

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to clear schedule')

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const QuickChip = ({
    value,
    icon,
    label,
  }: {
    value: string
    icon: React.ReactNode
    label: string
  }) => (
    <button
      type="button"
      onClick={() => setSelectedDate(value)}
      disabled={loading || success}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors border',
        selectedDate === value
          ? 'bg-ink text-bg border-ink'
          : 'bg-bg-elev text-ink-soft border-line hover:text-ink hover:border-ink/40',
      )}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-elev rounded-xl shadow-soft max-w-md w-full border border-line overflow-hidden animate-fade-up">
        <header className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line-soft">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-mute rounded-lg flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-0.5">
                Schedule ticket
              </div>
              <h2 className="font-display text-xl tracking-tightest text-ink leading-tight truncate">
                {ticketTitle}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-mute hover:text-ink hover:bg-mute transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-danger-soft border border-danger/30 rounded-md text-sm text-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="px-3 py-2 bg-ok-soft border border-ok/30 rounded-md text-sm text-ok">
              Saved.
            </div>
          )}

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-2">
              Quick select
            </label>
            <div className="flex flex-wrap gap-2">
              <QuickChip value={today} icon={<Pin className="w-3 h-3" />} label="Today" />
              <QuickChip value={tomorrow} icon={<Forward className="w-3 h-3" />} label="Tomorrow" />
              <QuickChip value={nextWeek} icon={<CalendarDays className="w-3 h-3" />} label="Next week" />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-2">
              Custom date
            </label>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              minDate={new Date(new Date().setHours(0, 0, 0, 0))}
              placeholder="Pick a date"
              disabled={loading || success}
            />
          </div>

          {currentScheduledDate && (
            <div className="px-3 py-2 bg-mute rounded-md">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                Currently scheduled
              </div>
              <div className="text-sm text-ink mt-0.5">
                {new Date(currentScheduledDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {currentScheduledDate && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={loading || success}
                className="flex-1 text-danger hover:bg-danger-soft hover:border-danger/30"
              >
                Clear
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || success}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success || !selectedDate}
              className="flex-1"
            >
              {loading ? 'Saving…' : success ? 'Saved' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
