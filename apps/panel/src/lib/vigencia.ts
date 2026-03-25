/**
 * Texto corto de vigencia para lista de propiedades en el panel.
 */
export function formatListingVigencia(
  expiresAt: Date | string | null | undefined,
  status: string
): string {
  if (status === 'draft' || status === 'pending_review') {
    return '—'
  }
  if (expiresAt == null) {
    return 'Sin fecha de vencimiento'
  }
  const end = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  if (Number.isNaN(end.getTime())) {
    return '—'
  }
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  if (diffMs < 0) {
    return 'Vencido'
  }
  if (days === 0) {
    return 'Vence hoy'
  }
  if (days === 1) {
    return '1 día restante'
  }
  if (days <= 30) {
    return `${days} días restantes`
  }
  return `Vence ${end.toLocaleDateString('es-AR')}`
}
