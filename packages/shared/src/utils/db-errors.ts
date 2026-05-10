/**
 * Mensajes claros cuando la DB no tiene tablas (schema no aplicado, etc.)
 * En Vercel el texto va orientado a usuario; en local se indica el comando de migración.
 */
export function humanizeDbError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  const pgCode =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : ''

  // Columna inexistente (p. ej. schema viejo sin account_intent). Prioridad sobre "relation does not exist".
  if (
    pgCode === '42703' ||
    (lower.includes('column') && lower.includes('does not exist'))
  ) {
    const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1'
    if (isVercel) {
      return 'Tu cuenta no se pudo crear en este momento por una actualización pendiente en el servidor de datos. Intentá de nuevo más tarde. Si sigue fallando, el equipo debe alinear el esquema de la base (misma DATABASE_URL que el portal: pnpm db:push o SQL en docs/sql).'
    }
    return 'La base de datos no tiene columnas que exige el código actual. Ejecutá pnpm db:push contra esta DATABASE_URL o el SQL en docs/sql/add-users-account-intent-monetization.sql.'
  }

  if (
    lower.includes('does not exist') ||
    lower.includes('relation') ||
    lower.includes('42p01')
  ) {
    const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1'
    if (isVercel) {
      return 'No podemos conectar con los datos en este momento. Volvé a intentar más tarde. Si el problema se repite, el equipo técnico debe comprobar que la base tenga el esquema actual.'
    }
    return 'La base de datos aún no tiene las tablas necesarias. Hay que ejecutar la migración (pnpm db:push) contra la misma DATABASE_URL que usa este entorno.'
  }
  return null
}
