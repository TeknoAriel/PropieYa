'use client'

import { getPortalPack, showCopyPackLabel } from '@/lib/portal-copy'

export function CopyPackBanner() {
  if (!showCopyPackLabel()) return null
  const pack = getPortalPack()
  return (
    <div className="bg-brand-primary/10 border-b border-border px-4 py-1.5 text-center text-xs text-text-secondary">
      <span className="font-medium text-text-primary">Copy pack (pruebas):</span>{' '}
      {pack.title}
    </div>
  )
}
