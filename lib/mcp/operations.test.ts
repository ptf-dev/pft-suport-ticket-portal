import { prisma } from '@/lib/prisma'
import { ActivityService } from '@/lib/services/activity'
import { notifyTicketNewComment } from '@/lib/services/whatsapp-notify'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'
import { uniqueTicketKey } from '@/lib/ticket-key'
import {
  InvalidOperationError,
  NotFoundError,
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

// These operations are the shared ticket layer behind both the /api/mcp REST
// routes and the MCP protocol endpoint. The REST responses are consumed in
// production by temp/mcp-remote.mjs and the WhatsApp bot, so every field and
// every Prisma `select`/`include` below is a contract, not an implementation
// detail — assert the whole shape so a dropped field fails here rather than in
// a live ticket.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ticketComment: { findMany: jest.fn(), create: jest.fn() },
    ticketRelation: { findMany: jest.fn(), create: jest.fn() },
    company: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/services/activity', () => ({
  ActivityService: { commented: jest.fn(), statusChanged: jest.fn() },
}))
jest.mock('@/lib/services/whatsapp-notify', () => ({ notifyTicketNewComment: jest.fn() }))
jest.mock('@/lib/auto-sprint', () => ({ autoSprintIdForPriority: jest.fn() }))
jest.mock('@/lib/ticket-key', () => ({ uniqueTicketKey: jest.fn() }))

const db = prisma as unknown as {
  ticket: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  ticketComment: { findMany: jest.Mock; create: jest.Mock }
  ticketRelation: { findMany: jest.Mock; create: jest.Mock }
  company: { findMany: jest.Mock; findUnique: jest.Mock }
  user: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  $transaction: jest.Mock
}
const activity = ActivityService as unknown as { commented: jest.Mock; statusChanged: jest.Mock }
const notify = notifyTicketNewComment as unknown as jest.Mock
const autoSprint = autoSprintIdForPriority as unknown as jest.Mock
const ticketKey = uniqueTicketKey as unknown as jest.Mock

/** Frozen so `new Date()` inside the operations is assertable instead of excluded. */
const NOW = new Date('2026-01-02T03:04:05.000Z')
/** Fixture timestamps, deliberately different from NOW. */
const MADE = new Date('2025-06-01T00:00:00.000Z')

const BOT_EMAIL = 'mcp-bot@propfirmstech.com'
const BOT_NAME = 'PFT AI Agent (Bot)'
const bot = { id: 'bot1', email: BOT_EMAIL, name: BOT_NAME }

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ now: NOW.getTime() })
  // The operations treat these as fire-and-forget, so they must be thenable.
  activity.commented.mockResolvedValue(undefined)
  activity.statusChanged.mockResolvedValue(undefined)
  notify.mockResolvedValue(undefined)
  autoSprint.mockResolvedValue(null)
  ticketKey.mockResolvedValue('FTM-042')
})

afterEach(() => {
  jest.useRealTimers()
})

