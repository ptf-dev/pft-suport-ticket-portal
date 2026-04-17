'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Image as ImageIcon, AtSign } from 'lucide-react'

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
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
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
      <div>
        <Label htmlFor="message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Add a Comment
        </Label>
        <textarea
          ref={textareaRef}
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Type your comment here... Use @ to mention users"
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
        />
      </div>

      {/* Mentioned Users */}
      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mentionedUsers.map(email => {
            const user = availableUsers.find(u => u.email === email)
            return (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs"
              >
                <AtSign className="h-3 w-3" />
                {user?.name || email}
                <button
                  type="button"
                  onClick={() => removeMention(email)}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedImages.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 object-cover rounded-md border border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
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
          Add Images
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
              Mention User
            </Button>

            {showMentionDropdown && (
              <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={mentionSearch}
                  onChange={(e) => setMentionSearch(e.target.value)}
                  className="w-full px-3 py-2 border-b border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none"
                />
                <div className="py-1">
                  {filteredUsers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <button
                        key={user.email}
                        type="button"
                        onClick={() => handleMention(user.email)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
                        disabled={mentionedUsers.includes(user.email)}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {user.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </span>
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
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!message.trim() || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Posting...' : 'Post Comment'}
      </Button>
    </form>
  )
}
