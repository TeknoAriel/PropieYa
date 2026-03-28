type ZodFlatten = {
  formErrors: string[]
  fieldErrors: Record<string, string[] | undefined>
}

function firstZodMessage(z: ZodFlatten): string | null {
  for (const msgs of Object.values(z.fieldErrors ?? {})) {
    const m = msgs?.[0]
    if (m) return m
  }
  const fe = z.formErrors?.[0]
  return fe ?? null
}

function messageFromJsonArray(raw: string): string | null {
  const t = raw.trim()
  if (!t.startsWith('[')) return null
  try {
    const parsed = JSON.parse(t) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const first = parsed[0] as { message?: unknown }
    return typeof first?.message === 'string' ? first.message : null
  } catch {
    return null
  }
}

/** Mensaje legible para el usuario ante errores tRPC (p. ej. validación Zod). */
export function formatTrpcUserMessage(err: {
  message: string
  data?: unknown
}): string {
  const raw = err.data
  const z =
    raw && typeof raw === 'object' && 'zodError' in raw
      ? (raw as { zodError?: ZodFlatten | null }).zodError
      : undefined
  if (z && typeof z === 'object') {
    const fromFlat = firstZodMessage(z)
    if (fromFlat) return fromFlat
  }
  const fromJson = messageFromJsonArray(err.message)
  if (fromJson) return fromJson
  return err.message || 'Ocurrió un error'
}
