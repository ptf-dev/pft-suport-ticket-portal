'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

/**
 * Ticket Filters Component
 * Requirements: 7.3
 * 
 * Provides filtering controls for:
 * - Company
 * - TicketStatus
 * - TicketPriority
 */
interface TicketFiltersProps {
  companies: { id: string; name: string }[]
  currentFilters: {
    company?: string
    status?: string
    priority?: string
  }
}

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

// Virtual/composite filter options (not real DB statuses)
const VIRTUAL_STATUSES = [
  { value: 'NOT_RESOLVED', label: 'Not Resolved' },
  { value: 'ACTIVE_ONLY', label: 'Active (excl. Waiting & Resolved)' },
]

export function TicketFilters({ companies, currentFilters }: TicketFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1') // reset to page 1 on filter change
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('company')
    params.delete('status')
    params.delete('priority')
    params.set('page', '1')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const hasActiveFilters = currentFilters.company || currentFilters.status || currentFilters.priority

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Company Filter */}
      <div>
        <label htmlFor="company-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Company
        </label>
        <select
          id="company-filter"
          value={currentFilters.company || ''}
          onChange={(e) => handleFilterChange('company', e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <label htmlFor="status-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Status
        </label>
        <select
          id="status-filter"
          value={currentFilters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <optgroup label="Quick Filters">
            {VIRTUAL_STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Specific Status">
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Priority Filter */}
      <div>
        <label htmlFor="priority-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Priority
        </label>
        <select
          id="priority-filter"
          value={currentFilters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="self-end">
          ✕ Clear
        </Button>
      )}
    </div>
  )
}
