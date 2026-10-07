'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Image as ImageIcon, AtSign, FileText } from 'lucide-react'
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE, isImageMime, isAllowedAttachment } from '@/lib/attachments'

interface CommentFormProps {
  ticketId: string
  availableUsers?: Array<{ email: string; name: string }> // Users that can be mentioned
}

export function CommentForm({ ticketId, availableUsers = [] }: CommentFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = isAllowedAttachment(file.name, file.type)
      const isValidSize = file.size <= MAX_ATTACHMENT_SIZE
      return isValidType && isValidSize
    })
    setSelectedImages(prev => [...prev, ...validFiles])
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleMention = (email: string) => {
    if (!mentionedUsers.includes(email)) {
      setMentionedUsers(prev => [...prev, email])
    }
    setShowMentionDropdown(false)
    setMentionSearch('')

    // Add @mention to message
    const user = availableUsers.find(u => u.email === email)
    if (user && textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart
      const textBefore = message.substring(0, cursorPos)
      const textAfter = message.substring(cursorPos)
      setMessage(`${textBefore}@${user.name} ${textAfter}`)
    }
  }

  const removeMention = (email: string) => {
    setMentionedUsers(prev => prev.filter(e => e !== email))
  }

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      setError('Comment cannot be empty')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create comment
      const response = await fetch(`/api/portal/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mentionedUsers,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      const comment = await response.json()

      // Upload images if any
      if (selectedImages.length > 0) {
        const formData = new FormData()
        selectedImages.forEach(file => {
          formData.append('images', file)
        })

        const imageResponse = await fetch(
          `/api/portal/tickets/${ticketId}/comments/${comment.id}/images`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!imageResponse.ok) {
          console.error('Failed to upload images')
        }
      }

      setMessage('')
      setSelectedImages([])
      setMentionedUsers([])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="message" className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Add a comment
        </Label>
        <textarea
          ref={textareaRef}
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Type your comment here… Use @ to mention someone"
          disabled={isSubmitting}
          className="block w-full rounded-md border border-line bg-bg-elev px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50 leading-relaxed"
        />
      </div>

      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mentionedUsers.map(email => {
            const user = availableUsers.find(u => u.email === email)
            return (
              <span
                key={email}
                className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-xs text-accent-ink"
              >
                <AtSign className="h-3 w-3" />
                {user?.name || email}
                <button
                  type="button"
                  onClick={() => removeMention(email)}
                  className="hover:text-accent"
                  aria-label={`Remove mention of ${user?.name || email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedImages.map((file, index) => (
            <div key={index} className="relative group">
              {isImageMime(file.type) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-md border border-line"
                />
              ) : (
                <div className="h-20 w-20 flex flex-col items-center justify-center gap-1 rounded-md border border-line bg-bg-sunken px-1">
                  <FileText className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
                  <span className="text-[9px] text-ink-mute truncate w-full text-center">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
        >
          <ImageIcon className="h-4 w-4 mr-1" />
          Attach files
        </Button>

        {availableUsers.length > 0 && (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMentionDropdown(!showMentionDropdown)}
              disabled={isSubmitting}
            >
              <AtSign className="h-4 w-4 mr-1" />
              Mention
            </Button>

            {showMentionDropdown && (
              <div className="absolute z-10 mt-1 w-64 rounded-md border border-line bg-bg-elev shadow-soft max-h-60 overflow-auto">
                <input
                  type="text"
                  placeholder="Search people…"
                  value={mentionSearch}
                  onChange={(e) => setMentionSearch(e.target.value)}
                  className="w-full border-b border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <div className="py-1">
                  {filteredUsers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-ink-mute">
                      No one found
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <button
                        key={user.email}
                        type="button"
                        onClick={() => handleMention(user.email)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-mute flex flex-col disabled:opacity-50"
                        disabled={mentionedUsers.includes(user.email)}
                      >
                        <span className="font-medium text-ink">{user.name}</span>
                        <span className="text-xs text-ink-mute">{user.email}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!message.trim() || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Posting…' : 'Post comment'}
      </Button>
    </form>
  )
}
