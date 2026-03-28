import { Suspense } from 'react'

import { RegisterContent } from './register-content'

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-secondary text-text-secondary text-sm">
          Cargando registro…
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
