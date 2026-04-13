'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
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
    
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/admin/tickets')
  }

  const hasActiveFilters = currentFilters.company || currentFilters.status || currentFilters.priority

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Company Filter */}
        <div>
          <Label htmlFor="company-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Company
          </Label>
          <select
            id="company-filter"
            value={currentFilters.company || ''}
            onChange={(e) => handleFilterChange('company', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
          <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </Label>
          <select
            id="status-filter"
            value={currentFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <Label htmlFor="priority-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Priority
          </Label>
          <select
            id="priority-filter"
            value={currentFilters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
