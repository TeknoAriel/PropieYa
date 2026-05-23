/**
 * Smoke: POST /api/v1/messages con property_id (una sola vez).
 * Uso: KITEPROP_API_KEY=… pnpm exec tsx scripts/smoke-kiteprop-message-once.ts 515670
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import { createMessage } from '../apps/web/src/lib/integrations/kiteprop-client'
import { resolveKitepropMessageName } from '../apps/web/src/lib/integrations/kiteprop-properties'

config({ path: resolve(__dirname, '../apps/web/.env.prod.audit') })

const propertyId = Number.parseInt(process.argv[2] ?? '515670', 10)

async function main() {
  const email = `smoke+${Date.now()}@example.invalid`
  const payload = {
    name: resolveKitepropMessageName({ name: 'Propieya Smoke', email }),
    email,
    body: `Smoke POST messages ${new Date().toISOString()}`,
    property_id: propertyId,
    phone: '+5491100000001',
  }
  const sent = await createMessage(payload)
  if (!sent.ok) {
    console.error('FAIL', sent.status, sent.message, sent.body ?? '')
    process.exit(1)
  }
  console.log('OK', sent.status, JSON.stringify(sent.data).slice(0, 400))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
