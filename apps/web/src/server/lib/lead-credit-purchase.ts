/**
 * Compra de créditos de lead sin pasarela (desarrollo o flag explícito en producción).
 * Cuando exista checkout real (p. ej. Mercado Pago), esta vía puede desactivarse vía env.
 */
export function isSimulatedLeadCreditPurchaseAllowed(): boolean {
  const v = process.env.LEAD_CREDITS_SIMULATED_PURCHASE?.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return process.env.NODE_ENV !== 'production'
}
