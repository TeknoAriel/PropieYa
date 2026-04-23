import {
  createContact,
  createMessage,
  getProperties,
  getPropertyById,
  isKitepropConfigured,
  type KitepropClientResult,
} from './kiteprop-client'

export type KitepropAssignedContact = {
  id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  phone_whatsapp: string | null
}

export type KitepropPortalListing = {
  id: string
  code: string | null
  title: string
  operation: string | null
  propertyType: string | null
  priceAmount: number | null
  priceCurrency: string | null
  city: string | null
  neighborhood: string | null
  address: string | null
  images: string[]
  surfaceTotal: number | null
  bedrooms: number | null
  bathrooms: number | null
  isPublished: boolean | null
  assignedContact: KitepropAssignedContact | null
  raw: Record<string, unknown>
}

export type GetPropertiesFromKitePropInput = {
  page?: number
  perPage?: number
  search?: string
  status?: string
}

export type PropertyInquiryPayload = {
  property_id?: string | number | null
  property_code?: string | null
  property_title?: string | null
  source: 'Propieya'
  page_url?: string | null
  lead_intent_id?: string | null
  name: string
  email: string
  phone?: string | null
  message: string
  assigned_user_id?: string | null
  assigned_user_name?: string | null
}

export type PropertyInquiryResult =
  | { ok: true; mode: 'contacts_only' | 'contacts_and_messages'; contactId?: string | null }
  | { ok: false; reason: 'not_configured' | 'contract_not_confirmed' | 'upstream_error'; message: string }

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalizeCollection(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((i): i is Record<string, unknown> => asRecord(i) !== null)
  const obj = asRecord(raw)
  if (!obj) return []
  const arr = obj.data ?? obj.properties ?? obj.items ?? obj.results
  return Array.isArray(arr)
    ? arr.filter((i): i is Record<string, unknown> => asRecord(i) !== null)
    : []
}

export function mapKitePropContact(raw: unknown): KitepropAssignedContact | null {
  const o = asRecord(raw)
  if (!o) return null
  const fullName =
    asString(o.name) ??
    asString(o.full_name) ??
    asString(o.fullName)
  const email = asString(o.email)
  const phone = asString(o.phone) ?? asString(o.mobile_phone)
  const phoneWhatsapp =
    asString(o.phone_whatsapp) ??
    asString(o.whatsapp) ??
    asString(o.whatsapp_phone)
  const id =
    asString(o.id) ??
    asString(o.user_id) ??
    asString(o.agent_id)

  if (!fullName && !email && !phone && !phoneWhatsapp && !id) return null
  return {
    id,
    full_name: fullName,
    email,
    phone,
    phone_whatsapp: phoneWhatsapp,
  }
}

export function getPropertyAssignedContact(
  property: Record<string, unknown>
): KitepropAssignedContact | null {
  const candidates = [
    property.kitepropAssignedContact,
    property.assignedContact,
    property.assigned_user,
    property.user,
    property.agent,
    property.broker,
    property.advisor,
    property.seller_contact,
  ]
  for (const c of candidates) {
    const contact = mapKitePropContact(c)
    if (contact) return contact
  }
  return null
}

function collectImageUrls(property: Record<string, unknown>): string[] {
  const imgs = property.images
  if (!Array.isArray(imgs)) return []
  const out: string[] = []
  for (const img of imgs) {
    if (typeof img === 'string' && img.startsWith('http')) out.push(img)
    const obj = asRecord(img)
    const u = obj ? asString(obj.url) : null
    if (u && u.startsWith('http')) out.push(u)
  }
  return out
}

