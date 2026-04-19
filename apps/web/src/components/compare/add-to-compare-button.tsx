'use client'

import { useEffect, useState } from 'react'

import {
  PORTAL_COMPARE_COPY as C,
  buildPortalCompareUrl,
} from '@propieya/shared'
import { Button } from '@propieya/ui'

import {
  COMPARE_LISTINGS_EVENT,
  readCompareIds,
  toggleCompareId,
} from '@/lib/compare-listings-storage'
import { trpc } from '@/lib/trpc'

type AddToCompareButtonProps = {
  listingId: string
  /** Estilo más chico en cards del buscador */
  compact?: boolean
  /** Evitar navegación del padre (card dentro de Link) */
  stopNavigation?: boolean
  /** Solo cuando el usuario agrega (no al quitar). Embudo / ficha. */
  onCompareAdded?: () => void
}

export function AddToCompareButton({
  listingId,
  compact = false,
  stopNavigation = false,
  onCompareAdded,
}: AddToCompareButtonProps) {
  const [ids, setIds] = useState<string[]>([])
  const [maxHint, setMaxHint] = useState(false)
  const recordCompareAdd = trpc.listing.recordCompareAdd.useMutation()

  useEffect(() => {
    const sync = () => setIds(readCompareIds())
    sync()
    window.addEventListener(COMPARE_LISTINGS_EVENT, sync)
    return () => window.removeEventListener(COMPARE_LISTINGS_EVENT, sync)
  }, [])

  const inList = ids.includes(listingId)

  const handleClick = (e: React.MouseEvent) => {
    if (stopNavigation) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (inList) {
      toggleCompareId(listingId)
      setIds(readCompareIds())
      return
    }
    const r = toggleCompareId(listingId)
    if (!r.ok) {
      setMaxHint(true)
      window.setTimeout(() => setMaxHint(false), 3500)
      return
    }
    setIds(readCompareIds())
    onCompareAdded?.()
    recordCompareAdd.mutate(
      { listingId },
      {
        onError: () => {
          /* telemetría best-effort */
        },
      }
    )
  }

  const label = compact
    ? inList
      ? C.removeFromCompareCompact
      : C.addToCompareCompact
    : inList
      ? C.removeFromCompare
      : C.addToCompare

  return (
    <div className={compact ? 'inline-flex flex-col items-stretch gap-1' : 'space-y-1'}>
      <Button
        type="button"
        variant={inList ? 'secondary' : 'outline'}
        size={compact ? 'sm' : 'default'}
        className={
          compact
            ? `text-xs ${inList ? '' : 'border-dashed border-border/60 text-text-secondary hover:text-text-primary'}`
            : undefined
        }
        onClick={handleClick}
        aria-pressed={inList}
        aria-label={inList ? C.removeFromCompareAria : C.addToCompareAria}
        title={inList ? C.removeFromCompare : C.addToCompare}
      >
        {label}
      </Button>
      {maxHint ? (
        <p className="text-xs text-semantic-warning" role="status">
          {C.compareMaxReached}{' '}
          <a
            className="font-medium text-brand-primary underline"
            href={buildPortalCompareUrl(readCompareIds())}
          >
            {C.compareOpen}
          </a>
        </p>
      ) : null}
    </div>
  )
}
