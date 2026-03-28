import { z } from 'zod'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { TRPCError } from '@trpc/server'

import {
  users,
  userSessions,
  userPreferences,
  organizations,
  organizationMemberships,
  userTokens,
  type Database,
} from '@propieya/database'
import { registerSchema, loginSchema, humanizeDbError } from '@propieya/shared'
import type { UserRole } from '@propieya/shared'

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from '../trpc'
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  getRefreshExpiresAt,
} from '../auth'
import { isMagicLinkTestMode } from '../magic-link'

const REFRESH_TOKEN_BYTES = 32
const MAGIC_LINK_TYPE = 'magic_login'
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

function generateMagicToken(): string {
  return randomBytes(32).toString('hex')
}

function panelBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_PANEL_URL?.trim() || 'http://localhost:3011'
  return base.replace(/\/$/, '')
}

async function issueSessionForUser(
  ctx: { db: Database },
  user: typeof users.$inferSelect
) {
  const membership = await ctx.db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, user.id),
      eq(organizationMemberships.isActive, true)
    ),
  })

  const role: UserRole = (membership?.role as UserRole) ?? 'user'
  const orgId = membership?.organizationId ?? null

  const accessToken = await createAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role,
    orgId,
  })

  const refreshToken = generateRefreshToken()
  const expiresAt = getRefreshExpiresAt()

  await ctx.db.insert(userSessions).values({
    userId: user.id,
    refreshToken,
    expiresAt,
  })

  await ctx.db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  const expiresIn = 7 * 24 * 60 * 60

  return {
    accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      organizationId: orgId,
    },
  }
}

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const existing = await ctx.db.query.users.findFirst({
          where: eq(users.email, input.email.toLowerCase()),
        })
        if (existing) {
          throw new Error('Ya existe una cuenta con ese email')
        }

        const passwordHash = await hashPassword(input.password)
        const accountIntent = input.accountIntent

        const [user] = await ctx.db
          .insert(users)
          .values({
            email: input.email.toLowerCase(),
            name: input.name.trim(),
            phone: input.phone?.trim() ?? null,
            passwordHash,
            accountIntent,
          })
          .returning()

        if (!user) throw new Error('Error al crear el usuario')

        await ctx.db.insert(userPreferences).values({
          userId: user.id,
        })

        if (accountIntent === 'owner_publisher') {
          const orgName = `Particular — ${input.name.trim()}`
          const [org] = await ctx.db
            .insert(organizations)
            .values({
              type: 'individual_owner',
              status: 'active',
              name: orgName.slice(0, 255),
              email: user.email,
              phone: user.phone,
            })
            .returning({ id: organizations.id })
          if (org) {
            await ctx.db.insert(organizationMemberships).values({
              userId: user.id,
              organizationId: org.id,
              role: 'org_admin',
            })
          }
        } else if (accountIntent === 'agency_publisher') {
          const rawName = input.organizationName?.trim() ?? ''
          const [org] = await ctx.db
            .insert(organizations)
            .values({
              type: 'real_estate_agency',
              status: 'active',
              name: rawName.slice(0, 255),
              email: user.email,
              phone: user.phone,
            })
            .returning({ id: organizations.id })
          if (org) {
            await ctx.db.insert(organizationMemberships).values({
              userId: user.id,
              organizationId: org.id,
              role: 'org_admin',
            })
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          accountIntent,
        }
      } catch (e) {
        if (e instanceof TRPCError) throw e
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('Ya existe')) throw e
        const h = humanizeDbError(e)
        if (h) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: h })
        }
        throw e
      }
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.email, input.email.toLowerCase()),
        })

        if (!user || !user.passwordHash) {
          throw new Error('Email o contraseña incorrectos')
        }

        const valid = await verifyPassword(input.password, user.passwordHash)
        if (!valid) {
          throw new Error('Email o contraseña incorrectos')
        }

        if (!user.isActive) {
          throw new Error('Cuenta desactivada')
        }

        return await issueSessionForUser(ctx, user)
      } catch (e) {
        if (e instanceof TRPCError) throw e
        const msg = e instanceof Error ? e.message : ''
        if (
          msg.includes('incorrectos') ||
          msg.includes('desactivada')
        ) {
          throw e
        }
        const h = humanizeDbError(e)
        if (h) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: h })
        }
        throw e
      }
    }),

  /** Solo con MAGIC_LINK_TEST_MODE=1. Devuelve URL al panel para entrar sin contraseña (pruebas). */
  generateTestMagicLink: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2).optional(),
        createIfMissing: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isMagicLinkTestMode()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Magic link de prueba desactivado. En Vercel (web): MAGIC_LINK_TEST_MODE=1',
        })
      }
      try {
        const email = input.email.toLowerCase()
        let user = await ctx.db.query.users.findFirst({
          where: eq(users.email, email),
        })

        if (!user && input.createIfMissing) {
          const randomPwd = `${randomBytes(24).toString('base64url')}Aa1`
          const passwordHash = await hashPassword(randomPwd)
          const [created] = await ctx.db
            .insert(users)
            .values({
              email,
              name:
                input.name?.trim() ||
                email.split('@')[0]?.slice(0, 50) ||
                'Usuario prueba',
              passwordHash,
            })
            .returning()
          if (!created) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'No se pudo crear usuario de prueba',
            })
          }
          await ctx.db.insert(userPreferences).values({ userId: created.id })
          user = created
        }

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message:
              'No hay usuario con ese email. Activá “crear si no existe” o registrate en /registro.',
          })
        }

        const token = generateMagicToken()
        const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)

        await ctx.db.insert(userTokens).values({
          userId: user.id,
          type: MAGIC_LINK_TYPE,
          token,
          expiresAt,
        })

        const url = `${panelBaseUrl()}/login/magic?token=${encodeURIComponent(token)}`

        return {
          url,
          expiresInMinutes: 15,
        }
      } catch (e) {
        if (e instanceof TRPCError) throw e
        const h = humanizeDbError(e)
        if (h) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: h })
        }
        throw e
      }
    }),

  consumeMagicLink: publicProcedure
    .input(z.object({ token: z.string().min(16) }))
    .mutation(async ({ input, ctx }) => {
      if (!isMagicLinkTestMode()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Magic link de prueba desactivado.',
        })
      }
      try {
        const now = new Date()
        const [row] = await ctx.db
          .select()
          .from(userTokens)
          .where(
            and(
              eq(userTokens.token, input.token),
              eq(userTokens.type, MAGIC_LINK_TYPE),
              isNull(userTokens.usedAt),
              gt(userTokens.expiresAt, now)
            )
          )
          .limit(1)

        if (!row) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Enlace inválido o expirado. Generá uno nuevo en el login.',
          })
        }

        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, row.userId),
        })
        if (!user || !user.isActive) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Usuario no disponible',
          })
        }

        await ctx.db
          .update(userTokens)
          .set({ usedAt: now })
          .where(eq(userTokens.id, row.id))

        return await issueSessionForUser(ctx, user)
      } catch (e) {
        if (e instanceof TRPCError) throw e
        const h = humanizeDbError(e)
        if (h) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: h })
        }
        throw e
      }
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.userId),
    })
    if (!user) return null

    const memberships = await ctx.db.query.organizationMemberships.findMany({
      where: and(
        eq(organizationMemberships.userId, user.id),
        eq(organizationMemberships.isActive, true)
      ),
    })

    const preferences = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      timezone: user.timezone,
      lastLoginAt: user.lastLoginAt,
      role: ctx.session.role,
      organizationId: ctx.session.organizationId,
      permissions: ctx.session.permissions,
      memberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        teamId: m.teamId,
      })),
      preferences: preferences
        ? {
            theme: preferences.theme,
            displayMode: preferences.displayMode,
          }
        : null,
    }
  }),

  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = await ctx.db.query.userSessions.findFirst({
        where: eq(userSessions.refreshToken, input.refreshToken),
      })

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Sesión inválida o expirada')
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, session.userId),
      })
      if (!user || !user.isActive) {
        throw new Error('Usuario no encontrado o inactivo')
      }

      const membership = await ctx.db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.userId, user.id),
          eq(organizationMemberships.isActive, true)
        ),
      })

      const role: UserRole = (membership?.role as UserRole) ?? 'user'
      const orgId = membership?.organizationId ?? null

      const accessToken = await createAccessToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role,
        orgId,
      })

      const newRefreshToken = generateRefreshToken()
      const expiresAt = getRefreshExpiresAt()

      await ctx.db
        .update(userSessions)
        .set({
          refreshToken: newRefreshToken,
          expiresAt,
        })
        .where(eq(userSessions.id, session.id))

      const expiresIn = 7 * 24 * 60 * 60

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      }
    }),

  logout: publicProcedure
    .input(z.object({ refreshToken: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.refreshToken, input.refreshToken))
      return { ok: true }
    }),
})
