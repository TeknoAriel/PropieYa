'use client'

import { useParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import { Button, Card } from '@propieya/ui'
import Link from 'next/link'

import { trpc } from '@/lib/trpc'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function EditarPropiedadPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

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
      setUploadError(err.message ?? 'Error al guardar la imagen')
      setUploading(false)
    },
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

        if (!res.ok) {
          throw new Error(`Error al subir: ${res.status}`)
        }

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
    [id, current?.primaryImageUrl, presignMutation, addMediaMutation, utils]
  )

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {current.title}
          </h1>
          <p className="text-text-secondary mt-1">{current.address?.city}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/propiedades">Volver</Link>
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Imágenes
        </h2>
        <div className="flex flex-col gap-4">
          {current.primaryImageUrl ? (
            <div className="relative w-48 h-32 rounded overflow-hidden bg-surface-secondary">
              <img
                src={current.primaryImageUrl}
                alt={current.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <p className="text-text-tertiary text-sm">
              Aún no hay imágenes. Subí la primera foto.
            </p>
          )}
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
          {uploadError ? (
            <p className="text-destructive text-sm">{uploadError}</p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
