import type { ListingPublishConfig } from './listing-publish-config'
import {
  isKnownOperationType,
  isKnownPropertyType,
  isUnsupportedPlaceholderPrice,
  normalizeListingPriceAmount,
} from './listing-publish-config'
import { LISTING_REASON_MESSAGES_ES } from './listing-reason-codes'
import type { ListingReasonCode } from './listing-reason-codes'

export interface ListingPublishabilityIssue {
  code: ListingReasonCode
  message: string
  details: Record<string, unknown>
}

export interface ListingPublishabilityInput {
  operationType: string
  propertyType: string
  priceAmount: number
  priceCurrency: string
  title: string
  description: string
  address: {
    city?: string | null
    state?: string | null
    neighborhood?: string | null
    street?: string | null
    country?: string | null
  }
  /** Conteo efectivo de imágenes (tabla listing_media o feed). */
  mediaCount: number
  config: ListingPublishConfig
}

export interface ListingPublishabilityResult {
  ok: boolean
  issues: ListingPublishabilityIssue[]
  primaryIssue: ListingPublishabilityIssue | null
}

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0
}

/**
 * Validación central y extensible de publicabilidad.
 * Orden estable: operación → tipo propiedad → ubicación mínima → título/descripción → precio → fotos.
 */
export function assessListingPublishability(
  input: ListingPublishabilityInput
): ListingPublishabilityResult {
  const issues: ListingPublishabilityIssue[] = []
  const { config } = input

  if (!isKnownOperationType(input.operationType)) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELDS',
      message: LISTING_REASON_MESSAGES_ES.MISSING_REQUIRED_FIELDS,
      details: { field: 'operationType', value: input.operationType },
    })
  }

  if (!isKnownPropertyType(input.propertyType)) {
    issues.push({
      code: 'INVALID_PROPERTY_TYPE',
      message: LISTING_REASON_MESSAGES_ES.INVALID_PROPERTY_TYPE,
      details: { field: 'propertyType', value: input.propertyType },
    })
  }

  const cityOk = nonEmpty(input.address.city)
  const stateOk = nonEmpty(input.address.state)
  const nbOk = nonEmpty(input.address.neighborhood)
  if (!cityOk || !stateOk || !nbOk) {
    issues.push({
      code: 'INVALID_LOCATION',
      message: LISTING_REASON_MESSAGES_ES.INVALID_LOCATION,
      details: {
        cityOk,
        stateOk,
        neighborhoodOk: nbOk,
      },
    })
  }

  const titleLen = (input.title ?? '').trim().length
  const descLen = (input.description ?? '').trim().length
  if (titleLen < config.minTitleLength || descLen < config.minDescriptionLength) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELDS',
      message: LISTING_REASON_MESSAGES_ES.MISSING_REQUIRED_FIELDS,
      details: {
        field: 'title_or_description',
        titleLength: titleLen,
        descriptionLength: descLen,
        minTitleLength: config.minTitleLength,
        minDescriptionLength: config.minDescriptionLength,
      },
    })
  }

  if (
    isUnsupportedPlaceholderPrice(input.priceAmount, config.unsupportedPriceAmounts) ||
    !Number.isFinite(input.priceAmount)
  ) {
    issues.push({
      code: 'UNSUPPORTED_PRICE',
      message: LISTING_REASON_MESSAGES_ES.UNSUPPORTED_PRICE,
      details: {
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency,
        unsupportedAmounts: config.unsupportedPriceAmounts,
        normalizedAmount: normalizeListingPriceAmount(input.priceAmount),
      },
    })
  }

  if (input.mediaCount < config.minImages) {
    issues.push({
      code: 'MIN_IMAGES_NOT_MET',
      message: LISTING_REASON_MESSAGES_ES.MIN_IMAGES_NOT_MET,
      details: {
        mediaCount: input.mediaCount,
        minImages: config.minImages,
      },
    })
  }

  const primaryIssue = issues[0] ?? null
  return { ok: issues.length === 0, issues, primaryIssue }
}

export function listingRowToPublishabilityInput(
  row: {
    operationType: string
    propertyType: string
    priceAmount: number
    priceCurrency: string
    title: string
    description: string
    address: unknown
  },
  mediaCount: number,
  config: ListingPublishConfig
): ListingPublishabilityInput {
  const addr =
    row.address && typeof row.address === 'object'
      ? (row.address as Record<string, unknown>)
      : {}
  return {
    operationType: row.operationType,
    propertyType: row.propertyType,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency,
    title: row.title,
    description: row.description,
    address: {
      city: typeof addr.city === 'string' ? addr.city : null,
      state: typeof addr.state === 'string' ? addr.state : null,
      neighborhood: typeof addr.neighborhood === 'string' ? addr.neighborhood : null,
      street: typeof addr.street === 'string' ? addr.street : null,
      country: typeof addr.country === 'string' ? addr.country : null,
    },
    mediaCount,
    config,
  }
}
