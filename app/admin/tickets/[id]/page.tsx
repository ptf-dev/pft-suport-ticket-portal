import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import { TicketStatusForm } from './ticket-status-form'
import { TicketPriorityForm } from './ticket-priority-form'
import CommentForm from '@/components/comment-form'
import { EditTicketForm } from '@/app/portal/tickets/[id]/edit-ticket-form'
import { AddAttachmentsForm } from '@/app/portal/tickets/[id]/add-attachments-form'

/**
 * Admin Ticket Detail Page
 * Requirements: 7.4
 * 
 * Displays:
 * - Full ticket details
 * - All comments (public and internal)
 * - Controls to change status and priority
 * - All attached images
 */
export default async function AdminTicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Protect route - admin only
  await requireAdmin()

  // Query ticket with all related data
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      company: {
        select: { name: true, contactEmail: true },
      },
      createdBy: {
        select: { name: true, email: true },
      },
      comments: {
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

  if (!ticket) {
    notFound()
  }

  // Get available users for mentions (all admins + users from ticket's company)
  const availableUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'ADMIN' },
        { companyId: ticket.companyId },
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Ticket #{ticket.id.slice(0, 8)}</span>
          <span>•</span>
          <span>{ticket.company.name}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{ticket.title}</h1>
      </div>

      {/* Edit and Add Attachments Actions */}
      <div className="flex gap-2">
        <EditTicketForm
          ticketId={ticket.id}
          initialTitle={ticket.title}
          initialDescription={ticket.description}
          initialCategory={ticket.category || undefined}
          apiBasePath="/api/admin/tickets"
        />
        <AddAttachmentsForm ticketId={ticket.id} apiBasePath="/api/admin/tickets" />
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
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Attached Images */}
          {ticket.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Images ({ticket.images.length})</CardTitle>
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
            <CardContent>
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-4 mb-6">
                  {ticket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg border ${
                        comment.internal
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {comment.author.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {comment.author.role}
                          </Badge>
                          {comment.internal && (
                            <Badge variant="warning" className="text-xs">
                              Internal Note
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.message}
                      </p>
                      
                      {/* Comment Images */}
                      {comment.images && comment.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {comment.images.map((image: any) => (
                            <a
                              key={image.id}
                              href={image.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.url}
                                alt={image.filename}
                                className="w-full h-24 object-cover rounded border border-gray-300 dark:border-gray-600"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded flex items-center justify-center">
                                <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                                  View
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Comment Form */}
              <div className="border-t dark:border-gray-700 pt-6">
                <CommentForm ticketId={ticket.id} isAdmin={true} availableUsers={availableUsers} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status and Priority Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Current Status
                </label>
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
              </div>

              {/* Change Status */}
              <TicketStatusForm ticketId={ticket.id} currentStatus={ticket.status} />

              {/* Current Priority */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Current Priority
                </label>
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

              {/* Change Priority */}
              <TicketPriorityForm ticketId={ticket.id} currentPriority={ticket.priority} />
            </CardContent>
          </Card>

          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Company</div>
                <div className="text-sm text-gray-900 dark:text-white">{ticket.company.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</div>
                <div className="text-sm text-gray-900 dark:text-white">{ticket.company.contactEmail}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Created By</div>
                <div className="text-sm text-gray-900 dark:text-white">{ticket.createdBy.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.createdBy.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</div>
                <div className="text-sm text-gray-900 dark:text-white">{ticket.category || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Created</div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated</div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
