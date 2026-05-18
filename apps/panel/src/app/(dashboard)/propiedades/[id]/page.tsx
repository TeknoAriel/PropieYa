'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  formatTrpcUserMessage,
  LISTING_AMENITY_IDS,
  LISTING_AMENITY_LABELS,
  OPERATION_TYPE_LABELS,
  PORTAL_COMMERCIAL_PACKAGES,
  portalCommercialPackageById,
  portalVisibilityOperationalLabel,
  portalVisibilityPanelStatusShort,
  portalVisibilitySurfacesLabel,
  PROPERTY_TYPE_LABELS,
  resolvePortalCommercialPackageId,
  resolvePortalVisibilityOperationalStatus,
  type Amenity,
  type CreateListingInput,
  type Currency,
  LISTING_STATUS_LABELS,
  type ListingPortalVisibility,
  type PortalCommercialPackageId,
  type ListingStatus,
  type OperationType,
  type PropertyType,
} from '@propieya/shared'
import { Button, Card, Input, Badge } from '@propieya/ui'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink, Star, Trash2 } from 'lucide-react'

import {
  publicationChecklist,
  statusActionCopy,
  statusOperationalCopy,
} from '@/lib/listing-publication'
import { formatListingVigencia } from '@/lib/vigencia'
import { trpc } from '@/lib/trpc'

const WEB_PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://propieyaweb.vercel.app'
).replace(/\/$/, '')

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const ORIENTATION_VALUES = [
  'N',
  'S',
  'E',
  'W',
  'NE',
  'NW',
  'SE',
  'SW',
] as const

function untilToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditarPropiedadPage() {
  const params = useParams()
  const id = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [editError, setEditError] = useState('')
  const [portalPackageUi, setPortalPackageUi] = useState<PortalCommercialPackageId>('none')
  const [portalDurationUi, setPortalDurationUi] = useState<'15' | '30' | '60' | 'custom'>('30')
  const [portalScheduleEnabled, setPortalScheduleEnabled] = useState(false)

  const { data: current, isLoading } = trpc.listing.getMineById.useQuery(
    { id },
    { enabled: !!id }
  )
  const { data: meQuality } = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
  })
  const quality = meQuality?.qualityRules
  const utils = trpc.useUtils()

  const presignMutation = trpc.listing.getPresignedUploadUrl.useMutation()
  const addMediaMutation = trpc.listing.addMedia.useMutation({
    onSuccess: () => {
      utils.listing.getMineById.invalidate({ id })
      setUploading(false)
      setUploadError('')
    },
    onError: (err) => {
      setUploadError(formatTrpcUserMessage(err) || 'Error al guardar la imagen')
      setUploading(false)
    },
  })

  const removeMediaMutation = trpc.listing.removeMedia.useMutation({
    onSuccess: () => utils.listing.getMineById.invalidate({ id }),
  })
  const setPrimaryMutation = trpc.listing.setPrimaryMedia.useMutation({
    onSuccess: () => utils.listing.getMineById.invalidate({ id }),
  })
  const reorderMediaMutation = trpc.listing.reorderListingMedia.useMutation({
    onSuccess: () => utils.listing.getMineById.invalidate({ id }),
  })
  const updateMutation = trpc.listing.update.useMutation({
    onSuccess: () => {
      utils.listing.getMineById.invalidate({ id })
      setEditError('')
    },
    onError: (err) =>
      setEditError(formatTrpcUserMessage(err) || 'Error al guardar'),
  })
  const publishMutation = trpc.listing.publish.useMutation({
    onSuccess: () => utils.listing.getMineById.invalidate({ id }),
    onError: (err) =>
      setEditError(
        formatTrpcUserMessage(err) || 'No se pudo publicar este aviso todavía.'
      ),
  })
  const renewMutation = trpc.listing.renew.useMutation({
    onSuccess: () => utils.listing.getMineById.invalidate({ id }),
    onError: (err) =>
      setEditError(
        formatTrpcUserMessage(err) || 'No se pudo renovar este aviso todavía.'
      ),
  })

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files
      if (!list?.length || !id) return
      const files = Array.from(list)
      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setUploadError('Solo se permiten imágenes JPEG, PNG o WebP.')
          e.target.value = ''
          return
        }
      }
      setUploading(true)
      setUploadError('')
      setUploadProgress(null)
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]!
          setUploadProgress(`${i + 1} / ${files.length}`)
          const { uploadUrl, fileUrl } = await presignMutation.mutateAsync({
            listingId: id,
            filename: file.name,
            contentType: file.type,
          })
          const res = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })
          if (!res.ok) throw new Error(`No se pudo subir una foto (${res.status}).`)
          await addMediaMutation.mutateAsync({
            listingId: id,
            url: fileUrl,
            type: 'image',
            isPrimary: !current?.primaryImageUrl && i === 0,
          })
        }
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Error al subir imágenes'
        )
      } finally {
        setUploading(false)
        setUploadProgress(null)
      }
      e.target.value = ''
    },
    [id, current?.primaryImageUrl, presignMutation, addMediaMutation]
  )

  useEffect(() => {
    if (!current) return
    const pv = (current.features as { portalVisibility?: ListingPortalVisibility } | null | undefined)
      ?.portalVisibility
    const pkg = resolvePortalCommercialPackageId(pv)
    setPortalPackageUi(pkg)
    setPortalScheduleEnabled(Boolean(pv?.from))
    if (pv?.until) {
      const until = new Date(pv.until)
      const ms = until.getTime() - Date.now()
      const days = Math.round(ms / (24 * 60 * 60 * 1000))
      if (days <= 17) setPortalDurationUi('15')
      else if (days <= 35) setPortalDurationUi('30')
      else if (days <= 65) setPortalDurationUi('60')
      else setPortalDurationUi('custom')
    } else {
      setPortalDurationUi('30')
    }
    // Sincronizar con servidor tras guardar; `id` + `updatedAt` identifican nueva versión persistida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.updatedAt])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!current) return
    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value
    const price = Number((form.elements.namedItem('price') as HTMLInputElement).value)
    const surface = Number((form.elements.namedItem('surface') as HTMLInputElement).value)
    const bedrooms = (form.elements.namedItem('bedrooms') as HTMLInputElement).value
    const bathrooms = (form.elements.namedItem('bathrooms') as HTMLInputElement).value
    const surfaceCoveredRaw = (
      form.elements.namedItem('surfaceCovered') as HTMLInputElement
    ).value
    const totalRoomsRaw = (form.elements.namedItem('totalRooms') as HTMLInputElement)
      .value
    const featFloorRaw = (form.elements.namedItem('featFloor') as HTMLInputElement)
      .value
    const featTotalFloorsRaw = (
      form.elements.namedItem('featTotalFloors') as HTMLInputElement
    ).value
    const featOrientation = (
      form.elements.namedItem('featOrientation') as HTMLSelectElement
    ).value
    const featEscalera = (
      form.elements.namedItem('featEscalera') as HTMLInputElement
    ).value
      .trim()
      .slice(0, 10)
    const featDispositionRaw = (
      form.elements.namedItem('featDisposition') as HTMLSelectElement | null
    )?.value
    const featAgeType = (
      form.elements.namedItem('featAgeType') as HTMLSelectElement | null
    )?.value as 'brand_new' | 'under_construction' | 'years' | undefined
    const featAgeYearsRaw = (form.elements.namedItem('featAgeYears') as HTMLInputElement | null)
      ?.value

    const operationTypeVal = (
      form.elements.namedItem('operationType') as HTMLSelectElement
    ).value as OperationType
    const propertyTypeVal = (
      form.elements.namedItem('propertyType') as HTMLSelectElement
    ).value as PropertyType

    const street = (form.elements.namedItem('addrStreet') as HTMLInputElement).value.trim()
    const numberRaw = (form.elements.namedItem('addrNumber') as HTMLInputElement).value.trim()
    const floorAddr = (form.elements.namedItem('addrFloor') as HTMLInputElement).value.trim()
    const unitAddr = (form.elements.namedItem('addrUnit') as HTMLInputElement).value.trim()
    const neighborhoodAddr = (
      form.elements.namedItem('addrNeighborhood') as HTMLInputElement
    ).value.trim()
    const cityAddr = (form.elements.namedItem('addrCity') as HTMLInputElement).value.trim()
    const stateAddr = (form.elements.namedItem('addrState') as HTMLInputElement).value.trim()
    const postalAddr = (form.elements.namedItem('addrPostal') as HTMLInputElement).value.trim()

    const currencyVal = (form.elements.namedItem('currency') as HTMLSelectElement)
      .value as Currency
    const showPriceEl = form.elements.namedItem('showPrice') as HTMLInputElement | null
    const showPriceVal = Boolean(showPriceEl?.checked)
    const expensesRaw = (form.elements.namedItem('expenses') as HTMLInputElement).value.trim()
    const expensesCurrencyRaw = (
      form.elements.namedItem('expensesCurrency') as HTMLSelectElement
    ).value

    const surfaceSemicoveredRaw = (
      form.elements.namedItem('surfaceSemicovered') as HTMLInputElement
    ).value
    const surfaceLandRaw = (form.elements.namedItem('surfaceLand') as HTMLInputElement).value
    const garagesRaw = (form.elements.namedItem('garages') as HTMLInputElement).value
    const toilettesRaw = (form.elements.namedItem('toilettes') as HTMLInputElement).value

    const latRaw = (form.elements.namedItem('locationLat') as HTMLInputElement).value.trim()
    const lngRaw = (form.elements.namedItem('locationLng') as HTMLInputElement).value.trim()
    const hideExactEl = form.elements.namedItem('hideExactAddress') as HTMLInputElement | null
    const hideExactVal = Boolean(hideExactEl?.checked)

    if (!title || title.length < 10) {
      setEditError('El título debe tener al menos 10 caracteres')
      return
    }
    if (!description || description.length < 50) {
      setEditError('La descripción debe tener al menos 50 caracteres')
      return
    }
    if (isNaN(price) || price <= 0 || isNaN(surface) || surface <= 0) {
      setEditError('Precio y superficie deben ser números positivos')
      return
    }

    if (
      !street ||
      !neighborhoodAddr ||
      !cityAddr ||
      !stateAddr
    ) {
      setEditError('Completá calle, barrio, ciudad y provincia.')
      return
    }

    let expensesParsed: number | null = null
    if (expensesRaw !== '') {
      const e = Number.parseFloat(expensesRaw)
      if (!Number.isFinite(e) || e < 0) {
        setEditError('Las expensas no son un número válido.')
        return
      }
      expensesParsed = e
    }

    let surfaceSemicovered: number | null = current.surfaceSemicovered ?? null
    if (surfaceSemicoveredRaw.trim() !== '') {
      const n = Number(surfaceSemicoveredRaw)
      surfaceSemicovered = !Number.isNaN(n) && n >= 0 ? n : null
      if (surfaceSemicovered === null && surfaceSemicoveredRaw.trim() !== '') {
        setEditError('Superficie semicubierta inválida.')
        return
      }
    }

    let surfaceLand: number | null = current.surfaceLand ?? null
    if (surfaceLandRaw.trim() !== '') {
      const n = Number(surfaceLandRaw)
      surfaceLand = !Number.isNaN(n) && n >= 0 ? n : null
      if (surfaceLand === null && surfaceLandRaw.trim() !== '') {
        setEditError('Superficie de terreno inválida.')
        return
      }
    }

    if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
      setEditError('Indicá latitud y longitud juntas, o dejá ambas vacías.')
      return
    }

    let location: CreateListingInput['location'] = null
    if (latRaw && lngRaw) {
      const la = Number.parseFloat(latRaw)
      const ln = Number.parseFloat(lngRaw)
      if (
        !Number.isFinite(la) ||
        !Number.isFinite(ln) ||
        la < -90 ||
        la > 90 ||
        ln < -180 ||
        ln > 180
      ) {
        setEditError('Latitud o longitud no válidas.')
        return
      }
      location = { lat: la, lng: ln }
    }

    const garagesParsed = garagesRaw.trim() !== '' ? parseInt(garagesRaw, 10) : current.garages
    const toilettesParsed =
      toilettesRaw.trim() !== '' ? parseInt(toilettesRaw, 10) : current.toilettes
    if (garagesParsed != null && (Number.isNaN(garagesParsed) || garagesParsed < 0)) {
      setEditError('Cocheras: número inválido.')
      return
    }
    if (toilettesParsed != null && (Number.isNaN(toilettesParsed) || toilettesParsed < 0)) {
      setEditError('Toilettes: número inválido.')
      return
    }

    const prevFeats = (current.features ?? {}) as Record<string, unknown>

    const parseOptInt = (raw: string): number | null => {
      if (!raw.trim()) return null
      const n = parseInt(raw, 10)
      return Number.isNaN(n) ? null : n
    }

    let surfaceCovered: number | null = null
    if (surfaceCoveredRaw.trim() !== '') {
      const n = Number(surfaceCoveredRaw)
      surfaceCovered = !Number.isNaN(n) && n >= 0 ? n : null
    }

    const totalRoomsParsed = parseOptInt(totalRoomsRaw)
    const floorFeat = parseOptInt(featFloorRaw)
    const totalFloorsFeat = parseOptInt(featTotalFloorsRaw)
    const orientationVal = ORIENTATION_VALUES.includes(
      featOrientation as (typeof ORIENTATION_VALUES)[number]
    )
      ? (featOrientation as (typeof ORIENTATION_VALUES)[number])
      : null

    const featBaseRaw =
      prevFeats && typeof prevFeats === 'object' && !Array.isArray(prevFeats)
        ? { ...prevFeats }
        : {}
    const { portalVisibility: _prevPortal, ...featBaseNoPortal } =
      featBaseRaw as Record<string, unknown>

    const commercialPackage = (
      form.elements.namedItem('portalCommercialPackage') as HTMLSelectElement
    ).value as PortalCommercialPackageId
    const durationMode = (
      form.elements.namedItem('portalDurationMode') as HTMLSelectElement | null
    )?.value as '15' | '30' | '60' | 'custom' | undefined
    const untilRaw = (
      form.elements.namedItem('portalVisibilityUntil') as HTMLInputElement | null
    )?.value?.trim()
    const fromRaw = (
      form.elements.namedItem('portalVisibilityFrom') as HTMLInputElement | null
    )?.value?.trim()

    const amenitiesFromForm: Amenity[] = []
    for (const k of LISTING_AMENITY_IDS) {
      const el = form.elements.namedItem(`amenity_${k}`) as HTMLInputElement | null
      if (el?.checked) amenitiesFromForm.push(k)
    }

    const dispositionVal =
      featDispositionRaw &&
      ['front', 'back', 'internal', 'lateral'].includes(featDispositionRaw)
        ? (featDispositionRaw as CreateListingInput['features']['disposition'])
        : null

    let ageMerged: CreateListingInput['features']['age'] =
      (prevFeats.age as CreateListingInput['features']['age']) ?? null
    if (featAgeType === 'brand_new') ageMerged = { type: 'brand_new', years: null }
    else if (featAgeType === 'under_construction')
      ageMerged = { type: 'under_construction', years: null }
    else if (featAgeType === 'years') {
      const y = featAgeYearsRaw?.trim() ? parseInt(featAgeYearsRaw, 10) : null
      ageMerged = {
        type: 'years',
        years: y != null && Number.isFinite(y) && y >= 0 ? y : null,
      }
    }

    const extrasSafe =
      prevFeats.extras &&
      typeof prevFeats.extras === 'object' &&
      !Array.isArray(prevFeats.extras)
        ? (prevFeats.extras as Record<string, string | number | boolean>)
        : {}

    const mergedFeatures: CreateListingInput['features'] = {
      ...(featBaseNoPortal as Partial<CreateListingInput['features']>),
      floor: floorFeat,
      totalFloors: totalFloorsFeat,
      escalera: featEscalera === '' ? null : featEscalera.toUpperCase(),
      orientation: orientationVal,
      disposition: dispositionVal,
      age: ageMerged,
      amenities: amenitiesFromForm,
      extras: extrasSafe,
      commercialSub: (prevFeats.commercialSub ??
        null) as CreateListingInput['features']['commercialSub'],
      field: (prevFeats.field ?? null) as CreateListingInput['features']['field'],
    }

    if (commercialPackage === 'none' && _prevPortal) {
      mergedFeatures.portalVisibility = _prevPortal as ListingPortalVisibility
    }

    if (commercialPackage !== 'none') {
      const pkg = portalCommercialPackageById(commercialPackage)
      const products = [...pkg.products]
      const prevPv = _prevPortal as ListingPortalVisibility | undefined
      const devExtras =
        prevPv?.products?.filter((id) => id.startsWith('developments_')) ?? []
      for (const id of devExtras) {
        if (!products.includes(id)) products.push(id)
      }

      let untilIso: string | null = null
      if (durationMode === 'custom') {
        untilIso = untilRaw ? new Date(untilRaw).toISOString() : null
      } else {
        const days = Number(durationMode ?? pkg.defaultDurationDays ?? 30)
        const d = new Date()
        d.setDate(d.getDate() + Math.max(1, days))
        untilIso = d.toISOString()
      }

      mergedFeatures.portalVisibility = {
        tier: pkg.tier,
        products,
        from: fromRaw ? new Date(fromRaw).toISOString() : null,
        until: untilIso,
      }
    }

    updateMutation.mutate({
      id,
      data: {
        propertyType: propertyTypeVal,
        operationType: operationTypeVal,
        title: title.slice(0, 255),
        description: description.slice(0, 5000),
        price: {
          amount: price,
          currency: currencyVal,
          showPrice: showPriceVal,
          expenses: expensesParsed,
          expensesCurrency:
            expensesParsed != null && expensesCurrencyRaw
              ? (expensesCurrencyRaw as Currency)
              : null,
        },
        surface: {
          total: surface,
          covered: surfaceCovered,
          semicovered: surfaceSemicovered,
          land: surfaceLand,
        },
        rooms: {
          bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
          bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
          toilettes: toilettesParsed ?? null,
          garages: garagesParsed ?? null,
          total: totalRoomsParsed ?? current.totalRooms,
        },
        address: {
          street,
          number: numberRaw || null,
          floor: floorAddr || null,
          unit: unitAddr || null,
          neighborhood: neighborhoodAddr,
          city: cityAddr,
          state: stateAddr,
          country:
            ((current.address as Record<string, unknown> | undefined)?.country as string) ||
            'Argentina',
          postalCode: postalAddr || null,
        },
        location,
        hideExactAddress: hideExactVal,
        features: mergedFeatures,
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-text-secondary">Cargando...</p>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="space-y-6">
        <p className="text-text-secondary">Propiedad no encontrada.</p>
        <Button asChild variant="outline">
          <Link href="/propiedades">Volver a propiedades</Link>
        </Button>
      </div>
    )
  }

  const addr = current.address as Record<string, unknown> | null
  const feats = (current.features ?? {}) as {
    floor?: number | null
    totalFloors?: number | null
    escalera?: string | null
    orientation?: string | null
    disposition?: string | null
    age?: { type: string; years?: number | null } | null
    amenities?: Amenity[]
    portalVisibility?: ListingPortalVisibility | null
  }
  const amenitiesSelected = new Set(
    Array.isArray(feats.amenities) ? feats.amenities : []
  )
  const ageTypeDefault =
    feats.age?.type === 'brand_new' ||
    feats.age?.type === 'under_construction' ||
    feats.age?.type === 'years'
      ? feats.age.type
      : 'years'
  const portalPv = feats.portalVisibility
  const portalPackageCurrent = resolvePortalCommercialPackageId(portalPv)
  const portalPackageDef = portalCommercialPackageById(portalPackageCurrent)
  const portalSavedLabel = portalVisibilityPanelStatusShort(portalPv?.tier)
  const portalOperational = resolvePortalVisibilityOperationalStatus(portalPv)
  const portalOperationalLabel = portalVisibilityOperationalLabel(portalOperational)
  const portalFromDefault = untilToDatetimeLocalValue(portalPv?.from ?? undefined)
  const untilDefault = untilToDatetimeLocalValue(portalPv?.until ?? undefined)
  const media = (current as { media?: { id: string; url: string; isPrimary: boolean; order: number }[] }).media ?? []
  const mediaSorted = [...media].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return (a.order ?? 0) - (b.order ?? 0)
  })
  const advertiser = (
    current as {
      advertiser?: {
        listingSource: string
        publisherDisplayName: string | null
        publisherEmail: string | null
        publisherPhone: string | null
        organizationName: string | null
        organizationType: string | null
        organizationEmail: string | null
        organizationPhone: string | null
      }
    }
  ).advertiser

  const moveMediaOrder = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mediaSorted.length || fromIndex === toIndex) return
    const next = [...mediaSorted]
    const [item] = next.splice(fromIndex, 1)
    if (!item) return
    next.splice(toIndex, 0, item)
    await reorderMediaMutation.mutateAsync({
      listingId: id,
      orderedMediaIds: next.map((m) => m.id),
    })
  }
  const status = current.status as ListingStatus
  const operational = statusOperationalCopy(status, Boolean(current.canPublish))
  const actionCopy = statusActionCopy(
    status,
    Boolean(current.canPublish),
    Boolean(current.canRenew)
  )
  const checklist = publicationChecklist(current.publishability?.issues ?? [])
  const lastLifecycleReason = current.lastLifecycleEvent?.reasonMessage ?? null
  const vigencia = formatListingVigencia(current.expiresAt, current.status)
  const showRenew = Boolean(current.canRenew)
  const isDraft = current.status === 'draft'
  const isRejected = current.status === 'rejected'
  const canPublishNow = Boolean(current.canPublish)
  const showPublishAction = isDraft || isRejected

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Editar: {current.title}
          </h1>
          <p className="text-text-secondary mt-1">{addr?.city as string}</p>
          <p className="text-sm text-text-tertiary mt-2">
            Visibilidad en portal (guardada):{' '}
            <span className="text-text-secondary font-medium">
              {portalSavedLabel}
            </span>
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            Paquete: <span className="font-medium text-text-secondary">{portalPackageDef.commercialName}</span>{' '}
            · Estado: <span className="font-medium text-text-secondary">{portalOperationalLabel}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {showPublishAction && (
            <Button
              onClick={() => publishMutation.mutate({ id })}
              disabled={publishMutation.isPending || !canPublishNow}
            >
              {publishMutation.isPending
                ? 'Publicando...'
                : canPublishNow
                  ? isRejected
                    ? 'Reintentar publicación'
                    : 'Publicar aviso'
                  : 'Completá requisitos'}
            </Button>
          )}
          {showRenew && (
            <Button
              onClick={() => renewMutation.mutate({ id })}
              disabled={renewMutation.isPending}
            >
              {renewMutation.isPending ? 'Renovando...' : 'Renovar'}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/propiedades">Volver</Link>
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Estado del aviso
            </h2>
            <p className="text-sm text-text-secondary">{actionCopy.description}</p>
          </div>
          <Badge
            variant={
              canPublishNow || status === 'active'
                ? 'default'
                : status === 'expiring_soon' || status === 'expired'
                  ? 'secondary'
                  : status === 'suspended' || status === 'rejected'
                    ? 'error'
                    : 'secondary'
            }
          >
            {isDraft
              ? operational.label
              : LISTING_STATUS_LABELS[status] ?? operational.label}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">
              Estado operativo
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {actionCopy.title}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{actionCopy.nextAction}</p>
            {!canPublishNow ? (
              <div className="mt-2 space-y-1">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">
                  Qué falta corregir
                </p>
                {checklist.length > 0 ? (
                  <ul className="text-sm text-text-secondary space-y-1">
                    {checklist.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Revisá datos obligatorios, ubicación, precio e imágenes.
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">
              Vigencia
            </p>
            <p
              className={`mt-1 text-sm ${
                vigencia === 'Vencido' ? 'text-semantic-error font-medium' : 'text-text-primary'
              }`}
            >
              {vigencia}
            </p>
            {showRenew ? (
              <p className="mt-1 text-sm text-text-secondary">
                Para volver a publicarlo, actualizá el contenido si hace falta y renová la vigencia.
              </p>
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                Última actualización: {new Date(current.updatedAt).toLocaleString('es-AR')}
              </p>
            )}
          </div>
        </div>

        {lastLifecycleReason ? (
          <div className="rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
            {lastLifecycleReason}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold text-text-primary">Antes de publicar</h2>
        <p className="text-sm text-text-secondary">
          Así se ve tu aviso en el portal público cuando está activo (misma ficha para avisos
          importados y manuales).
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>
            Fotos cargadas: {media.length}{' '}
            {quality ? `(mínimo sugerido para publicar: ${quality.minPhotos})` : ''}
          </li>
          <li>
            Título: {current.title.length} caracteres
            {quality ? ` (mín. ${quality.minTitleLength})` : ''}
          </li>
          <li>
            Descripción: {current.description.length} caracteres
            {quality ? ` (mín. ${quality.minDescriptionLength})` : ''}
          </li>
          <li>
            Contacto público en la ficha: datos de tu cuenta e inmobiliaria (nombre, mail y teléfono
            visibles según el diseño del portal).
          </li>
        </ul>
        <Button asChild variant="outline" size="sm">
          <a
            href={`${WEB_PUBLIC_BASE}/propiedad/${id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir vista pública (nueva pestaña)
          </a>
        </Button>
        {!canPublishNow ? (
          <div className="rounded-md border border-border bg-surface-secondary/50 p-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">Aún no se puede publicar</p>
            <ul className="mt-2 space-y-1">
              {checklist.map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {advertiser ? (
        <Card className="space-y-3 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Anunciante y consultas</h2>
          <p className="text-sm text-text-secondary">
            Origen del aviso:{' '}
            <span className="font-medium text-text-primary">
              {advertiser.listingSource === 'manual' ? 'Publicación manual en Propieya' : advertiser.listingSource}
            </span>
            . Las consultas del portal llegan por el formulario de la ficha y se notifican al mail
            configurado en tu cuenta.
          </p>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Cuenta publicadora</p>
              <p className="mt-1 font-medium text-text-primary">
                {advertiser.publisherDisplayName ?? '—'}
              </p>
              <p className="text-text-secondary">{advertiser.publisherEmail ?? '—'}</p>
              <p className="text-text-secondary">{advertiser.publisherPhone ?? '—'}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Organización</p>
              <p className="mt-1 font-medium text-text-primary">
                {advertiser.organizationName ?? '—'}
              </p>
              <p className="text-text-secondary">Tipo: {advertiser.organizationType ?? '—'}</p>
              <p className="text-text-secondary">{advertiser.organizationEmail ?? '—'}</p>
              <p className="text-text-secondary">{advertiser.organizationPhone ?? '—'}</p>
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            WhatsApp: si cargaste teléfono en tu perfil, podés usarlo también para contacto;
            Propieya no duplica un campo aparte todavía.
          </p>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-semibold text-text-primary">Operación, tipo y ubicación</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Tipo de propiedad
              </label>
              <select
                name="propertyType"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue={current.propertyType as PropertyType}
              >
                {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Operación</label>
              <select
                name="operationType"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue={current.operationType as OperationType}
              >
                {Object.entries(OPERATION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Calle</label>
              <Input name="addrStreet" defaultValue={(addr?.street as string) ?? ''} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Número</label>
              <Input name="addrNumber" defaultValue={(addr?.number as string) ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Piso</label>
              <Input name="addrFloor" defaultValue={(addr?.floor as string) ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Depto / unidad
              </label>
              <Input name="addrUnit" defaultValue={(addr?.unit as string) ?? ''} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Barrio</label>
              <Input
                name="addrNeighborhood"
                defaultValue={(addr?.neighborhood as string) ?? ''}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Ciudad</label>
              <Input name="addrCity" defaultValue={(addr?.city as string) ?? ''} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Provincia
              </label>
              <Input name="addrState" defaultValue={(addr?.state as string) ?? ''} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">CP</label>
              <Input name="addrPostal" defaultValue={(addr?.postalCode as string) ?? ''} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Latitud (opcional)
              </label>
              <Input
                name="locationLat"
                defaultValue={
                  current.locationLat != null ? String(current.locationLat) : ''
                }
                placeholder="-34.6"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Longitud (opcional)
              </label>
              <Input
                name="locationLng"
                defaultValue={
                  current.locationLng != null ? String(current.locationLng) : ''
                }
                placeholder="-58.4"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hideExactAddress"
              defaultChecked={current.hideExactAddress}
            />
            Ocultar dirección exacta en la ficha pública
          </label>

          <h2 className="text-lg font-semibold text-text-primary border-t border-border pt-6">
            Datos básicos
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Título
              </label>
              <Input
                name="title"
                defaultValue={current.title}
                placeholder="Ej: Departamento 2 ambientes..."
                minLength={10}
                maxLength={255}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Precio
              </label>
              <Input
                name="price"
                type="number"
                defaultValue={current.priceAmount}
                min={1}
                step={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Moneda</label>
              <select
                name="currency"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue={(current.priceCurrency as Currency | null) ?? 'USD'}
              >
                {(['ARS', 'USD', 'CLP', 'UF', 'MXN'] as const).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="showPrice" defaultChecked={current.showPrice} />
                Mostrar precio en la ficha
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Expensas (opcional)
              </label>
              <Input
                name="expenses"
                type="number"
                min={0}
                step={1}
                defaultValue={current.expenses ?? ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Moneda expensas
              </label>
              <select
                name="expensesCurrency"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue={(current.expensesCurrency as Currency | null) ?? ''}
              >
                <option value="">—</option>
                {(['ARS', 'USD', 'CLP', 'UF', 'MXN'] as const).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Superficie total (m²)
              </label>
              <Input
                name="surface"
                type="number"
                defaultValue={current.surfaceTotal}
                min={1}
                step={1}
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Dormitorios
                </label>
                <Input
                  name="bedrooms"
                  type="number"
                  defaultValue={current.bedrooms ?? ''}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Baños
                </label>
                <Input
                  name="bathrooms"
                  type="number"
                  defaultValue={current.bathrooms ?? ''}
                  min={0}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Toilettes
                </label>
                <Input
                  name="toilettes"
                  type="number"
                  defaultValue={current.toilettes ?? ''}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Cocheras
                </label>
                <Input
                  name="garages"
                  type="number"
                  defaultValue={current.garages ?? ''}
                  min={0}
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Superficie cubierta, ambientes y datos para búsqueda (modelo XML
                OpenNavent)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Superficie cubierta (m²)
                  </label>
                  <Input
                    name="surfaceCovered"
                    type="number"
                    defaultValue={current.surfaceCovered ?? ''}
                    min={0}
                    step={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ambientes totales
                  </label>
                  <Input
                    name="totalRooms"
                    type="number"
                    defaultValue={current.totalRooms ?? ''}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Superficie semicubierta (m²)
                  </label>
                  <Input
                    name="surfaceSemicovered"
                    type="number"
                    defaultValue={current.surfaceSemicovered ?? ''}
                    min={0}
                    step={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Terreno (m²)
                  </label>
                  <Input
                    name="surfaceLand"
                    type="number"
                    defaultValue={current.surfaceLand ?? ''}
                    min={0}
                    step={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Piso (unidad)
                  </label>
                  <Input
                    name="featFloor"
                    type="number"
                    defaultValue={feats.floor ?? ''}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Pisos del edificio
                  </label>
                  <Input
                    name="featTotalFloors"
                    type="number"
                    defaultValue={feats.totalFloors ?? ''}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Orientación
                  </label>
                  <select
                    name="featOrientation"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    defaultValue={feats.orientation ?? ''}
                  >
                    <option value="">—</option>
                    {ORIENTATION_VALUES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Escalera / entrada
                  </label>
                  <Input
                    name="featEscalera"
                    defaultValue={feats.escalera ?? ''}
                    maxLength={10}
                    placeholder="Ej: A, B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Disposición
                  </label>
                  <select
                    name="featDisposition"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    defaultValue={feats.disposition ?? ''}
                  >
                    <option value="">—</option>
                    <option value="front">Frente</option>
                    <option value="back">Contrafrente</option>
                    <option value="internal">Interno</option>
                    <option value="lateral">Lateral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Antigüedad
                  </label>
                  <select
                    name="featAgeType"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    defaultValue={ageTypeDefault}
                  >
                    <option value="brand_new">A estrenar</option>
                    <option value="under_construction">En construcción</option>
                    <option value="years">Años</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Años (si aplica)
                  </label>
                  <Input
                    name="featAgeYears"
                    type="number"
                    min={0}
                    defaultValue={
                      feats.age?.type === 'years' && feats.age.years != null
                        ? feats.age.years
                        : ''
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-text-primary">Amenities</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {LISTING_AMENITY_IDS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`amenity_${k}`}
                    defaultChecked={amenitiesSelected.has(k)}
                  />
                  {LISTING_AMENITY_LABELS[k]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Descripción
            </label>
            <textarea
              name="description"
              className="w-full min-h-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue={current.description}
              minLength={50}
              maxLength={5000}
              placeholder="Descripción detallada de la propiedad..."
            />
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Paquete comercial de visibilidad
            </h3>
            <p className="text-sm text-text-secondary max-w-2xl">
              Configurá el producto comercial sin activar cobro automático. Este bloque no
              cambia el ranking core del buscador.
            </p>
            <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Paquete
                </label>
                <select
                  name="portalCommercialPackage"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={portalPackageUi}
                  onChange={(e) =>
                    setPortalPackageUi(e.target.value as PortalCommercialPackageId)
                  }
                >
                  {PORTAL_COMMERCIAL_PACKAGES.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.commercialName}
                    </option>
                  ))}
                </select>
              </div>
              {portalPackageUi !== 'none' ? (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Duración sugerida
                  </label>
                  <select
                    name="portalDurationMode"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={portalDurationUi}
                    onChange={(e) =>
                      setPortalDurationUi(e.target.value as '15' | '30' | '60' | 'custom')
                    }
                  >
                    <option value="15">15 días</option>
                    <option value="30">30 días</option>
                    <option value="60">60 días</option>
                    <option value="custom">Fecha personalizada</option>
                  </select>
                </div>
              ) : null}
            </div>
            {portalPackageUi !== 'none' ? (
              <div className="rounded-md border border-border bg-surface-secondary/40 px-3 py-3 space-y-2 max-w-2xl">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Qué incluye
                </p>
                <p className="text-sm text-text-primary">
                  {portalCommercialPackageById(portalPackageUi).operationalSummary}
                </p>
                <p className="text-xs text-text-secondary">
                  Impacta en:{' '}
                  {portalVisibilitySurfacesLabel(
                    portalCommercialPackageById(portalPackageUi).surfaces
                  )}
                  .
                </p>
                <p className="text-xs text-text-secondary">
                  Alcance visible: {portalCommercialPackageById(portalPackageUi).visibleScope}
                </p>
                <p className="text-xs text-text-tertiary">
                  Preparado para extender a productos de emprendimientos (publicación, destaque,
                  banner y prioridad) sin cambiar este modelo.
                </p>
              </div>
            ) : null}
            {portalPackageUi !== 'none' && portalDurationUi === 'custom' ? (
              <div className="max-w-2xl">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Vigencia hasta
                </label>
                <input
                  name="portalVisibilityUntil"
                  type="datetime-local"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  defaultValue={untilDefault}
                />
              </div>
            ) : null}
            {portalPackageUi !== 'none' ? (
              <div className="max-w-2xl space-y-2 rounded-md border border-border bg-surface-secondary/40 px-3 py-3">
                <label className="flex items-start gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portalScheduleEnabled}
                    onChange={(e) => setPortalScheduleEnabled(e.target.checked)}
                    className="mt-1 rounded border-border"
                  />
                  <span>Programar inicio</span>
                </label>
                {portalScheduleEnabled ? (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Inicia el
                    </label>
                    <input
                      name="portalVisibilityFrom"
                      type="datetime-local"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      defaultValue={portalFromDefault}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-md border border-border bg-surface-secondary/40 px-3 py-3 space-y-1 max-w-2xl">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Estado comercial actual
              </p>
              <p className="text-sm text-text-primary">
                {portalPackageDef.commercialName} · {portalOperationalLabel}
              </p>
              <p className="text-xs text-text-secondary">
                {portalPv?.from ? `Desde ${new Date(portalPv.from).toLocaleString('es-AR')}` : 'Inicio inmediato'} ·{' '}
                {portalPv?.until
                  ? `Hasta ${new Date(portalPv.until).toLocaleString('es-AR')}`
                  : 'Sin fecha de fin'}
              </p>
            </div>
          </div>

          {editError && (
            <p className="text-destructive text-sm">{editError}</p>
          )}
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar borrador'}
          </Button>
        </Card>
      </form>

      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold text-text-primary">Fotos</h2>
        <p className="mb-4 text-sm text-text-secondary">
          Subí varias a la vez; reordená con las flechas. La primera marcada como principal se
          usa como portada en listados.
          {quality
            ? ` Para publicar necesitás al menos ${quality.minPhotos} fotos.`
            : ''}
        </p>
        <div className="mb-4 flex flex-wrap gap-4">
          {mediaSorted.map((m, idx) => (
            <div
              key={m.id}
              className="group relative h-24 w-32 overflow-hidden rounded border border-border bg-surface-secondary"
            >
              <Image
                src={m.url}
                alt=""
                fill
                sizes="128px"
                className="object-cover"
                unoptimized
              />
              {m.isPrimary && (
                <span className="absolute left-1 top-1 rounded bg-brand-primary px-1.5 py-0.5 text-xs text-white">
                  Portada
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="!p-1"
                  disabled={reorderMediaMutation.isPending || idx === 0}
                  onClick={() => void moveMediaOrder(idx, idx - 1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="!p-1"
                  disabled={reorderMediaMutation.isPending || idx >= mediaSorted.length - 1}
                  onClick={() => void moveMediaOrder(idx, idx + 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {!m.isPrimary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setPrimaryMutation.mutate({ mediaId: m.id })}
                    disabled={setPrimaryMutation.isPending}
                    className="!p-1"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => removeMediaMutation.mutate({ mediaId: m.id })}
                  disabled={removeMediaMutation.isPending}
                  className="!p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? uploadProgress
              ? `Subiendo ${uploadProgress}…`
              : 'Subiendo…'
            : 'Subir fotos'}
        </Button>
        {uploadError && (
          <p className="text-destructive text-sm mt-2">{uploadError}</p>
        )}
      </Card>
    </div>
  )
}
