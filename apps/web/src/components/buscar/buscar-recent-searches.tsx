'use client'

import { Card, Skeleton } from '@propieya/ui'
import { PORTAL_SEARCH_UX_COPY as S } from '@propieya/shared'

import { summarizeSearchHistoryFilters } from '@/lib/search-filter-summary'
import { trpc } from '@/lib/trpc'

export function BuscarRecentSearches() {
  const { data, isLoading } = trpc.searchHistory.listMine.useQuery(
    { limit: 10 },
    { retry: false }
  )

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-5 w-48 mb-3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[83%] mt-2" />
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text-primary">{S.recentSearchesTitle}</h2>
        <p className="mt-2 text-sm text-text-secondary">{S.recentSearchesEmpty}</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-text-primary">{S.recentSearchesTitle}</h2>
      <p className="mt-1 text-xs text-text-tertiary">{S.recentSearchesHint}</p>
      <ul className="mt-3 space-y-2">
        {data.map((row) => (
          <li
            key={row.id}
            className="border-b border-border/60 pb-2 text-sm last:border-0 last:pb-0"
          >
            <p className="text-text-primary">{summarizeSearchHistoryFilters(row.filters)}</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {new Date(row.createdAt).toLocaleString('es-AR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
              {' · '}
              {row.resultCount}{' '}
              {row.resultCount === 1 ? 'resultado' : 'resultados'}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
