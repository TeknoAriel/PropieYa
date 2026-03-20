import { z } from 'zod'
import { eq, and, desc, ilike } from 'drizzle-orm'

import {
  listings,
  listingMedia,
  organizations,
  organizationMemberships,
} from '@propieya/database'
import { createListingSchema, updateListingSchema, LISTING_VALIDITY } from '@propieya/shared'

import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'

export const listingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createListingSchema)
    .mutation(async ({ input, ctx }) => {
      let organizationId = ctx.session.organizationId

      // Bootstrap para dev: si el usuario no tiene organización, se crea una básica.
      if (!organizationId) {
        const [org] = await ctx.db
          .insert(organizations)
          .values({
            type: 'real_estate_agency',
            name: `${ctx.session.name} Propiedades`,
            email: ctx.session.email,
          })
          .returning({ id: organizations.id })

        if (!org) {
          throw new Error('No se pudo crear la organización')
        }

        organizationId = org.id

        await ctx.db.insert(organizationMemberships).values({
          userId: ctx.session.userId,
          organizationId,
          role: 'org_admin',
        })
      }

      const pricePerM2 =
        input.surface.total > 0 ? input.price.amount / input.surface.total : null

      const [created] = await ctx.db
        .insert(listings)
        .values({
          organizationId,
          publisherId: ctx.session.userId,
          propertyType: input.propertyType,
          operationType: input.operationType,
          status: 'draft',
          address: input.address,
          locationLat: input.location?.lat ?? null,
          locationLng: input.location?.lng ?? null,
          hideExactAddress: input.hideExactAddress,
          title: input.title,
          description: input.description,
          internalNotes: input.internalNotes,
          priceAmount: input.price.amount,
          priceCurrency: input.price.currency,
          pricePerM2,
          showPrice: input.price.showPrice,
          expenses: input.price.expenses,
          expensesCurrency: input.price.expensesCurrency,
          surfaceTotal: input.surface.total,
          surfaceCovered: input.surface.covered,
          surfaceSemicovered: input.surface.semicovered,
          surfaceLand: input.surface.land,
          bedrooms: input.rooms.bedrooms,
          bathrooms: input.rooms.bathrooms,
          toilettes: input.rooms.toilettes,
          garages: input.rooms.garages,
          totalRooms: input.rooms.total,
          features: input.features,
          updatedAt: new Date(),
        })
        .returning()

      return created
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.query.listings.findFirst({
        where: and(
          eq(listings.id, input.id),
          eq(listings.publisherId, ctx.session.userId)
        ),
      })

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const publishedAt = new Date()
      const expiresAt = new Date(
        publishedAt.getTime() +
          LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      )

      const [updated] = await ctx.db
        .update(listings)
        .set({
          status: 'active',
          publishedAt,
          lastValidatedAt: new Date(),
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.id))
        .returning()

      return updated ?? null
    }),

  listMine: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(listings.publisherId, ctx.session.userId)]

      if (input.status) {
        conditions.push(eq(listings.status, input.status))
      }
      if (input.search) {
        conditions.push(ilike(listings.title, `%${input.search}%`))
      }

      return ctx.db.query.listings.findMany({
        where: and(...conditions),
        orderBy: [desc(listings.createdAt)],
        limit: input.limit,
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateListingSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.query.listings.findFirst({
        where: and(
          eq(listings.id, input.id),
          eq(listings.publisherId, ctx.session.userId)
        ),
      })

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const data = input.data
      const surfaceTotal = data.surface?.total ?? existing.surfaceTotal
      const priceAmount = data.price?.amount ?? existing.priceAmount
      const pricePerM2 = surfaceTotal > 0 ? priceAmount / surfaceTotal : null

      const [updated] = await ctx.db
        .update(listings)
        .set({
          propertyType: data.propertyType ?? existing.propertyType,
          operationType: data.operationType ?? existing.operationType,
          address: data.address ?? existing.address,
          locationLat: data.location?.lat ?? existing.locationLat,
          locationLng: data.location?.lng ?? existing.locationLng,
          hideExactAddress: data.hideExactAddress ?? existing.hideExactAddress,
          title: data.title ?? existing.title,
          description: data.description ?? existing.description,
          internalNotes: data.internalNotes ?? existing.internalNotes,
          priceAmount,
          priceCurrency: data.price?.currency ?? existing.priceCurrency,
          pricePerM2,
          showPrice: data.price?.showPrice ?? existing.showPrice,
          expenses: data.price?.expenses ?? existing.expenses,
          expensesCurrency:
            data.price?.expensesCurrency ?? existing.expensesCurrency,
          surfaceTotal,
          surfaceCovered: data.surface?.covered ?? existing.surfaceCovered,
          surfaceSemicovered:
            data.surface?.semicovered ?? existing.surfaceSemicovered,
          surfaceLand: data.surface?.land ?? existing.surfaceLand,
          bedrooms: data.rooms?.bedrooms ?? existing.bedrooms,
          bathrooms: data.rooms?.bathrooms ?? existing.bathrooms,
          toilettes: data.rooms?.toilettes ?? existing.toilettes,
          garages: data.rooms?.garages ?? existing.garages,
          totalRooms: data.rooms?.total ?? existing.totalRooms,
          features: data.features ?? existing.features,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.id))
        .returning()

      return updated
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [archived] = await ctx.db
        .update(listings)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .returning()

      return archived ?? null
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const listing = await ctx.db.query.listings.findFirst({
        where: and(
          eq(listings.id, input.id),
          eq(listings.status, 'active')
        ),
      })

      if (!listing) {
        return null
      }

      const media = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.id),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      return {
        ...listing,
        media,
      }
    }),

  getFeatured: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(6),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await ctx.db.query.listings.findMany({
        where: eq(listings.status, 'active'),
        orderBy: [desc(listings.publishedAt)],
        limit: input.limit,
      })

      return result
    }),
})
