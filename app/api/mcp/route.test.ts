import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { callTool } from '@/lib/mcp/tools'
import { NotFoundError } from '@/lib/mcp/operations'
import { prisma } from '@/lib/prisma'

// Stubbed for the end-to-end describe at the bottom, which runs the real
// operations: no test in this file may reach a database.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn() },
    ticketComment: { findMany: jest.fn() },
    ticketRelation: { create: jest.fn() },
    user: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}))

// Only callTool is replaced: the real TOOLS list and error classes are what the
// route must discriminate on, and no test here should reach Prisma.
jest.mock('@/lib/mcp/tools', () => ({
  ...jest.requireActual('@/lib/mcp/tools'),
  callTool: jest.fn(),
}))
const mockCallTool = callTool as jest.MockedFunction<typeof callTool>
const { UnknownToolError, InvalidArgumentsError } = jest.requireActual('@/lib/mcp/tools')

// The MCP protocol handshake at /api/mcp, which Claude Code drives before it
// will call a single tool. Every expectation here was taken from the installed
// client bundle: the accepted protocol versions, the -32601 probe fallback, and
// the 405 that it reads as "this server has no stream". A wrong value fails the
// connection outright, so these are pinned rather than inferred.
const API_KEY = 'test-key'

const ORIGINAL_KEY = process.env.MCP_API_KEY

/** A POST carrying `body` verbatim; `key` of null sends no Authorization header. */
const rawReq = (body: string, key: string | null = API_KEY) =>
  new NextRequest('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key === null ? {} : { Authorization: `Bearer ${key}` }),
    },
    body,
  })

/** A POST carrying one JSON-RPC message. */
const req = (message: unknown, key: string | null = API_KEY) => rawReq(JSON.stringify(message), key)

beforeEach(() => {
  process.env.MCP_API_KEY = API_KEY
})

afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.MCP_API_KEY
  else process.env.MCP_API_KEY = ORIGINAL_KEY
})

describe('auth', () => {
  it('rejects a request with no Authorization header', async () => {
    expect((await POST(req({ method: 'initialize' }, null))).status).toBe(401)
  })

  it('rejects a wrong key', async () => {
    expect((await POST(req({ method: 'initialize' }, 'wrong'))).status).toBe(401)
  })

  it('rejects everything when MCP_API_KEY is unset', async () => {
    delete process.env.MCP_API_KEY

    expect((await POST(req({ method: 'initialize' }, 'anything'))).status).toBe(401)
    expect((await POST(req({ method: 'initialize' }, 'undefined'))).status).toBe(401)
  })

  it('rejects every key when MCP_API_KEY is empty', async () => {
    process.env.MCP_API_KEY = ''

    expect((await POST(req({ method: 'initialize' }, ''))).status).toBe(401)
    expect((await POST(req({ method: 'initialize' }, 'anything'))).status).toBe(401)
  })

  it('answers the same way the REST handlers do', async () => {
    const res = await POST(req({ id: 1, method: 'initialize' }, 'wrong'))

    expect(await res.json()).toEqual({ error: 'Unauthorized - Invalid API key' })
  })

  it('rejects before reading the body, so a bad key never reaches the parser', async () => {
    const res = await POST(rawReq('not json', null))

    expect(res.status).toBe(401)
  })
})

