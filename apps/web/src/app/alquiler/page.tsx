'use client'

import { Suspense } from 'react'

import { Card, Skeleton } from '@propieya/ui'

import { BuscarContent } from '@/components/buscar/buscar-content'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

export default function AlquilerPage() {
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
          <BuscarContent
            forcedOperation="rent"
            pageTitle="Propiedades en alquiler"
            pageSubtitle="Alquiler tradicional y opciones en tu zona. Refiná con los filtros."
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
