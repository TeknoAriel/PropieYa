'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button, Card, Input } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

export default function NuevaPropiedadPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [surface, setSurface] = useState('')
  const [error, setError] = useState('')

  const createMutation = trpc.listing.create.useMutation({
    onSuccess: () => {
      router.push('/propiedades')
    },
    onError: (err) => {
      setError(err.message || 'No se pudo crear la propiedad')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    createMutation.mutate({
      propertyType: 'apartment',
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
        bedrooms: 1,
        bathrooms: 1,
        toilettes: 0,
        garages: 0,
        total: 2,
      },
      features: {
        floor: null,
        totalFloors: null,
        orientation: null,
        disposition: null,
        age: null,
        amenities: [],
        extras: {},
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Nueva propiedad</h1>
        <p className="text-text-secondary">Carga inicial simple para el MVP.</p>
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

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Guardando...' : 'Crear propiedad'}
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
