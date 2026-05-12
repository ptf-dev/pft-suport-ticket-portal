'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BUCKET_ORDER, BUCKET_LABELS, type ActivityBucket } from '@/lib/activity-buckets'

interface BucketCount {
  key: ActivityBucket
  count: number
}

export function ActivityQuickFilter({
  counts,
  current,
  total,
}: {
  counts: BucketCount[]
  current: string | undefined
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const select = (bucket: ActivityBucket | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (bucket && bucket !== current) {
      params.set('activity', bucket)
    } else {
      params.delete('activity')
    }
    params.delete('dateFilter')
    params.delete('startDate')
    params.delete('endDate')
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const countFor = (k: ActivityBucket) => counts.find((c) => c.key === k)?.count ?? 0

  return (
    <section className="bg-bg-elev border border-line rounded-xl overflow-hidden shadow-card">
      <div className="flex items-baseline justify-between px-5 pt-4 pb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl tracking-tightest text-ink">Activity pulse</h2>
          <span className="text-[11px] uppercase tracking-widest text-ink-mute">
            {current ? `Filtered · ${BUCKET_LABELS[current as ActivityBucket] ?? current}` : 'All time'}
          </span>
        </div>
        <div className="font-mono text-xs text-ink-mute tabular-nums">
          {total} total
        </div>
      </div>
      <div className="rule mx-5" />
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <BucketChip
          label="All"
          count={total}
          active={!current}
          onClick={() => select(null)}
        />
        {BUCKET_ORDER.map((k) => {
          const c = countFor(k)
          return (
            <BucketChip
              key={k}
              label={BUCKET_LABELS[k]}
              count={c}
              active={current === k}
              dim={c === 0}
              onClick={() => select(k)}
              tone={toneFor(k)}
            />
          )
        })}
      </div>
    </section>
  )
}

function toneFor(k: ActivityBucket): 'live' | 'warm' | 'cool' | 'stale' {
  if (k === 'today') return 'live'
  if (k === 'yesterday' || k === 'thisWeek' || k === 'last7') return 'warm'
  if (k === 'stale' || k === 'older') return 'stale'
  return 'cool'
}

function BucketChip({
  label,
  count,
  active,
  dim,
  tone,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  dim?: boolean
  tone?: 'live' | 'warm' | 'cool' | 'stale'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight transition-all',
        'border-line bg-bg text-ink-soft hover:text-ink hover:border-ink/40',
        active && 'border-ink bg-ink text-bg hover:text-bg',
        dim && !active && 'opacity-55',
      )}
    >
      {tone === 'live' && !active && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-pulse" />
        </span>
      )}
      <span>{label}</span>
      <span
        className={cn(
          'font-mono tabular-nums text-[10px] uppercase tracking-widest',
          active ? 'text-bg/70' : 'text-ink-mute group-hover:text-ink-soft',
        )}
      >
        {count}
      </span>
    </button>
  )
}
