'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Date Filter Component
 * Provides quick filters and custom date range selection for ticket filtering
 */
export function DateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  const currentQuickFilter = searchParams.get('dateFilter')

  const handleQuickFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Remove custom date range when using quick filters
    params.delete('startDate')
    params.delete('endDate')
    
    if (filter === currentQuickFilter) {
      // Toggle off if clicking the same filter
      params.delete('dateFilter')
    } else {
      params.set('dateFilter', filter)
    }
    
    params.set('page', '1')
    setShowCustomRange(false)
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

  const clearDateFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('dateFilter')
    params.delete('startDate')
    params.delete('endDate')
    params.set('page', '1')
    setStartDate('')
    setEndDate('')
    setShowCustomRange(false)
    router.push(`/admin/tickets?${params.toString()}`)
  }

  const hasDateFilter = currentQuickFilter || startDate || endDate

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Activity Period:
        </label>
        
        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentQuickFilter === 'lastWeek' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter('lastWeek')}
            className="text-xs"
          >
            📅 Last Week
          </Button>
          
          <Button
            variant={currentQuickFilter === 'activeWeek' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter('activeWeek')}
            className="text-xs"
          >
            ⚡ Active Week
          </Button>
          
          <Button
            variant={showCustomRange ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCustomRange(!showCustomRange)}
            className="text-xs"
          >
            📆 Custom Range
          </Button>

          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕ Clear
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomRange && (
        <div className="flex items-end gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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

      {/* Active Filter Display */}
      {hasDateFilter && (
        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <span className="font-medium">Active filter:</span>
          {currentQuickFilter === 'lastWeek' && <span>Last 7 days</span>}
          {currentQuickFilter === 'activeWeek' && <span>Current week (Mon-Sun)</span>}
          {(startDate || endDate) && (
            <span>
              {startDate && `From ${new Date(startDate).toLocaleDateString()}`}
              {startDate && endDate && ' '}
              {endDate && `To ${new Date(endDate).toLocaleDateString()}`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
