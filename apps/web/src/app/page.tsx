import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSearch } from '@/components/home/hero-search'
import { FeaturedListings } from '@/components/home/featured-listings'
import { InductiveSearchChips } from '@/components/portal/inductive-search-chips'
import { HowItWorks } from '@/components/home/how-it-works'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSearch />
        <section className="border-t border-border/60 bg-surface-primary py-8 md:py-10">
          <div className="container mx-auto px-4">
            <InductiveSearchChips />
          </div>
        </section>
        <FeaturedListings />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
