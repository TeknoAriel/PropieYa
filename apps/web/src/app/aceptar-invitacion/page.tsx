import { Suspense } from 'react'

import { AceptarInvitacionContent } from './aceptar-content'

export default function AceptarInvitacionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-secondary text-text-secondary text-sm">
          Cargando…
        </div>
      }
    >
      <AceptarInvitacionContent />
    </Suspense>
  )
}
