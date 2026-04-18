'use client'

import { useLayoutEffect, useState } from 'react'

import {
  LISTING_RETURN_TO_PARAM,
  listingReturnToQuery,
  sanitizeListingReturnTo,
} from '@/lib/listing-flow-return-url'

export type ListingFlowReturnState = {
  returnPath: string | null
  returnToQuery: string
}

function readListingFlowReturn(): ListingFlowReturnState {
  if (typeof window === 'undefined') {
    return { returnPath: null, returnToQuery: '' }
  }
  const raw = new URL(window.location.href).searchParams.get(LISTING_RETURN_TO_PARAM)
  const returnPath = sanitizeListingReturnTo(raw)
  return {
    returnPath,
    returnToQuery: listingReturnToQuery(returnPath),
  }
}

/** Lectura del query `returnTo` sin `useSearchParams` (evita Suspense en toda la ficha). */
export function useListingFlowReturn(listingId: string): ListingFlowReturnState {
  const [state, setState] = useState<ListingFlowReturnState>({
    returnPath: null,
    returnToQuery: '',
  })

  useLayoutEffect(() => {
    setState(readListingFlowReturn())
  }, [listingId])

  return state
}
