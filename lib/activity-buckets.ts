export type ActivityBucket =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7'
  | 'lastWeek'
  | 'thisMonth'
  | 'older'
  | 'stale'

export const BUCKET_ORDER: ActivityBucket[] = [
  'today',
  'yesterday',
  'thisWeek',
  'last7',
  'lastWeek',
  'thisMonth',
  'older',
  'stale',
]

export const BUCKET_LABELS: Record<ActivityBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This week',
  last7: 'Last 7 days',
  lastWeek: 'Last week',
  thisMonth: 'This month',
  older: 'Older',
  stale: 'Stale (30d+)',
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function startOfWeek(d: Date): Date {
  const r = startOfDay(d)
  const day = r.getDay()
  const diff = day === 0 ? 6 : day - 1
  r.setDate(r.getDate() - diff)
  return r
}

function startOfMonth(d: Date): Date {
  const r = startOfDay(d)
  r.setDate(1)
  return r
}

export function bucketRange(bucket: ActivityBucket, now = new Date()): { gte?: Date; lt?: Date } {
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  const yesterday = addDays(today, -1)
  const weekStart = startOfWeek(now)
  const lastWeekStart = addDays(weekStart, -7)
  const sevenDaysAgo = addDays(today, -7)
  const monthStart = startOfMonth(now)
  const thirtyDaysAgo = addDays(today, -30)

  switch (bucket) {
    case 'today':
      return { gte: today, lt: tomorrow }
    case 'yesterday':
      return { gte: yesterday, lt: today }
    case 'thisWeek':
      return { gte: weekStart, lt: tomorrow }
    case 'last7':
      return { gte: sevenDaysAgo, lt: tomorrow }
    case 'lastWeek':
      return { gte: lastWeekStart, lt: weekStart }
    case 'thisMonth':
      return { gte: monthStart, lt: tomorrow }
    case 'older':
      return { lt: monthStart }
    case 'stale':
      return { lt: thirtyDaysAgo }
  }
}

export function bucketToWhere(bucket: ActivityBucket): Record<string, Date> {
  const r = bucketRange(bucket)
  const out: Record<string, Date> = {}
  if (r.gte) out.gte = r.gte
  if (r.lt) out.lt = r.lt
  return out
}