describe('listTickets', () => {
  const row = {
    id: 't1',
    key: 'FTM-042',
    title: 'Login broken',
    description: 'short desc',
    status: 'OPEN',
    priority: 'HIGH',
    category: 'BUG',
    createdAt: MADE,
    updatedAt: MADE,
    company: { id: 'c1', name: 'FTMO' },
    createdBy: { id: 'u1', name: 'Alice' },
    assignedTo: null,
    _count: { comments: 2, images: 1 },
  }

  it('queries with the full include tree and the default limit', async () => {
    db.ticket.findMany.mockResolvedValue([row])

    await listTickets()

    expect(db.ticket.findMany).toHaveBeenCalledWith({
      where: { isDeleted: false },
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { comments: true, images: true } },
      },
    })
  })

  it('returns every field the agents read, and echoes the filters', async () => {
    db.ticket.findMany.mockResolvedValue([row])

    await expect(listTickets()).resolves.toEqual({
      tickets: [
        {
          id: 't1',
          key: 'FTM-042',
          title: 'Login broken',
          description: 'short desc',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'BUG',
          company: 'FTMO',
          createdBy: 'Alice',
          assignedTo: 'Unassigned',
          createdAt: MADE,
          updatedAt: MADE,
          commentCount: 2,
          imageCount: 1,
        },
      ],
      count: 1,
      filters: {
        status: null,
        priority: null,
        companyId: null,
        assignedTo: null,
        limit: 20,
      },
    })
  })

  it('uses the assignee name when the ticket is assigned', async () => {
    db.ticket.findMany.mockResolvedValue([{ ...row, assignedTo: { id: 'u2', name: 'Bob' } }])

    const res = await listTickets()

    expect(res.tickets[0].assignedTo).toBe('Bob')
  })

  it('truncates a long description but leaves a short one whole', async () => {
    db.ticket.findMany.mockResolvedValue([{ ...row, description: 'x'.repeat(250) }])
    const long = await listTickets()
    expect(long.tickets[0].description).toBe('x'.repeat(200) + '...')

    db.ticket.findMany.mockResolvedValue([{ ...row, description: 'x'.repeat(200) }])
    const exact = await listTickets()
    expect(exact.tickets[0].description).toBe('x'.repeat(200))
  })

  it('clamps the limit at 100 and honours anything under it', async () => {
    db.ticket.findMany.mockResolvedValue([])

    await listTickets({ limit: 500 })
    expect(db.ticket.findMany.mock.calls[0][0].take).toBe(100)

    await listTickets({ limit: 5 })
    expect(db.ticket.findMany.mock.calls[1][0].take).toBe(5)
  })

  it('reports the clamped limit back in filters', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res = await listTickets({ limit: 500 })

    expect(res.filters.limit).toBe(100)
  })

  it('narrows the where clause by every supported filter', async () => {
    db.ticket.findMany.mockResolvedValue([])

    await listTickets({ status: 'OPEN', priority: 'HIGH', companyId: 'c1', assignedTo: 'u2' })

    expect(db.ticket.findMany.mock.calls[0][0].where).toEqual({
      isDeleted: false,
      status: 'OPEN',
      priority: 'HIGH',
      companyId: 'c1',
      assignedToId: 'u2',
    })
  })

  it('treats assignedTo=unassigned as a null assignee rather than an id', async () => {
    db.ticket.findMany.mockResolvedValue([])

    await listTickets({ assignedTo: 'unassigned' })

    expect(db.ticket.findMany.mock.calls[0][0].where).toEqual({
      isDeleted: false,
      assignedToId: null,
    })
  })

  it('never returns soft-deleted tickets', async () => {
    db.ticket.findMany.mockResolvedValue([])

    await listTickets()

    expect(db.ticket.findMany.mock.calls[0][0].where.isDeleted).toBe(false)
  })
})

