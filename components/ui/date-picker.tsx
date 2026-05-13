'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  minDate?: Date
  compact?: boolean
  disabled?: boolean
  allowClear?: boolean
}

function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromISO(value?: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  minDate,
  compact,
  disabled,
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = fromISO(value)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const label = selected
    ? selected.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : placeholder

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-md border bg-bg-elev font-medium transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          compact ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-sm',
          selected
            ? 'border-ink/40 text-ink'
            : 'border-line text-ink-soft hover:text-ink hover:border-ink/40',
        )}
      >
        <CalendarIcon className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4', 'text-ink-mute')} />
        <span className={cn('tabular-nums', selected ? 'font-mono text-xs' : '')}>{label}</span>
        {selected && allowClear && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="ml-1 text-ink-mute hover:text-ink cursor-pointer"
            aria-label="Clear"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-bg-elev border border-line rounded-xl shadow-soft overflow-hidden animate-fade-up">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(toISODate(d))
                setOpen(false)
              }
            }}
            disabled={minDate ? { before: minDate } : undefined}
            showOutsideDays
            weekStartsOn={1}
            className="p-3 text-ink"
            classNames={{
              month_caption: 'flex justify-center relative items-center pb-2 h-8',
              caption_label: 'font-display text-base tracking-tightest',
              nav: 'flex items-center justify-between absolute inset-x-2 top-2',
              button_previous: 'inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-mute text-ink-soft hover:text-ink transition-colors',
              button_next: 'inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-mute text-ink-soft hover:text-ink transition-colors',
              chevron: 'w-4 h-4 fill-current',
              month_grid: 'w-full border-collapse mt-1',
              weekdays: 'flex',
              weekday: 'w-9 font-mono text-[10px] uppercase tracking-widest text-ink-faint font-normal',
              week: 'flex w-full mt-1',
              day: 'w-9 h-9 text-center relative p-0',
              day_button: 'w-9 h-9 inline-flex items-center justify-center rounded-md text-sm text-ink-soft hover:bg-mute hover:text-ink transition-colors tabular-nums cursor-pointer',
              selected: '[&>button]:!bg-ink [&>button]:!text-bg hover:[&>button]:!bg-ink',
              today: '[&>button]:text-accent [&>button]:font-semibold',
              outside: '[&>button]:text-ink-faint/60',
              disabled: '[&>button]:text-ink-faint/40 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
            }}
          />
        </div>
      )}
    </div>
  )
}
