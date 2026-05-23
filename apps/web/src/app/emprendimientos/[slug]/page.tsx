import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Card, Skeleton } from '@propieya/ui'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

import { DevelopmentProjectDetailView } from './development-project-detail-view'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const title = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 80)
  return {
    title: `${title} | Emprendimientos`,
    description: `Unidades y datos del emprendimiento ${title} en Propieya.`,
  }
}

export default function EmprendimientoProjectPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="container mx-auto px-4 py-10">
              <Skeleton className="h-10 w-64" />
              <Card className="mt-4 overflow-hidden">
                <Skeleton className="aspect-[16/7] w-full" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </Card>
            </div>
          }
        >
          <DevelopmentProjectDetailView />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
