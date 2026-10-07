import { requireClient } from '@/lib/auth-helpers'
import { ticketAccess, TicketCapability } from '@/lib/ticket-access'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CommentForm } from './comment-form'
import { EditTicketForm } from './edit-ticket-form'
import { AddAttachmentsForm } from './add-attachments-form'
import { TicketStatusForm } from '@/components/ticket-status-form'
import { TicketPriorityForm } from '@/components/ticket-priority-form'
import { DeleteImageButton } from '@/components/delete-image-button'
import { DeleteCommentImageButton } from '@/components/delete-comment-image-button'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { priorityMeta, priorityLabel } from '@/lib/priorities'
import { isImageMime, attachmentOpenLabel } from '@/lib/attachments'
import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { WatchersPanel } from '@/components/watchers-panel'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: { title: true, status: true },
  })

  if (!ticket) {
    return { title: 'Ticket Not Found' }
  }

  return {
    title: `${ticket.title} — PropFirmsTech Support`,
    description: `Support ticket — Status: ${ticket.status.replace('_', ' ')}`,
    openGraph: {
      title: ticket.title,
      description: `Support ticket — Status: ${ticket.status.replace('_', ' ')}`,
      type: 'website',
    },
  }
}

function statusVariant(status: string) {
  switch (status) {
    case 'OPEN':
    case 'BLOCKED':
      return 'destructive' as const
    case 'IN_PROGRESS':
      return 'info' as const
    case 'WAITING_CLIENT':
      return 'warning' as const
    case 'RESOLVED':
      return 'success' as const
    default:
      return 'secondary' as const
  }
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">{label}</div>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  )
}

/**
 * Client Ticket Detail Page
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * Displays:
 * - Full ticket details
 * - Assigned agent name (read-only)
 * - Public comments only (internal=false)
 * - Attached images
 * - Comment form
 */
