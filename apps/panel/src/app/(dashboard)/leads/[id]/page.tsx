'use client'

import { useParams } from 'next/navigation'

import { ArrowLeft, Building2, Calendar, Mail, MessageSquare, Phone } from 'lucide-react'
import Link from 'next/link'

import { Badge, Button, Card, Skeleton } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  new: { label: 'Nuevo', variant: 'default' },
  contacted: { label: 'Contactado', variant: 'secondary' },
  qualified: { label: 'Calificado', variant: 'outline' },
}

const ACCESS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pendiente de activación', variant: 'outline' },
  activated: { label: 'Activado', variant: 'secondary' },
  managed: { label: 'Gestionado', variant: 'default' },
}

function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const utils = trpc.useUtils()
  const { data: lead, isLoading } = trpc.lead.getById.useQuery(
    { id: id ?? '' },
    { enabled: !!id }
  )

  const activate = trpc.lead.activate.useMutation({
    onSuccess: () => {
      void utils.lead.getById.invalidate({ id: id ?? '' })
      void utils.lead.listByPublisher.invalidate()
      void utils.organization.leadMonetizationSummary.invalidate()
    },
  })

  const markManaged = trpc.lead.markManaged.useMutation({
    onSuccess: () => {
      void utils.lead.getById.invalidate({ id: id ?? '' })
      void utils.lead.listByPublisher.invalidate()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <Button variant="outline" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a leads
          </Link>
        </Button>
        <Card className="p-8">
          <p className="text-text-secondary">Lead no encontrado o sin acceso.</p>
        </Card>
      </div>
    )
  }

  const activateError =
    activate.error?.message ??
    (activate.error?.data?.zodError ? 'Datos inválidos' : null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{lead.contactName}</h1>
          <p className="text-text-secondary mt-1">Consulta por {lead.listingTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_MAP[lead.status]?.variant ?? 'secondary'}>
            {STATUS_MAP[lead.status]?.label ?? lead.status}
          </Badge>
          <Badge variant={ACCESS_MAP[lead.accessStatus]?.variant ?? 'outline'}>
            {ACCESS_MAP[lead.accessStatus]?.label ?? lead.accessStatus}
          </Badge>
        </div>
      </div>

      {lead.accessStatus === 'pending' ? (
        <Card className="p-4 border-border bg-surface-secondary">
          <p className="text-sm text-text-secondary mb-3">
            Los datos de contacto y el mensaje están ocultos hasta que actives el lead. Con plan de
            pago se activan automáticamente al ingresar; con plan gratuito podés usar un crédito de
            activación.
          </p>
          <Button
            type="button"
            disabled={activate.isPending || !id}
            onClick={() => id && activate.mutate({ id })}
          >
            {activate.isPending ? 'Activando…' : 'Activar lead'}
          </Button>
          {activateError ? (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {activateError}
            </p>
          ) : null}
        </Card>
      ) : null}

      {lead.accessStatus === 'activated' ? (
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={markManaged.isPending || !id}
            onClick={() => id && markManaged.mutate({ id })}
          >
            {markManaged.isPending ? 'Guardando…' : 'Marcar como gestionado'}
          </Button>
          {markManaged.error?.message ? (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {markManaged.error.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contacto</h2>
          <div className="space-y-3">
            {lead.contactReveal && lead.contactEmail ? (
              <a
                href={`mailto:${lead.contactEmail}`}
                className="flex items-center gap-2 text-text-secondary hover:text-brand-primary"
              >
                <Mail className="h-4 w-4" />
                {lead.contactEmail}
              </a>
            ) : (
              <p className="flex items-center gap-2 text-text-tertiary text-sm">
                <Mail className="h-4 w-4" />
                Correo disponible tras activar el lead
              </p>
            )}
            {lead.contactReveal && lead.contactPhone ? (
              <a
                href={`tel:${lead.contactPhone}`}
                className="flex items-center gap-2 text-text-secondary hover:text-brand-primary"
              >
                <Phone className="h-4 w-4" />
                {lead.contactPhone}
              </a>
            ) : null}
            <span className="flex items-center gap-2 text-text-tertiary">
              <Calendar className="h-4 w-4" />
              {formatDate(lead.createdAt)}
            </span>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Propiedad</h2>
          <Link
            href={`/propiedades/${lead.listingId}`}
            className="flex items-center gap-2 text-text-secondary hover:text-brand-primary"
          >
            <Building2 className="h-4 w-4" />
            {lead.listingTitle}
          </Link>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Mensaje
        </h2>
        {lead.contactReveal ? (
          <p className="text-text-secondary whitespace-pre-wrap bg-surface-secondary p-4 rounded-lg">
            {lead.message}
          </p>
        ) : (
          <p className="text-text-tertiary text-sm bg-surface-secondary p-4 rounded-lg">
            El mensaje completo se muestra cuando el lead está activado.
          </p>
        )}
      </Card>
    </div>
  )
}
