'use client'

import { MessageSquare, Search, Sparkles, Heart } from '@propieya/ui'

import { getPortalPack } from '@/lib/portal-copy'

const ICONS = [MessageSquare, Sparkles, Search, Heart]

export function HowItWorks() {
  const pack = getPortalPack()
  const steps = pack.howItWorks.steps

  return (
    <section className="py-16 md:py-24 bg-surface-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            {pack.howItWorks.sectionTitle}
          </h2>
          <p className="mt-2 text-text-secondary max-w-2xl mx-auto">
            {pack.howItWorks.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = ICONS[index] ?? MessageSquare
            return (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10">
                  <Icon className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="text-sm font-medium text-brand-primary mb-2">
                  Paso {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
