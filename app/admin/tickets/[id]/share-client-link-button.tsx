'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Check } from 'lucide-react'

interface ShareClientLinkButtonProps {
  ticketId: string
}

export function ShareClientLinkButton({ ticketId }: ShareClientLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const clientLink = `${window.location.origin}/portal/tickets/${ticketId}`
    
    try {
      await navigator.clipboard.writeText(clientLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share Client Link
        </>
      )}
    </Button>
  )
}
