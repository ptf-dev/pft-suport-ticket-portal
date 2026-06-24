'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditTicketFormProps {
  ticketId: string
  initialTitle: string
  initialDescription: string
  initialCategory?: string
  apiBasePath?: string // defaults to '/api/portal/tickets'
}

export function EditTicketForm({
  ticketId,
  initialTitle,
  initialDescription,
  initialCategory,
  apiBasePath = '/api/portal/tickets',
}: EditTicketFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [category, setCategory] = useState(initialCategory || '')
  const [error, setError] = useState('')

  const openModal = () => {
    setTitle(initialTitle)
    setDescription(initialDescription)
    setCategory(initialCategory || '')
    setError('')
    setOpen(true)
  }

  const close = () => {
    if (isLoading) return
    setOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update ticket')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = 'w-full h-9 px-3 text-sm rounded-md border border-line bg-bg-elev text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50'

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line bg-bg-elev text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
      >
        <Pencil className="w-4 h-4" /> Edit ticket
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={close}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-bg-elev border border-line rounded-xl shadow-lg p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl tracking-tightest text-ink">Edit ticket</h3>
              <button type="button" onClick={close} className="text-ink-mute hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Title</span>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
              </label>

              <label className="block space-y-1">
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Description</span>
                  <span className="text-[10px] text-ink-faint">Markdown supported</span>
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full min-h-[220px] px-3 py-2 text-sm rounded-md border border-line bg-bg-elev text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-50 font-mono leading-relaxed"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Category (optional)</span>
                <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} disabled={isLoading} placeholder="e.g., Technical Support, Billing" />
              </label>

              {error && <p className="text-xs text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">{error}</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn('inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-accent-ink font-medium text-sm hover:opacity-90 transition disabled:opacity-50')}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  disabled={isLoading}
                  className="h-9 px-3 rounded-md border border-line text-ink-soft hover:text-ink hover:border-ink/40 text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