describe('searchTickets', () => {
  const row = {
    id: 't1',
    key: 'FTM-042',
    title: 'Login broken',
    description: 'short desc',
    status: 'OPEN',
    priority: 'HIGH',
    updatedAt: MADE,
    company: { name: 'FTMO' },
    createdBy: { name: 'Alice' },
    assignedTo: null,
    _count: { comments: 2 },
  }

  it('searches title, description and id case-insensitively', async () => {
    db.ticket.findMany.mockResolvedValue([row])

    await searchTickets({ q: 'login' })

    expect(db.ticket.findMany).toHaveBeenCalledWith({
      where: {
        isDeleted: false,
        OR: [
          { title: { contains: 'login', mode: 'insensitive' } },
          { description: { contains: 'login', mode: 'insensitive' } },
          { id: { contains: 'login', mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    })
  })

  it('returns the search result shape, echoing the query', async () => {
    db.ticket.findMany.mockResolvedValue([row])

    await expect(searchTickets({ q: 'login' })).resolves.toEqual({
      query: 'login',
      results: [
        {
          id: 't1',
          key: 'FTM-042',
          title: 'Login broken',
          // Pre-existing quirk: search appends the ellipsis unconditionally,
          // unlike listTickets which checks the length first.
          description: 'short desc...',
          status: 'OPEN',
          priority: 'HIGH',
          company: 'FTMO',
          createdBy: 'Alice',
          assignedTo: 'Unassigned',
          commentCount: 2,
          updatedAt: MADE,
        },
      ],
      count: 1,
    })
  })

  it('clamps the limit at 50 and honours anything under it', async () => {
    db.ticket.findMany.mockResolvedValue([])

    await searchTickets({ q: 'x', limit: 99 })
    expect(db.ticket.findMany.mock.calls[0][0].take).toBe(50)

    await searchTickets({ q: 'x', limit: 3 })
    expect(db.ticket.findMany.mock.calls[1][0].take).toBe(3)
  })
})

describe('getTicket', () => {
  const row = {
    id: 't1',
    key: 'FTM-042',
    title: 'Login broken',
    description: 'full desc',
    status: 'OPEN',
    priority: 'HIGH',
    category: null,
    assignedAt: MADE,
    createdAt: MADE,
    updatedAt: MADE,
    isDeleted: false,
    company: { id: 'c1', name: 'FTMO' },
    createdBy: { id: 'u1', name: 'Alice', email: 'a@x.com' },
    assignedTo: { id: 'u2', name: 'Bob', email: 'b@x.com' },
    comments: [
      {
        id: 'cm1',
        message: 'hi',
        internal: false,
        createdAt: MADE,
        author: { id: 'u1', name: 'Alice', email: 'a@x.com', role: 'ADMIN' },
        images: [{ id: 'i1', url: '/up/a.png', filename: 'a.png' }],
      },
    ],
    images: [{ id: 'i2', url: '/up/b.png', filename: 'b.png' }],
  }

  it('fetches the ticket with its comments, authors and images', async () => {
    db.ticket.findUnique.mockResolvedValue(row)

    await getTicket('t1')

    expect(db.ticket.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
            images: { select: { id: true, url: true, filename: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        images: { select: { id: true, url: true, filename: true } },
      },
    })
  })

  it('returns the full detail envelope with absolute image URLs', async () => {
    db.ticket.findUnique.mockResolvedValue(row)

    await expect(getTicket('t1', { baseUrl: 'https://portal.test' })).resolves.toEqual({
      ticket: {
        id: 't1',
        key: 'FTM-042',
        title: 'Login broken',
        description: 'full desc',
        status: 'OPEN',
        priority: 'HIGH',
        category: null,
        company: { id: 'c1', name: 'FTMO' },
        createdBy: { id: 'u1', name: 'Alice', email: 'a@x.com' },
        assignedTo: { id: 'u2', name: 'Bob', email: 'b@x.com' },
        assignedAt: MADE,
        createdAt: MADE,
        updatedAt: MADE,
        isDeleted: false,
        comments: [
          {
            id: 'cm1',
            // The column is `message`; the API has always called it `content`.
            content: 'hi',
            internal: false,
            author: { id: 'u1', name: 'Alice', email: 'a@x.com', role: 'ADMIN' },
            createdAt: MADE,
            images: [{ id: 'i1', url: 'https://portal.test/up/a.png', filename: 'a.png' }],
          },
        ],
        images: [{ id: 'i2', url: 'https://portal.test/up/b.png', filename: 'b.png' }],
        commentCount: 1,
        imageCount: 1,
      },
      metadata: {
        fetchedAt: '2026-01-02T03:04:05.000Z',
        source: 'PropFirms Ticketing MCP',
      },
    })
  })

  it('returns the ticket key so callers can show FTM-042', async () => {
    db.ticket.findUnique.mockResolvedValue(row)

    const t = await getTicket('t1')

    expect(t).toMatchObject({ ticket: { id: 't1', key: 'FTM-042' } })
  })

  it('leaves image URLs relative when no origin is given', async () => {
    db.ticket.findUnique.mockResolvedValue(row)

    const t = await getTicket('t1')

    expect(t.ticket.images[0].url).toBe('/up/b.png')
    expect(t.ticket.comments[0].images[0].url).toBe('/up/a.png')
  })

  it('nulls assignedTo rather than omitting it', async () => {
    db.ticket.findUnique.mockResolvedValue({ ...row, assignedTo: null })

    const t = await getTicket('t1')

    expect(t.ticket.assignedTo).toBeNull()
  })

  it('throws NotFoundError when the ticket does not exist', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    await expect(getTicket('nope')).rejects.toBeInstanceOf(NotFoundError)
    await expect(getTicket('nope')).rejects.toMatchObject({
      message: 'Ticket not found',
      resource: 'ticket',
    })
  })
})

describe('createTicket', () => {
  const made = {
    id: 't9',
    title: 'T',
    description: 'D',
    status: 'OPEN',
    priority: 'MEDIUM',
    category: null,
    createdAt: MADE,
    company: { id: 'c1', name: 'FTMO' },
    createdBy: { id: 'bot1', name: BOT_NAME, email: BOT_EMAIL },
  }

  beforeEach(() => {
    db.company.findUnique.mockResolvedValue({ id: 'c1', name: 'FTMO' })
    db.user.findFirst.mockResolvedValue(bot)
    db.ticket.create.mockResolvedValue(made)
  })

  it('writes the ticket with a generated key and trimmed text', async () => {
    autoSprint.mockResolvedValue('s1')

    await createTicket({
      title: '  T  ',
      description: '  D  ',
      priority: 'URGENT',
      category: 'BUG',
      companyId: 'c1',
    })

    expect(db.company.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } })
    expect(ticketKey).toHaveBeenCalledWith('c1')
    expect(autoSprint).toHaveBeenCalledWith('URGENT')
    expect(db.ticket.create).toHaveBeenCalledWith({
      data: {
        key: 'FTM-042',
        title: 'T',
        description: 'D',
        priority: 'URGENT',
        category: 'BUG',
        status: 'OPEN',
        companyId: 'c1',
        createdById: 'bot1',
        sprintId: 's1',
      },
      include: {
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })
  })

  it('returns the created-ticket envelope', async () => {
    await expect(createTicket({ title: 'T', description: 'D', companyId: 'c1' })).resolves.toEqual({
      success: true,
      ticket: {
        id: 't9',
        title: 'T',
        description: 'D',
        status: 'OPEN',
        priority: 'MEDIUM',
        category: null,
        company: { id: 'c1', name: 'FTMO' },
        createdBy: { id: 'bot1', name: BOT_NAME, email: BOT_EMAIL },
        createdAt: MADE,
      },
    })
  })

  it('defaults an absent or unrecognised priority to MEDIUM', async () => {
    await createTicket({ title: 'T', description: 'D', companyId: 'c1' })
    expect(db.ticket.create.mock.calls[0][0].data.priority).toBe('MEDIUM')

    await createTicket({ title: 'T', description: 'D', priority: 'NOPE', companyId: 'c1' })
    expect(db.ticket.create.mock.calls[1][0].data.priority).toBe('MEDIUM')
  })

  it('accepts every priority in the shared ladder', async () => {
    await createTicket({ title: 'T', description: 'D', priority: 'BACKLOG', companyId: 'c1' })
    await createTicket({ title: 'T', description: 'D', priority: 'ULTRA_URGENT', companyId: 'c1' })

    expect(db.ticket.create.mock.calls[0][0].data.priority).toBe('BACKLOG')
    expect(db.ticket.create.mock.calls[1][0].data.priority).toBe('ULTRA_URGENT')
  })

  it('stores a blank category as null', async () => {
    await createTicket({ title: 'T', description: 'D', category: '', companyId: 'c1' })

    expect(db.ticket.create.mock.calls[0][0].data.category).toBeNull()
  })

  it('creates the bot user on first use', async () => {
    db.user.findFirst.mockResolvedValue(null)
    db.user.create.mockResolvedValue({ id: 'bot2' })

    await createTicket({ title: 'T', description: 'D', companyId: 'c1' })

    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { email: BOT_EMAIL } })
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        email: BOT_EMAIL,
        name: BOT_NAME,
        password: 'mcp-bot-no-login',
        role: 'ADMIN',
        isActive: true,
      },
    })
    expect(db.ticket.create.mock.calls[0][0].data.createdById).toBe('bot2')
  })

  it('leaves a stale bot name alone on the create path', async () => {
    // Only the comment path has ever repaired the display name; preserved.
    db.user.findFirst.mockResolvedValue({ ...bot, name: 'Old Name' })

    await createTicket({ title: 'T', description: 'D', companyId: 'c1' })

    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when creating against an unknown company', async () => {
    db.company.findUnique.mockResolvedValue(null)

    await expect(createTicket({ title: 'a', description: 'b', companyId: 'nope' }))
      .rejects.toBeInstanceOf(NotFoundError)
    await expect(createTicket({ title: 'a', description: 'b', companyId: 'nope' }))
      .rejects.toMatchObject({ message: 'Company not found', resource: 'company' })
    expect(db.ticket.create).not.toHaveBeenCalled()
  })
})

