'use client'

import {
  formatTrpcUserMessage,
  LISTING_AMENITY_IDS,
  LISTING_AMENITY_LABELS,
  OPERATION_TYPE_LABELS,
  PUBLISHER_UX_COPY,
  PROPERTY_TYPE_LABELS,
  type Amenity,
  type CommercialSubVariant,
  type CreateListingInput,
  type Currency,
  type FieldVariant,
  type ListingCommercialSub,
  type ListingField,
  type OperationType,
  type PropertyType,
} from '@propieya/shared'
import { Button, Card, Input } from '@propieya/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { trpc } from '@/lib/trpc'

const WEB_APP_URL = (process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://propieyaweb.vercel.app').replace(
  /\/$/,
  ''
)

const CURRENCIES: Currency[] = ['ARS', 'USD', 'CLP', 'UF', 'MXN']

const DISPOSITION_OPTS = [
  { v: '', l: '—' },
  { v: 'front', l: 'Frente' },
  { v: 'back', l: 'Contrafrente' },
  { v: 'internal', l: 'Interno / contrafrente edificio' },
  { v: 'lateral', l: 'Lateral' },
] as const

function normalizeNullable(s: string): string | null {
  const v = s.trim()
  return v.length ? v : null
}

function parsePositiveInt(raw: string): number | null {
  const n = parseInt(raw.trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parsePositiveFloat(raw: string): number | null {
  const n = Number.parseFloat(raw.trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function NuevaPropiedadPage() {
  const router = useRouter()
  const { data: me } = trpc.auth.me.useQuery()
  const pub = me?.publisher
  const quality = me?.qualityRules
  const noPublisherProfile = !pub
  const blockCreate = Boolean(noPublisherProfile || (pub && !pub.canCreateListing))

  const [propertyType, setPropertyType] = useState<PropertyType>('apartment')
  const [operationType, setOperationType] = useState<OperationType>('sale')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [price, setPrice] = useState('')
  const [showPrice, setShowPrice] = useState(true)
  const [expenses, setExpenses] = useState('')
  const [expensesCurrency, setExpensesCurrency] = useState<Currency | ''>('')
  const [surfaceTotal, setSurfaceTotal] = useState('')
  const [surfaceCovered, setSurfaceCovered] = useState('')
  const [surfaceSemicovered, setSurfaceSemicovered] = useState('')
  const [surfaceLand, setSurfaceLand] = useState('')
  const [bedrooms, setBedrooms] = useState('2')
  const [bathrooms, setBathrooms] = useState('1')
  const [garages, setGarages] = useState('0')
  const [toilettes, setToilettes] = useState('0')
  const [totalRooms, setTotalRooms] = useState('3')

  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [unit, setUnit] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('Buenos Aires')
  const [state, setState] = useState('Buenos Aires')
  const [postalCode, setPostalCode] = useState('')
  const [hideExactAddress, setHideExactAddress] = useState(true)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  const [featFloor, setFeatFloor] = useState('')
  const [featTotalFloors, setFeatTotalFloors] = useState('')
  const [featEscalera, setFeatEscalera] = useState('')
  const [featOrientation, setFeatOrientation] = useState('')
  const [featDisposition, setFeatDisposition] = useState('')
  const [ageType, setAgeType] = useState<'brand_new' | 'under_construction' | 'years'>('years')
  const [ageYears, setAgeYears] = useState('')

  const [amenitiesSel, setAmenitiesSel] = useState<Record<Amenity, boolean>>(() => {
    const o = {} as Record<Amenity, boolean>
    for (const k of LISTING_AMENITY_IDS) o[k] = false
    return o
  })

  const [fieldVariant, setFieldVariant] = useState<FieldVariant>('agricola')
  const [commercialSubVariant, setCommercialSubVariant] =
    useState<CommercialSubVariant>('office')
  const [commercialSubLabel, setCommercialSubLabel] = useState('')

  const [hectares, setHectares] = useState('')
  const [cropType, setCropType] = useState('')
  const [irrigation, setIrrigation] = useState('')
  const [soilType, setSoilType] = useState('')
  const [animalSpecies, setAnimalSpecies] = useState('')
  const [headCount, setHeadCount] = useState('')
  const [housingSystem, setHousingSystem] = useState('')
  const [treeSpecies, setTreeSpecies] = useState('')
  const [ageForest, setAgeForest] = useState('')
  const [otherDescription, setOtherDescription] = useState('')

  const [error, setError] = useState('')

  const createMutation = trpc.listing.create.useMutation({
    onSuccess: (created) => {
      if (created?.id) router.push(`/propiedades/${created.id}`)
      else router.push('/propiedades')
    },
    onError: (err) => {
      setError(formatTrpcUserMessage(err) || 'No se pudo crear la propiedad')
    },
  })

  const toggleAmenity = (k: Amenity) => {
    setAmenitiesSel((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const titleT = title.trim()
    const descT = description.trim()
    if (titleT.length < 10) {
      setError('El título debe tener al menos 10 caracteres.')
      return
    }
    if (descT.length < 50) {
      setError('La descripción debe tener al menos 50 caracteres.')
      return
    }

    const priceN = parsePositiveFloat(price)
    const surfN = parsePositiveFloat(surfaceTotal)
    if (priceN == null || surfN == null) {
      setError('Precio y superficie total deben ser números mayores a 0.')
      return
    }

    const expRaw = expenses.trim()
    let expensesN: number | null = null
    if (expRaw !== '') {
      const e = Number.parseFloat(expRaw)
      expensesN = Number.isFinite(e) && e >= 0 ? e : null
      if (expensesN === null) {
        setError('Las expensas no son un número válido.')
        return
      }
    }

    const sc = surfaceCovered.trim() ? Number.parseFloat(surfaceCovered) : null
    const ss = surfaceSemicovered.trim() ? Number.parseFloat(surfaceSemicovered) : null
    const sl = surfaceLand.trim() ? Number.parseFloat(surfaceLand) : null
    const surfaceCoveredN = sc != null && Number.isFinite(sc) && sc >= 0 ? sc : null
    const surfaceSemicoveredN = ss != null && Number.isFinite(ss) && ss >= 0 ? ss : null
    const surfaceLandN = sl != null && Number.isFinite(sl) && sl >= 0 ? sl : null

    const bed = parsePositiveInt(bedrooms)
    const bath = parsePositiveInt(bathrooms)
    const gar = parsePositiveInt(garages)
    const toi = parsePositiveInt(toilettes)
    const tot = parsePositiveInt(totalRooms)
    if (bed == null || bath == null || gar == null || toi == null || tot == null) {
      setError('Dormitorios, baños, cocheras, toilettes y ambientes deben ser números válidos (0 o más).')
      return
    }
    if (tot < 1) {
      setError('Ambientes totales debe ser al menos 1.')
      return
    }

    if (!street.trim() || !neighborhood.trim() || !city.trim() || !state.trim()) {
      setError('Completá calle, barrio, ciudad y provincia.')
      return
    }

    let location: CreateListingInput['location'] = null
    if (lat.trim() && lng.trim()) {
      const la = Number.parseFloat(lat)
      const ln = Number.parseFloat(lng)
      if (Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180) {
        location = { lat: la, lng: ln }
      } else {
        setError('Latitud y longitud no son válidas.')
        return
      }
    }

    const h = Number(hectares)
    let field: ListingField | null = null
    let commercialSub: ListingCommercialSub | null = null

    if (propertyType === 'land') {
      switch (fieldVariant) {
        case 'agricola':
          field = {
            variant: 'agricola',
            hectares: h,
            cropType: cropType.trim(),
            irrigation: normalizeNullable(irrigation),
            soilType: normalizeNullable(soilType),
          }
          break
        case 'ganadero':
          field = {
            variant: 'ganadero',
            hectares: h,
            animalSpecies: animalSpecies.trim(),
            headCount: Number(headCount),
            housingSystem: normalizeNullable(housingSystem),
          }
          break
        case 'mixto':
          field = {
            variant: 'mixto',
            hectares: h,
            cropType: cropType.trim(),
            animalSpecies: animalSpecies.trim(),
            headCount: Number(headCount),
          }
          break
        case 'forestal':
          field = {
            variant: 'forestal',
            hectares: h,
            treeSpecies: treeSpecies.trim(),
            ageYears: ageForest.trim() ? Number(ageForest) : null,
          }
          break
        case 'otro':
          field = {
            variant: 'otro',
            description: otherDescription.trim(),
          }
          break
      }
    }

    if (propertyType === 'commercial' || propertyType === 'office') {
      commercialSub = {
        variant: commercialSubVariant,
        label: commercialSubLabel.trim() ? commercialSubLabel.trim() : null,
      }
    }

    const floorP = parsePositiveInt(featFloor)
    const totalFloorsP = parsePositiveInt(featTotalFloors)
    const orient =
      featOrientation &&
      ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'].includes(featOrientation)
        ? (featOrientation as CreateListingInput['features']['orientation'])
        : null
    const disp =
      featDisposition && ['front', 'back', 'internal', 'lateral'].includes(featDisposition)
        ? (featDisposition as CreateListingInput['features']['disposition'])
        : null

    let age: CreateListingInput['features']['age'] = null
    if (ageType === 'brand_new') age = { type: 'brand_new', years: null }
    else if (ageType === 'under_construction') age = { type: 'under_construction', years: null }
    else {
      const y = ageYears.trim() ? parseInt(ageYears, 10) : null
      age = { type: 'years', years: y != null && Number.isFinite(y) && y >= 0 ? y : null }
    }

    const amenities: Amenity[] = LISTING_AMENITY_IDS.filter((k) => amenitiesSel[k])

    const payload: CreateListingInput = {
      propertyType,
      operationType,
      address: {
        street: street.trim(),
        number: number.trim() ? number.trim() : null,
        floor: floor.trim() ? floor.trim() : null,
        unit: unit.trim() ? unit.trim() : null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        country: 'Argentina',
        postalCode: postalCode.trim() ? postalCode.trim() : null,
      },
      location,
      hideExactAddress,
      title: titleT,
      description: descT,
      internalNotes: internalNotes.trim() ? internalNotes.trim().slice(0, 1000) : null,
      price: {
        amount: priceN,
        currency,
        showPrice,
        expenses: expensesN,
        expensesCurrency:
          expensesN != null && expensesCurrency ? (expensesCurrency as Currency) : null,
      },
      surface: {
        total: surfN,
        covered: surfaceCoveredN,
        semicovered: surfaceSemicoveredN,
        land: surfaceLandN,
      },
      rooms: {
        bedrooms: bed,
        bathrooms: bath,
        toilettes: toi,
        garages: gar,
        total: tot,
      },
      features: {
        floor: floorP,
        totalFloors: totalFloorsP,
        escalera: featEscalera.trim() ? featEscalera.trim().slice(0, 10).toUpperCase() : null,
        orientation: orient,
        disposition: disp,
        age,
        amenities,
        extras: {},
        commercialSub,
        field,
      },
    }

    if (propertyType === 'land') {
      if (!Number.isFinite(h) || h <= 0) {
        setError('En campo / terreno rural, las hectáreas deben ser un número positivo.')
        return
      }
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Nuevo aviso</h1>
        <p className="text-text-secondary">
          Completá los mismos datos que verá el comprador en la ficha pública. Guardamos un
          borrador; podés subir fotos y publicar desde la siguiente pantalla.
        </p>
        {quality ? (
          <p className="mt-2 text-xs text-text-tertiary">
            Mínimo para publicar: {quality.minPhotos} fotos, título {quality.minTitleLength}{' '}
            caracteres, descripción {quality.minDescriptionLength} caracteres.
          </p>
        ) : null}
      </div>

      {blockCreate ? (
        <div className="rounded-md border border-semantic-warning/40 bg-semantic-warning/10 px-3 py-3 text-sm text-text-secondary">
          {noPublisherProfile ? (
            <p>
              Esta cuenta no está habilitada para publicar. Completá el alta desde{' '}
              <Link href={`${WEB_APP_URL}/publicar`} className="text-brand-primary underline">
                /publicar
              </Link>
              .
            </p>
          ) : pub?.isSuspended ? (
            <p>{PUBLISHER_UX_COPY.orgSuspended}</p>
          ) : pub?.atLimit ? (
            <p>{PUBLISHER_UX_COPY.atLimitBody}</p>
          ) : (
            <p>{PUBLISHER_UX_COPY.orgPending}</p>
          )}
          <p className="mt-2">
            <Link href="/propiedades" className="text-brand-primary underline">
              Volver a mis avisos
            </Link>
          </p>
        </div>
      ) : null}

      <Card className="p-6">
        {error ? (
          <div className="mb-4 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Operación y tipo</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Tipo de propiedad</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Operación</label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value as OperationType)}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  {Object.entries(OPERATION_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Texto</h2>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Departamento 3 ambientes con balcón"
                minLength={10}
                maxLength={150}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Descripción</label>
              <textarea
                className="min-h-36 w-full rounded-md border border-border bg-surface-primary p-3 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle ambientes, estado, entorno, accesos…"
                minLength={50}
                maxLength={5000}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">
                Notas internas (opcional, no se publican)
              </label>
              <Input
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                maxLength={1000}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Precio</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Monto</label>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                  />
                  Mostrar precio en la ficha
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">
                  Expensas (opcional)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">
                  Moneda expensas (si hay monto)
                </label>
                <select
                  value={expensesCurrency}
                  onChange={(e) => setExpensesCurrency(e.target.value as Currency | '')}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  <option value="">—</option>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Superficies y ambientes</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Total m²</label>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={surfaceTotal}
                  onChange={(e) => setSurfaceTotal(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Cubierta m²</label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={surfaceCovered}
                  onChange={(e) => setSurfaceCovered(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Semicubierta m²</label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={surfaceSemicovered}
                  onChange={(e) => setSurfaceSemicovered(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Terreno m²</label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={surfaceLand}
                  onChange={(e) => setSurfaceLand(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Dormitorios</label>
                <Input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Baños</label>
                <Input
                  type="number"
                  min={0}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Toilettes</label>
                <Input
                  type="number"
                  min={0}
                  value={toilettes}
                  onChange={(e) => setToilettes(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Cocheras</label>
                <Input
                  type="number"
                  min={0}
                  value={garages}
                  onChange={(e) => setGarages(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Ambientes totales</label>
                <Input
                  type="number"
                  min={1}
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Ubicación</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Calle</label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Número</label>
                <Input value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Piso</label>
                <Input value={floor} onChange={(e) => setFloor(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Depto / unidad</label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Barrio</label>
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Ciudad</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Provincia</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">CP (opcional)</label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={hideExactAddress}
                onChange={(e) => setHideExactAddress(e.target.checked)}
              />
              Ocultar dirección exacta en la ficha pública
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">
                  Latitud (opcional)
                </label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-34.6" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">
                  Longitud (opcional)
                </label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-58.4" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Características del edificio</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Piso (unidad)</label>
                <Input
                  type="number"
                  min={0}
                  value={featFloor}
                  onChange={(e) => setFeatFloor(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Pisos del edificio</label>
                <Input
                  type="number"
                  min={0}
                  value={featTotalFloors}
                  onChange={(e) => setFeatTotalFloors(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Escalera / entrada</label>
                <Input
                  value={featEscalera}
                  onChange={(e) => setFeatEscalera(e.target.value)}
                  maxLength={10}
                  placeholder="A, B…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Orientación</label>
                <select
                  value={featOrientation}
                  onChange={(e) => setFeatOrientation(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  <option value="">—</option>
                  {['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Disposición</label>
                <select
                  value={featDisposition}
                  onChange={(e) => setFeatDisposition(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  {DISPOSITION_OPTS.map((o) => (
                    <option key={o.v || '—'} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Antigüedad</label>
                <select
                  value={ageType}
                  onChange={(e) =>
                    setAgeType(e.target.value as 'brand_new' | 'under_construction' | 'years')
                  }
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  <option value="brand_new">A estrenar</option>
                  <option value="under_construction">En construcción</option>
                  <option value="years">Años de antigüedad</option>
                </select>
              </div>
              {ageType === 'years' ? (
                <div>
                  <label className="mb-1 block text-sm text-text-secondary">Años</label>
                  <Input
                    type="number"
                    min={0}
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Amenities</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {LISTING_AMENITY_IDS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={amenitiesSel[k]}
                    onChange={() => toggleAmenity(k)}
                  />
                  {LISTING_AMENITY_LABELS[k]}
                </label>
              ))}
            </div>
          </section>

          {(propertyType === 'commercial' || propertyType === 'office') && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Comercial / oficina</h2>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Subrubro</label>
                <select
                  value={commercialSubVariant}
                  onChange={(e) =>
                    setCommercialSubVariant(e.target.value as CommercialSubVariant)
                  }
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  <option value="retail">Retail / comercio</option>
                  <option value="medical">Salud / médico</option>
                  <option value="business">Negocio / empresa</option>
                  <option value="office">Oficina</option>
                  <option value="otro">Otro</option>
                  <option value="unificado">Unificado</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Etiqueta (opcional)</label>
                <Input
                  value={commercialSubLabel}
                  onChange={(e) => setCommercialSubLabel(e.target.value)}
                />
              </div>
            </section>
          )}

          {propertyType === 'land' ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Campo / rural</h2>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Variante</label>
                <select
                  value={fieldVariant}
                  onChange={(e) => setFieldVariant(e.target.value as FieldVariant)}
                  className="w-full rounded-md border border-border bg-surface-primary p-2 text-sm"
                >
                  <option value="agricola">Agrícola</option>
                  <option value="ganadero">Ganadero</option>
                  <option value="mixto">Mixto</option>
                  <option value="forestal">Forestal</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Hectáreas</label>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={hectares}
                  onChange={(e) => setHectares(e.target.value)}
                  required
                />
              </div>
              {(fieldVariant === 'agricola' || fieldVariant === 'mixto') && (
                <>
                  <Input
                    placeholder="Cultivo principal"
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    required={fieldVariant === 'agricola'}
                  />
                  <Input
                    placeholder="Riego (opcional)"
                    value={irrigation}
                    onChange={(e) => setIrrigation(e.target.value)}
                  />
                  <Input
                    placeholder="Tipo de suelo (opcional)"
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                  />
                </>
              )}
              {(fieldVariant === 'ganadero' || fieldVariant === 'mixto') && (
                <>
                  <Input
                    placeholder="Especie"
                    value={animalSpecies}
                    onChange={(e) => setAnimalSpecies(e.target.value)}
                    required={fieldVariant === 'ganadero'}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Cabezas"
                    value={headCount}
                    onChange={(e) => setHeadCount(e.target.value)}
                    required={fieldVariant === 'ganadero'}
                  />
                  <Input
                    placeholder="Sistema de cría (opcional)"
                    value={housingSystem}
                    onChange={(e) => setHousingSystem(e.target.value)}
                  />
                </>
              )}
              {fieldVariant === 'forestal' && (
                <>
                  <Input
                    placeholder="Especie de árboles"
                    value={treeSpecies}
                    onChange={(e) => setTreeSpecies(e.target.value)}
                    required
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Edad años (opcional)"
                    value={ageForest}
                    onChange={(e) => setAgeForest(e.target.value)}
                  />
                </>
              )}
              {fieldVariant === 'otro' && (
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-surface-primary p-3 text-sm"
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  required
                  minLength={10}
                />
              )}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={createMutation.isPending || blockCreate}>
              {createMutation.isPending ? 'Guardando…' : 'Guardar borrador y continuar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/propiedades')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
