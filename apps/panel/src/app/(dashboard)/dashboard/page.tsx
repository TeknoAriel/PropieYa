'use client'

import {
  Button,
  Card,
  Building2,
  FileEdit,
  Clock,
  Ban,
  Users,
  ArrowRight,
  Plus,
  TrendingUp,
} from '@propieya/ui'
import Link from 'next/link'

import { portalStatsTerminalLabel } from '@propieya/shared'

import { trpc } from '@/lib/trpc'

function relativeTime(iso: Date | string) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'Hace instantes'
  if (sec < 3600) return `Hace ${Math.floor(sec / 60)} min`
  if (sec < 86400) return `Hace ${Math.floor(sec / 3600)} h`
  return `Hace ${Math.floor(sec / 86400)} d`
}

export default function DashboardPage() {
  const { data: me } = trpc.auth.me.useQuery()
  const canPlatformAnalytics = Boolean(
    me?.permissions?.includes('analytics:platform')
  )

  const { data: stats, isLoading: statsLoading } =
    trpc.listing.dashboardStats.useQuery()
  const { data: leadsData, isLoading: leadsLoading } =
    trpc.lead.listByPublisher.useQuery({ limit: 5 })
  const {
    data: portalActivity,
    isLoading: activityLoading,
    isError: activityError,
  } = trpc.stats.portalActivityByTerminal.useQuery({ days: 7 })
  const {
    data: platformActivity,
    isLoading: platformActivityLoading,
    isError: platformActivityError,
  } = trpc.stats.platformPortalActivityByTerminal.useQuery(
    { days: 7 },
    { enabled: canPlatformAnalytics }
  )

  const by = stats?.byStatus ?? {}
  const cards = [
    {
      label: 'Activos',
      value: by.active ?? 0,
    icon: Building2,
      hint: 'Publicados en el portal',
    },
    {
      label: 'Borradores',
      value: by.draft ?? 0,
      icon: FileEdit,
      hint: 'Aún no publicados',
    },
    {
      label: 'Por vencer',
      value: by.expiring_soon ?? 0,
      icon: Clock,
      hint: 'Renová la vigencia pronto',
    },
    {
      label: 'Suspendidos',
      value: by.suspended ?? 0,
      icon: Ban,
      hint: 'Requieren acción',
    },
  ]

  const recentLeads = leadsData?.items ?? []

  const showPublisherOnboarding =
    !statsLoading && stats && stats.totalListings === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary">
          Resumen de tus avisos y leads
          {stats && !statsLoading ? (
            <span className="text-text-tertiary">
              {' '}
              · {stats.totalListings} propiedades en total
            </span>
          ) : null}
        </p>
      </div>

      {showPublisherOnboarding ? (
        <Card className="border-brand-primary/30 bg-brand-primary/5 p-5">
          <h2 className="font-semibold text-text-primary">
            Empezá a publicar en Propieya
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
            <li>Creá un borrador con título, descripción, precio y superficie.</li>
            <li>En la ficha, sumá fotos y completá la ubicación si querés mostrarla.</li>
            <li>Cuando esté listo, pulsá Publicar para que aparezca en el portal.</li>
          </ol>
          <Button asChild className="mt-4">
            <Link href="/propiedades/nueva">
              <Plus className="h-4 w-4 mr-2" />
              Nueva propiedad
            </Link>
          </Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? cards.map((c) => (
              <Card key={c.label} className="p-4 animate-pulse">
                <div className="h-16 bg-surface-secondary rounded" />
              </Card>
            ))
          : cards.map((c) => (
              <Card key={c.label} className="p-4">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-brand-primary/10">
                    <c.icon className="h-5 w-5 text-brand-primary" />
              </div>
            </div>
            <div className="mt-3">
                  <p className="text-2xl font-bold text-text-primary">
                    {c.value}
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {c.label}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">{c.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-text-primary mb-1">
          Actividad del portal (últimos 7 días)
        </h2>
        <p className="text-xs text-text-tertiary mb-4">
          Eventos registrados por tipo. Las vistas acumuladas en fichas suman el
          contador de cada aviso (todas las cargas históricas).
        </p>
        {activityError ? (
          <p className="text-sm text-text-secondary">
            No se pudieron cargar los eventos. Si el despliegue es reciente,
            aplicá la tabla{' '}
            <code className="text-xs bg-surface-secondary px-1 rounded">
              portal_stats_events
            </code>{' '}
            en la base (<code className="text-xs">pnpm db:push</code> o SQL en
            docs).
          </p>
        ) : activityLoading ? (
          <div className="h-24 rounded-lg bg-surface-secondary animate-pulse" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-2 text-sm">
              <span className="text-text-secondary">Vistas en fichas (suma)</span>
              <span className="text-xl font-bold text-text-primary tabular-nums">
                {portalActivity?.totalListingViews ?? 0}
              </span>
            </div>
            {portalActivity && portalActivity.terminals.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Todavía no hay eventos en esta ventana. Cuando usuarios visiten
                fichas públicas de tus avisos, verás filas acá.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {portalActivity?.terminals.map((row) => (
                  <li
                    key={row.terminalId}
                    className="flex justify-between gap-4 py-2 border-b border-border last:border-0"
                  >
                    <span className="text-text-primary">
                      {portalStatsTerminalLabel(row.terminalId)}
                    </span>
                    <span className="font-medium text-text-primary tabular-nums shrink-0">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {canPlatformAnalytics ? (
        <Card className="p-4 border-brand-primary/20">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-brand-primary/10">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">
                Operación del portal (plataforma)
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                Agregados globales en los últimos 7 días; visible solo con
                permiso de analítica de plataforma.
              </p>
            </div>
          </div>
          {platformActivityError ? (
            <p className="text-sm text-text-secondary">
              No se pudieron cargar las métricas globales.
            </p>
          ) : platformActivityLoading ? (
            <div className="h-24 rounded-lg bg-surface-secondary animate-pulse" />
          ) : platformActivity ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <span className="text-text-secondary">Eventos totales</span>
                  <p className="text-xl font-bold text-text-primary tabular-nums">
                    {platformActivity.totalEvents}
                  </p>
                </div>
                <div>
                  <span className="text-text-secondary">
                    Vistas en fichas (todo el catálogo)
                  </span>
                  <p className="text-xl font-bold text-text-primary tabular-nums">
                    {platformActivity.totalListingViewsAll}
                  </p>
                </div>
              </div>
              {platformActivity.lastIngestRun ? (
                <div className="rounded-lg bg-surface-secondary p-3 text-xs text-text-secondary">
                  <p className="font-medium text-text-primary text-sm mb-1">
                    Última ingesta (pipeline)
                  </p>
                  <p className="tabular-nums">
                    {relativeTime(platformActivity.lastIngestRun.at)} · feeds{' '}
                    {platformActivity.lastIngestRun.feedSources} · nuevos{' '}
                    {platformActivity.lastIngestRun.imported} · actualiz.{' '}
                    {platformActivity.lastIngestRun.updated} · publicados{' '}
                    {platformActivity.lastIngestRun.publishedCount}
                    {platformActivity.lastIngestRun.searchIndexDeferred
                      ? ' · ES diferido'
                      : ''}
                  </p>
                </div>
              ) : (
                <p className="text-text-secondary text-xs">
                  Aún no hay eventos de ingesta registrados.
                </p>
              )}
              {platformActivity.terminals.length > 0 ? (
                <ul className="space-y-2 border-t border-border pt-3">
                  {platformActivity.terminals.map((row) => (
                    <li
                      key={row.terminalId}
                      className="flex justify-between gap-4 py-1 border-b border-border last:border-0"
                    >
                      <span className="text-text-primary">
                        {portalStatsTerminalLabel(row.terminalId)}
                      </span>
                      <span className="font-medium text-text-primary tabular-nums shrink-0">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-secondary text-xs pt-2">
                  Sin eventos en esta ventana.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Últimos leads</h2>
            <Link
              href="/leads"
              className="text-sm text-brand-primary hover:underline inline-flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {leadsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                  className="h-14 rounded-lg bg-surface-secondary animate-pulse"
                />
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Todavía no recibiste consultas. Cuando publiques avisos, los leads
              aparecerán acá.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary hover:bg-surface-elevated transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-brand-primary" />
                </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {lead.contactName}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {lead.listingTitle} · {relativeTime(lead.createdAt)}
                      </p>
                </div>
                    <ArrowRight className="h-4 w-4 text-text-tertiary shrink-0" />
                  </Link>
                </li>
            ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-text-primary mb-4">
            Otros estados
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-secondary">En revisión</dt>
              <dd className="font-medium text-text-primary">
                {by.pending_review ?? 0}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-secondary">Archivados</dt>
              <dd className="font-medium text-text-primary">
                {by.archived ?? 0}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <dt className="text-text-secondary">Vendido / alquilado</dt>
              <dd className="font-medium text-text-primary">{by.sold ?? 0}</dd>
                </div>
            <div className="flex justify-between py-2">
              <dt className="text-text-secondary">Dados de baja</dt>
              <dd className="font-medium text-text-primary">
                {by.withdrawn ?? 0}
              </dd>
              </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href="/propiedades"
              className="text-sm text-brand-primary hover:underline inline-flex items-center gap-1"
            >
              Gestionar propiedades
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
