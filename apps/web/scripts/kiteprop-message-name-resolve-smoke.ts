/**
 * Verificación local del resolver de `name` para POST /api/v1/messages (sin API).
 *
 *   pnpm exec tsx scripts/kiteprop-message-name-resolve-smoke.ts
 */

import { resolveKitepropMessageName } from '../src/lib/integrations/kiteprop-properties'

function assertEq(label: string, got: string, want: string) {
  if (got !== want) {
    console.error(`FAIL ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
    process.exit(1)
  }
}

assertEq(
  '1 nombre real',
  resolveKitepropMessageName({ name: '  Ana López  ', email: 'x@y.com', phone: '+1' }),
  'Ana López'
)

assertEq(
  '2 sin nombre, con email',
  resolveKitepropMessageName({ name: '   ', email: 'lead@example.com', phone: '' }),
  'lead@example.com'
)

assertEq(
  '3 sin nombre ni email, con teléfono',
  resolveKitepropMessageName({ name: '', email: null, phone: '  +54911  ' }),
  '+54911'
)

assertEq(
  '4 todo vacío → fallback',
  resolveKitepropMessageName({ name: ' ', email: '', phone: undefined }),
  'Contacto Propieya'
)

console.log('OK — resolveKitepropMessageName (4 casos)')
