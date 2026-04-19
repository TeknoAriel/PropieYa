'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { PORTAL_COMPARE_COPY as C, buildPortalCompareUrl } from '@propieya/shared'
import { Button } from '@propieya/ui'

import {
  COMPARE_LISTINGS_EVENT,
  clearCompareIds,
  readCompareIds,
} from '@/lib/compare-listings-storage'

export function CompareDock() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const sync = () => setIds(readCompareIds())
    sync()
    window.addEventListener(COMPARE_LISTINGS_EVENT, sync)
    return () => window.removeEventListener(COMPARE_LISTINGS_EVENT, sync)
  }, [])

  if (ids.length < 2) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[rgba(255,252,245,0.7)] shadow-lg backdrop-blur-md dark:bg-[rgba(36,36,38,0.82)] pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label={C.compareBarTitle}
    >
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary">
            <span className="font-semibold">{C.compareBarTitle}</span>
            <span className="text-text-secondary">
              {' '}
              · {C.compareBarCount.replace('{n}', String(ids.length))}
            </span>
          </p>
          <p className="mt-0.5 text-xs leading-snug text-text-tertiary">{C.compareBarHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              clearCompareIds()
              setIds([])
            }}
          >
            {C.compareClear}
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href={buildPortalCompareUrl(ids)}>{C.compareOpen}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
