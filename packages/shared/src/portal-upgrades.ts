import { z } from 'zod'

import {
  portalCommercialPackageById,
  type ListingPortalVisibility,
  type PortalCommercialPackageId,
} from './portal-visibility'

export const PORTAL_UPGRADE_PURCHASE_TYPES = ['listing', 'package'] as const
export type PortalUpgradePurchaseType = (typeof PORTAL_UPGRADE_PURCHASE_TYPES)[number]

export const PORTAL_UPGRADE_CHANNELS = ['online', 'on_demand'] as const
export type PortalUpgradeChannel = (typeof PORTAL_UPGRADE_CHANNELS)[number]

export const PORTAL_UPGRADE_STATUSES = [
  'draft',
  'initiated',
  'pending_payment',
  'pending_activation',
  'active',
  'scheduled',
  'expired',
  'cancelled',
] as const
export type PortalUpgradeStatus = (typeof PORTAL_UPGRADE_STATUSES)[number]

export const portalUpgradeRecordSchema = z.object({
  id: z.string().uuid(),
  purchaseType: z.enum(PORTAL_UPGRADE_PURCHASE_TYPES),
  channel: z.enum(PORTAL_UPGRADE_CHANNELS),
  status: z.enum(PORTAL_UPGRADE_STATUSES),
  packageId: z.string().max(80),
  listingId: z.string().uuid().nullable().optional(),
  durationDays: z.number().int().min(1).max(365).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type PortalUpgradeRecord = z.infer<typeof portalUpgradeRecordSchema>

export const portalPackagePurchaseSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum(PORTAL_UPGRADE_CHANNELS),
  status: z.enum(PORTAL_UPGRADE_STATUSES),
  packageCode: z.string().max(80),
  packageName: z.string().max(120),
  creditsTotal: z.number().int().min(1).max(1000),
  creditsRemaining: z.number().int().min(0).max(1000),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type PortalPackagePurchase = z.infer<typeof portalPackagePurchaseSchema>

export function normalizePortalUpgradeStatus(
  status: string | null | undefined
): PortalUpgradeStatus {
  if (
    status === 'draft' ||
    status === 'initiated' ||
    status === 'pending_payment' ||
    status === 'pending_activation' ||
    status === 'active' ||
    status === 'scheduled' ||
    status === 'expired' ||
    status === 'cancelled'
  ) {
    return status
  }
  return 'draft'
}

export function resolveTemporalUpgradeStatus(
  baseStatus: PortalUpgradeStatus,
  startsAtIso: string | null | undefined,
  endsAtIso: string | null | undefined,
  nowInput?: Date
): PortalUpgradeStatus {
  if (baseStatus === 'cancelled') return 'cancelled'
  const now = nowInput ?? new Date()
  const startsAt = startsAtIso ? new Date(startsAtIso) : null
  const endsAt = endsAtIso ? new Date(endsAtIso) : null
  if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt.getTime() < now.getTime()) {
    return 'expired'
  }
  if (
    (baseStatus === 'active' || baseStatus === 'pending_activation') &&
    startsAt &&
    !Number.isNaN(startsAt.getTime()) &&
    startsAt.getTime() > now.getTime()
  ) {
    return 'scheduled'
  }
  if (baseStatus === 'scheduled' && startsAt && startsAt.getTime() <= now.getTime()) {
    return 'active'
  }
  return baseStatus
}

export function listingPortalVisibilityFromUpgrade(
  packageId: PortalCommercialPackageId,
  startsAtIso?: string | null,
  endsAtIso?: string | null
): ListingPortalVisibility {
  const pkg = portalCommercialPackageById(packageId)
  return {
    tier: pkg.tier,
    products: pkg.products,
    from: startsAtIso ?? null,
    until: endsAtIso ?? null,
  }
}

export function portalUpgradeStatusLabel(status: PortalUpgradeStatus): string {
  if (status === 'draft') return 'Borrador'
  if (status === 'initiated') return 'Iniciado'
  if (status === 'pending_payment') return 'Pendiente de pago'
  if (status === 'pending_activation') return 'Pendiente de activación'
  if (status === 'active') return 'Activo'
  if (status === 'scheduled') return 'Programado'
  if (status === 'expired') return 'Vencido'
  return 'Cancelado'
}
