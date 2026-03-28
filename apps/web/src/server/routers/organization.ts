import { randomBytes } from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'

import {
  organizationInvites,
  organizationMemberships,
  users,
} from '@propieya/database'
import type { UserRole } from '@propieya/shared'

import { createAccessToken } from '../auth'
import {
  createTRPCRouter,
  protectedProcedure,
  orgMembersProcedure,
} from '../trpc'

const INVITE_ROLE = z.enum(['agent', 'coordinator', 'org_admin'])
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function normEmail(s: string) {
  return s.trim().toLowerCase()
}

export const organizationRouter = createTRPCRouter({
  listMembers: orgMembersProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId
    const rows = await ctx.db.query.organizationMemberships.findMany({
      where: and(
        eq(organizationMemberships.organizationId, orgId),
        eq(organizationMemberships.isActive, true)
      ),
      with: {
        user: true,
      },
      orderBy: [desc(organizationMemberships.joinedAt)],
    })

    return rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      email: m.user?.email ?? '',
      name: m.user?.name ?? '',
    }))
  }),

  listPendingInvites: orgMembersProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId
    const now = new Date()
    return ctx.db.query.organizationInvites.findMany({
      where: and(
        eq(organizationInvites.organizationId, orgId),
        isNull(organizationInvites.acceptedAt),
        gt(organizationInvites.expiresAt, now)
      ),
      orderBy: [desc(organizationInvites.createdAt)],
    })
  }),

  createInvite: orgMembersProcedure
    .input(
      z.object({
        email: z.string().email().max(255),
        role: INVITE_ROLE,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId
      const email = normEmail(input.email)

      if (email === normEmail(ctx.session.email)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No podés invitarte a vos mismo',
        })
      }

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      })

      if (existingUser) {
        const already = await ctx.db.query.organizationMemberships.findFirst({
          where: and(
            eq(organizationMemberships.userId, existingUser.id),
            eq(organizationMemberships.organizationId, orgId),
            eq(organizationMemberships.isActive, true)
          ),
        })
        if (already) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ese usuario ya es miembro de la organización',
          })
        }

        const otherOrg = await ctx.db.query.organizationMemberships.findFirst({
          where: and(
            eq(organizationMemberships.userId, existingUser.id),
            eq(organizationMemberships.isActive, true)
          ),
        })
        if (otherOrg && otherOrg.organizationId !== orgId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message:
              'Ese usuario ya pertenece a otra organización. Usá otra cuenta o contactá soporte.',
          })
        }
      }

      const now = new Date()
      await ctx.db
        .delete(organizationInvites)
        .where(
          and(
            eq(organizationInvites.organizationId, orgId),
            eq(organizationInvites.email, email),
            isNull(organizationInvites.acceptedAt),
            gt(organizationInvites.expiresAt, now)
          )
        )

      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

      await ctx.db.insert(organizationInvites).values({
        organizationId: orgId,
        email,
        role: input.role,
        invitedBy: ctx.session.userId,
        token,
        expiresAt,
      })

      const webBase = (
        process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://propieyaweb.vercel.app'
      ).replace(/\/$/, '')
      const acceptUrl = `${webBase}/aceptar-invitacion?token=${encodeURIComponent(token)}`

      return { token, acceptUrl, expiresAt }
    }),

  revokeInvite: orgMembersProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.organizationInvites.findFirst({
        where: eq(organizationInvites.id, input.id),
      })
      if (!row || row.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      await ctx.db
        .delete(organizationInvites)
        .where(eq(organizationInvites.id, input.id))
      return { ok: true as const }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().min(16).max(512) }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.query.organizationInvites.findFirst({
        where: eq(organizationInvites.token, input.token.trim()),
      })

      if (!invite || invite.acceptedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitación no encontrada o ya utilizada',
        })
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La invitación expiró',
        })
      }

      if (normEmail(invite.email) !== normEmail(ctx.session.email)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Esta invitación es para otro correo electrónico',
        })
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
      }

      const existingInOrg = await ctx.db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.userId, ctx.session.userId),
          eq(organizationMemberships.organizationId, invite.organizationId),
          eq(organizationMemberships.isActive, true)
        ),
      })
      if (existingInOrg) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya sos miembro de esta organización',
        })
      }

      const anyOther = await ctx.db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.userId, ctx.session.userId),
          eq(organizationMemberships.isActive, true)
        ),
      })
      if (anyOther && anyOther.organizationId !== invite.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Ya tenés una organización asignada. Usá otra cuenta para aceptar esta invitación.',
        })
      }

      await ctx.db.insert(organizationMemberships).values({
        userId: ctx.session.userId,
        organizationId: invite.organizationId,
        role: invite.role,
        invitedBy: invite.invitedBy,
        isActive: true,
      })

      await ctx.db
        .update(organizationInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvites.id, invite.id))

      const role = invite.role as UserRole
      const accessToken = await createAccessToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role,
        orgId: invite.organizationId,
      })

      return {
        ok: true as const,
        accessToken,
        organizationId: invite.organizationId,
        role,
      }
    }),
})
