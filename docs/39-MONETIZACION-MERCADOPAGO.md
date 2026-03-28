# Monetización y pasarela (Mercado Pago)

**Estado:** preparación en repo (webhook stub + tabla de eventos). Los cobros de producto (destacados, planes por organización, comisiones) se implementan por fases.

## Objetivo

Ofrecer una **pasarela tipo marketplace** (Mercado Pago es el estándar en Latam para cuentas, Checkout Pro, suscripciones y split cuando aplique), alineado con:

- Publicadores (dueños e inmobiliarias) que pagan por visibilidad o cupos.
- Buscadores: en fases avanzadas, servicios premium opcionales.

## En código hoy

| Pieza | Ubicación |
|-------|-----------|
| Webhook HTTP 200 + persistencia cruda | `apps/web/src/app/api/payments/mercadopago/webhook/route.ts` |
| Tabla auditoría / idempotencia futura | `payment_webhook_events` en `packages/database/src/schema/billing.ts` |

Tras `pnpm db:push` (o migración equivalente), los eventos entrantes se guardan en `payment_webhook_events`.

## Variables de entorno

Ver `.env.example` — prefijos sugeridos:

- `MERCADOPAGO_ACCESS_TOKEN` — API privada (servidor).
- `MERCADOPAGO_PUBLIC_KEY` — front Checkout Bricks / SDK si se usa en cliente.
- `MERCADOPAGO_WEBHOOK_SECRET` — validación de firma (implementar según doc oficial MP).
- `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` — OAuth si aplica.

## Próximos pasos técnicos (orden sugerido)

1. **Verificar firma** del webhook (`x-signature` / `x-request-id` según documentación actual de Mercado Pago).
2. **Idempotencia:** `UNIQUE (provider, external_eventId)` donde `externalEventId` no sea null.
3. **Modelo de negocio en DB:** `products` / `subscriptions` / `orders` ligados a `organization_id` o `user_id`.
4. **Checkout Pro** o **API de pagos** desde el panel (crear preferencia, redirigir, IPN/webhook confirma).
5. **Panel:** pantalla “Facturación” y activación de destacados tras pago aprobado.

## Documentación externa

- [Mercado Pago — desarrolladores](https://www.mercadopago.com.ar/developers) (Checkout Pro, webhooks, API).

## Relación con onboarding

Quién paga y qué compra depende del tipo de cuenta: ver **`docs/40-ONBOARDING-PERSONAS-Y-FLUJOS.md`**.
