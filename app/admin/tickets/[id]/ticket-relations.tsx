'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import Link from 'next/link'
import { RELATION_LABEL } from '@/lib/relations'
import { PRIORITY_OPTIONS } from '@/lib/priorities'

const CATEGORIES = [
  'Account Issue', 'Technical Problem', 'Billing Question',
  'Feature Request', 'Bug Report', 'General Inquiry',
  'Platform Access', 'Data Issue', 'Performance Issue',
  'Integration Problem', 'Other',
]

interface RelatedTicket {
  id: string
  title: string
  status: string
  priority: string
}

interface TicketRelation {
  id: string
  type: string
  direction: string
  relatedTicket: RelatedTicket
  createdBy: string
  createdAt: string
}

const RELATION_TYPE_LABELS: Record<string, string> = RELATION_LABEL as Record<string, string>

const RELATION_TYPE_COLORS: Record<string, string> = {
  BLOCKS: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  BLOCKED_BY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  RELATES_TO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IS_IDEA_FOR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  WILL_IMPLEMENT_AFTER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ADDED_TO_ROADMAP: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLONES: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  CLONED_BY: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  DUPLICATES: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  DUPLICATED_BY: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  CAUSES: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  CAUSED_BY: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  TESTS: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  TESTED_BY: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  SPLIT_FROM: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SPLIT_TO: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WAITING_CLIENT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

interface TicketRelationsProps {
  ticketId: string
}

export function TicketRelations({ ticketId }: TicketRelationsProps) {
  const [relations, setRelations] = useState<TicketRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [targetTicketId, setTargetTicketId] = useState('')
  const [relationType, setRelationType] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RelatedTicket[]>([])
  const [searching, setSearching] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newCategory, setNewCategory] = useState('')

  const resetForm = () => {
    setTargetTicketId('')
    setRelationType('')
    setSearchQuery('')
    setSearchResults([])
    setNewTitle('')
    setNewDescription('')
    setNewPriority('MEDIUM')
    setNewCategory('')
    setError('')
  }

  const canSubmit = relationType && (mode === 'existing'
    ? Boolean(targetTicketId)
    : Boolean(newTitle.trim() && newDescription.trim()))

  const fetchRelations = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/relations`)
      if (res.ok) {
        const data = await res.json()
        setRelations(data.relations || [])
      }
    } catch (err) {
      console.error('Failed to fetch relations:', err)
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchRelations()
  }, [fetchRelations])

  const searchTickets = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/tickets/search?q=${encodeURIComponent(query)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        const tickets = (data.tickets || [])
          .filter((t: any) => t.id !== ticketId)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
          }))
        setSearchResults(tickets)
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddRelation = async () => {
    if (!canSubmit) {
      setError(mode === 'existing'
        ? 'Please select a ticket and relation type'
        : 'Title, description and relation type are required')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = mode === 'existing'
        ? { targetTicketId, relationType }
        : {
            relationType,
            newTicket: {
              title: newTitle.trim(),
              description: newDescription.trim(),
              priority: newPriority,
              category: newCategory || null,
            },
          }

      const res = await fetch(`/api/admin/tickets/${ticketId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowAddForm(false)
        resetForm()
        fetchRelations()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add relation')
      }
    } catch (err) {
      setError('Failed to add relation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRelation = async (relationId: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/relations?relationId=${relationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchRelations()
      }
    } catch (err) {
      console.error('Failed to delete relation:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Related Tickets {relations.length > 0 && <span className="text-gray-500">({relations.length})</span>}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (showAddForm) resetForm(); setShowAddForm(!showAddForm) }}
          >
            {showAddForm ? 'Cancel' : '+ Add Relation'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Relation Form */}
        {showAddForm && (
          <div className="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
            <div className="flex gap-1 p-1 rounded-md bg-gray-200/60 dark:bg-gray-900/40 w-fit">
              {(['existing', 'new'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError('') }}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    mode === m
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {m === 'existing' ? 'Link existing' : 'Create new'}
                </button>
              ))}
            </div>

            {mode === 'existing' ? (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Search Ticket
                </label>
                <Input
                  placeholder="Search by title or ticket ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchTickets(e.target.value)
                  }}
                  className="text-sm"
                />
                {searching && (
                  <p className="text-xs text-gray-500 mt-1">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => {
                          setTargetTicketId(ticket.id)
                          setSearchQuery(ticket.title)
                          setSearchResults([])
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                          targetTicketId === ticket.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <span className="font-mono text-xs text-gray-500">#{ticket.id.slice(0, 8)}</span>{' '}
                        <span>{ticket.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {targetTicketId && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Selected: #{targetTicketId.slice(0, 8)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Opens a new ticket for this ticket&apos;s company and links it — no need to leave this page.
                </p>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Brief summary of the new ticket"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="What needs to happen…"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Priority</label>
                    <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="text-sm">
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Category</label>
                    <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="text-sm">
                      <option value="">Select a category (optional)</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Relation Type
              </label>
              <Select
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
                className="text-sm"
              >
                <option value="">Select relation type...</option>
                {Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              size="sm"
              onClick={handleAddRelation}
              disabled={submitting || !canSubmit}
            >
              {submitting
                ? (mode === 'new' ? 'Creating…' : 'Adding...')
                : (mode === 'new' ? 'Create & Link' : 'Add Relation')}
            </Button>
          </div>
        )}

        {/* Relations List */}
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Loading relations...</p>
        ) : relations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No related tickets
          </p>
        ) : (
          <div className="space-y-2">
            {relations.map((relation) => (
              <div
                key={relation.id}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs whitespace-nowrap ${RELATION_TYPE_COLORS[relation.type] || ''}`}
                  >
                    {RELATION_TYPE_LABELS[relation.type] || relation.type}
                  </Badge>
                  <Link
                    href={`/admin/tickets/${relation.relatedTicket.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                  >
                    <span className="font-mono text-xs text-gray-500">#{relation.relatedTicket.id.slice(0, 8)}</span>{' '}
                    {relation.relatedTicket.title}
                  </Link>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${STATUS_COLORS[relation.relatedTicket.status] || ''}`}
                  >
                    {relation.relatedTicket.status.replace('_', ' ')}
                  </Badge>
                </div>
                <button
                  onClick={() => handleDeleteRelation(relation.id)}
                  className="text-gray-400 hover:text-red-500 ml-2 text-sm flex-shrink-0"
                  title="Remove relation"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
