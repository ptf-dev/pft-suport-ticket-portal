import { PRIORITY_VALUES } from '@/lib/priorities'
import { RELATION_TYPES } from '@/lib/relations'
import * as ops from './operations'
import { InvalidArgumentsError, TOOLS, UnknownToolError, callTool } from './tools'

// The dispatcher is tested against stubbed operations: what matters here is
// which arguments reach them, and that bad ones never do.
jest.mock('./operations', () => ({
  addComment: jest.fn(),
  addRelation: jest.fn(),
  createTicket: jest.fn(),
  getTicket: jest.fn(),
  listComments: jest.fn(),
  listCompanies: jest.fn(),
  listRelations: jest.fn(),
  listTickets: jest.fn(),
  searchTickets: jest.fn(),
  setStatus: jest.fn(),
}))

const mocked = ops as jest.Mocked<typeof ops>
const schemaOf = (name: string) => TOOLS.find((t) => t.name === name)!.inputSchema as any

beforeEach(() => jest.clearAllMocks())

describe('TOOLS', () => {
  it('exposes exactly the ten documented tools', () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([
      'add_comment', 'add_relation', 'create_ticket', 'get_ticket',
      'list_comments', 'list_companies', 'list_relations', 'list_tickets',
      'search_tickets', 'set_status',
    ])
  })

  it('every tool declares an object inputSchema', () => {
    for (const t of TOOLS) {
      expect(t.inputSchema).toMatchObject({ type: 'object' })
      expect(t.description.length).toBeGreaterThan(0)
    }
  })

  it('draws enum values from the source of truth, not a retyped copy', () => {
    expect(schemaOf('create_ticket').properties.priority.enum).toEqual([...PRIORITY_VALUES])
    expect(schemaOf('list_tickets').properties.priority.enum).toEqual([...PRIORITY_VALUES])
    expect(schemaOf('add_relation').properties.relationType.enum).toEqual([...RELATION_TYPES])
    expect(schemaOf('set_status').properties.status.enum).toContain('WAITING_CLIENT')
  })

  it('declares the required arguments from the REST routes', () => {
    expect(schemaOf('create_ticket').required).toEqual(['title', 'description', 'companyId'])
    expect(schemaOf('add_comment').required).toEqual(['id', 'content'])
    expect(schemaOf('set_status').required).toEqual(['id', 'status'])
    expect(schemaOf('add_relation').required).toEqual(['id', 'targetTicketId', 'relationType'])
    expect(schemaOf('search_tickets').required).toEqual(['q'])
    for (const n of ['get_ticket', 'list_comments', 'list_relations']) {
      expect(schemaOf(n).required).toEqual(['id'])
    }
    expect(schemaOf('list_tickets').required).toEqual([])
    expect(schemaOf('list_companies').required).toEqual([])
  })
})

describe('callTool', () => {
  it('rejects an unknown tool name', async () => {
    await expect(callTool('nope', {})).rejects.toBeInstanceOf(UnknownToolError)
  })

  it('rejects a call missing a required argument', async () => {
    await expect(callTool('get_ticket', {})).rejects.toBeInstanceOf(InvalidArgumentsError)
    expect(mocked.getTicket).not.toHaveBeenCalled()
  })

  it('rejects wrongly typed arguments', async () => {
    await expect(callTool('get_ticket', { id: 42 })).rejects.toBeInstanceOf(InvalidArgumentsError)
    await expect(callTool('add_comment', { id: 't', content: 'x', internal: 'yes' }))
      .rejects.toBeInstanceOf(InvalidArgumentsError)
    await expect(callTool('list_tickets', { limit: 'ten' })).rejects.toBeInstanceOf(InvalidArgumentsError)
    await expect(callTool('list_tickets', { limit: 0 })).rejects.toBeInstanceOf(InvalidArgumentsError)
  })

  it.each([
    ['list_tickets', { status: 'BOGUS' }],
    ['list_tickets', { priority: 'BOGUS' }],
    ['create_ticket', { title: 't', description: 'd', companyId: 'c', priority: 'BOGUS' }],
    ['set_status', { id: 't', status: 'BOGUS' }],
    ['set_status', { id: 't', status: 'open' }],
    ['add_relation', { id: 't', targetTicketId: 'u', relationType: 'BOGUS' }],
  ])('rejects an invalid enum value before reaching an operation: %s %j', async (name, args) => {
    await expect(callTool(name, args)).rejects.toBeInstanceOf(InvalidArgumentsError)
    for (const fn of Object.values(mocked).filter((v) => typeof v === 'function')) expect(fn).not.toHaveBeenCalled()
  })

  it('dispatches valid calls with the operation arguments', async () => {
    mocked.setStatus.mockResolvedValue({ ok: true } as any)
    await expect(callTool('set_status', { id: 't1', status: 'RESOLVED' })).resolves.toEqual({ ok: true })
    expect(mocked.setStatus).toHaveBeenCalledWith('t1', 'RESOLVED')

    await callTool('list_tickets', { status: 'OPEN', priority: PRIORITY_VALUES[0], limit: 5 })
    expect(mocked.listTickets).toHaveBeenCalledWith({
      status: 'OPEN', priority: PRIORITY_VALUES[0], companyId: undefined, assignedTo: undefined, limit: 5,
    })

    await callTool('add_relation', { id: 't1', targetTicketId: 't2', relationType: RELATION_TYPES[0] })
    expect(mocked.addRelation).toHaveBeenCalledWith('t1', { targetTicketId: 't2', relationType: RELATION_TYPES[0] })

    await callTool('add_comment', { id: 't1', content: 'hi', internal: true })
    expect(mocked.addComment).toHaveBeenCalledWith('t1', { content: 'hi', internal: true })

    await callTool('create_ticket', { title: 'T', description: 'D', companyId: 'c1' })
    expect(mocked.createTicket).toHaveBeenCalledWith({
      title: 'T', description: 'D', priority: undefined, category: undefined, companyId: 'c1',
    })

    await callTool('search_tickets', { q: 'login' })
    expect(mocked.searchTickets).toHaveBeenCalledWith({ q: 'login', limit: undefined })

    await callTool('list_companies', {})
    expect(mocked.listCompanies).toHaveBeenCalledWith()
  })

  it('omits baseUrl so attachment URLs stay relative', async () => {
    await callTool('get_ticket', { id: 't1' })
    expect(mocked.getTicket).toHaveBeenCalledWith('t1')
    await callTool('list_comments', { id: 't1' })
    expect(mocked.listComments).toHaveBeenCalledWith('t1')
  })
})
