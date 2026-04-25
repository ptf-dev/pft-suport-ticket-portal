'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Ticket Filters Component
 * Requirements: 7.3, 5.1, 5.2
 * 
 * Provides filtering controls for:
 * - Company
 * - TicketStatus
 * - TicketPriority
 * - Assignment (Assigned To)
 */
interface TicketFiltersProps {
  companies: { id: string; name: string }[]
  currentFilters: {
    company?: string
    status?: string
    priority?: string
    assignedTo?: string
    search?: string
    dateFilter?: string
    startDate?: string
    endDate?: string
  }
}

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

// Virtual/composite filter options (not real DB statuses)
const VIRTUAL_STATUSES = [
  { value: 'NOT_RESOLVED', label: 'Not Resolved' },
  { value: 'ACTIVE_ONLY', label: 'Active (excl. Waiting & Resolved)' },
  { value: 'DELETED', label: '🗑️ Deleted Tickets' },
]

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export function TicketFilters({ companies, currentFilters }: TicketFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchInput, setSearchInput] = useState(currentFilters.search || '')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [startDate, setStartDate] = useState(currentFilters.startDate || '')
  const [endDate, setEndDate] = useState(currentFilters.endDate || '')

  // Fetch active admin users for assignment filter
  useEffect(() => {
    async function fetchAdminUsers() {
      try {
        const response = await fetch('/api/admin/users')
        if (response.ok) {
          const users = await response.json()
          // Filter for active admin users only
          const activeAdmins = users.filter(
            (user: AdminUser) => user.role === 'ADMIN' && user.isActive
          )
          setAdminUsers(activeAdmins)
        }
      } catch (error) {
        console.error('Failed to fetch admin users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchAdminUsers()
  }, [])

  // Sync search input with URL params when they change externally
  useEffect(() => {
    setSearchInput(currentFilters.search || '')
  }, [currentFilters.search])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Set new timer - wait 500ms after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.set('page', '1')
      router.push(`/admin/tickets?${params.toString()}`)
    }, 500)
  }, [router, searchParams])

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
    params.delete('assignedTo')
    params.delete('search')
    params.delete('dateFilter')
    params.delete('startDate')
    params.delete('endDate')
    params.set('page', '1')
    setSearchInput('') // Clear local search input state
    setStartDate('')
    setEndDate('')
    setShowCustomRange(false)
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const handleQuickFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Remove custom date range when using quick filters
    params.delete('startDate')
    params.delete('endDate')
    
    if (filter === currentFilters.dateFilter) {
      // Toggle off if clicking the same filter
      params.delete('dateFilter')
    } else {
      params.set('dateFilter', filter)
    }
    
    params.set('page', '1')
    setShowCustomRange(false)
    setStartDate('')
    setEndDate('')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const handleCustomRange = () => {
    if (!startDate && !endDate) return

    const params = new URLSearchParams(searchParams.toString())
    
    // Remove quick filter when using custom range
    params.delete('dateFilter')
    
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    
    params.set('page', '1')
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const hasActiveFilters = currentFilters.company || currentFilters.status || currentFilters.priority || currentFilters.assignedTo || currentFilters.search || currentFilters.dateFilter || currentFilters.startDate || currentFilters.endDate

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tickets by ID, title, or description..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchInput && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Dropdowns and Date Filters - All in one row */}
      <div className="flex flex-wrap items-end gap-2">
      {/* Company Filter */}
      <div className="min-w-[140px]">
        <label htmlFor="company-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Company
        </label>
        <select
          id="company-filter"
          value={currentFilters.company || ''}
          onChange={(e) => handleFilterChange('company', e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
      <div className="min-w-[130px]">
        <label htmlFor="status-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Status
        </label>
        <select
          id="status-filter"
          value={currentFilters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
      <div className="min-w-[110px]">
        <label htmlFor="priority-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Priority
        </label>
        <select
          id="priority-filter"
          value={currentFilters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      {/* Assigned To Filter */}
      <div className="min-w-[130px]">
        <label htmlFor="assignedTo-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Assigned To
        </label>
        <select
          id="assignedTo-filter"
          value={currentFilters.assignedTo || ''}
          onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
          disabled={loadingUsers}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">All Agents</option>
          <option value="unassigned">Unassigned</option>
          {adminUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 self-end mb-2" />

      {/* Date Quick Filters */}
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Activity Period
          </label>
          <div className="flex gap-1">
            <Button
              variant={currentFilters.dateFilter === 'lastWeek' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('lastWeek')}
              className="text-xs h-[38px] px-2"
            >
              📅 Last Week
            </Button>
            
            <Button
              variant={currentFilters.dateFilter === 'activeWeek' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickFilter('activeWeek')}
              className="text-xs h-[38px] px-2"
            >
              ⚡ Active Week
            </Button>
            
            <Button
              variant={showCustomRange ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCustomRange(!showCustomRange)}
              className="text-xs h-[38px] px-2"
            >
              📆 Custom
            </Button>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="self-end h-[38px]">
          ✕ Clear All
        </Button>
      )}
    </div>

    {/* Custom Date Range Picker - Collapsible */}
    {showCustomRange && (
      <div className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <label htmlFor="start-date" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        
        <div className="flex-1">
          <label htmlFor="end-date" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        
        <Button
          onClick={handleCustomRange}
          disabled={!startDate && !endDate}
          size="sm"
          className="whitespace-nowrap"
        >
          Apply Range
        </Button>
      </div>
    )}
    </div>
  )
}
