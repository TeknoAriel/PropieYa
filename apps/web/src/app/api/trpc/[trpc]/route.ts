import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { corsHeadersForRequest, withPanelCors } from '@/lib/cors-panel'
import { appRouter } from '@/server/routers/_app'
import { createTRPCContext } from '@/server/trpc'

const innerHandler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            )
          }
        : undefined,
  })

export async function OPTIONS(request: Request) {
  const h = corsHeadersForRequest(request)
  if (!h.has('Access-Control-Allow-Origin')) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, { status: 204, headers: h })
}

export async function GET(request: Request) {
  const res = await innerHandler(request)
  return withPanelCors(request, res)
}

export async function POST(request: Request) {
  const res = await innerHandler(request)
  return withPanelCors(request, res)
}
