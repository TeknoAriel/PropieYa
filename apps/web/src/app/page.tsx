import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSearch } from '@/components/home/hero-search'
import { FeaturedListings } from '@/components/home/featured-listings'
import { HomePortalRail } from '@/components/home/home-portal-rail'
import { HowItWorks } from '@/components/home/how-it-works'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSearch />
        <FeaturedListings />
        <HomePortalRail />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
