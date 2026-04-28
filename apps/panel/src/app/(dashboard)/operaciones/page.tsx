'use client'

import Link from 'next/link'

import { Badge, Button, Card } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin registro'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Sin registro'
  return d.toLocaleString('es-AR')
}

function statusVariant(ok: boolean): 'default' | 'secondary' | 'error' {
  if (ok) return 'default'
  return 'error'
}

export default function OperacionesPage() {
  const health = trpc.stats.operationsHealthOverview.useQuery(undefined, { retry: false })

  if (health.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Operaciones e integraciones</h1>
        <p className="text-text-secondary">Cargando salud operativa…</p>
      </div>
    )
  }

  if (health.isError) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-text-primary">Operaciones e integraciones</h1>
        <p className="mt-2 text-sm text-text-secondary">
          No pudimos cargar el resumen operativo. Verificá permisos de analítica de plataforma.
        </p>
      </Card>
    )
  }

  const data = health.data
  const hasOperationalAlerts = (data?.alerts.length ?? 0) > 0
  const webhookHealthy =
    (data?.integrations.kitepropPropertiesWebhook.byStatus.error ?? 0) === 0 &&
    Boolean(data?.integrations.kitepropPropertiesWebhook.lastActivityAt)
  const leadsSyncHealthy = (data?.integrations.leadsSync.syncError ?? 0) < 10
  const ingestHealthy = Boolean(data?.integrations.ingest.lastRunAt)
  const auditHealthy = Boolean(data?.integrations.inventoryAudit.lastRunAt)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Operaciones e integraciones</h1>
        <p className="text-text-secondary">
          Estado de inventario, webhooks, sincronización de leads y jobs críticos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Inventario activo</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{data?.inventory.active ?? 0}</p>
          <p className="mt-1 text-xs text-text-tertiary">Total: {data?.inventory.total ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Withdrawn / rejected / suspended</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {(data?.inventory.withdrawn ?? 0) + (data?.inventory.rejected ?? 0) + (data?.inventory.suspended ?? 0)}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {data?.inventory.withdrawn ?? 0} / {data?.inventory.rejected ?? 0} / {data?.inventory.suspended ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Leads con sync error</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{data?.integrations.leadsSync.syncError ?? 0}</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Pending activation: {data?.integrations.leadsSync.pendingActivation ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Último audit inventario</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            {data?.latestInventoryAudit?.snapshotDateUtc ?? 'Sin snapshot'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Feed count: {data?.latestInventoryAudit?.feedCount ?? 'n/d'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Integraciones críticas</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-primary">KiteProp properties webhook</p>
              <Badge variant={statusVariant(webhookHealthy)}>
                {webhookHealthy ? 'Operativo' : 'Degradado'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Última actividad: {formatDateTime(data?.integrations.kitepropPropertiesWebhook.lastActivityAt)}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              pending: {data?.integrations.kitepropPropertiesWebhook.byStatus.pending ?? 0} · sent:{' '}
              {data?.integrations.kitepropPropertiesWebhook.byStatus.sent ?? 0} · error:{' '}
              {data?.integrations.kitepropPropertiesWebhook.byStatus.error ?? 0}
            </p>
            <p className="mt-2 text-xs text-text-tertiary">
              {data?.integrations.kitepropPropertiesWebhook.lastError?.message
                ? `Último error: ${data.integrations.kitepropPropertiesWebhook.lastError.message}`
                : 'Sin errores recientes registrados.'}
            </p>
          </div>

          <div className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-primary">Sync de leads a KiteProp</p>
              <Badge variant={statusVariant(leadsSyncHealthy)}>
                {leadsSyncHealthy ? 'Operativo' : 'Revisar'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Leads ventana: {data?.integrations.leadsSync.leadsInWindow ?? 0}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Sync error: {data?.integrations.leadsSync.syncError ?? 0} · Pending activation:{' '}
              {data?.integrations.leadsSync.pendingActivation ?? 0}
            </p>
            <p className="mt-2 text-xs text-text-tertiary">
              Último lead: {formatDateTime(data?.integrations.leadsSync.lastLeadAt)}
            </p>
          </div>

          <div className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-primary">Ingesta de inventario/feed</p>
              <Badge variant={statusVariant(ingestHealthy)}>
                {ingestHealthy ? 'Operativo' : 'Sin registro reciente'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Última ejecución: {formatDateTime(data?.integrations.ingest.lastRunAt)}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              imported: {data?.integrations.ingest.imported ?? 0} · updated: {data?.integrations.ingest.updated ?? 0}{' '}
              · withdrawn: {data?.integrations.ingest.withdrawn ?? 0}
            </p>
            <p className="mt-2 text-xs text-text-tertiary">
              Errores de flush webhook: {data?.integrations.ingest.lifecycleWebhookErrors ?? 0}
            </p>
          </div>

          <div className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-primary">Auditoría diaria de inventario</p>
              <Badge variant={statusVariant(auditHealthy)}>
                {auditHealthy ? 'Operativo' : 'Sin registro reciente'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Última ejecución: {formatDateTime(data?.integrations.inventoryAudit.lastRunAt)}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Alertas reportadas por auditoría: {data?.integrations.inventoryAudit.alertCount ?? 0}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Alertas operativas</h2>
        {hasOperationalAlerts ? (
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {data?.alerts.map((alert) => (
              <li key={alert} className="rounded-md border border-semantic-error/30 bg-semantic-error/10 px-3 py-2">
                {alert}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">Sin señales críticas activas en esta ventana.</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Acciones rápidas</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/propiedades">Inventario / propiedades</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/leads">Monitoreo de leads</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/upgrades">Upgrades</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/clientes">Clientes/publicadores</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
