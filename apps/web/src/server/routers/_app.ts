import { createTRPCRouter } from '../trpc'
import { authRouter } from './auth'
import { demandRouter } from './demand'
import { healthRouter } from './health'
import { leadRouter } from './lead'
import { listingRouter } from './listing'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  demand: demandRouter,
  health: healthRouter,
  lead: leadRouter,
  listing: listingRouter,
})

export type AppRouter = typeof appRouter
