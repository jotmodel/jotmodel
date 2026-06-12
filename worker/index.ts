import { routePartykitRequest } from 'partyserver'
import { JotBoard } from './server'
import { handleRest, corsHeaders } from './rest'
import { gateConnection } from './auth'

export { JotBoard }

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) })
    if (url.pathname.startsWith('/api/')) return handleRest(request, env)

    // WebSocket sync → the per-board Durable Object, gated before the upgrade.
    const res = await routePartykitRequest(request, env, {
      onBeforeConnect: (req, lobby) => gateConnection(req, lobby.name, env),
    })
    return res ?? new Response('Not found', { status: 404 })
  },
}
