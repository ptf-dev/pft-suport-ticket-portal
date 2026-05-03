'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface DeleteImageButtonProps {
  ticketId: string
  imageId: string
  apiBasePath?: string
}

export function DeleteImageButton({
  ticketId,
  imageId,
  apiBasePath = '/api/portal/tickets',
}: DeleteImageButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/images/${imageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete image')
      }

      router.refresh()
    } catch (err) {
      console.error('Failed to delete image:', err)
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center gap-2 z-10">
        <span className="text-white text-xs font-medium">Delete?</span>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Yes'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
          >
            No
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setShowConfirm(true)
      }}
      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      title="Delete image"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}
