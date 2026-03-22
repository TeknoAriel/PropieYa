/**
 * Mensajes claros cuando la DB no tiene tablas (schema no aplicado, etc.)
 */
export function humanizeDbError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (
    lower.includes('does not exist') ||
    lower.includes('relation') ||
    lower.includes('42p01')
  ) {
    return 'La base de datos aún no tiene las tablas necesarias. Hay que ejecutar la migración (pnpm db:push) contra la misma DATABASE_URL que usa este entorno.'
  }
  return null
}
