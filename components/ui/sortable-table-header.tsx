'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SortableThProps {
  column: string
  label: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  align?: 'left' | 'right' | 'center'
  multiSort?: string // Format: "column1:asc,column2:desc"
  className?: string
}

/** Header cell shared by every table; matches the plain mono eyebrow `th` used across admin and portal. */
export const TABLE_TH_CLASS = 'px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mute whitespace-nowrap'

export function SortableTh({ column, label, currentSort, currentOrder, align = 'left', multiSort, className }: SortableThProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse multi-sort string to get all active sorts
  const sortColumns = multiSort ? multiSort.split(',').map(s => {
    const [col, order] = s.split(':')
    return { column: col, order: order as 'asc' | 'desc' }
  }) : []

  // Find if this column is in the sort list and its position
  const sortIndex = sortColumns.findIndex(s => s.column === column)
  const multiActive = sortIndex !== -1
  const singleActive = !multiSort && currentSort === column
  const isActive = multiActive || singleActive
  const currentColumnOrder = multiActive ? sortColumns[sortIndex].order : singleActive ? currentOrder : 'asc'
  const sortPriority = multiActive ? sortIndex + 1 : null

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())

    // Create new sort array
    let newSortColumns = [...sortColumns]

    if (multiActive) {
      // Column is already in sort - toggle its order
      if (currentColumnOrder === 'asc') {
        newSortColumns[sortIndex].order = 'desc'
      } else {
        // Remove from sort if clicking desc again
        newSortColumns.splice(sortIndex, 1)
      }
    } else {
      // Add new column to sort (becomes primary sort)
      newSortColumns.push({ column, order: 'asc' })
    }

    // Update URL params
    if (newSortColumns.length > 0) {
      const sortString = newSortColumns.map(s => `${s.column}:${s.order}`).join(',')
      params.set('multiSort', sortString)
      // Keep legacy params for backward compatibility
      params.set('sort', newSortColumns[newSortColumns.length - 1].column)
      params.set('order', newSortColumns[newSortColumns.length - 1].order)
    } else {
      params.delete('multiSort')
      params.delete('sort')
      params.delete('order')
    }

    params.set('page', '1') // reset to page 1 on sort change
    router.push(`${pathname}?${params.toString()}`)
  }

  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <th
      onClick={handleClick}
      aria-sort={isActive ? (currentColumnOrder === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(TABLE_TH_CLASS, alignClass, 'cursor-pointer select-none group transition-colors hover:text-ink', isActive && 'text-ink', className)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className="inline-flex items-center gap-1">
          {sortPriority && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ink text-bg text-[9px] font-semibold tabular-nums">
              {sortPriority}
            </span>
          )}
          <span className={cn('flex flex-col gap-px transition-opacity', isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-70')}>
            <svg className={cn('w-2.5 h-2.5', isActive && currentColumnOrder === 'asc' && 'text-accent')} viewBox="0 0 10 6" fill="currentColor">
              <path d="M5 0L10 6H0L5 0Z" />
            </svg>
            <svg className={cn('w-2.5 h-2.5', isActive && currentColumnOrder === 'desc' && 'text-accent')} viewBox="0 0 10 6" fill="currentColor">
              <path d="M5 6L0 0H10L5 6Z" />
            </svg>
          </span>
        </span>
      </span>
    </th>
  )
}
