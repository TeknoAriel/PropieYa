import { z } from 'zod'
import { eq, and, desc, count } from 'drizzle-orm'

import { leads, listings, users } from '@propieya/database'

import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'
import { sendNewLeadEmail } from '@/lib/email'

const panelBaseUrl = () =>
  process.env.NEXT_PUBLIC_PANEL_URL?.trim() || 'http://localhost:3001'

export const leadRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        contactName: z.string().min(1).max(255),
        contactEmail: z.string().email().max(255),
        message: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          listingId: listings.id,
          organizationId: listings.organizationId,
          title: listings.title,
          publisherEmail: users.email,
        })
        .from(listings)
        .innerJoin(users, eq(listings.publisherId, users.id))
        .where(and(eq(listings.id, input.listingId), eq(listings.status, 'active')))
        .limit(1)

      if (!row) {
        throw new Error('El aviso no existe o no está activo')
      }

      const [created] = await ctx.db
        .insert(leads)
        .values({
          organizationId: row.organizationId,
          listingId: input.listingId,
          contactName: input.contactName.trim(),
          contactEmail: input.contactEmail.trim().toLowerCase(),
          message: input.message.trim(),
          source: 'listing_contact',
          status: 'new',
        })
        .returning()

      // Notificar al publicador por email (no bloquea el create)
      if (row.publisherEmail) {
        sendNewLeadEmail({
          to: row.publisherEmail,
          listingTitle: row.title,
          contactName: input.contactName.trim(),
          contactEmail: input.contactEmail.trim().toLowerCase(),
          message: input.message.trim(),
          panelLeadsUrl: `${panelBaseUrl()}/leads`,
        }).catch((err) => {
          console.warn('[lead.create] Email falló:', err)
        })
      }

      return created
    }),

  listByPublisher: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(listings.publisherId, ctx.session.userId)]

      const rows = await ctx.db
        .select({
          id: leads.id,
          contactName: leads.contactName,
          contactEmail: leads.contactEmail,
          contactPhone: leads.contactPhone,
          message: leads.message,
          status: leads.status,
          source: leads.source,
          createdAt: leads.createdAt,
          listingId: leads.listingId,
          listingTitle: listings.title,
        })
        .from(leads)
        .innerJoin(listings, eq(leads.listingId, listings.id))
        .where(and(...conditions, ...(input?.status ? [eq(leads.status, input.status)] : [])))
        .orderBy(desc(leads.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0)

      const [countResult] = await ctx.db
        .select({ total: count() })
        .from(leads)
        .innerJoin(listings, eq(leads.listingId, listings.id))
        .where(and(...conditions, ...(input?.status ? [eq(leads.status, input.status)] : [])))

      return {
        items: rows,
        total: Number(countResult?.total ?? 0),
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const row = await ctx.db
        .select({
          id: leads.id,
          contactName: leads.contactName,
          contactEmail: leads.contactEmail,
          contactPhone: leads.contactPhone,
          message: leads.message,
          status: leads.status,
          source: leads.source,
          createdAt: leads.createdAt,
          listingId: leads.listingId,
          listingTitle: listings.title,
          organizationId: leads.organizationId,
        })
        .from(leads)
        .innerJoin(listings, eq(leads.listingId, listings.id))
        .where(and(eq(leads.id, input.id), eq(listings.publisherId, ctx.session.userId)))
        .limit(1)

      return row[0] ?? null
    }),
})
