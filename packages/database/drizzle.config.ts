import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'drizzle-kit'

// Cargar .env: primero raíz del monorepo, luego cwd
const rootEnv = path.resolve(process.cwd(), '../../.env')
const localEnv = path.resolve(process.cwd(), '.env')
config({ path: fs.existsSync(rootEnv) ? rootEnv : localEnv })

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  // strict: false: menos prompts en push local; prod: preferir SQL en docs/sql + manifest.
  strict: false,
})
