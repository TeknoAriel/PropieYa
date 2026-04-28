import { z } from 'zod'

import {
  PORTAL_COMMERCIAL_PACKAGES,
  portalCommercialPackageById,
  type PortalCommercialSurface,
  type PortalVisibilityTier,
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

export const PORTAL_UPGRADE_PAYMENT_STATUSES = [
  'pending_payment',
  'payment_processing',
  'paid',
  'payment_failed',
  'cancelled',
  'refunded',
] as const
export type PortalUpgradePaymentStatus = (typeof PORTAL_UPGRADE_PAYMENT_STATUSES)[number]

export const PORTAL_UPGRADE_PAYMENT_PROVIDERS = ['mercadopago'] as const
export type PortalUpgradePaymentProvider = (typeof PORTAL_UPGRADE_PAYMENT_PROVIDERS)[number]

export const portalUpgradeOrderRequestSchema = z.object({
  id: z.string().uuid(),
  buyerUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  purchaseType: z.enum(PORTAL_UPGRADE_PURCHASE_TYPES),
  channel: z.enum(PORTAL_UPGRADE_CHANNELS),
  status: z.enum(PORTAL_UPGRADE_STATUSES),
  productId: z.string().max(80),
  productName: z.string().max(120),
  listingId: z.string().uuid().nullable().optional(),
  durationDays: z.number().int().min(1).max(365).nullable().optional(),
  creditsTotal: z.number().int().min(1).max(1000).nullable().optional(),
  basePriceAmount: z.number().min(0).max(100000000).nullable().optional(),
  finalPriceAmount: z.number().min(0).max(100000000).nullable().optional(),
  discountAmount: z.number().min(0).max(100000000).default(0),
  currency: z.string().min(3).max(3).default('USD'),
  promotionId: z.string().max(80).nullable().optional(),
  promotionName: z.string().max(120).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  relatedUpgradeId: z.string().uuid().nullable().optional(),
  relatedPackagePurchaseId: z.string().uuid().nullable().optional(),
  latestPaymentId: z.string().uuid().nullable().optional(),
  checkoutUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type PortalUpgradeOrderRequest = z.infer<typeof portalUpgradeOrderRequestSchema>

export const portalUpgradePaymentRecordSchema = z.object({
  id: z.string().uuid(),
  orderRequestId: z.string().uuid(),
  buyerUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  purchaseType: z.enum(PORTAL_UPGRADE_PURCHASE_TYPES),
  productId: z.string().max(80),
  productName: z.string().max(120),
  listingId: z.string().uuid().nullable().optional(),
  provider: z.enum(PORTAL_UPGRADE_PAYMENT_PROVIDERS),
  providerMethod: z.string().max(60).nullable().optional(),
  providerPaymentId: z.string().max(120).nullable().optional(),
  providerPreferenceId: z.string().max(120).nullable().optional(),
  checkoutUrl: z.string().url().nullable().optional(),
  externalReference: z.string().max(180).nullable().optional(),
  amount: z.number().min(0).max(100000000),
  currency: z.string().min(3).max(3),
  status: z.enum(PORTAL_UPGRADE_PAYMENT_STATUSES),
  statusDetail: z.string().max(160).nullable().optional(),
  rawProviderPayload: z.unknown().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  failedAt: z.string().datetime().nullable().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
  refundedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type PortalUpgradePaymentRecord = z.infer<typeof portalUpgradePaymentRecordSchema>

export const PORTAL_COMMERCIAL_PRODUCT_TYPES = ['listing', 'package'] as const
export type PortalCommercialProductType = (typeof PORTAL_COMMERCIAL_PRODUCT_TYPES)[number]

export const PORTAL_COMMERCIAL_PROFILE_KEYS = ['owner', 'agent', 'agency'] as const
export type PortalCommercialProfileKey = (typeof PORTAL_COMMERCIAL_PROFILE_KEYS)[number]

export const PORTAL_COMMERCIAL_CHANNELS = ['online', 'on_demand'] as const
export type PortalCommercialChannel = (typeof PORTAL_COMMERCIAL_CHANNELS)[number]

export const PORTAL_COMMERCIAL_PROMOTION_DISCOUNT_TYPES = ['fixed', 'percent'] as const
export type PortalCommercialPromotionDiscountType =
  (typeof PORTAL_COMMERCIAL_PROMOTION_DISCOUNT_TYPES)[number]

export const PORTAL_COMMERCIAL_RENEWAL_MODES = ['manual', 'none'] as const
export type PortalCommercialRenewalMode = (typeof PORTAL_COMMERCIAL_RENEWAL_MODES)[number]

export const portalCommercialPromotionSchema = z.object({
  id: z.string().max(80),
  name: z.string().min(2).max(120),
  discountType: z.enum(PORTAL_COMMERCIAL_PROMOTION_DISCOUNT_TYPES),
  discountValue: z.number().min(0).max(1000000),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  enabledProfiles: z.array(z.enum(PORTAL_COMMERCIAL_PROFILE_KEYS)).max(3).default([
    'owner',
    'agent',
    'agency',
  ]),
  enabledChannels: z.array(z.enum(PORTAL_COMMERCIAL_CHANNELS)).max(2).default([
    'online',
    'on_demand',
  ]),
  notes: z.string().max(220).nullable().optional(),
})
export type PortalCommercialPromotion = z.infer<typeof portalCommercialPromotionSchema>

export const portalCommercialCatalogItemSchema = z.object({
  id: z.string().max(80),
  commercialName: z.string().min(2).max(120),
  type: z.enum(PORTAL_COMMERCIAL_PRODUCT_TYPES),
  tier: z.enum(['standard', 'highlight', 'boost', 'premium_ficha']),
  technicalProducts: z.array(z.string().max(120)).max(30).default([]),
  suggestedDurationDays: z.number().int().min(1).max(365).nullable().optional(),
  priceBand: z.string().max(120).nullable().optional(),
  basePriceAmount: z.number().min(0).max(100000000).nullable().optional(),
  currency: z.string().min(3).max(3).default('USD'),
  profilePrices: z
    .object({
      owner: z.number().min(0).max(100000000).nullable().optional(),
      agent: z.number().min(0).max(100000000).nullable().optional(),
      agency: z.number().min(0).max(100000000).nullable().optional(),
    })
    .default({ owner: null, agent: null, agency: null }),
  isActive: z.boolean().default(true),
  enabledProfiles: z.array(z.enum(PORTAL_COMMERCIAL_PROFILE_KEYS)).max(3).default([
    'owner',
    'agent',
    'agency',
  ]),
  enabledChannels: z.array(z.enum(PORTAL_COMMERCIAL_CHANNELS)).max(2).default([
    'online',
    'on_demand',
  ]),
  renewalMode: z.enum(PORTAL_COMMERCIAL_RENEWAL_MODES).default('manual'),
  shortCopy: z.string().max(220).default(''),
  surfaces: z.array(z.string().max(80)).max(10).default([]),
  promotions: z.array(portalCommercialPromotionSchema).max(30).default([]),
  updatedAt: z.string().datetime(),
})

export type PortalCommercialCatalogItem = z.infer<typeof portalCommercialCatalogItemSchema>

export function defaultPortalCommercialCatalog(nowInput?: Date): PortalCommercialCatalogItem[] {
  const now = (nowInput ?? new Date()).toISOString()
  const listingItems = PORTAL_COMMERCIAL_PACKAGES.map((p) => ({
    id: p.id,
    commercialName: p.commercialName,
    type: 'listing' as const,
    tier: p.tier as PortalVisibilityTier,
    technicalProducts: p.products,
    suggestedDurationDays: p.defaultDurationDays,
    priceBand: null,
    basePriceAmount: null,
    currency: 'USD',
    profilePrices: { owner: null, agent: null, agency: null },
    isActive: p.id !== 'none',
    enabledProfiles: ['owner', 'agent', 'agency'] as PortalCommercialProfileKey[],
    enabledChannels: ['online', 'on_demand'] as PortalCommercialChannel[],
    renewalMode: 'manual' as PortalCommercialRenewalMode,
    shortCopy: p.operationalSummary,
    surfaces: p.surfaces as unknown as PortalCommercialSurface[],
    promotions: [],
    updatedAt: now,
  }))
  const packageItems: PortalCommercialCatalogItem[] = [
    {
      id: 'pack_5',
      commercialName: 'Pack 5 activaciones',
      type: 'package',
      tier: 'standard',
      technicalProducts: [],
      suggestedDurationDays: 30,
      priceBand: null,
      basePriceAmount: null,
      currency: 'USD',
      profilePrices: { owner: null, agent: null, agency: null },
      isActive: true,
      enabledProfiles: ['owner', 'agent', 'agency'],
      enabledChannels: ['online', 'on_demand'],
      renewalMode: 'manual',
      shortCopy: 'Pack base para activar upgrades por aviso.',
      surfaces: [],
      promotions: [],
      updatedAt: now,
    },
    {
      id: 'pack_10',
      commercialName: 'Pack 10 activaciones',
      type: 'package',
      tier: 'standard',
      technicalProducts: [],
      suggestedDurationDays: 30,
      priceBand: null,
      basePriceAmount: null,
      currency: 'USD',
      profilePrices: { owner: null, agent: null, agency: null },
      isActive: true,
      enabledProfiles: ['owner', 'agent', 'agency'],
      enabledChannels: ['online', 'on_demand'],
      renewalMode: 'manual',
      shortCopy: 'Pack intermedio para operación comercial continua.',
      surfaces: [],
      promotions: [],
      updatedAt: now,
    },
    {
      id: 'pack_25',
      commercialName: 'Pack 25 activaciones',
      type: 'package',
      tier: 'standard',
      technicalProducts: [],
      suggestedDurationDays: 30,
      priceBand: null,
      basePriceAmount: null,
      currency: 'USD',
      profilePrices: { owner: null, agent: null, agency: null },
      isActive: true,
      enabledProfiles: ['owner', 'agent', 'agency'],
      enabledChannels: ['online', 'on_demand'],
      renewalMode: 'manual',
      shortCopy: 'Pack volumen para equipos comerciales.',
      surfaces: [],
      promotions: [],
      updatedAt: now,
    },
  ]
  return [...listingItems, ...packageItems]
}

export function parsePortalCommercialCatalog(raw: unknown): PortalCommercialCatalogItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => portalCommercialCatalogItemSchema.safeParse(item))
    .filter((r): r is { success: true; data: PortalCommercialCatalogItem } => r.success)
    .map((r) => r.data)
}

export function resolvePortalCommercialPricing(
  item: PortalCommercialCatalogItem,
  input: {
    profile: PortalCommercialProfileKey
    channel: PortalCommercialChannel
    nowInput?: Date
  }
): {
  baseAmount: number | null
  finalAmount: number | null
  discountAmount: number
  appliedPromotionId: string | null
  appliedPromotionName: string | null
  currency: string
} {
  const now = input.nowInput ?? new Date()
  const profilePrice = item.profilePrices?.[input.profile]
  const baseAmount =
    typeof profilePrice === 'number'
      ? profilePrice
      : typeof item.basePriceAmount === 'number'
        ? item.basePriceAmount
        : null
  if (baseAmount == null) {
    return {
      baseAmount: null,
      finalAmount: null,
      discountAmount: 0,
      appliedPromotionId: null,
      appliedPromotionName: null,
      currency: item.currency,
    }
  }

  let bestDiscount = 0
  let bestPromo: PortalCommercialPromotion | null = null
  for (const promo of item.promotions ?? []) {
    if (!promo.isActive) continue
    if (!promo.enabledProfiles.includes(input.profile)) continue
    if (!promo.enabledChannels.includes(input.channel)) continue
    if (promo.startsAt) {
      const startsAt = new Date(promo.startsAt)
      if (!Number.isNaN(startsAt.getTime()) && startsAt.getTime() > now.getTime()) continue
    }
    if (promo.endsAt) {
      const endsAt = new Date(promo.endsAt)
      if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() < now.getTime()) continue
    }
    const discount =
      promo.discountType === 'percent'
        ? Math.max(0, Math.min(baseAmount, (baseAmount * promo.discountValue) / 100))
        : Math.max(0, Math.min(baseAmount, promo.discountValue))
    if (discount > bestDiscount) {
      bestDiscount = discount
      bestPromo = promo
    }
  }

  const finalAmount = Math.max(0, baseAmount - bestDiscount)
  return {
    baseAmount,
    finalAmount,
    discountAmount: bestDiscount,
    appliedPromotionId: bestPromo?.id ?? null,
    appliedPromotionName: bestPromo?.name ?? null,
    currency: item.currency,
  }
}

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