describe('handshake', () => {
  it('answers initialize with a version Claude Code accepts', async () => {
    const body = await (await POST(req({ id: 1, method: 'initialize' }))).json()

    expect(body.result.protocolVersion).toBe('2025-11-25')
    expect(body.result.capabilities).toMatchObject({ tools: {} })
    expect(body.result.serverInfo.name).toBeTruthy()
  })

  it('echoes the request id so the client can correlate the reply', async () => {
    const body = await (await POST(req({ id: 'abc', method: 'initialize' }))).json()

    expect(body.id).toBe('abc')
    expect(body.jsonrpc).toBe('2.0')
  })

  it('answers as application/json rather than a stream', async () => {
    const res = await POST(req({ id: 1, method: 'initialize' }))

    expect(res.headers.get('content-type')).toMatch(/application\/json/)
  })

  it('never issues an Mcp-Session-Id, so the client stays stateless', async () => {
    const res = await POST(req({ id: 1, method: 'initialize' }))

    expect(res.headers.get('Mcp-Session-Id')).toBeNull()
  })

  it('answers server/discover with -32601 so the client falls back to legacy', async () => {
    const body = await (await POST(req({ id: 1, method: 'server/discover' }))).json()

    expect(body.error.code).toBe(-32601)
  })

  it('answers an unknown method with -32601', async () => {
    const body = await (await POST(req({ id: 1, method: 'nope/nope' }))).json()

    expect(body.error.code).toBe(-32601)
  })

  it('answers notifications/initialized with 202 and no body', async () => {
    const res = await POST(req({ method: 'notifications/initialized' }))

    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })

  it('answers any other notification with 202, since JSON-RPC forbids a reply', async () => {
    const res = await POST(req({ method: 'notifications/cancelled' }))

    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })

  it('returns 405 for GET so the client treats it as "no stream"', async () => {
    expect((await GET()).status).toBe(405)
  })
})

describe('malformed requests', () => {
  it('returns a JSON-RPC error for a malformed body rather than throwing', async () => {
    const body = await (await POST(rawReq('not json'))).json()

    expect(body.error.code).toBe(-32700)
  })

  it('returns a JSON-RPC error for an empty body rather than throwing', async () => {
    const body = await (await POST(rawReq(''))).json()

    expect(body.error.code).toBe(-32700)
  })

  it('returns a JSON-RPC error for a batch array rather than hanging', async () => {
    const body = await (await POST(rawReq('[{"id":1,"method":"initialize"}]'))).json()

    expect(body.error.code).toBe(-32600)
  })

  it.each(['"hello"', 'null', '42', '{}', '{"id":1}', '{"id":1,"method":7}'])(
    'returns -32600 for %s, which is not a JSON-RPC request',
    async (body) => {
      expect((await (await POST(rawReq(body))).json()).error.code).toBe(-32600)
    }
  )
})

