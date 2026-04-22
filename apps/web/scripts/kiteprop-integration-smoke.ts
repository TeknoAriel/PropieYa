/**
 * Smoke tests manuales para KiteProp + MCP + assistant (sin framework de test).
 *
 * Uso desde apps/web:
 *   KITEPROP_API_KEY=kp_... pnpm exec tsx scripts/kiteprop-integration-smoke.ts
 *
 * Casos:
 * 1) getProperties (REST)
 * 2) getMessages (REST)
 * 3) createContact simulado (solo si KITEPROP_SMOKE_CREATE_LEAD=1)
 * 4) error sin API key
 */

import {
  createContact,
  getMessages,
  getProfile,
  getProperties,
  isKitepropConfigured,
} from '../src/lib/integrations/kiteprop-client'
import { queryLeadsFromMCP, queryPropertiesFromMCP } from '../src/lib/integrations/kiteprop-mcp'

function section(title: string) {
  console.log(`\n--- ${title} ---`)
}

async function main() {
  section('Configuración')
  console.log('isKitepropConfigured:', isKitepropConfigured())

  if (!isKitepropConfigured()) {
    section('Sin API key — se espera fallo controlado')
    const r = await getProfile()
    console.log('getProfile:', r.ok ? 'unexpected ok' : r.message)
    if (r.ok) process.exit(1)
    console.log('OK: comportamiento sin key')
    process.exit(0)
  }

  section('1) Perfil (REST)')
  const profile = await getProfile()
  console.log(profile.ok ? `OK status=${profile.status}` : profile.message)

  section('2) Propiedades (REST)')
  const props = await getProperties({ per_page: 2, page: 1 })
  console.log(props.ok ? `OK status=${props.status}` : props.message)

  section('3) Mensajes/consultas (REST)')
  const leads = await getMessages({ per_page: 2, page: 1 })
  console.log(leads.ok ? `OK status=${leads.status}` : leads.message)

  section('4) MCP / fallback — propiedades (prompt corto)')
  const mcpP = await queryPropertiesFromMCP('departamento venta')
  console.log('source:', mcpP.source, 'rows:', mcpP.results.length, '|', mcpP.summary)

  section('5) MCP / fallback — leads (prompt corto)')
  const mcpL = await queryLeadsFromMCP('mensajes')
  console.log('source:', mcpL.source, 'rows:', mcpL.results.length, '|', mcpL.summary)

  if (process.env.KITEPROP_SMOKE_CREATE_LEAD === '1') {
    section('6) createContact (KITEPROP_SMOKE_CREATE_LEAD=1)')
    const ext = `smoke-${Date.now()}`
    const created = await createContact({
      source: 'propieya',
      external_lead_id: ext,
      name: 'Smoke Propieya',
      email: `smoke+${ext}@example.invalid`,
      message: 'Lead de prueba automática — ignorar',
    })
    console.log(created.ok ? `OK status=${created.status}` : created.message)
  } else {
    section('6) createContact omitido (definí KITEPROP_SMOKE_CREATE_LEAD=1 para probar)')
  }

  console.log('\nSmoke terminado.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
