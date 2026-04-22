import { getPropertyByIdFromKiteProp, mapKitePropContact } from './kiteprop-properties'
import { isKitepropConfigured } from './kiteprop-client'

export type PortalAssignedContact = {
  id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  phone_whatsapp: string | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

export function getAssignedContactFromListingFeatures(
  features: unknown
): PortalAssignedContact | null {
  const f = asRecord(features)
  if (!f) return null
  const raw =
    f.kitepropAssignedContact ??
    f.assignedContact ??
    f.assigned_user ??
    f.agent
  const contact = mapKitePropContact(raw)
  return contact
}

export async function resolveAssignedContactForListing(opts: {
  source: string
  externalId: string | null | undefined
  features: unknown
}): Promise<PortalAssignedContact | null> {
  const fromFeatures = getAssignedContactFromListingFeatures(opts.features)
  if (fromFeatures) return fromFeatures

  if (
    opts.source !== 'import' ||
    !opts.externalId ||
    !isKitepropConfigured() ||
    process.env.KITEPROP_ENRICH_LISTING_CONTACT !== '1'
  ) {
    return null
  }

  const live = await getPropertyByIdFromKiteProp(opts.externalId)
  if (!live.ok || !live.data?.assignedContact) {
    return null
  }
  return live.data.assignedContact
}

export function preferredWhatsappPhone(
  contact: PortalAssignedContact | null | undefined
): string | null {
  if (!contact) return null
  return contact.phone_whatsapp ?? contact.phone ?? null
}
