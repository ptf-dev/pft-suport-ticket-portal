'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

interface RestoreTicketButtonProps {
  ticketId: string
}

export function RestoreTicketButton({ ticketId }: RestoreTicketButtonProps) {
  const router = useRouter()
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    setIsRestoring(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to restore ticket')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore ticket')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestore}
        disabled={isRestoring}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        {isRestoring ? 'Restoring...' : 'Restore'}
      </Button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
