'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface SortableThProps {
  column: string
  label: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  align?: 'left' | 'right' | 'center'
  multiSort?: string // Format: "column1:asc,column2:desc"
}

export function SortableTh({ column, label, currentSort, currentOrder, align = 'left', multiSort }: SortableThProps) {
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
  const isActive = sortIndex !== -1
  const currentColumnOrder = isActive ? sortColumns[sortIndex].order : 'asc'
  const sortPriority = isActive ? sortIndex + 1 : null

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Create new sort array
    let newSortColumns = [...sortColumns]
    
    if (isActive) {
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
      className={`px-6 py-4 ${alignClass} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none group hover:text-gray-900 dark:hover:text-white transition-colors`}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className="inline-flex items-center gap-1">
          {/* Sort priority badge */}
          {sortPriority && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-blue-500 rounded-full">
              {sortPriority}
            </span>
          )}
          {/* Sort direction arrows */}
          <span className={`flex flex-col gap-px transition-opacity ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`}>
            <svg className={`w-2.5 h-2.5 ${isActive && currentColumnOrder === 'asc' ? 'text-blue-500' : ''}`} viewBox="0 0 10 6" fill="currentColor">
              <path d="M5 0L10 6H0L5 0Z" />
            </svg>
            <svg className={`w-2.5 h-2.5 ${isActive && currentColumnOrder === 'desc' ? 'text-blue-500' : ''}`} viewBox="0 0 10 6" fill="currentColor">
              <path d="M5 6L0 0H10L5 6Z" />
            </svg>
          </span>
        </span>
      </span>
    </th>
  )
}
