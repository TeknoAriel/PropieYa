#!/usr/bin/env npx tsx
/**
 * Crea una organización y usuario demo para poder importar propiedades.
 * Uso: DATABASE_URL="..." pnpm exec tsx scripts/seed-org-for-import.ts
 */
import 'dotenv/config'

import * as argon2 from 'argon2'

import {
  db,
  organizations,
  organizationMemberships,
  users,
} from '@propieya/database'

const DEMO_EMAIL = 'import@propieya.local'
const DEMO_PASSWORD = 'import-demo-2024'
const DEMO_ORG_NAME = 'Propieya Import'

async function main() {
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, DEMO_EMAIL),
  })
  if (existing) {
    console.log('Usuario import@propieya.local ya existe. Listo.')
    return
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id })

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: 'Usuario Import',
      passwordHash,
    })
    .returning()

  if (!user) throw new Error('No se pudo crear usuario')

  const [org] = await db
    .insert(organizations)
    .values({
      name: DEMO_ORG_NAME,
      email: DEMO_EMAIL,
      type: 'real_estate_agency',
      status: 'active',
    })
    .returning()

  if (!org) throw new Error('No se pudo crear organización')

  await db.insert(organizationMemberships).values({
    userId: user.id,
    organizationId: org.id,
    role: 'org_admin',
    isActive: true,
  })

  console.log('✓ Org y usuario creados para import.')
  console.log(`  Org: ${org.id}`)
  console.log(`  User: ${user.id}`)
  console.log(`  Email: ${DEMO_EMAIL} / contraseña: ${DEMO_PASSWORD}`)
  console.log('')
  console.log('Ejecutá: pnpm import:yumblin')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
