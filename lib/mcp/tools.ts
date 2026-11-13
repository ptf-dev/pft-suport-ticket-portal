import { TicketStatus } from '@prisma/client'
import { PRIORITY_VALUES } from '@/lib/priorities'
import { RELATION_TYPES } from '@/lib/relations'
import {
  addComment,
  addRelation,
  createTicket,
  getTicket,
  listComments,
  listCompanies,
  listRelations,
  listTickets,
  searchTickets,
  setStatus,
} from './operations'

/**
 * The tools the MCP protocol endpoint advertises, and the dispatcher that runs
 * them against the shared ticket operations.
 */

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/** The tool name is not one of TOOLS. */
export class UnknownToolError extends Error {
  constructor(readonly toolName: string) {
    super(`Unknown tool: ${toolName}`)
    this.name = 'UnknownToolError'
  }
}

/** A required argument is missing, or an argument has the wrong type or value. */
export class InvalidArgumentsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidArgumentsError'
  }
}

const STATUS_VALUES = Object.values(TicketStatus)

const str = (description: string) => ({ type: 'string', description })

export const TOOLS: McpTool[] = [
  {
    name: 'list_tickets',
    description: 'List tickets, newest first, optionally filtered by status, priority, company or assignee.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: STATUS_VALUES, description: 'Only tickets in this status' },
        priority: { type: 'string', enum: [...PRIORITY_VALUES], description: 'Only tickets with this priority' },
        companyId: str('Only tickets for this company id'),
        assignedTo: str('Only tickets assigned to this user id'),
        limit: { type: 'integer', minimum: 1, description: 'Maximum number of tickets to return' },
      },
      required: [],
    },
  },
  {
    name: 'search_tickets',
    description: 'Search tickets by text in their title, description or key.',
    inputSchema: {
      type: 'object',
      properties: {
        q: str('Search text'),
        limit: { type: 'integer', minimum: 1, description: 'Maximum number of tickets to return' },
      },
      required: ['q'],
    },
  },
  {
    name: 'get_ticket',
    description: 'Get one ticket with its full details and metadata.',
    inputSchema: {
      type: 'object',
      properties: { id: str('Ticket id') },
      required: ['id'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a ticket for a company.',
    inputSchema: {
      type: 'object',
      properties: {
        title: str('Ticket title'),
        description: str('Ticket description'),
        priority: { type: 'string', enum: [...PRIORITY_VALUES], description: 'Priority; defaults server-side when omitted' },
        category: str('Ticket category'),
        companyId: str('Company id the ticket belongs to'),
      },
      required: ['title', 'description', 'companyId'],
    },
  },
  {
    name: 'list_comments',
    description: 'List the comments on a ticket, oldest first.',
    inputSchema: {
      type: 'object',
      properties: { id: str('Ticket id') },
      required: ['id'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a ticket, as the PFT AI Agent bot.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Ticket id'),
        content: str('Comment text'),
        internal: { type: 'boolean', description: 'Hide the comment from the client' },
      },
      required: ['id', 'content'],
    },
  },
  {
    name: 'set_status',
    description: 'Change a ticket\'s status.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Ticket id'),
        status: { type: 'string', enum: STATUS_VALUES, description: 'The new status' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'list_relations',
    description: 'List the tickets related to a ticket.',
    inputSchema: {
      type: 'object',
      properties: { id: str('Ticket id') },
      required: ['id'],
    },
  },
  {
    name: 'add_relation',
    description: 'Relate a ticket to another ticket.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Source ticket id'),
        targetTicketId: str('Ticket id to relate to'),
        relationType: { type: 'string', enum: [...RELATION_TYPES], description: 'How the source relates to the target' },
      },
      required: ['id', 'targetTicketId', 'relationType'],
    },
  },
  {
    name: 'list_companies',
    description: 'List the companies tickets can be created for.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
]

// The inputSchema is advisory — an MCP client can send anything — so every
// argument is checked here. The operations hand values straight to Prisma,
// where a bad enum is a 500 rather than a clean client error.
type Args = Record<string, unknown>

function requiredString(args: Args, key: string): string {
  const v = args[key]
  if (typeof v !== 'string' || v === '') {
    throw new InvalidArgumentsError(`"${key}" is required and must be a non-empty string`)
  }
  return v
}

function optionalString(args: Args, key: string): string | undefined {
  const v = args[key]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') throw new InvalidArgumentsError(`"${key}" must be a string`)
  return v
}

function optionalBoolean(args: Args, key: string): boolean | undefined {
  const v = args[key]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'boolean') throw new InvalidArgumentsError(`"${key}" must be a boolean`)
  return v
}

function optionalLimit(args: Args): number | undefined {
  const v = args.limit
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) {
    throw new InvalidArgumentsError('"limit" must be a positive integer')
  }
  return v
}

function oneOf<T extends string>(value: string, allowed: readonly T[], key: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidArgumentsError(`"${key}" must be one of: ${allowed.join(', ')}`)
  }
  return value as T
}

function optionalEnum<T extends string>(args: Args, key: string, allowed: readonly T[]): T | undefined {
  const v = optionalString(args, key)
  return v === undefined ? undefined : oneOf(v, allowed, key)
}

export async function callTool(name: string, args: Args = {}): Promise<unknown> {
  const a: Args = args ?? {}
  switch (name) {
    case 'list_tickets':
      return listTickets({
        status: optionalEnum(a, 'status', STATUS_VALUES),
        priority: optionalEnum(a, 'priority', PRIORITY_VALUES),
        companyId: optionalString(a, 'companyId'),
        assignedTo: optionalString(a, 'assignedTo'),
        limit: optionalLimit(a),
      })
    case 'search_tickets':
      return searchTickets({ q: requiredString(a, 'q'), limit: optionalLimit(a) })
    // No baseUrl on get_ticket/list_comments: a tool call has no request host,
    // so attachment URLs stay site-relative.
    case 'get_ticket':
      return getTicket(requiredString(a, 'id'))
    case 'create_ticket':
      return createTicket({
        title: requiredString(a, 'title'),
        description: requiredString(a, 'description'),
        priority: optionalEnum(a, 'priority', PRIORITY_VALUES),
        category: optionalString(a, 'category'),
        companyId: requiredString(a, 'companyId'),
      })
    case 'list_comments':
      return listComments(requiredString(a, 'id'))
    case 'add_comment':
      return addComment(requiredString(a, 'id'), {
        content: requiredString(a, 'content'),
        internal: optionalBoolean(a, 'internal'),
      })
    case 'set_status':
      return setStatus(
        requiredString(a, 'id'),
        oneOf(requiredString(a, 'status'), STATUS_VALUES, 'status')
      )
    case 'list_relations':
      return listRelations(requiredString(a, 'id'))
    case 'add_relation':
      return addRelation(requiredString(a, 'id'), {
        targetTicketId: requiredString(a, 'targetTicketId'),
        relationType: oneOf(requiredString(a, 'relationType'), RELATION_TYPES, 'relationType'),
      })
    case 'list_companies':
      return listCompanies()
    default:
      throw new UnknownToolError(name)
  }
}
