'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X, Image as ImageIcon, AtSign, Lock, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommentFormProps {
  ticketId: string
  isAdmin?: boolean
  onCommentAdded?: () => void
  availableUsers?: Array<{ email: string; name: string }>
}

interface MentionMatch {
  start: number
  query: string
}

export default function CommentForm({
  ticketId,
  isAdmin = false,
  onCommentAdded,
  availableUsers = [],
}: CommentFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [internal, setInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([])
  const [mention, setMention] = useState<MentionMatch | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredUsers = mention
    ? availableUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(mention.query.toLowerCase()) ||
          u.email.toLowerCase().includes(mention.query.toLowerCase()),
      ).slice(0, 6)
    : []

  const detectMention = useCallback((value: string, cursor: number): MentionMatch | null => {
    const before = value.slice(0, cursor)
    const atIndex = before.lastIndexOf('@')
    if (atIndex === -1) return null
    const prevChar = atIndex === 0 ? ' ' : before[atIndex - 1]
    if (prevChar !== ' ' && prevChar !== '\n' && atIndex !== 0) return null
    const query = before.slice(atIndex + 1)
    if (/\s/.test(query)) return null
    return { start: atIndex, query }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    const m = detectMention(value, e.target.selectionStart ?? value.length)
    setMention(m)
    setMentionIndex(0)
  }

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget
    const m = detectMention(target.value, target.selectionStart ?? target.value.length)
    setMention(m)
  }

  const insertMention = useCallback(
    (user: { email: string; name: string }) => {
      if (!mention || !textareaRef.current) return
      const before = message.slice(0, mention.start)
      const after = message.slice(mention.start + mention.query.length + 1)
      const insertion = `@${user.name} `
      const next = `${before}${insertion}${after}`
      setMessage(next)
      if (!mentionedUsers.includes(user.email)) {
        setMentionedUsers((prev) => [...prev, user.email])
      }
      setMention(null)
      setMentionIndex(0)
      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.focus()
        const pos = before.length + insertion.length
        ta.setSelectionRange(pos, pos)
      })
    },
    [mention, message, mentionedUsers],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention || filteredUsers.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex((i) => (i + 1) % filteredUsers.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(filteredUsers[mentionIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMention(null)
    }
  }

  useEffect(() => {
    if (mentionIndex >= filteredUsers.length) setMentionIndex(0)
  }, [filteredUsers.length, mentionIndex])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter((f) => {
      const okType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
      const okSize = f.size <= 10 * 1024 * 1024
      return okType && okSize
    })
    setSelectedImages((prev) => [...prev, ...valid])
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeMention = (email: string) => {
    setMentionedUsers((prev) => prev.filter((e) => e !== email))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!message.trim()) {
      setError('Comment message is required')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, internal, mentionedUsers }),
      })
      if (!response.ok) {
        const err = await response.json()
        setError(err.message || 'Failed to add comment')
        return
      }
      const comment = await response.json()

      if (selectedImages.length > 0) {
        const formData = new FormData()
        selectedImages.forEach((file) => formData.append('images', file))
        await fetch(`/api/tickets/${ticketId}/comments/${comment.id}/images`, {
          method: 'POST',
          body: formData,
        })
      }

      setMessage('')
      setInternal(false)
      setSelectedImages([])
      setMentionedUsers([])

      if (onCommentAdded) onCommentAdded()
      else router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-danger-soft border border-danger/30 text-danger px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      <div
        className={cn(
          'relative rounded-xl border bg-bg-elev transition-colors',
          internal
            ? 'border-warn/50 bg-warn-soft/40'
            : 'border-line focus-within:border-ink/40',
        )}
      >
        {internal && (
          <div className="flex items-center gap-1.5 px-4 pt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-warn">
            <Lock className="w-3 h-3" />
            Internal note
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none"
          placeholder={internal ? 'Leave a note for the team…' : 'Write a reply. Use @ to mention teammates.'}
          disabled={isSubmitting}
        />

        {mention && filteredUsers.length > 0 && (
          <div className="absolute z-20 left-3 -bottom-2 translate-y-full w-64 bg-bg-elev border border-line rounded-lg shadow-soft overflow-hidden">
            <div className="px-3 py-1.5 border-b border-line-soft">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Mention {mention.query && `“${mention.query}”`}
              </span>
            </div>
            <ul className="max-h-56 overflow-auto">
              {filteredUsers.map((u, i) => (
                <li key={u.email}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertMention(u)
                    }}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors',
                      i === mentionIndex ? 'bg-ink text-bg' : 'text-ink-soft hover:bg-mute',
                    )}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0',
                        i === mentionIndex ? 'bg-bg text-ink' : 'bg-ink text-bg',
                      )}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div
                        className={cn(
                          'font-mono text-[10px] truncate',
                          i === mentionIndex ? 'text-bg/70' : 'text-ink-faint',
                        )}
                      >
                        {u.email}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-3 py-1.5 border-t border-line-soft font-mono text-[10px] uppercase tracking-widest text-ink-faint flex items-center gap-3">
              <span>↑↓ nav</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        )}
      </div>

      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentionedUsers.map((email) => {
            const user = availableUsers.find((u) => u.email === email)
            return (
              <span
                key={email}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-accent-soft text-accent-ink rounded-md text-xs border border-accent/30"
              >
                <AtSign className="h-3 w-3" />
                {user?.name || email}
                <button
                  type="button"
                  onClick={() => removeMention(email)}
                  className="hover:bg-accent/20 rounded p-0.5"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index + 1}`}
                className="h-16 w-16 object-cover rounded-md border border-line"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 bg-ink text-bg rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
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
            <ImageIcon className="w-3.5 h-3.5" />
            Images
          </Button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setInternal((v) => !v)}
              disabled={isSubmitting}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors border',
                internal
                  ? 'bg-warn text-white border-warn'
                  : 'bg-bg-elev text-ink-soft border-line hover:text-ink hover:border-ink/40',
              )}
            >
              <Lock className="w-3 h-3" />
              Internal
            </button>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting || !message.trim()} size="sm" className="gap-2">
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? 'Sending…' : internal ? 'Post note' : 'Reply'}
        </Button>
      </div>
    </form>
  )
}
