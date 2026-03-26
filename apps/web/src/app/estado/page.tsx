import Link from 'next/link'

import { Card } from '@propieya/ui'

/**
 * Página pública de estado: pendientes conocidos y bloqueos documentados.
 * Útil cuando el deploy está OK; si el sitio entero devuelve 404 de Vercel,
 * esta ruta no cargará hasta corregir el proyecto en Vercel.
 */
export default function EstadoPage() {
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
        </ul>
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
          Completados hasta Sprint 9 (perfil de demanda + matching explicado).
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
