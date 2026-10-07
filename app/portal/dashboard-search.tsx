'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export function DashboardSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')

  useEffect(() => {
    setSearchValue(searchParams.get('search') || '')
  }, [searchParams])

  const handleSearch = (value: string) => {
    setSearchValue(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    router.push(`/portal?${params.toString()}`)
  }

  const clearSearch = () => {
    setSearchValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')
    router.push(`/portal?${params.toString()}`)
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search recent tickets…"
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-10 w-full rounded-md border border-line bg-bg-elev pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" strokeWidth={1.75} />
      {searchValue && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