describe('listComments', () => {
  const row = {
    id: 'cm1',
    message: 'hi',
    internal: true,
    createdAt: MADE,
    author: { id: 'u1', name: 'Alice', email: 'a@x.com', role: 'ADMIN' },
    images: [{ id: 'i1', url: '/up/a.png', filename: 'a.png' }],
  }

  it('reads the thread oldest-first with authors and images', async () => {
    db.ticketComment.findMany.mockResolvedValue([row])

    await listComments('t1')

    expect(db.ticketComment.findMany).toHaveBeenCalledWith({
      where: { ticketId: 't1' },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        images: { select: { id: true, url: true, filename: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('returns the comment list shape with absolute image URLs', async () => {
    db.ticketComment.findMany.mockResolvedValue([row])

    await expect(listComments('t1', { baseUrl: 'https://portal.test' })).resolves.toEqual({
      ticketId: 't1',
      comments: [
        {
          id: 'cm1',
          content: 'hi',
          internal: true,
          author: { id: 'u1', name: 'Alice', email: 'a@x.com', role: 'ADMIN' },
          createdAt: MADE,
          images: [{ id: 'i1', url: 'https://portal.test/up/a.png', filename: 'a.png' }],
        },
      ],
      count: 1,
    })
  })

  it('returns an empty thread for an unknown ticket instead of throwing', async () => {
    // Pre-existing behaviour: this operation never verifies the ticket exists,
    // so the REST route answers 200 with an empty list rather than 404.
    db.ticketComment.findMany.mockResolvedValue([])

    await expect(listComments('nope')).resolves.toEqual({
      ticketId: 'nope',
      comments: [],
      count: 0,
    })
  })

  it('does not look the ticket up unless asked, which is what keeps REST at 200', async () => {
    db.ticketComment.findMany.mockResolvedValue([])

    await listComments('nope', { baseUrl: 'https://portal.test' })

    expect(db.ticket.findUnique).not.toHaveBeenCalled()
  })

  it('throws NotFoundError for an unknown ticket when the caller requires one', async () => {
    // What the MCP tool asks for: an empty success would read to a model as
    // "this ticket has no comments" rather than "there is no such ticket".
    db.ticket.findUnique.mockResolvedValue(null)

    await expect(listComments('nope', {}, { requireTicket: true }))
      .rejects.toBeInstanceOf(NotFoundError)
    expect(db.ticketComment.findMany).not.toHaveBeenCalled()
  })

  it('reads the thread as usual when the required ticket exists', async () => {
    db.ticket.findUnique.mockResolvedValue({ id: 't1' })
    db.ticketComment.findMany.mockResolvedValue([row])

    const result = await listComments('t1', { baseUrl: 'https://portal.test' }, { requireTicket: true })

    expect(db.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 't1' }, select: { id: true } })
    expect(result.count).toBe(1)
    expect(result.comments[0].images[0].url).toBe('https://portal.test/up/a.png')
  })
})

describe('addComment', () => {
  const made = {
    id: 'cm9',
    message: 'added',
    internal: false,
    createdAt: MADE,
    author: { id: 'bot1', name: BOT_NAME, email: BOT_EMAIL, role: 'ADMIN' },
  }

  beforeEach(() => {
    db.ticket.findUnique.mockResolvedValue({ id: 't1' })
    db.user.findFirst.mockResolvedValue(bot)
    db.ticketComment.create.mockResolvedValue(made)
  })

  it('writes the comment as the bot and returns it', async () => {
    const res = await addComment('t1', { content: 'added' })

    expect(db.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } })
    expect(db.ticketComment.create).toHaveBeenCalledWith({
      data: { ticketId: 't1', authorId: 'bot1', message: 'added', internal: false },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    expect(res).toEqual({
      success: true,
      comment: {
        id: 'cm9',
        content: 'added',
        internal: false,
        author: { id: 'bot1', name: BOT_NAME, email: BOT_EMAIL, role: 'ADMIN' },
        createdAt: MADE,
      },
    })
  })

  it('logs the comment to the activity timeline and pings WhatsApp', async () => {
    await addComment('t1', { content: 'added' })

    expect(activity.commented).toHaveBeenCalledWith('t1', 'bot1', 'cm9', false, 'added')
    expect(notify).toHaveBeenCalledWith('t1', 'cm9')
  })

  it('keeps an internal note off WhatsApp', async () => {
    db.ticketComment.create.mockResolvedValue({ ...made, internal: true })

    await addComment('t1', { content: 'added', internal: true })

    expect(db.ticketComment.create.mock.calls[0][0].data.internal).toBe(true)
    expect(activity.commented).toHaveBeenCalledWith('t1', 'bot1', 'cm9', true, 'added')
    expect(notify).not.toHaveBeenCalled()
  })

  it('treats any non-true `internal` as a public comment', async () => {
    await addComment('t1', { content: 'added', internal: undefined })

    expect(db.ticketComment.create.mock.calls[0][0].data.internal).toBe(false)
  })

  it('repairs a stale bot display name, because comment authors are visible', async () => {
    db.user.findFirst.mockResolvedValue({ ...bot, name: 'Old Name' })
    db.user.update.mockResolvedValue({ ...bot, id: 'bot1' })

    await addComment('t1', { content: 'added' })

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'bot1' },
      data: { name: BOT_NAME },
    })
    expect(db.ticketComment.create.mock.calls[0][0].data.authorId).toBe('bot1')
  })

  it('throws NotFoundError when the ticket does not exist', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    await expect(addComment('nope', { content: 'x' })).rejects.toMatchObject({
      message: 'Ticket not found',
      resource: 'ticket',
    })
    expect(db.ticketComment.create).not.toHaveBeenCalled()
  })
})

