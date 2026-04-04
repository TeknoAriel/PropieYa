'use client'

import { useEffect, useState } from 'react'

import { Badge } from '@propieya/ui'

/**
 * Si /api/health está degradado (p. ej. sin DATABASE_URL en Vercel), mostramos un aviso claro.
 * Evita la sensación de "portal vacío" o "código perdido" cuando el fallo es de configuración.
 */
export function ProductionStatusBanner() {
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = (await res.json()) as {
          status?: string
          checks?: { database?: { status?: string; error?: string } }
        }
        if (cancelled) return
        if (data.status === 'healthy') {
          setMsg(null)
          return
        }
        const dbErr = data.checks?.database?.error ?? ''
        const isLocal =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1')
        if (dbErr.includes('DATABASE_URL')) {
          setMsg(
            isLocal
              ? 'Falta DATABASE_URL para el servidor Next.js. En local, creá apps/web/.env o .env.local con la misma cadena que en la raíz del repo (ver .env.example) o la URL de Neon. Reiniciá el dev server.'
              : 'Falta la variable DATABASE_URL en el proyecto Vercel (web). Sin base de datos no hay propiedades en listados ni búsqueda. El código del producto está desplegado; falta copiar las variables de entorno de producción (Neon u origen que uses).'
          )
        } else if (data.checks?.database?.status === 'error') {
          const hint = dbErr.trim()
            ? ` Detalle: ${dbErr.trim().slice(0, 280)}${dbErr.length > 280 ? '…' : ''}`
            : ''
          setMsg(
            isLocal
              ? `No hay conexión a PostgreSQL.${hint} Si usás Docker del repo: en la raíz ejecutá «docker compose up -d postgres» (puerto 5433). Si usás Neon, pegá la connection string en apps/web/.env como DATABASE_URL=… y reiniciá el dev server.`
              : `No hay conexión a la base de datos.${hint} Revisá DATABASE_URL en Vercel y que Neon (o tu proveedor) acepte conexiones desde el entorno de deploy.`
          )
        } else {
          setMsg(
            'El servicio está degradado. Algunas funciones pueden no estar disponibles.'
          )
        }
      } catch {
        if (!cancelled) setMsg(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!msg) return null

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-2 border-b border-amber-400/60 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <Badge variant="secondary" className="shrink-0">
        Configuración
      </Badge>
      <span className="max-w-4xl">{msg}</span>
    </div>
  )
}
