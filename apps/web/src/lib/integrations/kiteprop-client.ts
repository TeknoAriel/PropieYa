/**
 * Cliente server-side KiteProp (REST).
 * Autenticación: header X-API-Key (nunca exponer al cliente).
 *
 * Rutas base configurables vía env por si la API evoluciona.
 */

export type KitepropJson = Record<string, unknown>

export type KitepropClientError = {
  ok: false
  status: number
  message: string
  body?: unknown
}

export type KitepropClientSuccess<T> = { ok: true; data: T; status: number }

export type KitepropClientResult<T> = KitepropClientSuccess<T> | KitepropClientError

function getApiKey(): string | null {
  const k =
    process.env.KITEPROP_API_KEY?.trim() ||
    process.env.KITEPROP_API_TOKEN?.trim() ||
    null
  return k || null
}

function getBaseUrl(): string {
  const raw =
    process.env.KITEPROP_API_BASE_URL?.trim() || 'https://www.kiteprop.com/api/v1'
  return raw.replace(/\/$/, '')
}

function pathProfile(): string {
  return process.env.KITEPROP_PATH_PROFILE?.trim() || 'profile'
}

function pathProperties(): string {
  return process.env.KITEPROP_PATH_PROPERTIES?.trim() || 'properties'
}

function pathLeads(): string {
  return process.env.KITEPROP_PATH_LEADS?.trim() || 'leads'
}

function pathContacts(): string {
  return process.env.KITEPROP_PATH_CONTACTS?.trim() || 'contacts'
}

function pathMessages(): string {
  return process.env.KITEPROP_PATH_MESSAGES?.trim() || 'messages'
}

function requestTimeoutMs(): number {
  const raw = process.env.KITEPROP_REQUEST_TIMEOUT_MS?.trim()
  if (!raw) return 10_000
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 10_000
  return Math.min(120_000, Math.max(1_000, n))
}

function retryCount(): number {
  const raw = process.env.KITEPROP_REQUEST_RETRIES?.trim()
  if (!raw) return 1
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 1
  return Math.min(3, Math.max(0, n))
}

/** Expuesto para tests y diagnóstico (sin key). */
export function isKitepropConfigured(): boolean {
  return Boolean(getApiKey())
}

async function kitepropRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT',
  pathSegment: string,
  options?: {
    query?: Record<string, string | number | boolean | undefined>
    body?: unknown
  }
): Promise<KitepropClientResult<T>> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[kiteprop-client] KITEPROP_API_KEY / KITEPROP_API_TOKEN no definido')
    return {
      ok: false,
      status: 0,
      message: 'KiteProp API key no configurada',
    }
  }

  const base = getBaseUrl()
  const url = new URL(`${base}/${pathSegment.replace(/^\//, '')}`)
  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined) continue
      url.searchParams.set(k, String(v))
    }
  }

  const attempts = retryCount() + 1
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs())
    try {
      const res = await fetch(url.toString(), {
        method,
        headers: {
          'X-API-Key': apiKey,
          Accept: 'application/json',
          ...(options?.body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: 'no-store',
        signal: controller.signal,
      })

      const text = await res.text()
      let parsed: unknown = text
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text) as unknown
        } catch {
          parsed = text
        }
      }

      if (!res.ok) {
        // Reintentar solo errores 5xx (intermitentes).
        if (res.status >= 500 && attempt < attempts) {
          continue
        }
        console.error('[kiteprop-client] HTTP error', {
          method,
          url: url.toString(),
          status: res.status,
          snippet: text.slice(0, 500),
        })
        return {
          ok: false,
          status: res.status,
          message: `KiteProp HTTP ${res.status}`,
          body: parsed,
        }
      }

      return { ok: true, data: parsed as T, status: res.status }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (attempt < attempts) {
        continue
      }
      console.error('[kiteprop-client] fetch error', { method, pathSegment, message })
      return {
        ok: false,
        status: 0,
        message: `KiteProp red: ${message}`,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return {
    ok: false,
    status: 0,
    message: 'KiteProp: error desconocido de red',
  }
}

export async function getProfile(): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('GET', pathProfile())
}

export type GetPropertiesParams = {
  page?: number
  per_page?: number
  search?: string
  q?: string
  status?: string
  operation?: string
  city?: string
  [key: string]: string | number | boolean | undefined
}

export async function getProperties(
  params: GetPropertiesParams = {}
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('GET', pathProperties(), { query: params })
}

export async function getPropertyById(
  id: string | number
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>(
    'GET',
    `${pathProperties()}/${encodeURIComponent(String(id))}`
  )
}

export type CreateLeadPayload = KitepropJson

export async function createLead(
  data: CreateLeadPayload
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('POST', pathLeads(), { body: data })
}

export type CreateContactPayload = KitepropJson

export async function createContact(
  data: CreateContactPayload
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('POST', pathContacts(), { body: data })
}

export type CreateMessagePayload = KitepropJson

export async function createMessage(
  data: CreateMessagePayload
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('POST', pathMessages(), { body: data })
}

export type UpdateLeadPayload = KitepropJson & { id?: string }

export async function updateLead(data: UpdateLeadPayload): Promise<KitepropClientResult<unknown>> {
  const id = data.id
  if (!id || typeof id !== 'string') {
    return {
      ok: false,
      status: 0,
      message: 'updateLead requiere id string en el payload',
    }
  }
  const { id: _omit, ...rest } = data
  return kitepropRequest<unknown>('PATCH', `${pathLeads()}/${encodeURIComponent(id)}`, {
    body: rest,
  })
}

export type GetLeadsParams = {
  page?: number
  per_page?: number
  search?: string
  q?: string
  status?: string
  [key: string]: string | number | boolean | undefined
}

export async function getLeads(
  params: GetLeadsParams = {}
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('GET', pathLeads(), { query: params })
}

export async function getContacts(
  params: GetLeadsParams = {}
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('GET', pathContacts(), { query: params })
}

export async function getMessages(
  params: GetLeadsParams = {}
): Promise<KitepropClientResult<unknown>> {
  return kitepropRequest<unknown>('GET', pathMessages(), { query: params })
}
