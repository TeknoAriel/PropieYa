import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'

import { db } from '@propieya/database'

import { verifyAccessToken, payloadToSession, type Session } from './auth'

export interface Context {
  db: typeof db
  session: Session | null
  /** IP del cliente (para rate limiting) */
  ip: string
}

function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export const createTRPCContext = async (opts: {
  headers: Headers
}): Promise<Context> => {
  const session = await getSession(opts.headers)

  return {
    db,
    session,
    ip: getClientIp(opts.headers),
  }
}

async function getSession(headers: Headers): Promise<Session | null> {
  const authHeader = headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const payload = await verifyAccessToken(token)
  if (!payload) return null

  return payloadToSession(payload)
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session.organizationId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization context required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.session.organizationId,
    },
  })
})

/** Gestión de equipo: coordinadores y admins de org. */
export const orgMembersProcedure = orgProcedure.use(({ ctx, next }) => {
  if (!ctx.session.permissions.includes('org:members')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Sin permiso para gestionar el equipo',
    })
  }
  return next({ ctx })
})