export default async function ClientTicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Protect route - client only
  const session = await requireClient()
  const companyId = session.user.companyId!

  const access: TicketCapability = await ticketAccess(session.user.id, session.user.role, companyId, params.id)
  if (!access.view) {
    notFound()
  }

  // Query ticket with tenant access validation
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      company: {
        select: { name: true },
      },
      createdBy: {
        select: { name: true, email: true },
      },
      assignedTo: {
        select: { name: true },
      },
      comments: {
        where: { internal: false }, // Only public comments
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { name: true, role: true },
          },
          images: true, // Include comment images
        },
      },
      images: {
        orderBy: { uploadedAt: 'asc' },
      },
    },
  })

  // Ticket existence already confirmed by ticketAccess(), but guard for null narrowing
  if (!ticket) {
    notFound()
  }

  // Get available users for mentions (admins + users from same company)
  const availableUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'ADMIN' },
        { companyId: companyId },
      ],
      isActive: true,
    },
    select: {
      email: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
          <Link href="/portal/tickets" className="inline-flex items-center gap-1 hover:text-ink transition-colors">
            <ArrowLeft className="w-3 h-3" /> Tickets
          </Link>
          <span>·</span>
          <span>{ticket.key ?? `#${ticket.id.slice(0, 8)}`}</span>
          <span>·</span>
          <span>{ticket.company.name}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-3xl tracking-tightest text-ink leading-none">{ticket.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
            <Badge variant={priorityMeta(ticket.priority).badgeVariant}>{priorityLabel(ticket.priority)}</Badge>
          </div>
        </div>
      </header>

      {access.manage && (
        <div className="flex flex-wrap gap-2">
          <EditTicketForm
            ticketId={ticket.id}
            initialTitle={ticket.title}
            initialDescription={ticket.description}
            initialCategory={ticket.category || undefined}
          />
          <AddAttachmentsForm ticketId={ticket.id} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={ticket.description} />
            </CardContent>
          </Card>

          {ticket.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments ({ticket.images.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ticket.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <DeleteImageButton
                        ticketId={ticket.id}
                        imageId={image.id}
                      />
                      {isImageMime(image.mimeType) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt={image.filename}
                            className="w-full h-32 object-cover rounded-lg border border-line"
                          />
                          <div className="absolute inset-0 rounded-lg bg-ink/0 group-hover:bg-ink/60 transition-colors flex items-center justify-center">
                            <a
                              href={image.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-bg opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium"
                            >
                              View full size
                            </a>
                          </div>
                        </>
                      ) : (
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-32 rounded-lg border border-line bg-bg-sunken flex flex-col items-center justify-center gap-1.5 hover:border-ink/40 transition-colors"
                        >
                          <FileText className="w-8 h-8 text-ink-faint" strokeWidth={1.5} />
                          <span className="text-xs text-accent">{attachmentOpenLabel(image.mimeType)}</span>
                        </a>
                      )}
                      <div className="mt-1 text-xs text-ink-mute truncate">
                        {image.filename}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comments ({ticket.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-ink-mute text-center py-8">
                  No comments yet. Be the first to comment.
                </p>
              ) : (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-lg border border-line bg-bg-sunken"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {comment.author.role === 'ADMIN' ? 'Support Team' : comment.author.name}
                        </span>
                        <Badge variant="secondary">{comment.author.role}</Badge>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <MarkdownRenderer content={comment.message} />
                    </div>

                    {comment.images && comment.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {comment.images.map((image) => (
                          <div
                            key={image.id}
                            className="relative group"
                          >
                            <DeleteCommentImageButton
                              ticketId={ticket.id}
                              commentId={comment.id}
                              imageId={image.id}
                            />
                            {isImageMime(image.mimeType) ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={image.url}
                                  alt={image.filename}
                                  className="w-full h-24 object-cover rounded border border-line"
                                />
                                <div className="absolute inset-0 rounded bg-ink/0 group-hover:bg-ink/50 transition-colors flex items-center justify-center">
                                  <a
                                    href={image.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-bg text-xs opacity-0 group-hover:opacity-100"
                                  >
                                    View
                                  </a>
                                </div>
                              </>
                            ) : (
                              <a
                                href={image.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-24 rounded border border-line bg-bg-elev flex flex-col items-center justify-center gap-1 hover:border-ink/40 transition-colors"
                              >
                                <FileText className="w-5 h-5 text-ink-faint" strokeWidth={1.5} />
                                <span className="text-[10px] text-accent">{attachmentOpenLabel(image.mimeType)}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              <div className="pt-4 border-t border-line-soft">
                <CommentForm ticketId={ticket.id} availableUsers={availableUsers} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {access.manage && (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <TicketStatusForm ticketId={ticket.id} currentStatus={ticket.status} />
              </CardContent>
            </Card>
          )}

          {access.manage && (
            <Card>
              <CardHeader>
                <CardTitle>Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <TicketPriorityForm ticketId={ticket.id} currentPriority={ticket.priority} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.category && <InfoRow label="Category">{ticket.category}</InfoRow>}
              <InfoRow label="Assigned to">
                {ticket.assignedTo ? ticket.assignedTo.name : <span className="italic text-ink-faint">Not yet assigned</span>}
              </InfoRow>
              <InfoRow label="Created by">{ticket.createdBy.name}</InfoRow>
              <InfoRow label="Created">{new Date(ticket.createdAt).toLocaleString()}</InfoRow>
              <InfoRow label="Last updated">{new Date(ticket.updatedAt).toLocaleString()}</InfoRow>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <WatchersPanel
                ticketId={ticket.id}
                isAdmin={false}
                canAddWatchers={access.manage}
                currentUserId={session.user.id}
              />
            </CardContent>
          </Card>

          <Card className="bg-accent-soft border-accent/30">
            <CardContent className="pt-6">
              <h3 className="font-display text-xl tracking-tightest text-ink mb-2">Need help?</h3>
              <p className="text-sm text-ink-soft mb-4">
                Our support team typically responds within 24 hours. For urgent issues, mark your ticket as &quot;Urgent&quot;.
              </p>
              <Link href="/portal/tickets/new">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Plus className="w-3.5 h-3.5" /> Create another ticket
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
