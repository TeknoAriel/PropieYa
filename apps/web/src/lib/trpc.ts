import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import superjson from 'superjson'

import { getAccessToken } from '@/lib/auth-storage'
import type { AppRouter } from '@/server/routers/_app'

export const trpc = createTRPCReact<AppRouter>()

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3010}`
}

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        const token = getAccessToken()
        return {
          'x-trpc-source': 'react',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      },
    }),
  ],
})
