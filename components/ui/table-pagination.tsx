'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TablePaginationProps {
  total: number
  page: number
  pageSize: number
}

export function TablePagination({ total, page, pageSize }: TablePaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build page number list with ellipsis
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const navButton = 'inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-line text-xs font-medium text-ink-soft hover:text-ink hover:bg-mute transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line bg-bg-elev">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mute">
        Showing <span className="text-ink tabular-nums">{from}–{to}</span> of{' '}
        <span className="text-ink tabular-nums">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => goTo(page - 1)} disabled={page === 1} className={navButton} aria-label="Previous page">
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-ink-faint">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p as number)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'w-8 h-8 rounded-md border text-xs tabular-nums transition-colors',
                p === page
                  ? 'bg-ink border-ink text-bg font-semibold'
                  : 'border-line text-ink-soft hover:text-ink hover:bg-mute',
              )}
            >
              {p}
            </button>
          )
        )}

        <button type="button" onClick={() => goTo(page + 1)} disabled={page === totalPages} className={navButton} aria-label="Next page">
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
