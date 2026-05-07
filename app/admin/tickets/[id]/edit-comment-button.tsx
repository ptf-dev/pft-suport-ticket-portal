'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { EditCommentModal } from './edit-comment-modal'

interface EditCommentButtonProps {
  ticketId: string
  commentId: string
  currentMessage: string
}

export function EditCommentButton({ ticketId, commentId, currentMessage }: EditCommentButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Edit comment"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {showModal && (
        <EditCommentModal
          ticketId={ticketId}
          commentId={commentId}
          currentMessage={currentMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
