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
  if (process.env.KITEPROP_ENABLE_INQUIRY_POST !== '1') {
    return {
      ok: false,
      reason: 'contract_not_confirmed',
      message:
        'POST de inquiry desactivado hasta confirmar contrato final de campos en KiteProp.',
    }
  }

  const contactPayload: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone ?? undefined,
    source: payload.source,
    property_id: payload.property_id ?? undefined,
    property_code: payload.property_code ?? undefined,
    property_title: payload.property_title ?? undefined,
    assigned_user_id: payload.assigned_user_id ?? undefined,
    assigned_user_name: payload.assigned_user_name ?? undefined,
    metadata: {
      page_url: payload.page_url ?? undefined,
      lead_intent_id: payload.lead_intent_id ?? undefined,
    },
  }

  const createdContact = await createContact(contactPayload)
  if (!createdContact.ok) {
    return {
      ok: false,
      reason: 'upstream_error',
      message: createdContact.message,
    }
  }

  const contactId = extractIdFromCreateContactResponse(createdContact.data)
  if (process.env.KITEPROP_ENABLE_MESSAGE_POST !== '1') {
    return { ok: true, mode: 'contacts_only', contactId }
  }

  const messagePayload: Record<string, unknown> = {
    message: payload.message,
    source: payload.source,
    contact_id: contactId ?? undefined,
    property_id: payload.property_id ?? undefined,
    property_code: payload.property_code ?? undefined,
    property_title: payload.property_title ?? undefined,
    assigned_user_id: payload.assigned_user_id ?? undefined,
    assigned_user_name: payload.assigned_user_name ?? undefined,
    page_url: payload.page_url ?? undefined,
    lead_intent_id: payload.lead_intent_id ?? undefined,
  }
  const createdMessage = await createMessage(messagePayload)
  if (!createdMessage.ok) {
    return {
      ok: false,
      reason: 'upstream_error',
      message: createdMessage.message,
    }
  }
  return { ok: true, mode: 'contacts_and_messages', contactId }
}
