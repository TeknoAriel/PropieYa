import * as argon2 from 'argon2'
import { SignJWT, jwtVerify } from 'jose'

import type { UserRole } from '@propieya/shared'
import { ROLE_PERMISSIONS } from '@propieya/shared'

export interface Session {
  userId: string
  email: string
  name: string
  role: UserRole
  organizationId: string | null
  permissions: string[]
}

export interface JWTPayload {
  sub: string
  email: string
  name: string
  role: UserRole
  orgId: string | null
  iat: number
  exp: number
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'
)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_EXPIRES_IN_DAYS = 30

function parseExpiresIn(s: string): number {
  if (s.endsWith('d')) return parseInt(s.slice(0, -1), 10) * 24 * 60 * 60
  if (s.endsWith('h')) return parseInt(s.slice(0, -1), 10) * 60 * 60
  if (s.endsWith('m')) return parseInt(s.slice(0, -1), 10) * 60
  return parseInt(s, 10) || 7 * 24 * 60 * 60
}

const accessTokenExpiresInSeconds = parseExpiresIn(JWT_EXPIRES_IN)

export async function createAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    orgId: payload.orgId ?? null,
  })
    .setSubject(payload.sub)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${accessTokenExpiresInSeconds}s`)
    .sign(JWT_SECRET)
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const sub = payload.sub
    if (!sub || typeof sub !== 'string') return null
    const role = (payload.role as UserRole) ?? 'user'
    const permissions = ROLE_PERMISSIONS[role] ?? []
    return {
      sub,
      email: (payload.email as string) ?? '',
      name: (payload.name as string) ?? '',
      role,
      orgId: (payload.orgId as string | null) ?? null,
      iat: (payload.iat as number) ?? 0,
      exp: (payload.exp as number) ?? 0,
    }
  } catch {
    return null
  }
}

export function payloadToSession(payload: JWTPayload): Session {
  const permissions = ROLE_PERMISSIONS[payload.role] ?? []
  return {
    userId: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    organizationId: payload.orgId,
    permissions: permissions as string[],
  }
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

export function getRefreshExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + REFRESH_EXPIRES_IN_DAYS)
  return d
}