describe('setStatus', () => {
  const updated = {
    id: 't1',
    title: 'Login broken',
    status: 'RESOLVED',
    priority: 'HIGH',
    updatedAt: MADE,
    company: { name: 'FTMO' },
    assignedTo: { name: 'Bob' },
  }

  beforeEach(() => {
    db.ticket.findUnique.mockResolvedValue({ status: 'OPEN' })
    db.ticket.update.mockResolvedValue(updated)
    db.user.findFirst.mockResolvedValue(bot)
    db.ticketComment.create.mockResolvedValue({ id: 'cm3' })
  })

  it('reads only the prior status, then updates and returns the summary', async () => {
    const res = await setStatus('t1', 'RESOLVED')

    expect(db.ticket.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      select: { status: true },
    })
    expect(db.ticket.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'RESOLVED', resolvedAt: NOW, updatedAt: NOW },
      include: {
        company: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    })
    expect(res).toEqual({
      success: true,
      ticket: {
        id: 't1',
        title: 'Login broken',
        status: 'RESOLVED',
        priority: 'HIGH',
        company: 'FTMO',
        assignedTo: 'Bob',
        updatedAt: MADE,
      },
    })
  })

  it('leaves resolvedAt untouched when a resolved ticket is re-resolved', async () => {
    db.ticket.findUnique.mockResolvedValue({ status: 'RESOLVED' })

    await setStatus('t1', 'RESOLVED')

    // `undefined` means "do not write", which keeps the original resolution time.
    expect(db.ticket.update.mock.calls[0][0].data.resolvedAt).toBeUndefined()
  })

  it('clears resolvedAt on any move away from RESOLVED', async () => {
    db.ticket.findUnique.mockResolvedValue({ status: 'RESOLVED' })

    await setStatus('t1', 'CLOSED')

    // Pre-existing: this discards the resolution timestamp on RESOLVED -> CLOSED.
    expect(db.ticket.update.mock.calls[0][0].data.resolvedAt).toBeNull()
  })

  it('leaves assignedTo undefined when nobody is assigned', async () => {
    db.ticket.update.mockResolvedValue({ ...updated, assignedTo: null })

    const res = await setStatus('t1', 'RESOLVED')

    expect(res.ticket.assignedTo).toBeUndefined()
  })

  it('posts a system comment and logs the transition', async () => {
    await setStatus('t1', 'RESOLVED')

    expect(db.ticketComment.create).toHaveBeenCalledWith({
      data: {
        ticketId: 't1',
        authorId: 'bot1',
        message: 'Status changed to RESOLVED by PFT AI Agent',
      },
    })
    expect(activity.statusChanged).toHaveBeenCalledWith('t1', 'bot1', 'OPEN', 'RESOLVED')
  })

  it('still comments on a no-op transition but does not log activity', async () => {
    db.ticket.findUnique.mockResolvedValue({ status: 'RESOLVED' })

    await setStatus('t1', 'RESOLVED')

    // Pre-existing asymmetry: the comment is unguarded, the activity log is not.
    expect(db.ticketComment.create).toHaveBeenCalledTimes(1)
    expect(activity.statusChanged).not.toHaveBeenCalled()
  })

  it('skips the comment and the log when the bot user is missing', async () => {
    db.user.findFirst.mockResolvedValue(null)

    await setStatus('t1', 'RESOLVED')

    expect(db.ticketComment.create).not.toHaveBeenCalled()
    expect(activity.statusChanged).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when the ticket does not exist', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    await expect(setStatus('nope', 'OPEN')).rejects.toMatchObject({
      message: 'Ticket not found',
      resource: 'ticket',
    })
    expect(db.ticket.update).not.toHaveBeenCalled()
  })
})

