/**
 * Subconjunto del apéndice A de `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md`.
 *
 * Uso:
 *   pnpm --filter @propieya/web run golden:search-smoke
 *   GOLDEN_SEARCH_BASE_URL=https://propieyaweb.vercel.app pnpm --filter @propieya/web run golden:search-smoke
 */
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { inferRouterInputs } from '@trpc/server'
import superjson from 'superjson'

import type { AppRouter } from '../src/server/routers/_app'

type SearchInput = inferRouterInputs<AppRouter>['listing']['search']

const CASES: { appendix: string; label: string; input: SearchInput }[] = [
  {
    appendix: 'A#1',
    label: 'Alquiler 2 amb Palermo hasta 400k',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'rent',
      minBedrooms: 2,
      city: 'Buenos Aires',
      neighborhood: 'Palermo',
      maxPrice: 400_000,
    },
  },
  {
    appendix: 'A#2',
    label: 'Casa venta Nordelta pileta',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'sale',
      propertyType: 'house',
      q: 'Nordelta pileta',
      amenities: ['pool'],
    },
  },
  {
    appendix: 'A#3',
    label: 'Depto luminoso reciclado CABA',
    input: {
      limit: 24,
      offset: 0,
      propertyType: 'apartment',
      city: 'Buenos Aires',
      q: 'luminoso reciclado',
    },
  },
  {
    appendix: 'A#4',
    label: 'PH sin expensas CABA',
    input: {
      limit: 24,
      offset: 0,
      propertyType: 'ph',
      city: 'Buenos Aires',
      q: 'sin expensas',
    },
  },
  {
    appendix: 'A#5',
    label: 'Cochera venta Belgrano',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'sale',
      propertyType: 'parking',
      neighborhood: 'Belgrano',
      city: 'Buenos Aires',
    },
  },
  {
    appendix: 'A#6',
    label: 'Local alquiler microcentro',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'rent',
      propertyType: 'commercial',
      city: 'Buenos Aires',
      q: 'microcentro',
    },
  },
  {
    appendix: 'A#7',
    label: 'Terreno venta >300 m²',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'sale',
      propertyType: 'land',
      minSurface: 300,
    },
  },
  {
    appendix: 'A#8',
    label: 'Alq. temporario MDP 4 personas',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'temporary_rent',
      city: 'Mar del Plata',
      q: '4 personas',
    },
  },
  {
    appendix: 'A#9',
    label: 'Oficina coworking',
    input: {
      limit: 24,
      offset: 0,
      propertyType: 'office',
      city: 'Buenos Aires',
      q: 'coworking',
    },
  },
  {
    appendix: 'A#10',
    label: 'Duplex 3 dorm zona norte',
    input: {
      limit: 24,
      offset: 0,
      minBedrooms: 3,
      q: 'duplex zona norte',
    },
  },
  {
    appendix: 'A#11',
    label: 'Monoambiente inversión subte',
    input: {
      limit: 24,
      offset: 0,
      propertyType: 'apartment',
      city: 'Buenos Aires',
      q: 'monoambiente inversión subte',
    },
  },
  {
    appendix: 'A#12',
    label: 'Casa quinta pileta quincho',
    input: {
      limit: 24,
      offset: 0,
      propertyType: 'house',
      amenities: ['pool', 'bbq'],
      q: 'quinta',
    },
  },
  {
    appendix: 'A#14',
    label: 'Solo mapa (bbox CABA)',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'sale',
      bbox: {
        south: -34.65,
        north: -34.53,
        west: -58.53,
        east: -58.35,
      },
    },
  },
  {
    appendix: 'A#15',
    label: 'Barrio + precio mínimo',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'sale',
      neighborhood: 'Palermo',
      city: 'Buenos Aires',
      minPrice: 50_000_000,
    },
  },
  {
    appendix: 'A#16',
    label: 'Solo operación venta',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'sale',
    },
  },
  {
    appendix: 'A#17',
    label: 'Typo Palermmo (fuzziness)',
    input: {
      limit: 24,
      offset: 0,
      city: 'Buenos Aires',
      q: 'Palermmo',
    },
  },
  {
    appendix: 'A#20a',
    label: 'Paginación misma query offset 0',
    input: {
      limit: 24,
      offset: 0,
      operationType: 'rent',
      city: 'Buenos Aires',
    },
  },
  {
    appendix: 'A#20b',
    label: 'Paginación misma query offset 24',
    input: {
      limit: 24,
      offset: 24,
      operationType: 'rent',
      city: 'Buenos Aires',
    },
  },
  {
    appendix: 'A#20c',
    label: 'Paginación misma query offset 48',
    input: {
      limit: 24,
      offset: 48,
      operationType: 'rent',
      city: 'Buenos Aires',
    },
  },
]

function baseUrl(): string {
  const raw =
    process.env.GOLDEN_SEARCH_BASE_URL?.trim() || 'http://127.0.0.1:3010'
  return raw.replace(/\/$/, '')
}

async function main(): Promise<void> {
  const url = baseUrl()
  const client = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${url}/api/trpc`,
        transformer: superjson,
      }),
    ],
  })

  // eslint-disable-next-line no-console
  console.info(`golden-search-smoke → ${url}/api/trpc\n`)

  let failed = false
  for (const c of CASES) {
    const t0 = Date.now()
    try {
      const res = await client.listing.search.query(c.input)
      const ms = Date.now() - t0
      // eslint-disable-next-line no-console
      console.info(
        `${c.appendix}\t${ms}ms\ttotal=${res.total}\trows=${res.items.length}\t${c.label}`
      )
    } catch (e) {
      failed = true
      const msg = e instanceof Error ? e.message : String(e)
      // eslint-disable-next-line no-console
      console.error(`${c.appendix}\tFAIL\t${c.label}\t${msg}`)
    }
  }

  if (failed) {
    process.exitCode = 1
  }
}

void main()
