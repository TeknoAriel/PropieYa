import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null

function assertPostgresUrlHasHost(connectionString: string): void {
  try {
    const u = new URL(connectionString)
    const h = u.hostname
    if (!h || h === 'undefined' || h === 'null') {
      throw new Error('missing host')
    }
  } catch {
    throw new Error(
      'DATABASE_URL no es una URL PostgreSQL válida (sin host). Revisá variables en Vercel / Neon.'
    )
  }
}

function createClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  assertPostgresUrlHasHost(connectionString)

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    /** Neon pooler (PgBouncer transaction): prepared statements suelen fallar. */
    prepare: false,
    connect_timeout: 25,
  })

  return drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  })
}

export function getDb() {
  if (!_db) {
    _db = createClient()
  }
  return _db
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>]
  },
})

export type Database = PostgresJsDatabase<typeof schema>
