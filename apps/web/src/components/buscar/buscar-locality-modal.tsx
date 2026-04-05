'use client'

import { useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@propieya/ui'
import { foldLocalityKey, PORTAL_SEARCH_UX_COPY as S } from '@propieya/shared'

import { trpc } from '@/lib/trpc'

export type BuscarLocalityPick = { city: string; neighborhood: string }

function catalogEntryLabel(entry: {
  city: string
  neighborhood: string | null
}): string {
  const c = entry.city === '—' ? '' : entry.city.trim()
  const n = entry.neighborhood?.trim() ?? ''
  if (c && n) return `${c} · ${n}`
  if (n) return n
  return c || '—'
}

type BuscarLocalityModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (pick: BuscarLocalityPick) => void
}

export function BuscarLocalityModal({
  open,
  onOpenChange,
  onPick,
}: BuscarLocalityModalProps) {
  const [needle, setNeedle] = useState('')

  const { data, isLoading, isError } = trpc.listing.localityCatalog.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
      enabled: open,
    }
  )

  const filtered = useMemo(() => {
    const entries = data?.entries ?? []
    const q = foldLocalityKey(needle)
    if (!q) return entries.slice(0, 100)
    return entries
      .filter((e) => {
        const hay = foldLocalityKey(
          `${e.city} ${e.neighborhood ?? ''}`
        )
        return hay.includes(q)
      })
      .slice(0, 100)
  }, [data?.entries, needle])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNeedle('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base sm:text-lg">
            {S.buscarLocalityCatalogTitle}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-text-secondary">{S.buscarLocalityCatalogHint}</p>
        <Input
          placeholder={S.buscarLocalityCatalogPlaceholder}
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
          autoFocus
          aria-label={S.buscarLocalityCatalogPlaceholder}
        />
        <div className="min-h-[200px] flex-1 overflow-hidden rounded-md border border-border/60">
          {isLoading ? (
            <p className="p-3 text-sm text-text-secondary">
              {S.buscarLocalityCatalogLoading}
            </p>
          ) : isError ? (
            <p className="p-3 text-sm text-text-secondary">{S.loadError}</p>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-sm text-text-secondary">
              {S.buscarLocalityCatalogEmpty}
            </p>
          ) : (
            <ul className="max-h-[min(52vh,420px)] overflow-y-auto text-sm">
              {filtered.map((e, i) => (
                <li key={`${e.city}-${e.neighborhood ?? ''}-${i}`}>
                  <button
                    type="button"
                    className="w-full border-b border-border/40 px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                    onClick={() => {
                      onPick({
                        city: e.city === '—' ? '' : e.city,
                        neighborhood: e.neighborhood?.trim() ?? '',
                      })
                      setNeedle('')
                      onOpenChange(false)
                    }}
                  >
                    {catalogEntryLabel(e)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
