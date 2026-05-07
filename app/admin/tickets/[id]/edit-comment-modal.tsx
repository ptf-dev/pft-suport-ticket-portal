'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/markdown-renderer'

interface EditCommentModalProps {
  ticketId: string
  commentId: string
  currentMessage: string
  onClose: () => void
}

export function EditCommentModal({
  ticketId,
  commentId,
  currentMessage,
  onClose,
}: EditCommentModalProps) {
  const router = useRouter()
  const [message, setMessage] = useState(currentMessage)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleSave = async () => {
    if (!message.trim()) return
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update comment')
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">✏️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Comment
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Markdown formatting supported
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              disabled={isSaving}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Tab Buttons */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                !showPreview
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              ✏️ Write
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                showPreview
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              👁️ Preview
            </button>
          </div>

          {/* Editor or Preview */}
          {!showPreview ? (
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm resize-none"
                rows={12}
                placeholder="Write your comment... (Markdown supported)"
                disabled={isSaving}
              />
              
              {/* Markdown Help */}
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Markdown Quick Reference:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">**bold**</code> → <strong>bold</strong></div>
                  <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">*italic*</code> → <em>italic</em></div>
                  <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded"># Heading</code> → Heading</div>
                  <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">- List item</code> → • List item</div>
                  <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">[Link](url)</code> → Link</div>
                  <div><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">`code`</code> → <code>code</code></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[300px]">
              {message.trim() ? (
                <MarkdownRenderer content={message} />
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Nothing to preview. Write something in the Write tab.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !message.trim()}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
