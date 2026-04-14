'use client'

import { useState } from 'react'
import Link from 'next/link'

import { Card, Badge, Mail, Calendar, Building2, Skeleton, Button } from '@propieya/ui'

import { LeadCreditsPurchaseDialog } from '@/components/lead-credits-purchase-dialog'
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function portalWebBase() {
  return (process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://propieyaweb.vercel.app').replace(
    /\/$/,
    ''
  )
}

export default function LeadsPage() {
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const { data, isLoading } = trpc.lead.listByPublisher.useQuery()
  const { data: pendingSummary } = trpc.lead.publisherPendingSummary.useQuery()
  const { data: monet } = trpc.organization.leadMonetizationSummary.useQuery(undefined, {
    retry: false,
  })
  const trackMonetization = trpc.lead.trackMonetizationEvent.useMutation()

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
  const pendingN = pendingSummary?.pendingCount ?? 0
  const simulatedAllowed = monet?.simulatedCreditPurchaseAllowed ?? false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
          <p className="text-text-secondary">
            Consultas recibidas por tus propiedades ({data?.total ?? 0} en total)
          </p>
          {pendingN > 0 ? (
            <p
              className="text-sm font-medium text-amber-800 dark:text-amber-200 mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 inline-block"
              role="status"
            >
              Tenés {pendingN} {pendingN === 1 ? 'lead esperando' : 'leads esperando'} activación.
              Cada uno puede estar contactando otras propiedades: activalos pronto.
            </p>
          ) : null}
          {monet ? (
            <p className="text-sm text-text-tertiary mt-2">
              Plan: <span className="font-medium text-text-secondary">{monet.planType}</span>
              {monet.planType === 'free' ? (
                <>
                  {' '}
                  · Créditos:{' '}
                  <span className="font-medium text-text-secondary">
                    {monet.leadCreditsBalance}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {monet?.planType === 'free' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void trackMonetization.mutate({ event: 'purchase_modal_open' })
                setPurchaseOpen(true)
              }}
            >
              Comprar créditos
            </Button>
            <Button type="button" variant="outline" asChild>
              <a
                href={`${portalWebBase()}/planes`}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  void trackMonetization.mutate({ event: 'plans_link_click' })
                }
              >
                Ver planes
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {monet?.planType === 'free' ? (
        <Card className="p-4 border-border">
          <h2 className="font-semibold text-text-primary mb-3">Free vs planes de pago</h2>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-lg bg-surface-secondary p-3 space-y-2">
              <div className="font-medium text-text-primary">Plan gratuito</div>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li>Leads nuevos quedan pendientes hasta que uses un crédito</li>
                <li>Sin boost en el ranking del portal</li>
                <li>Ideal para publicar pocos avisos y probar</li>
              </ul>
            </div>
            <div className="rounded-lg bg-brand-primary/5 border border-brand-primary/20 p-3 space-y-2">
              <div className="font-medium text-text-primary">Planes premium</div>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li>Activación automática de leads al ingresar</li>
                <li>Contacto y mensaje al instante, sin fricción</li>
                <li>Boost leve en búsqueda y prioridad de visibilidad</li>
              </ul>
              <a
                href={`${portalWebBase()}/planes`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-brand-primary font-medium hover:underline"
                onClick={() => void trackMonetization.mutate({ event: 'plans_link_click' })}
              >
                Pasarme a un plan →
              </a>
            </div>
          </div>
        </Card>
      ) : null}

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
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {lead.contactName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                          <Building2 className="h-4 w-4" />
                          {lead.listingTitle}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {lead.isRecentLead && lead.accessStatus === 'pending' ? (
                          <Badge variant="default" className="bg-amber-600 hover:bg-amber-600">
                            Reciente
                          </Badge>
                        ) : null}
                        <Badge variant={STATUS_MAP[lead.status]?.variant ?? 'secondary'}>
                          {STATUS_MAP[lead.status]?.label ?? lead.status}
                        </Badge>
                        <Badge variant={ACCESS_MAP[lead.accessStatus]?.variant ?? 'outline'}>
                          {ACCESS_MAP[lead.accessStatus]?.label ?? lead.accessStatus}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary bg-surface-secondary p-3 rounded-lg line-clamp-2">
                      {lead.contactReveal
                        ? `"${lead.message}"`
                        : 'Activá el lead para ver el mensaje y el contacto.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {lead.contactReveal && lead.contactEmail ? (
                        <a
                          href={`mailto:${lead.contactEmail}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary"
                        >
                          <Mail className="h-4 w-4" />
                          {lead.contactEmail}
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-text-tertiary">
                          <Mail className="h-4 w-4" />
                          Correo oculto hasta activar
                        </span>
                      )}
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

      <LeadCreditsPurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        simulatedAllowed={simulatedAllowed}
        onDismissTrack={() =>
          void trackMonetization.mutate({ event: 'purchase_modal_dismiss' })
        }
      />
    </div>
  )
}
