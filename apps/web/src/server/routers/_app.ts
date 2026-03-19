import { createTRPCRouter } from '../trpc'
import { authRouter } from './auth'
import { healthRouter } from './health'
import { listingRouter } from './listing'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  health: healthRouter,
  listing: listingRouter,
})

export type AppRouter = typeof appRouter
