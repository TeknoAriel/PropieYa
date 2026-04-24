import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { PublicarEntry } from './publicar-entry'

export default function PublicarPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16">
        <PublicarEntry />
      </main>
      <Footer />
    </div>
  )
}
