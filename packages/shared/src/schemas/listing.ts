import { z } from 'zod'

const propertyTypes = [
  'apartment',
  'house',
  'ph',
  'land',
  'office',
  'commercial',
  'warehouse',
  'parking',
  'development_unit',
] as const

const operationTypes = ['sale', 'rent', 'temporary_rent'] as const

const currencies = ['ARS', 'USD', 'CLP', 'UF', 'MXN'] as const

const amenities = [
  'pool',
  'gym',
  'security_24h',
  'laundry',
  'rooftop',
  'sum',
  'playground',
  'bbq',
  'garden',
  'balcony',
  'terrace',
  'parking',
  'storage',
  'elevator',
  'doorman',
  'air_conditioning',
  'heating',
  'furnished',
  'pet_friendly',
  'wheelchair_accessible',
  'fireplace',
  'front_facing',
  'credit_approved',
] as const

const fieldSchema = z.discriminatedUnion('variant', [
  z.object({
    variant: z.literal('agricola'),
    hectares: z.number().positive(),
    cropType: z.string().min(1),
    irrigation: z.string().min(1).nullable().optional(),
    soilType: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('ganadero'),
    hectares: z.number().positive(),
    animalSpecies: z.string().min(1),
    headCount: z.number().int().positive(),
    housingSystem: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('mixto'),
    hectares: z.number().positive(),
    cropType: z.string().min(1),
    animalSpecies: z.string().min(1),
    headCount: z.number().int().positive(),
  }),
  z.object({
    variant: z.literal('forestal'),
    hectares: z.number().positive(),
    treeSpecies: z.string().min(1),
    ageYears: z.number().int().positive().nullable().optional(),
  }),
  z.object({
    variant: z.literal('otro'),
    description: z.string().min(10),
  }),
])

const commercialSubSchema = z.discriminatedUnion('variant', [
  z.object({
    variant: z.literal('retail'),
    label: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('medical'),
    label: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('business'),
    label: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('office'),
    label: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('unificado'),
    label: z.string().min(1).nullable().optional(),
  }),
  z.object({
    variant: z.literal('otro'),
    label: z.string().min(1).nullable().optional(),
  }),
])

const addressSchema = z.object({
  street: z.string().min(1, 'La calle es requerida'),
  number: z.string().nullable(),
  floor: z.string().nullable(),
  unit: z.string().nullable(),
  neighborhood: z.string().min(1, 'El barrio es requerido'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'La provincia es requerida'),
  country: z.string().default('Argentina'),
  postalCode: z.string().nullable(),
})

const priceSchema = z.object({
  amount: z.number().positive('El precio debe ser mayor a 0'),
  currency: z.enum(currencies),
  showPrice: z.boolean().default(true),
  expenses: z.number().nullable(),
  expensesCurrency: z.enum(currencies).nullable(),
})

const surfaceSchema = z.object({
  total: z.number().positive('La superficie debe ser mayor a 0'),
  covered: z.number().nullable(),
  semicovered: z.number().nullable(),
  land: z.number().nullable(),
})

const roomsSchema = z.object({
  bedrooms: z.number().int().min(0).nullable(),
  bathrooms: z.number().int().min(0).nullable(),
  toilettes: z.number().int().min(0).nullable(),
  garages: z.number().int().min(0).nullable(),
  total: z.number().int().min(1).nullable(),
})

/** Visibilidad comercial en portal (JSONB `features.portalVisibility`). */
export const listingPortalVisibilitySchema = z.object({
  tier: z.enum(['standard', 'highlight', 'boost', 'premium_ficha']),
  products: z.array(z.string().max(120)).max(25).optional(),
  until: z.union([z.string().max(40), z.null()]).optional(),
})

export const createListingSchema = z.object({
  propertyType: z.enum(propertyTypes),
  operationType: z.enum(operationTypes),
  address: addressSchema,
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable(),
  hideExactAddress: z.boolean().default(false),
  title: z.string().min(10, 'El título debe tener al menos 10 caracteres').max(150),
  description: z.string().min(50, 'La descripción debe tener al menos 50 caracteres').max(5000),
  internalNotes: z.string().max(1000).nullable(),
  price: priceSchema,
  surface: surfaceSchema,
  rooms: roomsSchema,
  features: z.object({
    floor: z.number().int().nullable(),
    totalFloors: z.number().int().nullable(),
    /** Escalera / entrada (p. ej. A, B), alineado a feeds OpenNavent/XML. */
    escalera: z.string().max(10).nullable().optional(),
    orientation: z.enum(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']).nullable(),
    disposition: z.enum(['front', 'back', 'internal', 'lateral']).nullable(),
    age: z
      .object({
        type: z.enum(['brand_new', 'under_construction', 'years']),
        years: z.number().int().nullable(),
      })
      .nullable(),
    amenities: z.array(z.enum(amenities)),
    feedAmenityRaw: z.array(z.string().max(120)).max(150).optional(),
    extras: z.record(z.union([z.string(), z.number(), z.boolean()])),

    // Subrubro comercial/oficina (opcional).
    commercialSub: commercialSubSchema.optional().nullable(),

    // Campos rurales (opcional). Se guarda dentro de `features` (JSONB) sin migración adicional.
    field: fieldSchema.optional().nullable(),

    /** Capa comercial: tier + productos; sin cobro ni ranking hasta que se cablee ES. */
    portalVisibility: listingPortalVisibilitySchema.optional().nullable(),
  }),
})

export const updateListingSchema = createListingSchema.partial()

export const listingFiltersSchema = z.object({
  status: z
    .enum([
      'draft',
      'pending_review',
      'active',
      'expiring_soon',
      'suspended',
      'archived',
      'sold',
      'withdrawn',
      'rejected',
      'expired',
    ])
    .optional(),
  propertyType: z.enum(propertyTypes).optional(),
  operationType: z.enum(operationTypes).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
export type ListingFiltersInput = z.infer<typeof listingFiltersSchema>
