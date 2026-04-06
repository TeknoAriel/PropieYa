/**
 * Resolución de ciudad/barrio contra un catálogo (p. ej. agregado desde avisos activos)
 * o contra aliases estáticos mínimos si el catálogo está vacío.
 */

export type LocalityCatalogEntry = {
  city: string
  neighborhood: string | null
  /** Conteo de avisos (para desempates). */
  count?: number
}

export type LocalityCatalogHit = {
  kind: 'city' | 'neighborhood'
  canonical: string
}

/** Misma normalización que el pipeline conversacional. */
export function foldLocalityKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

const STATIC_ALIAS_ENTRIES: ReadonlyArray<{
  aliases: readonly string[]
  kind: 'city' | 'neighborhood'
  canonical: string
}> = [
  { aliases: ['rosario'], kind: 'city', canonical: 'Rosario' },
  { aliases: ['cordoba', 'córdoba'], kind: 'city', canonical: 'Córdoba' },
  {
    aliases: ['buenos aires', 'bs as', 'bsas'],
    kind: 'city',
    canonical: 'Buenos Aires',
  },
  {
    aliases: ['caba', 'capital federal', 'ciudad autonoma'],
    kind: 'city',
    canonical: 'CABA',
  },
  { aliases: ['funes'], kind: 'city', canonical: 'Funes' },
  { aliases: ['santa fe', 'santa fé'], kind: 'city', canonical: 'Santa Fe' },
  { aliases: ['mendoza'], kind: 'city', canonical: 'Mendoza' },
  { aliases: ['palermo'], kind: 'neighborhood', canonical: 'Palermo' },
  { aliases: ['belgrano'], kind: 'neighborhood', canonical: 'Belgrano' },
  {
    aliases: ['nueva cordoba', 'nueva córdoba'],
    kind: 'neighborhood',
    canonical: 'Nueva Córdoba',
  },
  { aliases: ['villa crespo'], kind: 'neighborhood', canonical: 'Villa Crespo' },
  { aliases: ['almagro'], kind: 'neighborhood', canonical: 'Almagro' },
  { aliases: ['caballito'], kind: 'neighborhood', canonical: 'Caballito' },
  { aliases: ['nuñez', 'nunez'], kind: 'neighborhood', canonical: 'Núñez' },
  { aliases: ['recoleta'], kind: 'neighborhood', canonical: 'Recoleta' },
  { aliases: ['san telmo'], kind: 'neighborhood', canonical: 'San Telmo' },
  {
    aliases: ['puerto madero'],
    kind: 'neighborhood',
    canonical: 'Puerto Madero',
  },
]

function resolveStaticAlias(raw: string): LocalityCatalogHit | null {
  if (!raw.trim()) return null
  const key = foldLocalityKey(raw)
  for (const e of STATIC_ALIAS_ENTRIES) {
    for (const a of e.aliases) {
      if (foldLocalityKey(a) === key) {
        return { kind: e.kind, canonical: e.canonical }
      }
    }
  }
  return null
}

/** Aliases más largos primero para no confundir «nueva cordoba» con «cordoba». */
const STATIC_ALIAS_BY_LENGTH = [...STATIC_ALIAS_ENTRIES]
  .flatMap((e) =>
    e.aliases.map((alias) => ({
      alias,
      kind: e.kind,
      canonical: e.canonical,
    }))
  )
  .sort((a, b) => b.alias.length - a.alias.length)

/**
 * Detecta ciudad/barrio conocido por mención en el mensaje (p. ej. «en Rosario»).
 * Usa los mismos aliases estáticos que el resolver; no requiere coincidir campo por campo con el catálogo dinámico.
 */
export function inferLocalityFromUserMessage(message: string): LocalityCatalogHit | null {
  if (!message.trim()) return null
  const pad = ` ${foldLocalityKey(message)} `
  for (const { alias, kind, canonical } of STATIC_ALIAS_BY_LENGTH) {
    const needle = ` ${foldLocalityKey(alias)} `
    if (needle.length >= 3 && pad.includes(needle)) {
      return { kind, canonical }
    }
  }
  return null
}

function maxByCount<T extends { count: number }>(rows: T[]): T {
  let best = rows[0]!
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.count > best.count) best = rows[i]!
  }
  return best
}

type AggregatedRow = {
  cityDisplay: string
  neighborhoodDisplay: string | null
  count: number
}

