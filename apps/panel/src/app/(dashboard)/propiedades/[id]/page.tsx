'use client'

import { useParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import {
  formatTrpcUserMessage,
  type CreateListingInput,
  type Currency,
  LISTING_STATUS_LABELS,
  type ListingStatus,
} from '@propieya/shared'
import { Button, Card, Input, Badge } from '@propieya/ui'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Trash2 } from 'lucide-react'

import {
  publicationChecklist,
  statusActionCopy,
  statusOperationalCopy,
} from '@/lib/listing-publication'
import { formatListingVigencia } from '@/lib/vigencia'
import { trpc } from '@/lib/trpc'

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

export default function EditarPropiedadPage() {
  const params = useParams()
  const id = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [editError, setEditError] = useState('')

  const { data: current, isLoading } = trpc.listing.getMineById.useQuery(
    { id },
    { enabled: !!id }
  )
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
      const file = e.target.files?.[0]
      if (!file || !id) return
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError('Solo se permiten imágenes JPEG, PNG o WebP.')
        return
      }
      setUploading(true)
      setUploadError('')
      try {
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
        if (!res.ok) throw new Error(`Error al subir: ${res.status}`)
        await addMediaMutation.mutateAsync({
          listingId: id,
          url: fileUrl,
          type: 'image',
          isPrimary: !current?.primaryImageUrl,
        })
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Error al subir la imagen'
        )
        setUploading(false)
      }
      e.target.value = ''
    },
    [id, current?.primaryImageUrl, presignMutation, addMediaMutation]
  )

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

    const addr = current.address as Record<string, unknown> ?? {}
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

    const featBase =
      prevFeats && typeof prevFeats === 'object' && !Array.isArray(prevFeats)
        ? { ...prevFeats }
        : {}

    const mergedFeatures: CreateListingInput['features'] = {
      disposition: null,
      age: null,
      amenities: [],
      extras: {},
      commercialSub: null,
      field: null,
      ...(featBase as Partial<CreateListingInput['features']>),
      floor: floorFeat,
      totalFloors: totalFloorsFeat,
      escalera: featEscalera === '' ? null : featEscalera.toUpperCase(),
      orientation: orientationVal,
    }

    updateMutation.mutate({
      id,
      data: {
        title: title.slice(0, 255),
        description: description.slice(0, 5000),
        price: {
          amount: price,
          currency: (current.priceCurrency as Currency | null) ?? 'USD',
          showPrice: true,
          expenses: current.expenses,
          expensesCurrency: (current.expensesCurrency as Currency | null) ?? null,
        },
        surface: {
          total: surface,
          covered: surfaceCovered,
          semicovered: current.surfaceSemicovered,
          land: current.surfaceLand,
        },
        rooms: {
          bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
          bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
          toilettes: current.toilettes,
          garages: current.garages,
          total: totalRoomsParsed ?? current.totalRooms,
        },
        address: {
          street: (addr.street as string) ?? '',
          number: (addr.number as string) ?? null,
          floor: (addr.floor as string) ?? null,
          unit: (addr.unit as string) ?? null,
          neighborhood: (addr.neighborhood as string) ?? '',
          city: (addr.city as string) ?? '',
          state: (addr.state as string) ?? '',
          country: (addr.country as string) ?? 'Argentina',
          postalCode: (addr.postalCode as string) ?? null,
        },
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
  }
  const media = (current as { media?: { id: string; url: string; isPrimary: boolean; order: number }[] }).media ?? []
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

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-semibold text-text-primary">
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
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Superficie (m²)
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
              </div>
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
          {editError && (
            <p className="text-destructive text-sm">{editError}</p>
          )}
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar borrador'}
          </Button>
        </Card>
      </form>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Imágenes
        </h2>
        <div className="flex flex-wrap gap-4 mb-4">
          {media.map((m) => (
            <div
              key={m.id}
              className="relative group w-32 h-24 rounded overflow-hidden bg-surface-secondary border border-border"
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
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-brand-primary text-white text-xs rounded">
                  Principal
                </span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!m.isPrimary && (
                  <Button
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
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Subiendo...' : 'Subir imagen'}
        </Button>
        {uploadError && (
          <p className="text-destructive text-sm mt-2">{uploadError}</p>
        )}
      </Card>
    </div>
  )
}
