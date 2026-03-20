import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'

import { users, userSessions, userPreferences, organizationMemberships } from '@propieya/database'
import { registerSchema, loginSchema } from '@propieya/shared'
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

const REFRESH_TOKEN_BYTES = 32

function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      })
      if (existing) {
        throw new Error('Ya existe una cuenta con ese email')
      }

      const passwordHash = await hashPassword(input.password)
      const [user] = await ctx.db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          name: input.name.trim(),
          phone: input.phone?.trim() ?? null,
          passwordHash,
        })
        .returning()

      if (!user) throw new Error('Error al crear el usuario')

      await ctx.db.insert(userPreferences).values({
        userId: user.id,
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
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
