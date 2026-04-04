import type { Metadata } from 'next'

import { PORTAL_COMPARE_COPY } from '@propieya/shared'

export const metadata: Metadata = {
  title: PORTAL_COMPARE_COPY.pageTitle,
  description: PORTAL_COMPARE_COPY.pageSubtitle,
}

export default function CompararLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
