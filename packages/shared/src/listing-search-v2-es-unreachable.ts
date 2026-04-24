import type { ListingSearchV2Result } from './search-session-mvp'

/**
 * ¿El resultado de `runListingSearchV2` indica fallo del índice (ES/OpenSearch)
 * con cero hits, de modo que debe intentarse el fallback SQL en `listing.searchV2`?
 *
 * Importante: `runListingSearchV2` pone avisos tanto en `messages` como en
 * `emptyExplanation`. Cualquier chequeo solo sobre `messages` deja afuera el
 * texto del índice y el fallback **nunca** corre (regresión abril 2026).
 */
export function isSearchV2ElasticsearchUnreachable(
  out: ListingSearchV2Result
): boolean {
  const itemsOnPage = out.buckets.reduce((n, b) => n + b.items.length, 0)
  if (itemsOnPage > 0) return false
  const blob = [...out.messages, out.emptyExplanation ?? '']
    .join('\n')
    .toLowerCase()
  return (
    blob.includes('no pudimos consultar el índice') ||
    blob.includes('el buscador no está disponible')
  )
}
