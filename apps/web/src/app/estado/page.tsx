import Link from 'next/link'

import { Card } from '@propieya/ui'

import { getPublicInventoryStats } from '@/lib/inventory-stats'

/**
 * Página pública de estado: pendientes conocidos y bloqueos documentados.
 * Útil cuando el deploy está OK; si el sitio entero devuelve 404 de Vercel,
 * esta ruta no cargará hasta corregir el proyecto en Vercel.
 */
export default async function EstadoPage() {
  let inventory = null as Awaited<
    ReturnType<typeof getPublicInventoryStats>
  > | null
  let inventoryError: string | null = null
  try {
    inventory = await getPublicInventoryStats()
  } catch (e) {
    inventoryError =
      e instanceof Error ? e.message : 'No se pudieron leer totales de la base'
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">
          Estado y despliegue
        </h1>
        <p className="mt-2 text-text-secondary">
          Resumen operativo para pruebas en navegador. Fuente detallada en el
          repo:{' '}
          <code className="text-sm bg-surface-secondary px-1 rounded">
            docs/REGISTRO-BLOQUEOS.md
          </code>
          .
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">URL canónica</h2>
        <p className="text-text-secondary text-sm">
          Portal web:{' '}
          <a
            href="https://propieyaweb.vercel.app"
            className="text-brand-primary hover:underline"
          >
            https://propieyaweb.vercel.app
          </a>{' '}
          (ver{' '}
          <code className="text-xs">docs/CANONICAL-URLS.md</code>).
        </p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Comprobar qué está desplegado
        </h2>
        <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
          <li>
            <Link href="/api/health" className="text-brand-primary hover:underline">
              /api/health
            </Link>{' '}
            — estado del servicio
          </li>
          <li>
            <Link href="/api/version" className="text-brand-primary hover:underline">
              /api/version
            </Link>{' '}
            — commit desplegado (si Vercel inyecta la variable)
          </li>
          <li>
            <Link
              href="/api/inventory-stats"
              className="text-brand-primary hover:underline"
            >
              /api/inventory-stats
            </Link>{' '}
            — totales de avisos (manual vs import) y referencia al cron de ingest
          </li>
        </ul>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Inventario e ingestión
        </h2>
        {inventoryError ? (
          <p className="text-sm text-semantic-error">{inventoryError}</p>
        ) : inventory ? (
          <dl className="grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
            <div>
              <dt className="font-medium text-text-primary">Total avisos (DB)</dt>
              <dd>{inventory.totalListings}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-primary">Activos</dt>
              <dd>{inventory.activeListings}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-primary">
                Con origen import (<code className="text-xs">source=import</code>)
              </dt>
              <dd>{inventory.listingsFromImportSource}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-primary">
                Activos desde import
              </dt>
              <dd>{inventory.activeListingsFromImport}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-text-primary">
                Con <code className="text-xs">external_id</code> (vinculados a feed)
              </dt>
              <dd>{inventory.listingsWithExternalId}</dd>
            </div>
            <div className="sm:col-span-2 border-t border-border pt-3 mt-1">
              <dt className="font-medium text-text-primary">Feed JSON</dt>
              <dd className="mt-1 break-all">
                {inventory.feedUrlConfigured
                  ? inventory.feedUrlHint
                  : `${inventory.feedUrlHint} Variable opcional: YUMBLIN_JSON_URL.`}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-text-primary">Cron de sync</dt>
              <dd className="mt-1">
                <code className="text-xs bg-surface-secondary px-1 rounded">
                  GET {inventory.cronIngestPath}
                </code>
                <span className="block mt-2 text-text-secondary">
                  {inventory.cronResponseNote}
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-text-primary">
                Webhook ingesta puntual (Kiteprop)
              </dt>
              <dd className="mt-1">
                <code className="text-xs bg-surface-secondary px-1 rounded">
                  POST {inventory.ingestWebhookPath}
                </code>
                <span className="block mt-2 text-text-secondary">
                  {inventory.ingestWebhookNote}
                </span>
              </dd>
            </div>
          </dl>
        ) : null}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Bloqueos y causas externas recientes
        </h2>
        <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
          <li>
            <strong className="text-text-primary">Plan Vercel Hobby:</strong>{' '}
            cuotas de descargas/build pueden bloquear despliegues unas horas.
            Revisar uso en el panel de Vercel; upgrade o esperar reinicio de
            cuota.
          </li>
          <li>
            <strong className="text-text-primary">404 en todo el sitio:</strong>{' '}
            suele ser configuración del proyecto (rama <code>main</code>, Root
            Directory <code>apps/web</code>), no un bug de rutas Next. Ver{' '}
            <code className="text-xs">docs/33-VERCEL-CONFIG-PROYECTO-WEB.md</code>{' '}
            y <code className="text-xs">docs/DEPLOY-PASOS-URIs.md</code>.
          </li>
          <li>
            <strong className="text-text-primary">GitHub Actions:</strong>{' '}
            permisos para crear PR en promote, y reglas de rama en{' '}
            <code>main</code> (status checks). Detalle en{' '}
            <code className="text-xs">REGISTRO-BLOQUEOS.md</code>.
          </li>
        </ul>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Backlog de producto (sprints)
        </h2>
        <p className="text-sm text-text-secondary">
          Completados hasta Sprint 9 (perfil de demanda + resultados explicados).
          Pendientes documentados en{' '}
          <code className="text-xs">docs/24-sprints-y-hitos.md</code>:
        </p>
        <ul className="text-sm text-text-secondary list-decimal list-inside space-y-1">
          <li>Sprint 10: Alertas guardadas</li>
          <li>Sprint 11: Gestión de organización (invitar miembros)</li>
          <li>Sprint 12: Ficha propiedad mejorada (mapa, similares)</li>
        </ul>
      </Card>

      <p className="text-xs text-text-tertiary">
        Actualizado en código: 2026-03-26. Tras cada release, conviene alinear
        este texto con el doc de bloqueos si cambia algo crítico.
      </p>

      <Link
        href="/"
        className="inline-block text-sm text-brand-primary hover:underline"
      >
        ← Volver al inicio
      </Link>
    </div>
  )
}