function aggregateEntries(
  entries: readonly LocalityCatalogEntry[]
): AggregatedRow[] {
  const map = new Map<
    string,
    { cityDisplay: string; neighborhoodDisplay: string | null; count: number }
  >()
  for (const e of entries) {
    const city = e.city.trim()
    const nb =
      e.neighborhood != null && e.neighborhood.trim().length > 0
        ? e.neighborhood.trim()
        : null
    const k = `${foldLocalityKey(city)}\0${nb ? foldLocalityKey(nb) : ''}`
    const c = e.count ?? 0
    const prev = map.get(k)
    if (prev) {
      prev.count += c
    } else {
      map.set(k, { cityDisplay: city, neighborhoodDisplay: nb, count: c })
    }
  }
  return [...map.values()]
}

export type LocalityResolver = {
  resolveForCityField: (raw: string) => LocalityCatalogHit | null
  resolveForNeighborhoodField: (
    raw: string,
    cityCanonical?: string
  ) => LocalityCatalogHit | null
}

/**
 * Si `entries` tiene filas, se resuelve primero contra agregados de avisos activos;
 * si no hay coincidencia, se usa el mismo fallback de aliases estáticos que en cold start.
 * Así «Rosario» / «Funes» siguen funcionando aunque el feed use otra grafía en `address.city`.
 */
export function createLocalityResolver(
  entries: readonly LocalityCatalogEntry[] | undefined
): LocalityResolver {
  const rows =
    entries && entries.length > 0 ? aggregateEntries(entries) : null

  if (!rows) {
    return {
      resolveForCityField: resolveStaticAlias,
      resolveForNeighborhoodField: resolveStaticAlias,
    }
  }

  const cityByFold = new Map<string, { display: string; count: number }>()
  for (const r of rows) {
    const cf = foldLocalityKey(r.cityDisplay)
    const prev = cityByFold.get(cf)
    const add = r.count
    if (!prev) {
      cityByFold.set(cf, { display: r.cityDisplay, count: add })
    } else {
      prev.count += add
    }
  }

  const neighborhoodIndex = new Map<string, AggregatedRow[]>()
  for (const r of rows) {
    if (!r.neighborhoodDisplay?.trim()) continue
    const nf = foldLocalityKey(r.neighborhoodDisplay)
    const list = neighborhoodIndex.get(nf) ?? []
    list.push(r)
    neighborhoodIndex.set(nf, list)
  }

  return {
    resolveForCityField(raw: string): LocalityCatalogHit | null {
      if (!raw.trim()) return null
      const k = foldLocalityKey(raw)
      const cityHit = cityByFold.get(k)
      const nHits = neighborhoodIndex.get(k) ?? []

      if (cityHit && nHits.length === 0) {
        return { kind: 'city', canonical: cityHit.display }
      }
      if (!cityHit && nHits.length === 1) {
        return {
          kind: 'neighborhood',
          canonical: nHits[0]!.neighborhoodDisplay!,
        }
      }
      if (!cityHit && nHits.length > 1) {
        const best = maxByCount(nHits)
        return { kind: 'neighborhood', canonical: best.neighborhoodDisplay! }
      }
      if (cityHit && nHits.length > 0) {
        return { kind: 'city', canonical: cityHit.display }
      }
      return resolveStaticAlias(raw)
    },

    resolveForNeighborhoodField(
      raw: string,
      cityCanonical?: string
    ): LocalityCatalogHit | null {
      if (!raw.trim()) return null
      const k = foldLocalityKey(raw)
      let nHits = neighborhoodIndex.get(k) ?? []

      if (cityCanonical?.trim()) {
        const cf = foldLocalityKey(cityCanonical)
        const filtered = nHits.filter((h) => foldLocalityKey(h.cityDisplay) === cf)
        if (filtered.length >= 1) nHits = filtered
      }

      if (nHits.length === 1) {
        return {
          kind: 'neighborhood',
          canonical: nHits[0]!.neighborhoodDisplay!,
        }
      }
      if (nHits.length > 1) {
        const best = maxByCount(nHits)
        return { kind: 'neighborhood', canonical: best.neighborhoodDisplay! }
      }

      const cityHit = cityByFold.get(k)
      if (cityHit) {
        return { kind: 'city', canonical: cityHit.display }
      }
      return resolveStaticAlias(raw)
    },
  }
}
