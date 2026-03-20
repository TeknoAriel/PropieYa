/**
 * Evita open-redirect: solo paths relativos internos (mismo origen al usar router.push).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (raw == null || typeof raw !== 'string') return fallback
  const p = raw.trim()
  if (!p.startsWith('/') || p.startsWith('//')) return fallback
  // Bloquea esquemas embebidos (http:, javascript:, etc.)
  if (p.includes(':') || p.includes('\\')) return fallback
  return p
}
