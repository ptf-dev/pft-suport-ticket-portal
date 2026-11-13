import { NextRequest } from 'next/server'
import { GET, POST } from './route'

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
