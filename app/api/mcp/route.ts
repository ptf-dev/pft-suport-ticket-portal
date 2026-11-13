import { NextRequest, NextResponse } from 'next/server'

/**
 * MCP API: the protocol endpoint.
 *
 * Speaks JSON-RPC over POST so an admin can point Claude Code straight at the
 * portal. The REST handlers under /api/mcp/* stay where they are; this sits
 * beside them and shares only their bearer-key check.
 *
 * The protocol choices below were read off the installed client, not the spec,
 * because a disagreement costs the whole connection rather than one call:
 *  - The client probes `server/discover` first and needs a prompt -32601 to
 *    fall back to the legacy handshake. A timeout there is terminal — there is
 *    no second fallback — so nothing on the reply path waits on I/O.
 *  - It rejects any `protocolVersion` outside the list it ships with.
 *  - It opens a GET for a server stream and reads 405 as "there is none".
 *  - It omits `Mcp-Session-Id` when the server never sets one, so staying
 *    stateless costs nothing.
 */

export const dynamic = 'force-dynamic'

/** One of the versions the installed client accepts; anything else fails it. */
const PROTOCOL_VERSION = '2025-11-25'

/** Identifies the endpoint to the client, independent of the app's release. */
const SERVER_INFO = { name: 'pft-ticket-portal', version: '1.0.0' }

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601

type JsonRpcId = string | number

interface JsonRpcRequest {
  id?: JsonRpcId | null
  method: string
  params?: unknown
}

export async function POST(request: NextRequest): Promise<Response> {
  // Before the body is touched: the key is admin-wide, so an unset or
  // mismatched one must never read as permission to continue.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized - Invalid API key' }, { status: 401 })
  }

  let message: unknown
  try {
    message = JSON.parse(await request.text())
  } catch {
    return jsonRpcError(null, PARSE_ERROR, 'Parse error', 400)
  }

  // Answered here rather than in the dispatch so a body that is not a single
  // request — a batch array most of all — cannot reach a method handler.
  if (!isJsonRpcRequest(message)) {
    return jsonRpcError(null, INVALID_REQUEST, 'Invalid Request', 400)
  }

  // No usable id makes it a notification, which JSON-RPC answers with no
  // result at all. The only one the client sends is notifications/initialized,
  // and nothing in the handshake needs doing when it arrives.
  const { id } = message
  if (id === undefined || id === null) {
    return new NextResponse(null, { status: 202 })
  }

  return dispatch(id, message.method)
}

export async function GET(): Promise<Response> {
  // The client opens this looking for a server-sent stream. 405 tells it there
  // is none and it carries on over POST; a 404 or a non-SSE 200 breaks it.
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

/**
 * Answers one JSON-RPC call. Returns a Response directly rather than a promise
 * for methods that need no I/O, which is every method that the client's
 * connection probe depends on; a method that does need I/O returns one.
 */
function dispatch(id: JsonRpcId, method: string): Response | Promise<Response> {
  switch (method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      })

    default:
      // `server/discover` arrives here too, and the -32601 is what makes the
      // client drop to the legacy handshake instead of giving up.
      return jsonRpcError(id, METHOD_NOT_FOUND, `Method not found: ${method}`)
  }
}

function isAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.MCP_API_KEY

  return Boolean(apiKey && validApiKey && apiKey === validApiKey)
}

function isJsonRpcRequest(message: unknown): message is JsonRpcRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    !Array.isArray(message) &&
    typeof (message as { method?: unknown }).method === 'string'
  )
}

function jsonRpcResult(id: JsonRpcId, result: unknown): Response {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

/**
 * Carries the JSON-RPC code in the body. A method-not-found keeps HTTP 200 —
 * the client has to read that body to know it should fall back — while a body
 * that never parsed is reported as the bad request it is.
 */
function jsonRpcError(
  id: JsonRpcId | null,
  code: number,
  message: string,
  status = 200
): Response {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status })
}
