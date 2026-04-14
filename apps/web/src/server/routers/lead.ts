import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, desc, count, sql } from 'drizzle-orm'

import { leads, listings, organizations, users } from '@propieya/database'
import { PORTAL_STATS_TERMINALS } from '@propieya/shared'

import { recordPortalStatsEvent } from '../../lib/analytics/record-portal-stats-event'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'
import { sendNewLeadEmail } from '../../lib/email'

const panelBaseUrl = () =>
  process.env.NEXT_PUBLIC_PANEL_URL?.trim() || 'http://localhost:3011'

function isPaidPlan(planType: string): boolean {
  return planType !== 'free'
}

function forPublisherView<
  T extends {
    accessStatus: string
    contactEmail: string
    contactPhone: string | null
    message: string
  },
>(row: T): T & { contactReveal: boolean } {
  if (row.accessStatus !== 'pending') {
    return { ...row, contactReveal: true }
  }
  return {
    ...row,
    contactReveal: false,
    contactEmail: '',
    contactPhone: null,
    message: '',
  }
}

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
          planType: organizations.planType,
        })
        .from(listings)
        .innerJoin(users, eq(listings.publisherId, users.id))
        .innerJoin(organizations, eq(listings.organizationId, organizations.id))
        .where(and(eq(listings.id, input.listingId), eq(listings.status, 'active')))
        .limit(1)

      if (!row) {
        throw new Error('El aviso no existe o no está activo')
      }

      const paid = isPaidPlan(row.planType)
      const now = new Date()

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
          accessStatus: paid ? 'activated' : 'pending',
          activatedAt: paid ? now : null,
          activationMode: paid ? 'plan' : null,
        })
        .returning()

      if (row.publisherEmail) {
        sendNewLeadEmail({
          to: row.publisherEmail,
          listingTitle: row.title,
          contactName: input.contactName.trim(),
          contactEmail: input.contactEmail.trim().toLowerCase(),
          message: input.message.trim(),
          panelLeadsUrl: `${panelBaseUrl()}/leads`,
          accessPending: !paid,
        }).catch((err) => {
          console.warn('[lead.create] Email falló:', err)
        })
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LEAD_SUBMITTED,
        listingId: input.listingId,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload: { source: 'listing_contact', accessStatus: paid ? 'activated' : 'pending' },
      })

      if (!paid) {
        recordPortalStatsEvent(ctx.db, {
          terminalId: PORTAL_STATS_TERMINALS.LEAD_ACCESS_PENDING,
          listingId: input.listingId,
          organizationId: row.organizationId,
          userId: ctx.session?.userId ?? null,
          payload: {},
        })
      }

      return created
    }),

  activate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const [leadRow] = await tx
          .select({
            id: leads.id,
            listingId: leads.listingId,
            organizationId: leads.organizationId,
            accessStatus: leads.accessStatus,
            planType: organizations.planType,
            leadCreditsBalance: organizations.leadCreditsBalance,
            publisherId: listings.publisherId,
          })
          .from(leads)
          .innerJoin(listings, eq(leads.listingId, listings.id))
          .innerJoin(organizations, eq(leads.organizationId, organizations.id))
          .where(and(eq(leads.id, input.id), eq(listings.publisherId, ctx.session.userId)))
          .limit(1)

        if (!leadRow) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' })
        }

        if (leadRow.accessStatus !== 'pending') {
          return { ok: true as const, already: true }
        }

        const now = new Date()

        if (isPaidPlan(leadRow.planType)) {
          await tx
            .update(leads)
            .set({
              accessStatus: 'activated',
              activationMode: 'plan',
              activatedAt: now,
              updatedAt: now,
            })
            .where(eq(leads.id, input.id))
          return {
            ok: true as const,
            already: false,
            mode: 'plan' as const,
            listingId: leadRow.listingId,
            organizationId: leadRow.organizationId,
          }
        }

        const [debited] = await tx
          .update(organizations)
          .set({
            leadCreditsBalance: sql`${organizations.leadCreditsBalance} - 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(organizations.id, leadRow.organizationId),
              sql`${organizations.leadCreditsBalance} > 0`
            )
          )
          .returning({ leadCreditsBalance: organizations.leadCreditsBalance })

        if (!debited) {
          throw new TRPCError({
            code: 'PAYMENT_REQUIRED',
            message:
              'Este lead está pendiente. Activá con un crédito de lead o pasá a un plan que incluya leads.',
          })
        }

        await tx
          .update(leads)
          .set({
            accessStatus: 'activated',
            activationMode: 'pay_per_lead',
            activatedAt: now,
            updatedAt: now,
          })
          .where(eq(leads.id, input.id))

        return {
          ok: true as const,
          already: false,
          mode: 'pay_per_lead' as const,
          listingId: leadRow.listingId,
          organizationId: leadRow.organizationId,
        }
      })

      if (!result.already && result.listingId) {
        recordPortalStatsEvent(ctx.db, {
          terminalId: PORTAL_STATS_TERMINALS.LEAD_ACCESS_ACTIVATED,
          listingId: result.listingId,
          organizationId: result.organizationId,
          userId: ctx.session.userId,
          payload: { mode: result.mode },
        })
      }

      return result
    }),

  markManaged: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select({
          id: leads.id,
          accessStatus: leads.accessStatus,
          listingId: leads.listingId,
          organizationId: leads.organizationId,
        })
        .from(leads)
        .innerJoin(listings, eq(leads.listingId, listings.id))
        .where(and(eq(leads.id, input.id), eq(listings.publisherId, ctx.session.userId)))
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' })
      }

      if (existing.accessStatus === 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Activá el lead antes de marcarlo como gestionado.',
        })
      }

      if (existing.accessStatus === 'managed') {
        return { ok: true as const, already: true }
      }

      const now = new Date()
      await ctx.db
        .update(leads)
        .set({ accessStatus: 'managed', updatedAt: now })
        .where(eq(leads.id, input.id))

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LEAD_ACCESS_MANAGED,
        listingId: existing.listingId,
        organizationId: existing.organizationId,
        userId: ctx.session.userId,
        payload: {},
      })

      return { ok: true as const, already: false }
    }),

  listByPublisher: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
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
          accessStatus: leads.accessStatus,
          activatedAt: leads.activatedAt,
          activationMode: leads.activationMode,
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
        items: rows.map((r) => forPublisherView(r)),
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
          accessStatus: leads.accessStatus,
          activatedAt: leads.activatedAt,
          activationMode: leads.activationMode,
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

      const first = row[0]
      return first ? forPublisherView(first) : null
    }),
})