describe('listRelations', () => {
  beforeEach(() => {
    db.ticket.findUnique.mockResolvedValue({ id: 't1', title: 'Login broken' })
  })

  it('reads the outgoing relations with their target summary', async () => {
    db.ticketRelation.findMany.mockResolvedValue([])

    await listRelations('t1')

    expect(db.ticket.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      select: { id: true, title: true },
    })
    expect(db.ticketRelation.findMany).toHaveBeenCalledWith({
      where: { sourceTicketId: 't1' },
      include: {
        targetTicket: { select: { id: true, title: true, status: true, priority: true } },
        createdBy: { select: { name: true } },
      },
    })
  })

  it('returns the relation list shape', async () => {
    db.ticketRelation.findMany.mockResolvedValue([
      {
        id: 'r1',
        relationType: 'BLOCKS',
        createdAt: MADE,
        targetTicket: { id: 't2', title: 'Other', status: 'OPEN', priority: 'LOW' },
        createdBy: { name: 'Alice' },
      },
    ])

    await expect(listRelations('t1')).resolves.toEqual({
      ticketId: 't1',
      ticketTitle: 'Login broken',
      relations: [
        {
          id: 'r1',
          type: 'BLOCKS',
          direction: 'outgoing',
          relatedTicket: { id: 't2', title: 'Other', status: 'OPEN', priority: 'LOW' },
          createdBy: 'Alice',
          createdAt: MADE,
        },
      ],
      count: 1,
    })
  })

  it('attributes an authorless relation to System', async () => {
    db.ticketRelation.findMany.mockResolvedValue([
      {
        id: 'r1',
        relationType: 'BLOCKS',
        createdAt: MADE,
        targetTicket: { id: 't2', title: 'Other', status: 'OPEN', priority: 'LOW' },
        createdBy: null,
      },
    ])

    const res = await listRelations('t1')

    expect(res.relations[0].createdBy).toBe('System')
  })

  it('throws NotFoundError when the ticket does not exist', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    await expect(listRelations('nope')).rejects.toMatchObject({
      message: 'Ticket not found',
      resource: 'ticket',
    })
    expect(db.ticketRelation.findMany).not.toHaveBeenCalled()
  })
})

