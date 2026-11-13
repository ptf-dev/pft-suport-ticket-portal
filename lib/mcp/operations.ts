import { prisma } from '@/lib/prisma'
import type { TicketPriority, TicketRelationType, TicketStatus } from '@prisma/client'
import { PRIORITY_VALUES } from '@/lib/priorities'
import { RELATION_INVERSE } from '@/lib/relations'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'
import { uniqueTicketKey } from '@/lib/ticket-key'
import { ActivityService } from '@/lib/services/activity'
import { notifyTicketNewComment } from '@/lib/services/whatsapp-notify'

/**
 * Ticket operations shared by the /api/mcp REST routes and the MCP protocol
 * endpoint.
 *
 * Transports keep their own auth, input validation and status codes; the work
 * itself — the Prisma queries, the defaulting and the response shapes agents
 * consume — lives here so both speak about tickets identically.
 */

const MCP_BOT_EMAIL = 'mcp-bot@propfirmstech.com'
const MCP_BOT_NAME = 'PFT AI Agent (Bot)'

/**
 * A referenced ticket or company does not exist. Transports map this to their
 * own not-found response; `resource` tells a relation write which end missed.
 */
export class NotFoundError extends Error {
  constructor(
    message: string,
    readonly resource: 'ticket' | 'company' | 'sourceTicket' | 'targetTicket'
  ) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Image URLs are stored site-relative. HTTP callers pass the request origin to
 * prefix them with; omitting it leaves them relative.
 */
export interface ImageUrlOptions {
  baseUrl?: string
}

export interface ListTicketsInput {
  status?: TicketStatus | null
  priority?: TicketPriority | null
  companyId?: string | null
  assignedTo?: string | null
  limit?: number
}

export async function listTickets(input: ListTicketsInput = {}) {
  const {
    status = null,
    priority = null,
    companyId = null,
    assignedTo = null,
  } = input
  const limit = Math.min(input.limit ?? 20, 100)

  // Build where clause
  const where: any = {
    isDeleted: false,
  }

  if (status) where.status = status
  if (priority) where.priority = priority
  if (companyId) where.companyId = companyId
  if (assignedTo === 'unassigned') {
    where.assignedToId = null
  } else if (assignedTo) {
    where.assignedToId = assignedTo
  }

  const tickets = await prisma.ticket.findMany({
    where,
    take: limit,
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          comments: true,
          images: true,
        },
      },
    },
  })

  return {
    tickets: tickets.map(ticket => ({
      id: ticket.id,
      key: ticket.key,
      title: ticket.title,
      description: ticket.description.substring(0, 200) + (ticket.description.length > 200 ? '...' : ''),
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      company: ticket.company.name,
      createdBy: ticket.createdBy.name,
      assignedTo: ticket.assignedTo?.name || 'Unassigned',
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      commentCount: ticket._count.comments,
      imageCount: ticket._count.images,
    })),
    count: tickets.length,
    // Echoed back so an agent can see which filters actually took effect.
    filters: {
      status,
      priority,
      companyId,
      assignedTo,
      limit,
    },
  }
}

export interface SearchTicketsInput {
  q: string
  limit?: number
}

export async function searchTickets(input: SearchTicketsInput) {
  const query = input.q
  const limit = Math.min(input.limit ?? 10, 50)

  const tickets = await prisma.ticket.findMany({
    where: {
      isDeleted: false,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
      assignedTo: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
  })

  return {
    query,
    results: tickets.map(ticket => ({
      id: ticket.id,
      key: ticket.key,
      title: ticket.title,
      description: ticket.description.substring(0, 150) + '...',
      status: ticket.status,
      priority: ticket.priority,
      company: ticket.company.name,
      createdBy: ticket.createdBy.name,
      assignedTo: ticket.assignedTo?.name || 'Unassigned',
      commentCount: ticket._count.comments,
      updatedAt: ticket.updatedAt,
    })),
    count: tickets.length,
  }
}

export async function getTicket(id: string, options: ImageUrlOptions = {}) {
  const baseUrl = options.baseUrl ?? ''

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              filename: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          filename: true,
        },
      },
    },
  })

  if (!ticket) {
    throw new NotFoundError('Ticket not found', 'ticket')
  }

  // Formatted for LLM consumption
  return {
    ticket: {
      id: ticket.id,
      key: ticket.key,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      company: {
        id: ticket.company.id,
        name: ticket.company.name,
      },
      createdBy: {
        id: ticket.createdBy.id,
        name: ticket.createdBy.name,
        email: ticket.createdBy.email,
      },
      assignedTo: ticket.assignedTo ? {
        id: ticket.assignedTo.id,
        name: ticket.assignedTo.name,
        email: ticket.assignedTo.email,
      } : null,
      assignedAt: ticket.assignedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      isDeleted: ticket.isDeleted,
      comments: ticket.comments.map(comment => ({
        id: comment.id,
        content: comment.message,
        internal: comment.internal,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          role: comment.author.role,
        },
        createdAt: comment.createdAt,
        images: comment.images.map(img => ({
          id: img.id,
          url: `${baseUrl}${img.url}`,
          filename: img.filename,
        })),
      })),
      images: ticket.images.map(img => ({
        id: img.id,
        url: `${baseUrl}${img.url}`,
        filename: img.filename,
      })),
      commentCount: ticket.comments.length,
      imageCount: ticket.images.length,
    },
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: 'PropFirms Ticketing MCP',
    },
  }
}

