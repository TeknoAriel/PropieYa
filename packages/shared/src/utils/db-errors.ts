/**
 * Mensajes claros cuando la DB no tiene tablas (schema no aplicado, etc.)
 * En Vercel el texto va orientado a usuario; en local se indica el comando de migración.
 */
export function humanizeDbError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
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
