import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isReportedByMe, reporterHref, type PortalSearchParams } from '@/lib/portal-ticket-scope'

interface ReporterFilterProps {
  pathname: string
  searchParams: PortalSearchParams
  allCount: number
  mineCount: number
}

export function ReporterFilter({ pathname, searchParams, allCount, mineCount }: ReporterFilterProps) {
  const mine = isReportedByMe(searchParams)
  const options = [
    { label: 'All tickets', title: 'Tickets reported by anyone in your company', count: allCount, active: !mine, href: reporterHref(pathname, searchParams, false) },
    { label: 'Reported by me', title: 'Only tickets you created', count: mineCount, active: mine, href: reporterHref(pathname, searchParams, true) },
  ]

  return (
    <nav
      aria-label="Filter tickets by reporter"
      className="inline-flex shrink-0 items-center rounded-lg border border-line p-0.5"
    >
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          title={option.title}
          aria-current={option.active ? 'true' : undefined}
          className={cn(buttonVariants({ variant: option.active ? 'default' : 'ghost', size: 'sm' }), 'gap-1.5')}
        >
          {option.label}
          <span className={cn('font-mono tabular-nums', option.active ? 'opacity-70' : 'text-ink-mute')}>
            {option.count}
          </span>
        </Link>
      ))}
    </nav>
  )
}
