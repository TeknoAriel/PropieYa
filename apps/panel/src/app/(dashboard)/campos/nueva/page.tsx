'use client'

import { useRouter } from 'next/navigation'

import { Button, Card, Input } from '@propieya/ui'
import { useMemo, useState } from 'react'

import { trpc } from '@/lib/trpc'

function normalizeNullable(s: string): string | null {
  const v = s.trim()
  return v.length ? v : null
}

export default function NuevoCampoPage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [surface, setSurface] = useState('')
  const [hectares, setHectares] = useState('')

  const [fieldVariant, setFieldVariant] = useState<
    'agricola' | 'ganadero' | 'mixto' | 'forestal' | 'otro'
  >('agricola')

  // Agrícola
  const [cropType, setCropType] = useState('')
  const [irrigation, setIrrigation] = useState('')
  const [soilType, setSoilType] = useState('')

  // Ganadero
  const [animalSpecies, setAnimalSpecies] = useState('')
  const [headCount, setHeadCount] = useState('')
  const [housingSystem, setHousingSystem] = useState('')

  // Forestal
  const [treeSpecies, setTreeSpecies] = useState('')
  const [ageYears, setAgeYears] = useState('')

  // Otro
  const [otherDescription, setOtherDescription] = useState('')

  const [error, setError] = useState('')

  const createMutation = trpc.listing.create.useMutation({
    onSuccess: () => {
      router.push('/campos')
    },
    onError: (err) => {
      setError(err.message || 'No se pudo crear el campo')
    },
  })

  const field = useMemo(() => {
    const h = Number(hectares)
    switch (fieldVariant) {
      case 'agricola':
        return {
          variant: 'agricola' as const,
          hectares: h,
          cropType: cropType.trim(),
          irrigation: normalizeNullable(irrigation),
          soilType: normalizeNullable(soilType),
        }
      case 'ganadero':
        return {
          variant: 'ganadero' as const,
          hectares: h,
          animalSpecies: animalSpecies.trim(),
          headCount: Number(headCount),
          housingSystem: normalizeNullable(housingSystem),
        }
      case 'mixto':
        return {
          variant: 'mixto' as const,
          hectares: h,
          cropType: cropType.trim(),
          animalSpecies: animalSpecies.trim(),
          headCount: Number(headCount),
        }
      case 'forestal':
        return {
          variant: 'forestal' as const,
          hectares: h,
          treeSpecies: treeSpecies.trim(),
          ageYears: ageYears.trim() ? Number(ageYears) : null,
        }
      case 'otro':
        return {
          variant: 'otro' as const,
          description: otherDescription.trim(),
        }
      default:
        return null
    }
  }, [
    hectares,
    fieldVariant,
    cropType,
    irrigation,
    soilType,
    animalSpecies,
    headCount,
    housingSystem,
    treeSpecies,
    ageYears,
    otherDescription,
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    createMutation.mutate({
      propertyType: 'land',
      operationType: 'sale',
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
        bedrooms: null,
        bathrooms: null,
        toilettes: null,
        garages: null,
        total: null,
      },
      features: {
        floor: null,
        totalFloors: null,
        orientation: null,
        disposition: null,
        age: null,
        amenities: [],
        extras: {},
        field: field,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Nuevo campo</h1>
        <p className="text-text-secondary">
          Publicá un campo con su variante rural (agrícola/ganadero/etc.)
        </p>
      </div>

      <Card className="p-6">
        {error ? (
          <div className="mb-4 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Campo agrícola en zona núcleo"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Descripción
            </label>
            <textarea
              className="w-full min-h-32 rounded-md border border-border bg-surface-primary p-3 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contanos detalles del campo..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Precio (USD)
              </label>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Superficie total (m2)
              </label>
              <Input
                type="number"
                min={1}
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Variante rural
            </label>
            <select
              value={fieldVariant}
              onChange={(e) =>
                setFieldVariant(
                  e.target.value as 'agricola' | 'ganadero' | 'mixto' | 'forestal' | 'otro'
                )
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Ej: riego por pivote, sin riego..."
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Tipo de suelo (opcional)
                </label>
                <Input
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  placeholder="Ej: franco-arenoso, arcilloso..."
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
                  placeholder="Ej: cría, engorde, mixto..."
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

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Publicar campo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/campos')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

