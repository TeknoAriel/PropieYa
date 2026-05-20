import type { Metadata } from 'next'
import { Suspense } from 'react'

import {
  portalEmprendimientosDocumentTitle,
  portalEmprendimientosMetaDescription,
  portalPickSingleSearchParam,
} from '@propieya/shared'
import { Card, Skeleton } from '@propieya/ui'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

import { EmprendimientosLandingView } from './emprendimientos-landing-view'

type EmprendimientosPageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

export async function generateMetadata({
  searchParams,
}: EmprendimientosPageProps): Promise<Metadata> {
  const ciudad = portalPickSingleSearchParam(searchParams.ciudad)
  return {
    title: portalEmprendimientosDocumentTitle(ciudad),
    description: portalEmprendimientosMetaDescription(ciudad),
  }
}

export default function EmprendimientosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="container mx-auto px-4 py-10">
              <Skeleton className="h-10 w-64" />
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          }
        >
          <EmprendimientosLandingView />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