export function mapKitePropPropertyToPortalListing(
  raw: Record<string, unknown>
): KitepropPortalListing {
  const code = asString(raw.public_code) ?? asString(raw.code)
  const id = asString(raw.id) ?? code ?? 'unknown'
  const title = asString(raw.title) ?? asString(raw.content) ?? 'Propiedad sin título'
  const operation =
    raw.for_sale === true
      ? 'sale'
      : raw.for_rent === true
        ? 'rent'
        : raw.for_temp_rental === true
          ? 'temporary_rent'
          : asString(raw.type_operation)
  const priceAmount =
    asNumber(raw.for_sale_price) ??
    asNumber(raw.for_rent_price) ??
    asNumber(raw.for_temp_rental_price_month) ??
    asNumber(raw.price)
  const addressObj = asRecord(raw.address)
  return {
    id,
    code,
    title,
    operation,
    propertyType: asString(raw.property_type) ?? asString(raw.property_type_old),
    priceAmount,
    priceCurrency: asString(raw.currency),
    city: asString(raw.city),
    neighborhood: asString(raw.neighborhood),
    address: asString(raw.address) ?? asString(addressObj?.street),
    images: collectImageUrls(raw),
    surfaceTotal:
      asNumber(raw.total_meters) ??
      asNumber(raw.surface_total) ??
      asNumber(raw.surface),
    bedrooms: asNumber(raw.bedrooms),
    bathrooms: asNumber(raw.bathrooms),
    isPublished: raw.for_sale === true || raw.for_rent === true || raw.for_temp_rental === true,
    assignedContact: getPropertyAssignedContact(raw),
    raw,
  }
}

export async function getPropertiesFromKiteProp(
  input: GetPropertiesFromKitePropInput = {}
): Promise<KitepropClientResult<KitepropPortalListing[]>> {
  const result = await getProperties({
    page: input.page,
    per_page: input.perPage,
    q: input.search,
    search: input.search,
    status: input.status,
  })
  if (!result.ok) return result
  const rows = normalizeCollection(result.data).map(mapKitePropPropertyToPortalListing)
  return { ok: true, status: result.status, data: rows }
}

export async function getPropertyByIdFromKiteProp(
  idOrCode: string
): Promise<KitepropClientResult<KitepropPortalListing | null>> {
  const direct = await getPropertyById(idOrCode)
  if (direct.ok) {
    const rec = asRecord(direct.data)
    if (rec) {
      const dataNode = asRecord(rec.data)
      const candidate = dataNode ?? rec
      return { ok: true, status: direct.status, data: mapKitePropPropertyToPortalListing(candidate) }
    }
  }
  const listBySearch = await getProperties({ search: idOrCode, q: idOrCode, per_page: 5, page: 1 })
  if (!listBySearch.ok) {
    return {
      ok: false,
      status: listBySearch.status,
      message: listBySearch.message,
      body: listBySearch.body,
    }
  }
  const rows = normalizeCollection(listBySearch.data).map(mapKitePropPropertyToPortalListing)
  const exact =
    rows.find((r) => r.code === idOrCode || r.id === idOrCode) ??
    rows[0] ??
    null
  return { ok: true, status: listBySearch.status, data: exact }
}

function extractIdFromCreateContactResponse(raw: unknown): string | null {
  const o = asRecord(raw)
  if (!o) return null
  const direct = asString(o.id)
  if (direct) return direct
  const data = asRecord(o.data)
  if (!data) return null
  return asString(data.id) ?? asString(data.contact_id)
}

