'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface SortableThProps {
  column: string
  label: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  align?: 'left' | 'right' | 'center'
}

export function SortableTh({ column, label, currentSort, currentOrder, align = 'left' }: SortableThProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isActive = currentSort === column
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc'

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', column)
    params.set('order', nextOrder)
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
        <span className={`flex flex-col gap-px transition-opacity ${isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`}>
          <svg className={`w-2.5 h-2.5 ${isActive && currentOrder === 'asc' ? 'text-blue-500' : ''}`} viewBox="0 0 10 6" fill="currentColor">
            <path d="M5 0L10 6H0L5 0Z" />
          </svg>
          <svg className={`w-2.5 h-2.5 ${isActive && currentOrder === 'desc' ? 'text-blue-500' : ''}`} viewBox="0 0 10 6" fill="currentColor">
            <path d="M5 6L0 0H10L5 6Z" />
          </svg>
        </span>
      </span>
    </th>
  )
}
