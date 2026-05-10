/**
 * Validación post-auth contra PRODUCCIÓN (propieyaweb.vercel.app).
 * Ejecutar: node scripts/qa-post-auth-validation.mjs
 */
const BASE = process.env.QA_PORTAL_URL || 'https://propieyaweb.vercel.app'

async function trpcMutation(proc, input, token) {
  const body = { 0: { json: input } }
  const res = await fetch(`${BASE}/api/trpc/${proc}?batch=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return parseTrpcBody(await res.text(), res.status)
}

/** Queries en este servidor tRPC solo aceptan GET (no POST). */
async function trpcQuery(proc, input, token) {
  const inputStr = encodeURIComponent(
    JSON.stringify({ 0: { json: input ?? null } })
  )
  const res = await fetch(
    `${BASE}/api/trpc/${proc}?batch=1&input=${inputStr}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )
  return parseTrpcBody(await res.text(), res.status)
}

function parseTrpcBody(text, httpStatus) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON (${httpStatus}): ${text.slice(0, 400)}`)
  }
  const first = Array.isArray(parsed) ? parsed[0] : parsed
  if (first?.error) {
    const err = first.error.json || first.error
    throw new Error(err.message || JSON.stringify(err))
  }
  return first?.result?.data?.json
}

function summarizeSeekerProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    naturalLanguageSummary: row.naturalLanguageSummary?.slice?.(0, 120),
    completeness: row.completeness,
    updatedAt: row.updatedAt,
  }
}

function minimalListingPayload() {
  return {
    propertyType: 'apartment',
    operationType: 'sale',
    address: {
      street: 'Av QA Automático',
      number: '1000',
      floor: '3',
      unit: 'A',
      neighborhood: 'Palermo',
      city: 'Buenos Aires',
      state: 'CABA',
      country: 'Argentina',
      postalCode: '1414',
    },
    location: { lat: -34.58, lng: -58.42 },
    hideExactAddress: false,
    title: 'Departamento QA automatizado de prueba portal',
    description:
      'Descripción de prueba para validación post-auth en Propieya. Superficie luminosa, ambientes amplios, ideal para verificar borrador y flujo publicador sin intervención manual.',
    internalNotes: null,
    price: {
      amount: 150000,
      currency: 'USD',
      showPrice: true,
      expenses: null,
      expensesCurrency: null,
    },
    surface: {
      total: 65,
      covered: 55,
      semicovered: 5,
      land: null,
    },
    rooms: {
      bedrooms: 2,
      bathrooms: 1,
      toilettes: 1,
      garages: 0,
      total: 4,
    },
    features: {
      floor: 3,
      totalFloors: 12,
      escalera: null,
      orientation: 'N',
      disposition: 'front',
      age: { type: 'years', years: 10 },
      amenities: ['balcony'],
      extras: {},
    },
  }
}

async function main() {
  const stamp = Date.now()
  const pass = 'QaValid1Pass'
  const seekerEmail = `qa_seeker_${stamp}@example.com`
  const ownerEmail = `qa_owner_${stamp}@example.com`
  const agencyEmail = `qa_agency_${stamp}@example.com`

  console.log('=== /api/version ===')
  const ver = await fetch(`${BASE}/api/version`).then((r) => r.json())
  console.log(JSON.stringify(ver))

  console.log('\n--- Registro cuentas ---')
  await trpcMutation('auth.register', {
    name: 'QA Seeker',
    email: seekerEmail,
    password: pass,
    accountIntent: 'seeker',
  })
  await trpcMutation('auth.register', {
    name: 'QA Dueño',
    email: ownerEmail,
    password: pass,
    accountIntent: 'owner_publisher',
  })
  await trpcMutation('auth.register', {
    name: 'QA Inmobiliaria',
    email: agencyEmail,
    password: pass,
    accountIntent: 'agency_publisher',
    organizationName: 'QA Inmobiliaria SA',
  })
  console.log('registro seeker/owner/agency OK')

  const seekerTok = await trpcMutation('auth.login', {
    email: seekerEmail,
    password: pass,
  }).then((r) => r.accessToken)
  const ownerTok = await trpcMutation('auth.login', {
    email: ownerEmail,
    password: pass,
  }).then((r) => r.accessToken)
  const agencyTok = await trpcMutation('auth.login', {
    email: agencyEmail,
    password: pass,
  }).then((r) => r.accessToken)

  console.log('\n=== TAREA 1: Búsqueda guardada (demand profile) ===')
  const filters = {
    operationType: 'sale',
    city: 'Buenos Aires',
    propertyType: 'apartment',
    minPrice: 50000,
    maxPrice: 200000,
  }
  const upserted = await trpcMutation('demand.upsertFromSearchFilters', filters, seekerTok)
  console.log('demand.upsertFromSearchFilters:', summarizeSeekerProfile(upserted))
  const profile = await trpcQuery('demand.getMyProfile', null, seekerTok)
  console.log('demand.getMyProfile:', summarizeSeekerProfile(profile))
  await trpcMutation('demand.clearMyProfile', null, seekerTok)
  console.log('demand.clearMyProfile: OK')

  console.log('\n=== TAREA 2: Alertas ===')
  await trpcMutation('demand.upsertFromSearchFilters', filters, seekerTok)
  const alert = await trpcMutation('searchAlert.create', { ...filters, name: 'QA alerta' }, seekerTok)
  console.log('searchAlert.create:', alert)
  const feed = await trpcQuery('searchAlert.getMyFeed', null, seekerTok)
  const saved = feed?.filter?.((x) => x.kind === 'saved_search') ?? []
  console.log(
    'searchAlert.getMyFeed saved_search count:',
    saved.length,
    saved[0]?.filtersSummary?.slice?.(0, 80)
  )
  await trpcMutation('searchAlert.setActive', { id: alert.id, isActive: false }, seekerTok)
  console.log('searchAlert.setActive (pausa): OK')
  await trpcMutation('searchAlert.remove', { id: alert.id }, seekerTok)
  console.log('searchAlert.remove: OK')

  console.log('\n=== TAREA 3A: Publicar — dueño ===')
  let ownerListingId
  try {
    const created = await trpcMutation('listing.create', minimalListingPayload(), ownerTok)
    ownerListingId = created?.id
    console.log('listing.create owner:', ownerListingId, created?.status)
    try {
      const pub = await trpcMutation(
        'listing.publish',
        { id: ownerListingId },
        ownerTok
      )
      console.log('listing.publish owner: OK', pub?.status ?? pub)
    } catch (e) {
      console.log('listing.publish owner: FAIL', e.message)
    }
  } catch (e) {
    console.log('listing owner flow FAIL:', e.message)
  }

  console.log('\n=== TAREA 3B: Publicar — inmobiliaria ===')
  try {
    const created = await trpcMutation('listing.create', minimalListingPayload(), agencyTok)
    const lid = created?.id
    console.log('listing.create agency:', lid, created?.status)
    try {
      const pub = await trpcMutation(
        'listing.publish',
        { id: lid },
        agencyTok
      )
      console.log('listing.publish agency: OK', pub?.status ?? pub)
    } catch (e) {
      console.log('listing.publish agency: FAIL', e.message)
    }
  } catch (e) {
    console.log('listing agency flow FAIL:', e.message)
  }

  console.log('\n=== TAREA 4: Lead + KiteProp ===')
  const searchRes = await trpcQuery('listing.search', {
    operationType: 'sale',
    limit: 5,
    offset: 0,
  })
  const items = searchRes?.items ?? searchRes?.listings ?? searchRes?.results ?? []
  const first = items[0]
  const listingId = first?.id
  const src = first?.source ?? first?.listing?.source
  console.log('listing.search primer aviso:', listingId, 'source=', src)

  if (!listingId) {
    console.log('Sin avisos para lead.create — abort lead test')
    return
  }

  const leadBody = {
    listingId,
    contactName: 'QA Lead Bot',
    contactEmail: `qa_lead_${stamp}@example.com`,
    contactPhone: '+5491112345678',
    message: 'Consulta de prueba automatizada post-auth validation Propieya portal.',
    pageUrl: `${BASE}/propiedad/${listingId}`,
  }
  let leadOut
  try {
    leadOut = await trpcMutation('lead.create', leadBody)
    console.log('lead.create persisted id:', leadOut?.id, 'accessStatus:', leadOut?.accessStatus)
  } catch (e) {
    console.log('lead.create FAIL:', e.message)
    return
  }

  console.log(
    '\nNota: sync KiteProp es async en servidor; comprobar enrichment en DB o logs Vercel.'
  )
  console.log('lead.create programa scheduleKitepropLeadSync — elegibilidad según código:')
  console.log('- import listingSource → intenta sync si API configurada')
  console.log('- portal draft/active free → access pending puede omitir sync')

  await new Promise((r) => setTimeout(r, 4000))

  const leadDetail = await trpcQuery(
    'lead.getById',
    { id: leadOut.id },
    ownerTok
  ).catch((e) => ({ error: e.message }))

  console.log(
    'lead.getById(token dueño QA):',
    leadDetail === null
      ? 'null (esperado si el aviso público no pertenece a esta cuenta)'
      : JSON.stringify(leadDetail)?.slice(0, 400)
  )

  const enrichment =
    leadOut?.enrichment && typeof leadOut.enrichment === 'object'
      ? leadOut.enrichment
      : {}
  console.log(
    'lead enrichment en respuesta create (antes sync async):',
    JSON.stringify(enrichment.kiteprop || {}).slice(0, 200)
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
