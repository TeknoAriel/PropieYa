import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import superjson from 'superjson'

import type { AppRouter } from '@propieya/web/server'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('accessToken')
  if (!token) return {}
  return { authorization: `Bearer ${token}` }
}

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        return {
          'x-trpc-source': 'panel',
          ...getAuthHeader(),
        }
      },
    }),
  ],
})
