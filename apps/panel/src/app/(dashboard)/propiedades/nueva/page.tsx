'use client'

import {
  formatTrpcUserMessage,
  OPERATION_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from '@propieya/shared'
import { Button, Card, Input } from '@propieya/ui'
import type {
  FieldVariant,
  OperationType,
  PropertyType,
  ListingField,
  CommercialSubVariant,
  ListingCommercialSub,
} from '@propieya/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'


import { trpc } from '@/lib/trpc'

function normalizeNullable(s: string): string | null {
  const v = s.trim()
  return v.length ? v : null
}

export default function NuevaPropiedadPage() {
  const router = useRouter()

  const [propertyType, setPropertyType] = useState<PropertyType>('apartment')
  const [operationType, setOperationType] = useState<OperationType>('sale')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [surface, setSurface] = useState('')
  const [error, setError] = useState('')

  const [fieldVariant, setFieldVariant] = useState<FieldVariant>('agricola')

  // Subrubro comercial/oficina (propertyType: commercial/office)
  const [commercialSubVariant, setCommercialSubVariant] =
    useState<CommercialSubVariant>('office')
  const [commercialSubLabel, setCommercialSubLabel] = useState('')

  // Campos rurales (field.*)
  const [hectares, setHectares] = useState('')
  const [cropType, setCropType] = useState('')
  const [irrigation, setIrrigation] = useState('')
  const [soilType, setSoilType] = useState('')

  const [animalSpecies, setAnimalSpecies] = useState('')
  const [headCount, setHeadCount] = useState('')
  const [housingSystem, setHousingSystem] = useState('')

  const [treeSpecies, setTreeSpecies] = useState('')
  const [ageYears, setAgeYears] = useState('')

  const [otherDescription, setOtherDescription] = useState('')

  const createMutation = trpc.listing.create.useMutation({
    onSuccess: (created) => {
      if (created?.id) router.push(`/propiedades/${created.id}`)
      else router.push('/propiedades')
    },
    onError: (err) => {
      setError(formatTrpcUserMessage(err) || 'No se pudo crear la propiedad')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
            ageYears: ageYears.trim() ? Number(ageYears) : null,
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

    createMutation.mutate({
      propertyType,
      operationType,
      address: {
        street: 'Sin definir',
        number: null,
        floor: null,
        unit: null,
        neighborhood: 'Sin definir',
        city: 'Buenos Aires',
        state: 'Buenos Aires',
        country: 'Argentina',
        postalCode: null,
      },
      location: null,
      hideExactAddress: true,
      title,
      description,
      internalNotes: null,
      price: {
        amount: Number(price),
        currency: 'USD',
        showPrice: true,
        expenses: null,
        expensesCurrency: null,
      },
      surface: {
        total: Number(surface),
        covered: null,
        semicovered: null,
        land: null,
      },
      rooms: {
        bedrooms: 1,
        bathrooms: 1,
        toilettes: 0,
        garages: 0,
        total: 2,
      },
      features: {
        floor: null,
        totalFloors: null,
        escalera: null,
        orientation: null,
        disposition: null,
        age: null,
        amenities: [],
        extras: {},
        field,
        commercialSub,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Nueva propiedad</h1>
        <p className="text-text-secondary">
          Cargá un borrador inicial. Después vas a poder completar datos, revisar
          faltantes y publicarlo desde la ficha.
        </p>
      </div>

      <Card className="p-6">
        {error ? (
          <div className="mb-4 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Tipo de propiedad
              </label>
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
              <label className="block text-sm text-text-secondary mb-1">
                Operación
              </label>
              <select
                value={operationType}
                onChange={(e) =>
                  setOperationType(e.target.value as OperationType)
                }
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

          <div>
            <label className="block text-sm text-text-secondary mb-1">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Departamento 3 ambientes en Palermo..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Descripción</label>
            <textarea
              className="w-full min-h-32 rounded-md border border-border bg-surface-primary p-3 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción comercial de la propiedad..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Precio (USD)</label>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Superficie total (m2)</label>
              <Input
                type="number"
                min={1}
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                required
              />
            </div>
          </div>

          {(propertyType === 'commercial' || propertyType === 'office') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Subrubro comercial/oficina
                </label>
                <select
                  value={commercialSubVariant}
                  onChange={(e) =>
                    setCommercialSubVariant(
                      e.target.value as CommercialSubVariant
                    )
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
                <label className="block text-sm text-text-secondary mb-1">
                  Etiqueta (opcional)
                </label>
                <Input
                  value={commercialSubLabel}
                  onChange={(e) => setCommercialSubLabel(e.target.value)}
                  placeholder="Ej: coworking, clínica de especialidades..."
                />
              </div>
            </div>
          )}

          {propertyType === 'land' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Variante rural (campo)
                </label>
                <select
                  value={fieldVariant}
                  onChange={(e) =>
                    setFieldVariant(e.target.value as FieldVariant)
                  }
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
                <label className="block text-sm text-text-secondary mb-1">
                  Hectáreas
                </label>
                <Input
                  type="number"
                  min={1}
                  value={hectares}
                  onChange={(e) => setHectares(e.target.value)}
                  required
                />
              </div>

              {fieldVariant === 'agricola' || fieldVariant === 'mixto' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Cultivo principal
                    </label>
                    <Input
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      placeholder="Ej: soja, trigo, maíz..."
                      required={fieldVariant === 'agricola'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Riego (opcional)
                    </label>
                    <Input
                      value={irrigation}
                      onChange={(e) => setIrrigation(e.target.value)}
                      placeholder="Ej: riego por pivote..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Tipo de suelo (opcional)
                    </label>
                    <Input
                      value={soilType}
                      onChange={(e) => setSoilType(e.target.value)}
                      placeholder="Ej: franco-arenoso..."
                    />
                  </div>
                </div>
              ) : null}

              {fieldVariant === 'ganadero' || fieldVariant === 'mixto' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Especie
                    </label>
                    <Input
                      value={animalSpecies}
                      onChange={(e) => setAnimalSpecies(e.target.value)}
                      placeholder="Ej: bovinos, ovinos, porcinos..."
                      required={fieldVariant === 'ganadero'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Cantidad de cabezas
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={headCount}
                      onChange={(e) => setHeadCount(e.target.value)}
                      required={fieldVariant === 'ganadero'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Sistema de cría (opcional)
                    </label>
                    <Input
                      value={housingSystem}
                      onChange={(e) => setHousingSystem(e.target.value)}
                      placeholder="Ej: cría, engorde..."
                    />
                  </div>
                </div>
              ) : null}

              {fieldVariant === 'forestal' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Especie de árboles
                    </label>
                    <Input
                      value={treeSpecies}
                      onChange={(e) => setTreeSpecies(e.target.value)}
                      placeholder="Ej: eucalipto, pino..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Edad (años) (opcional)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={ageYears}
                      onChange={(e) => setAgeYears(e.target.value)}
                      placeholder="Ej: 3"
                    />
                  </div>
                </div>
              ) : null}

              {fieldVariant === 'otro' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Detalles
                    </label>
                    <textarea
                      className="w-full min-h-24 rounded-md border border-border bg-surface-primary p-3 text-sm"
                      value={otherDescription}
                      onChange={(e) => setOtherDescription(e.target.value)}
                      placeholder="Contanos qué particularidad tiene el campo..."
                      required
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? 'Guardando...'
                : 'Guardar borrador y continuar'}
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