describe('addRelation', () => {
  const made = {
    id: 'r9',
    relationType: 'BLOCKS',
    createdAt: MADE,
    sourceTicket: { id: 't1', title: 'A' },
    targetTicket: { id: 't2', title: 'B' },
  }

  beforeEach(() => {
    db.ticket.findUnique
      .mockResolvedValueOnce({ id: 't1', title: 'A' })
      .mockResolvedValueOnce({ id: 't2', title: 'B' })
    db.user.findFirst.mockResolvedValue(bot)
    db.ticketRelation.create.mockReturnValue('create-call')
    db.$transaction.mockResolvedValue([made])
  })

  it('checks both ends before writing', async () => {
    await addRelation('t1', { targetTicketId: 't2', relationType: 'BLOCKS' })

    expect(db.ticket.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 't1' },
      select: { id: true, title: true },
    })
    expect(db.ticket.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 't2' },
      select: { id: true, title: true },
    })
  })

  it('writes the relation and its inverse in one transaction', async () => {
    await addRelation('t1', { targetTicketId: 't2', relationType: 'BLOCKS' })

    expect(db.ticketRelation.create).toHaveBeenNthCalledWith(1, {
      data: {
        sourceTicketId: 't1',
        targetTicketId: 't2',
        relationType: 'BLOCKS',
        createdById: 'bot1',
      },
      include: {
        sourceTicket: { select: { id: true, title: true } },
        targetTicket: { select: { id: true, title: true } },
      },
    })
    expect(db.ticketRelation.create).toHaveBeenNthCalledWith(2, {
      data: {
        sourceTicketId: 't2',
        targetTicketId: 't1',
        relationType: 'BLOCKED_BY',
        createdById: 'bot1',
      },
    })
    expect(db.$transaction).toHaveBeenCalledWith(['create-call', 'create-call'])
  })

  it('maps a symmetric type to itself', async () => {
    await addRelation('t1', { targetTicketId: 't2', relationType: 'RELATES_TO' })

    expect(db.ticketRelation.create.mock.calls[1][0].data.relationType).toBe('RELATES_TO')
  })

  it('returns the relation envelope', async () => {
    await expect(addRelation('t1', { targetTicketId: 't2', relationType: 'BLOCKS' }))
      .resolves.toEqual({
        success: true,
        relation: {
          id: 'r9',
          type: 'BLOCKS',
          sourceTicket: { id: 't1', title: 'A' },
          targetTicket: { id: 't2', title: 'B' },
          createdAt: MADE,
        },
      })
  })

  it('still records the relation when the bot user is missing', async () => {
    db.user.findFirst.mockResolvedValue(null)

    await addRelation('t1', { targetTicketId: 't2', relationType: 'BLOCKS' })

    expect(db.ticketRelation.create.mock.calls[0][0].data.createdById).toBeNull()
  })

  it('refuses a self-relation before reading or writing anything', async () => {
    // Otherwise both rows land and the ticket blocks and is blocked by itself.
    // The REST route rejects this with a 400 of its own first, so this guard
    // exists for the MCP tool, which has no other.
    await expect(addRelation('t1', { targetTicketId: 't1', relationType: 'BLOCKS' }))
      .rejects.toBeInstanceOf(InvalidOperationError)

    expect(db.ticket.findUnique).not.toHaveBeenCalled()
    expect(db.ticketRelation.create).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('names the source ticket when that end is missing', async () => {
    db.ticket.findUnique.mockReset()
    db.ticket.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 't2', title: 'B' })

    await expect(addRelation('nope', { targetTicketId: 't2', relationType: 'BLOCKS' }))
      .rejects.toMatchObject({ message: 'Source ticket not found', resource: 'sourceTicket' })
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('names the target ticket when that end is missing', async () => {
    db.ticket.findUnique.mockReset()
    db.ticket.findUnique
      .mockResolvedValueOnce({ id: 't1', title: 'A' })
      .mockResolvedValueOnce(null)

    await expect(addRelation('t1', { targetTicketId: 'nope', relationType: 'BLOCKS' }))
      .rejects.toMatchObject({ message: 'Target ticket not found', resource: 'targetTicket' })
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe('listCompanies', () => {
  it('lists companies by name with their ticket and user counts', async () => {
    db.company.findMany.mockResolvedValue([
      { id: 'c1', name: 'FTMO', _count: { tickets: 3, users: 4 } },
    ])

    await expect(listCompanies()).resolves.toEqual({
      companies: [{ id: 'c1', name: 'FTMO', ticketCount: 3, userCount: 4 }],
      count: 1,
    })
    expect(db.company.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        _count: { select: { tickets: true, users: true } },
      },
      orderBy: { name: 'asc' },
    })
  })
})
