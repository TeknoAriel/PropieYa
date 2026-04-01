import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { searchHistory } from '@propieya/database'

import { createTRPCRouter, protectedProcedure } from '../trpc'

export const searchHistoryRouter = createTRPCRouter({
  /** Últimas búsquedas del usuario (filtros + métricas; una fila por request de listing.search con sesión). */
  listMine: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(searchHistory)
        .where(eq(searchHistory.userId, ctx.session.userId))
        .orderBy(desc(searchHistory.createdAt))
        .limit(input.limit)
    }),
})
