'use client'

import Link from 'next/link'

import { Card, Badge, Mail, Calendar, Building2, Skeleton } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  new: { label: 'Nuevo', variant: 'default' },
  contacted: { label: 'Contactado', variant: 'secondary' },
  qualified: { label: 'Calificado', variant: 'outline' },
}

function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeadsPage() {
  const { data, isLoading } = trpc.lead.listByPublisher.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
          <p className="text-text-secondary">Consultas recibidas por tus propiedades</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
        <p className="text-text-secondary">
          Consultas recibidas por tus propiedades ({data?.total ?? 0} en total)
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          <p>Aún no tenés consultas por tus propiedades.</p>
          <p className="text-sm mt-2">
            Cuando alguien use el formulario de contacto en un aviso tuyo, aparecerá acá.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <Card className="p-4 hover:border-border-focus transition-colors cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {lead.contactName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                          <Building2 className="h-4 w-4" />
                          {lead.listingTitle}
                        </div>
                      </div>
                      <Badge variant={STATUS_MAP[lead.status]?.variant ?? 'secondary'}>
                        {STATUS_MAP[lead.status]?.label ?? lead.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary bg-surface-secondary p-3 rounded-lg line-clamp-2">
                      "{lead.message}"
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <a
                        href={`mailto:${lead.contactEmail}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary"
                      >
                        <Mail className="h-4 w-4" />
                        {lead.contactEmail}
                      </a>
                      <span className="flex items-center gap-1.5 text-text-tertiary">
                        <Calendar className="h-4 w-4" />
                        {formatDate(lead.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