export interface CreateTicketInput {
  title: string
  description: string
  priority?: string | null
  category?: string | null
  companyId: string
}

export async function createTicket(input: CreateTicketInput) {
  const { title, description, priority, category, companyId } = input

  const ticketPriority: TicketPriority =
    priority && (PRIORITY_VALUES as readonly string[]).includes(priority)
      ? (priority as TicketPriority)
      : 'MEDIUM'

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    throw new NotFoundError('Company not found', 'company')
  }

  const mcpUser = await ensureMcpBotUser()

  const sprintId = await autoSprintIdForPriority(ticketPriority)
  const key = await uniqueTicketKey(companyId)

  const ticket = await prisma.ticket.create({
    data: {
      key,
      title: title.trim(),
      description: description.trim(),
      priority: ticketPriority,
      category: category || null,
      status: 'OPEN',
      companyId,
      createdById: mcpUser.id,
      sprintId,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return {
    success: true,
    ticket: {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      company: ticket.company,
      createdBy: ticket.createdBy,
      createdAt: ticket.createdAt,
    },
  }
}

export async function listComments(ticketId: string, options: ImageUrlOptions = {}) {
  const baseUrl = options.baseUrl ?? ''

  const comments = await prisma.ticketComment.findMany({
    where: {
      ticketId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          filename: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return {
    ticketId,
    comments: comments.map(comment => ({
      id: comment.id,
      content: comment.message,
      internal: comment.internal,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        email: comment.author.email,
        role: comment.author.role,
      },
      createdAt: comment.createdAt,
      images: comment.images.map((img: any) => ({
        id: img.id,
        url: `${baseUrl}${img.url}`,
        filename: img.filename,
      })),
    })),
    count: comments.length,
  }
}

export interface AddCommentInput {
  content: string
  internal?: boolean
}

export async function addComment(ticketId: string, input: AddCommentInput) {
  const { content } = input
  const isInternal = input.internal === true

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    throw new NotFoundError('Ticket not found', 'ticket')
  }

  const mcpUser = await ensureMcpBotUser({ renameStale: true })

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: mcpUser.id,
      message: content,
      internal: isInternal,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  ActivityService.commented(ticketId, mcpUser.id, comment.id, isInternal, content).catch(() => {})

  if (!isInternal) {
    notifyTicketNewComment(ticketId, comment.id).catch((err) => {
      console.error('[mcp/comments] whatsapp notify failed', err)
    })
  }

  return {
    success: true,
    comment: {
      id: comment.id,
      content: comment.message,
      internal: comment.internal,
      author: comment.author,
      createdAt: comment.createdAt,
    },
  }
}

export async function setStatus(ticketId: string, status: TicketStatus) {
  // Capture prior status so we only stamp resolvedAt on transition into RESOLVED
  const existing = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true },
  })

  if (!existing) {
    throw new NotFoundError('Ticket not found', 'ticket')
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt:
        status === 'RESOLVED' && existing.status !== 'RESOLVED'
          ? new Date()
          : status !== 'RESOLVED'
          ? null
          : undefined,
      updatedAt: new Date(),
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
      assignedTo: {
        select: {
          name: true,
        },
      },
    },
  })

  // Add a system comment about the status change
  const mcpUser = await prisma.user.findFirst({
    where: { email: MCP_BOT_EMAIL },
  })

  if (mcpUser) {
    await prisma.ticketComment.create({
      data: {
        ticketId,
        authorId: mcpUser.id,
        message: `Status changed to ${status} by PFT AI Agent`,
      },
    })

    // Log to the activity timeline + maintain boomerang counters (lib/boomerang.ts).
    if (existing.status !== status) {
      ActivityService.statusChanged(ticketId, mcpUser.id, existing.status, status).catch(() => {})
    }
  }

  return {
    success: true,
    ticket: {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      company: ticket.company.name,
      assignedTo: ticket.assignedTo?.name,
      updatedAt: ticket.updatedAt,
    },
  }
}

