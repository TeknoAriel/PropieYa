/**
 * Ray casting (plano, lng/lat) para filtro SQL sin PostGIS.
 * Vértices en orden; el anillo debe ser simple (sin autointersecciones).
 */
import { sql, type AnyColumn, type SQL } from 'drizzle-orm'

export function sqlPointInPolygonLngLat(
  lngCol: AnyColumn,
  latCol: AnyColumn,
  ring: readonly { lng: number; lat: number }[]
): SQL {
  const n = ring.length
  if (n < 3) return sql`false`

  const parts: SQL[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + n - 1) % n
    const xi = ring[i]!.lng
    const yi = ring[i]!.lat
    const xj = ring[j]!.lng
    const yj = ring[j]!.lat
    parts.push(sql`
      CASE WHEN
        ((${yi}::double precision > ${latCol}) IS DISTINCT FROM (${yj}::double precision > ${latCol}))
        AND (${lngCol}::double precision < (${xj}::double precision - ${xi}::double precision) * (${latCol}::double precision - ${yi}::double precision) / NULLIF(${yj}::double precision - ${yi}::double precision, 0) + ${xi}::double precision)
      THEN 1 ELSE 0 END
    `)
  }
  return sql`(${sql.join(parts, sql` + `)}) % 2 = 1`
}
