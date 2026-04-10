import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CommentForm } from './comment-form'

/**
 * Client Ticket Detail Page
 * Requirements: 6.3, 6.4, 6.5
 * 
 * Displays:
 * - Full ticket details
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
      comments: {
        where: { internal: false }, // Only public comments
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { name: true, role: true },
          },
        },
      },
      images: {
        orderBy: { uploadedAt: 'asc' },
      },
    },
  })

  // Return 404 if ticket doesn't exist or belongs to different company
  if (!ticket || ticket.companyId !== companyId) {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/portal/tickets" className="hover:text-primary-600">
              ← Back to Tickets
            </Link>
            <span>•</span>
            <span>#{ticket.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              ticket.status === 'OPEN'
                ? 'destructive'
                : ticket.status === 'IN_PROGRESS'
                ? 'default'
                : ticket.status === 'WAITING_CLIENT'
                ? 'warning'
                : ticket.status === 'RESOLVED'
                ? 'success'
                : 'secondary'
            }
          >
            {ticket.status.replace('_', ' ')}
          </Badge>
          <Badge
            variant={
              ticket.priority === 'URGENT'
                ? 'destructive'
                : ticket.priority === 'HIGH'
                ? 'warning'
                : 'secondary'
            }
          >
            {ticket.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Attached Images */}
          {ticket.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments ({ticket.images.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ticket.images.map((image) => (
                    <div key={image.id} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium"
                        >
                          View Full Size
                        </a>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {image.filename}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Comments ({ticket.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-lg border bg-gray-50 border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.author.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {comment.author.role}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.message}
                    </p>
                  </div>
                ))
              )}

              {/* Comment Form */}
              <div className="pt-4 border-t border-gray-200">
                <CommentForm ticketId={ticket.id} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.category && (
                <div>
                  <div className="text-sm font-medium text-gray-700">Category</div>
                  <div className="text-sm text-gray-900">{ticket.category}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-700">Created By</div>
                <div className="text-sm text-gray-900">{ticket.createdBy.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Created</div>
                <div className="text-sm text-gray-900">
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">Last Updated</div>
                <div className="text-sm text-gray-900">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-800 mb-4">
                Our support team typically responds within 24 hours. For urgent issues, please mark your ticket as "Urgent".
              </p>
              <Link href="/portal/tickets/new">
                <Button variant="outline" size="sm" className="w-full">
                  Create Another Ticket
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