function normalizePropertyId(
  propertyId: string | number | null | undefined,
  propertyCode: string | null | undefined
): number | null {
  if (typeof propertyId === 'number' && Number.isFinite(propertyId)) {
    return propertyId
  }
  if (typeof propertyId === 'string') {
    const n = Number.parseInt(propertyId, 10)
    if (Number.isFinite(n)) return n
  }
  if (typeof propertyCode === 'string') {
    const n = Number.parseInt(propertyCode, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

function stringifyUpstreamError(raw: unknown): string {
  if (typeof raw === 'string') return raw
  try {
    return JSON.stringify(raw)
  } catch {
    return 'Respuesta no serializable del upstream'
  }
}

function hasFailureEnvelope(raw: unknown): raw is { success: false; errorMessage?: string; details?: unknown } {
  const r = asRecord(raw)
  return Boolean(r && r.success === false)
}

async function postLegacyInquiry(payload: PropertyInquiryPayload): Promise<PropertyInquiryResult | null> {
  const legacyUrl = process.env.KITEPROP_API_CONSULTA_URL?.trim()
  if (!legacyUrl) return null

  const apiKey =
    process.env.KITEPROP_API_KEY?.trim() ||
    process.env.KITEPROP_API_TOKEN?.trim() ||
    null
  if (!apiKey) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'KITEPROP_API_KEY no configurada',
    }
  }

  const propertyId = normalizePropertyId(payload.property_id, payload.property_code)
  const legacyPayload = {
    full_name: payload.name,
    email: payload.email,
    phone: payload.phone ?? undefined,
    body: payload.message,
    property_id: propertyId ?? undefined,
    source: payload.source,
    page_url: payload.page_url ?? undefined,
    lead_intent_id: payload.lead_intent_id ?? undefined,
    assigned_user_id: payload.assigned_user_id ?? undefined,
    assigned_user_name: payload.assigned_user_name ?? undefined,
  }

  try {
    const res = await fetch(legacyUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(legacyPayload),
      cache: 'no-store',
    })
    const text = await res.text()
    let parsed: unknown = text
    try {
      parsed = text.length > 0 ? JSON.parse(text) : {}
    } catch {
      // texto plano
    }
    if (!res.ok || hasFailureEnvelope(parsed)) {
      return {
        ok: false,
        reason: 'upstream_error',
        message: stringifyUpstreamError(parsed),
      }
    }
    return { ok: true, mode: 'contacts_and_messages', contactId: null }
  } catch (err) {
    return {
      ok: false,
      reason: 'upstream_error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * El contrato exacto de POST en KiteProp puede variar por cuenta/versión.
 * Para evitar inventar payloads, este adaptador solo se activa con:
 * - `KITEPROP_ENABLE_INQUIRY_POST=1`
 * y usa `contacts` (confirmado por docs MCP) con payload conservador.
 * El envío de `messages` es opt-in (`KITEPROP_ENABLE_MESSAGE_POST=1`).
 */
export async function createPropertyInquiryInKiteProp(
  payload: PropertyInquiryPayload
): Promise<PropertyInquiryResult> {
  if (!isKitepropConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'KITEPROP_API_KEY no configurada',
    }
  }

  const legacy = await postLegacyInquiry(payload)
  if (legacy) return legacy

  // Contrato confirmado por auditor para POST /messages.
  const propertyId = normalizePropertyId(payload.property_id, payload.property_code)
  if (propertyId !== null) {
    const messagePayload: Record<string, unknown> = {
      body: payload.message,
      phone: payload.phone ?? undefined,
      property_id: propertyId,
      email: payload.email,
    }
    const createdMessage = await createMessage(messagePayload)
    if (!createdMessage.ok) {
      return {
        ok: false,
        reason: 'upstream_error',
        message: createdMessage.message,
      }
    }
    if (hasFailureEnvelope(createdMessage.data)) {
      return {
        ok: false,
        reason: 'upstream_error',
        message: stringifyUpstreamError(createdMessage.data),
      }
    }
    return { ok: true, mode: 'contacts_and_messages', contactId: null }
  }

  // Sin propiedad, fallback a contacto.
  const contactPayload: Record<string, unknown> = {
    first_name: payload.name,
    email: payload.email,
    phone: payload.phone ?? undefined,
    summary: payload.message,
    source: payload.source,
    page_url: payload.page_url ?? undefined,
    lead_intent_id: payload.lead_intent_id ?? undefined,
    assigned_user_id: payload.assigned_user_id ?? undefined,
    assigned_user_name: payload.assigned_user_name ?? undefined,
  }
  const createdContact = await createContact(contactPayload)
  if (!createdContact.ok) {
    return {
      ok: false,
      reason: 'upstream_error',
      message: createdContact.message,
    }
  }
  if (hasFailureEnvelope(createdContact.data)) {
    return {
      ok: false,
      reason: 'upstream_error',
      message: stringifyUpstreamError(createdContact.data),
    }
  }
  const contactId = extractIdFromCreateContactResponse(createdContact.data)
  return { ok: true, mode: 'contacts_only', contactId }
}
