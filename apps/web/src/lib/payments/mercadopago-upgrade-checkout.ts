type CreateUpgradeCheckoutInput = {
  title: string
  amount: number
  currency: string
  quantity?: number
  externalReference: string
  payerEmail?: string | null
  metadata: Record<string, unknown>
}

type CreateUpgradeCheckoutResult = {
  checkoutUrl: string
  preferenceId: string | null
}

function envRequired(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`missing_env_${name}`)
  }
  return value
}

export async function createMercadoPagoUpgradeCheckout(
  input: CreateUpgradeCheckoutInput
): Promise<CreateUpgradeCheckoutResult> {
  const accessToken = envRequired('MERCADOPAGO_ACCESS_TOKEN')
  const baseUrl = (process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://propieyaweb.vercel.app').replace(/\/$/, '')
  const webhookUrl = `${baseUrl}/api/payments/mercadopago/webhook`
  const payload = {
    items: [
      {
        title: input.title,
        quantity: input.quantity ?? 1,
        currency_id: input.currency,
        unit_price: Number(input.amount.toFixed(2)),
      },
    ],
    external_reference: input.externalReference,
    metadata: input.metadata,
    notification_url: webhookUrl,
    back_urls: {
      success: `${baseUrl}/upgrades?pago=ok`,
      failure: `${baseUrl}/upgrades?pago=error`,
      pending: `${baseUrl}/upgrades?pago=pendiente`,
    },
    auto_return: 'approved',
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
  }
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`mercadopago_preference_error:${response.status}:${body.slice(0, 240)}`)
  }
  const json = (await response.json()) as {
    id?: string
    init_point?: string
    sandbox_init_point?: string
  }
  const checkoutUrl = json.init_point ?? json.sandbox_init_point
  if (!checkoutUrl) {
    throw new Error('mercadopago_preference_missing_init_point')
  }
  return {
    checkoutUrl,
    preferenceId: json.id ?? null,
  }
}

export async function fetchMercadoPagoPaymentById(paymentId: string): Promise<{
  id: string
  status: string
  statusDetail?: string
  externalReference?: string | null
  metadata?: Record<string, unknown>
  dateApproved?: string | null
  dateLastUpdated?: string | null
  raw: unknown
}> {
  const accessToken = envRequired('MERCADOPAGO_ACCESS_TOKEN')
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`mercadopago_payment_fetch_error:${response.status}:${body.slice(0, 240)}`)
  }
  const json = (await response.json()) as Record<string, unknown>
  return {
    id: String(json.id ?? paymentId),
    status: typeof json.status === 'string' ? json.status : 'unknown',
    statusDetail: typeof json.status_detail === 'string' ? json.status_detail : undefined,
    externalReference:
      typeof json.external_reference === 'string' ? json.external_reference : null,
    metadata:
      json.metadata && typeof json.metadata === 'object' && !Array.isArray(json.metadata)
        ? (json.metadata as Record<string, unknown>)
        : undefined,
    dateApproved: typeof json.date_approved === 'string' ? json.date_approved : null,
    dateLastUpdated: typeof json.date_last_updated === 'string' ? json.date_last_updated : null,
    raw: json,
  }
}