describe('tools/list and tools/call', () => {
  const call = async (params?: unknown) =>
    (await POST(req({ id: 7, method: 'tools/call', params }))).json()

  beforeEach(() => {
    mockCallTool.mockReset()
  })

  it('lists the ten tools', async () => {
    const body = await (await POST(req({ id: 1, method: 'tools/list' }))).json()

    expect(body.jsonrpc).toBe('2.0')
    expect(body.id).toBe(1)
    expect(body.result.tools).toHaveLength(10)
  })

  it('returns tool output as a text content block', async () => {
    mockCallTool.mockResolvedValue([{ id: 'c1' }])

    const body = await call({ name: 'list_companies', arguments: {} })

    expect(body.jsonrpc).toBe('2.0')
    expect(body.id).toBe(7)
    expect(body.result).toEqual({
      content: [{ type: 'text', text: JSON.stringify([{ id: 'c1' }], null, 2) }],
      isError: false,
    })
  })

  it('passes the arguments through to the tool', async () => {
    mockCallTool.mockResolvedValue({})

    await call({ name: 'get_ticket', arguments: { id: 't1' } })

    expect(mockCallTool).toHaveBeenCalledWith('get_ticket', { id: 't1' })
  })

  it('treats absent arguments as empty rather than throwing', async () => {
    mockCallTool.mockResolvedValue([])

    const body = await call({ name: 'list_companies' })

    expect(mockCallTool).toHaveBeenCalledWith('list_companies', {})
    expect(body.result.isError).toBe(false)
  })

  it('still returns a text block when the tool returns undefined', async () => {
    mockCallTool.mockResolvedValue(undefined)

    const body = await call({ name: 'list_companies' })

    expect(body.result.content[0].text).toBe('null')
  })

  it('reports an unknown tool as a protocol error, not a tool error', async () => {
    mockCallTool.mockRejectedValue(new UnknownToolError('nope'))

    const body = await call({ name: 'nope', arguments: {} })

    expect(body.jsonrpc).toBe('2.0')
    expect(body.id).toBe(7)
    expect(body.error.code).toBe(-32601)
    expect(body.result).toBeUndefined()
  })

  it('reports invalid arguments as a tool error the model can read', async () => {
    mockCallTool.mockRejectedValue(new InvalidArgumentsError('id is required'))

    const body = await call({ name: 'get_ticket', arguments: {} })

    expect(body.error).toBeUndefined()
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0]).toEqual({ type: 'text', text: 'id is required' })
  })

  it('reports a missing ticket as a tool error with a readable message', async () => {
    mockCallTool.mockRejectedValue(new NotFoundError('Ticket not found', 'ticket'))

    const body = await call({ name: 'get_ticket', arguments: { id: 'nope' } })

    expect(body.error).toBeUndefined()
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0].text).toMatch(/not found/i)
  })

  it('turns an unexpected error class into a tool error, not a 500', async () => {
    mockCallTool.mockRejectedValue(new TypeError('boom'))

    const res = await POST(req({ id: 7, method: 'tools/call', params: { name: 'list_tickets' } }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.error).toBeUndefined()
    expect(body.result).toEqual({ content: [{ type: 'text', text: 'boom' }], isError: true })
  })

  it('turns a thrown non-Error into a tool error', async () => {
    mockCallTool.mockRejectedValue('plain string')

    const body = await call({ name: 'list_tickets' })

    expect(body.result).toEqual({ content: [{ type: 'text', text: 'plain string' }], isError: true })
  })

  it.each([undefined, null, 'x', [], {}, { name: 5 }, { name: '' }])(
    'rejects params %j that name no tool with -32602 without calling anything',
    async (params) => {
      const body = await call(params)

      expect(body.error.code).toBe(-32602)
      expect(mockCallTool).not.toHaveBeenCalled()
    }
  )

  it.each([['a string', 'x'], ['an array', []], ['null', null]])(
    'reports arguments given as %s as a tool error',
    async (_label, args) => {
      const body = await call({ name: 'list_tickets', arguments: args })

      expect(body.result.isError).toBe(true)
      expect(mockCallTool).not.toHaveBeenCalled()
    }
  )
})

// The two guards exercised here live in lib/mcp/operations, and only protect a
// model if nothing between the JSON-RPC body and Prisma swallows or re-labels
// them. So these run the real dispatcher and the real operations end to end,
// with Prisma stubbed, rather than asserting against a mocked callTool.
describe('operation guards reach the model as tool errors', () => {
  const db = prisma as unknown as Record<string, any>
  const { callTool: realCallTool } = jest.requireActual('@/lib/mcp/tools')

  const callReal = async (name: string, args: unknown) =>
    (await POST(req({ id: 7, method: 'tools/call', params: { name, arguments: args } }))).json()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCallTool.mockImplementation(realCallTool)
  })

  afterEach(() => {
    mockCallTool.mockReset()
  })

  it('refuses add_relation to the same ticket without attempting a write', async () => {
    const body = await callReal('add_relation', {
      id: 't1',
      targetTicketId: 't1',
      relationType: 'BLOCKS',
    })

    expect(body.error).toBeUndefined()
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0].text).toBe('Cannot create a relation to the same ticket')
    expect(db.ticketRelation.create).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('reports list_comments for an unknown ticket as an error, not an empty thread', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    const body = await callReal('list_comments', { id: 'nope' })

    expect(body.error).toBeUndefined()
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0].text).toMatch(/not found/i)
    expect(db.ticketComment.findMany).not.toHaveBeenCalled()
  })

  it('still returns the thread when the ticket exists', async () => {
    db.ticket.findUnique.mockResolvedValue({ id: 't1' })
    db.ticketComment.findMany.mockResolvedValue([])

    const body = await callReal('list_comments', { id: 't1' })

    expect(body.result.isError).toBe(false)
    expect(JSON.parse(body.result.content[0].text)).toEqual({ ticketId: 't1', comments: [], count: 0 })
  })
})
