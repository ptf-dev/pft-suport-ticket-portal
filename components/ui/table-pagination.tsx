'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

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

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Showing <span className="font-semibold text-gray-900 dark:text-white">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{total}</span> results
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p as number)}
              className={`w-9 h-9 text-sm rounded-md border transition-colors ${
                p === page
                  ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
