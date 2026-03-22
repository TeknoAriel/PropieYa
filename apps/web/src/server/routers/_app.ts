import { createTRPCRouter } from '../trpc'
import { authRouter } from './auth'
import { healthRouter } from './health'
import { leadRouter } from './lead'
import { listingRouter } from './listing'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  health: healthRouter,
  lead: leadRouter,
  listing: listingRouter,
})

export type AppRouter = typeof appRouter