export async function listRelations(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, title: true },
  })

  if (!ticket) {
    throw new NotFoundError('Ticket not found', 'ticket')
  }

  const relationsAsSource = await prisma.ticketRelation.findMany({
    where: { sourceTicketId: ticketId },
    include: {
      targetTicket: {
        select: { id: true, title: true, status: true, priority: true },
      },
      createdBy: {
        select: { name: true },
      },
    },
  })

  return {
    ticketId,
    ticketTitle: ticket.title,
    relations: relationsAsSource.map(r => ({
      id: r.id,
      type: r.relationType,
      direction: 'outgoing' as const,
      relatedTicket: r.targetTicket,
      createdBy: r.createdBy?.name || 'System',
      createdAt: r.createdAt,
    })),
    count: relationsAsSource.length,
  }
}

export interface AddRelationInput {
  targetTicketId: string
  relationType: TicketRelationType
}

export async function addRelation(ticketId: string, input: AddRelationInput) {
  const { targetTicketId, relationType } = input

  // Verify both tickets exist
  const [sourceTicket, targetTicket] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, title: true } }),
    prisma.ticket.findUnique({ where: { id: targetTicketId }, select: { id: true, title: true } }),
  ])

  if (!sourceTicket) {
    throw new NotFoundError('Source ticket not found', 'sourceTicket')
  }

  if (!targetTicket) {
    throw new NotFoundError('Target ticket not found', 'targetTicket')
  }

  const mcpUser = await prisma.user.findFirst({
    where: { email: MCP_BOT_EMAIL },
  })

  const inverseType = RELATION_INVERSE[relationType]

  const [relation] = await prisma.$transaction([
    prisma.ticketRelation.create({
      data: {
        sourceTicketId: ticketId,
        targetTicketId,
        relationType,
        createdById: mcpUser?.id || null,
      },
      include: {
        sourceTicket: { select: { id: true, title: true } },
        targetTicket: { select: { id: true, title: true } },
      },
    }),
    // Always create the reciprocal row so the relation shows on BOTH tickets
    // (symmetric types like RELATES_TO map to themselves).
    prisma.ticketRelation.create({
      data: {
        sourceTicketId: targetTicketId,
        targetTicketId: ticketId,
        relationType: inverseType,
        createdById: mcpUser?.id || null,
      },
    }),
  ])

  return {
    success: true,
    relation: {
      id: relation.id,
      type: relation.relationType,
      sourceTicket: relation.sourceTicket,
      targetTicket: relation.targetTicket,
      createdAt: relation.createdAt,
    },
  }
}

export async function listCompanies() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          tickets: true,
          users: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return {
    companies: companies.map(company => ({
      id: company.id,
      name: company.name,
      ticketCount: company._count.tickets,
      userCount: company._count.users,
    })),
    count: companies.length,
  }
}

/**
 * Everything the agent writes is attributed to one bot user, created on first
 * use because no migration seeds it.
 *
 * `renameStale` additionally repairs an older row's display name; only the
 * comment path has ever done that, and its author name is the one users see.
 */
async function ensureMcpBotUser(options: { renameStale?: boolean } = {}) {
  let mcpUser = await prisma.user.findFirst({
    where: { email: MCP_BOT_EMAIL },
  })

  if (!mcpUser) {
    return prisma.user.create({
      data: {
        email: MCP_BOT_EMAIL,
        name: MCP_BOT_NAME,
        password: 'mcp-bot-no-login',
        role: 'ADMIN',
        isActive: true,
      },
    })
  }

  if (options.renameStale && mcpUser.name !== MCP_BOT_NAME) {
    mcpUser = await prisma.user.update({
      where: { id: mcpUser.id },
      data: { name: MCP_BOT_NAME },
    })
  }

  return mcpUser
}
