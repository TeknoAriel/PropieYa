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

const currencies = ['ARS', 'USD'] as const

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
] as const

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
    orientation: z.enum(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']).nullable(),
    disposition: z.enum(['front', 'back', 'internal', 'lateral']).nullable(),
    age: z
      .object({
        type: z.enum(['brand_new', 'under_construction', 'years']),
        years: z.number().int().nullable(),
      })
      .nullable(),
    amenities: z.array(z.enum(amenities)),
    extras: z.record(z.union([z.string(), z.number(), z.boolean()])),
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
