import { eq, desc } from 'drizzle-orm'

import { demandProfiles } from '@propieya/database'
import {
  completenessFromFilters,
  summarizeSearchFilters,
} from '@propieya/shared'

import {
  createTRPCRouter,
  protectedProcedure,
} from '../trpc'
import { listingSearchFiltersSchema } from './listing-search-input'

export const demandRouter = createTRPCRouter({
  /** Último perfil de demanda guardado del usuario. */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.demandProfiles.findFirst({
      where: eq(demandProfiles.userId, ctx.session.userId),
      orderBy: [desc(demandProfiles.updatedAt)],
    })
    return row ?? null
  }),

  /**
   * Persiste los filtros actuales de búsqueda como perfil de demanda
   * (JSONB legible + resumen + completitud).
   */
  upsertFromSearchFilters: protectedProcedure
    .input(listingSearchFiltersSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.demandProfiles.findFirst({
        where: eq(demandProfiles.userId, ctx.session.userId),
        orderBy: [desc(demandProfiles.updatedAt)],
      })

      const summary = summarizeSearchFilters(input)
      const completeness = completenessFromFilters(input)
      const now = new Date()

      const propertyTypes = input.propertyType
        ? { selected: [input.propertyType] }
        : {}
      const operationTypes = input.operationType
        ? { selected: [input.operationType] }
        : {}
      const location = {
        city: input.city ?? null,
        neighborhood: input.neighborhood ?? null,
      }
      const price = {
        min: input.minPrice ?? null,
        max: input.maxPrice ?? null,
      }
      const space = {
        minBedrooms: input.minBedrooms ?? null,
        minSurface: input.minSurface ?? null,
        maxSurface: input.maxSurface ?? null,
        minBathrooms: input.minBathrooms ?? null,
        minGarages: input.minGarages ?? null,
        floorMin: input.floorMin ?? null,
        floorMax: input.floorMax ?? null,
        escalera: input.escalera ?? null,
      }
      const features = {
        q: input.q ?? null,
        amenities: input.amenities ?? [],
      }

      if (existing) {
        const [updated] = await ctx.db
          .update(demandProfiles)
          .set({
            propertyTypes,
            operationTypes,
            location,
            price,
            space,
            features,
            naturalLanguageSummary: summary,
            completeness,
            lastSearchAt: now,
            updatedAt: now,
          })
          .where(eq(demandProfiles.id, existing.id))
          .returning()
        return updated ?? null
      }

      const [inserted] = await ctx.db
        .insert(demandProfiles)
        .values({
          userId: ctx.session.userId,
          name: 'Mi búsqueda',
          propertyTypes,
          operationTypes,
          location,
          price,
          space,
          features,
          naturalLanguageSummary: summary,
          completeness,
          lastSearchAt: now,
        })
        .returning()

      return inserted ?? null
    }),
})
