import { createTRPCRouter } from '../trpc'
import { authRouter } from './auth'
import { demandRouter } from './demand'
import { healthRouter } from './health'
import { leadRouter } from './lead'
import { listingRouter } from './listing'
import { organizationRouter } from './organization'
import { searchAlertRouter } from './searchAlert'
import { searchHistoryRouter } from './searchHistory'
import { statsRouter } from './stats'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  demand: demandRouter,
  health: healthRouter,
  lead: leadRouter,
  listing: listingRouter,
  organization: organizationRouter,
  searchAlert: searchAlertRouter,
  searchHistory: searchHistoryRouter,
  stats: statsRouter,
})

export type AppRouter = typeof appRouter
