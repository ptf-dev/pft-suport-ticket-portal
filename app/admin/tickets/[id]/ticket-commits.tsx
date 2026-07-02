'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GitCommit, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Commit {
  sha: string
  message: string
  author: string
  date: string
  repo: string
  url: string
}

export function TicketCommits({
  ticketKey,
  commitSearchUrl,
}: {
  ticketKey: string
  commitSearchUrl: string | null
}) {
  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCommits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/github/commits?key=${encodeURIComponent(ticketKey)}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      setCommits(data.commits ?? [])
    } catch {
      setError('Failed to fetch commits')
    } finally {
      setLoading(false)
    }
  }, [ticketKey])

  useEffect(() => {
    fetchCommits()
  }, [fetchCommits])

  const shortSha = (sha: string) => sha.slice(0, 7)
  const repoName = (full: string) => full.split('/').pop() ?? full
  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCommit className="w-4 h-4" />
            Code
            {!loading && commits.length > 0 && (
              <span className="text-ink-mute font-normal">({commits.length})</span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchCommits} disabled={loading} className="h-7 w-7 p-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commit tag</div>
          <code className="font-mono text-sm bg-mute px-2 py-1 rounded text-ink">[{ticketKey}]</code>
          <p className="text-xs text-ink-mute mt-1.5">
            Prefix commit messages with this tag to link commits here.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-warn rounded-lg bg-warn-soft border border-warn px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-4 text-center">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto text-ink-mute" />
            <p className="text-xs text-ink-mute mt-2">Searching GitHub...</p>
          </div>
        ) : commits.length === 0 && !error ? (
          <p className="text-xs text-ink-mute text-center py-3">No commits found with [{ticketKey}]</p>
        ) : (
          <div className="space-y-1.5">
            {commits.map((c) => (
              <a
                key={c.sha}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 rounded-lg border border-line hover:border-accent/40 hover:bg-bg-sunken px-3 py-2 transition-colors"
              >
                <GitCommit className="w-3.5 h-3.5 mt-1 shrink-0 text-ink-mute group-hover:text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate group-hover:text-accent">{c.message}</p>
                  <div className="flex items-center gap-2 text-[11px] text-ink-mute mt-0.5">
                    <code className="font-mono">{shortSha(c.sha)}</code>
                    <span>·</span>
                    <span>{c.author}</span>
                    <span>·</span>
                    <span className="text-ink-faint">{repoName(c.repo)}</span>
                    <span>·</span>
                    <span>{timeAgo(c.date)}</span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 mt-1 shrink-0 text-ink-faint opacity-0 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        )}

        {commitSearchUrl && (
          <a
            href={commitSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mt-1"
          >
            View all on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </CardContent>
    </Card>
  )
}
