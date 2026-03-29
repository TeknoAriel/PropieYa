# Monetización y pasarela (Mercado Pago)

**Estado:** preparación en repo (webhook stub + tabla de eventos). Los cobros de producto (destacados, planes por organización, comisiones) se implementan por fases.

## Objetivo

Ofrecer una **pasarela tipo marketplace** (Mercado Pago es el estándar en Latam para cuentas, Checkout Pro, suscripciones y split cuando aplique), alineado con:

- Publicadores (dueños e inmobiliarias) que pagan por visibilidad o cupos.
- Buscadores: en fases avanzadas, servicios premium opcionales.

## En código hoy

| Pieza | Ubicación |
|-------|-----------|
| Webhook HTTP 200 + persistencia; idempotencia si hay `data.id` / `body.id` | `apps/web/src/app/api/payments/mercadopago/webhook/route.ts` |
| Validación HMAC opcional (`x-signature`, manifest oficial MP) | `apps/web/src/lib/payments/mercadopago-webhook-verify.ts` — activa si `MERCADOPAGO_WEBHOOK_SECRET` está definido |
| Tabla auditoría | `payment_webhook_events` en `packages/database/src/schema/billing.ts` |

Tras `pnpm db:push` (o migración equivalente), los eventos entrantes se guardan en `payment_webhook_events`.

## Variables de entorno

Ver `.env.example` — prefijos sugeridos:

- `MERCADOPAGO_ACCESS_TOKEN` — API privada (servidor).
- `MERCADOPAGO_PUBLIC_KEY` — front Checkout Bricks / SDK si se usa en cliente.
- `MERCADOPAGO_WEBHOOK_SECRET` — secreto del panel MP para validar `x-signature` (HMAC); si no está definido, el webhook no exige firma (solo entornos de prueba).
- `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` — OAuth si aplica.

## Próximos pasos técnicos (orden sugerido)

1. **Verificar firma** — implementado de forma opcional con `MERCADOPAGO_WEBHOOK_SECRET` (sin secreto, el endpoint sigue aceptando notificaciones para desarrollo/simulador).
2. **Idempotencia** — lectura previa por `(provider, external_eventId)` antes de insertar; pendiente índice único parcial en DB si se quiere garantía a nivel SQL.
3. **Modelo de negocio en DB:** `products` / `subscriptions` / `orders` ligados a `organization_id` o `user_id`.
4. **Checkout Pro** o **API de pagos** desde el panel (crear preferencia, redirigir, IPN/webhook confirma).
5. **Panel:** pantalla “Facturación” y activación de destacados tras pago aprobado.

## Documentación externa

- [Mercado Pago — desarrolladores](https://www.mercadopago.com.ar/developers) (Checkout Pro, webhooks, API).

## Relación con onboarding

Quién paga y qué compra depende del tipo de cuenta: ver **`docs/40-ONBOARDING-PERSONAS-Y-FLUJOS.md`**.
