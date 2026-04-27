# Modelo operativo de upgrades comerciales

## Objetivo

Operar upgrades de visibilidad sin pasarela compleja ni cobro automático en la etapa inicial, usando:

- compra por aviso
- compra por paquete
- canal online
- canal on_demand (manual/comercial)

## Tipos de compra

- `listing`: upgrade aplicado a un aviso puntual.
- `package`: paquete de créditos/activaciones para consumo futuro.

## Canales

- `online`: compra iniciada por el usuario.
- `on_demand`: compra asistida por equipo comercial/operaciones.

## Estados de upgrade

- `draft`
- `initiated`
- `pending_payment`
- `pending_activation`
- `active`
- `scheduled`
- `expired`
- `cancelled`

Regla temporal:

- si `startsAt` es futuro -> `scheduled`
- si `endsAt` ya venció -> `expired`
- si no aplica ninguna de las anteriores y está habilitado -> `active`

## Activación y vencimiento

- upgrades `active`/`scheduled` aplican `portalVisibility` al aviso.
- al vencer, el aviso no se baja:
  - vuelve a visibilidad normal (sin upgrade activo)
  - mantiene su ciclo de publicación habitual.

## Relación con `portalVisibility`

- `listing` upgrade mapea a paquete comercial (`packageId`) y deriva:
  - `tier`
  - `products`
  - `from`
  - `until`
- enforcement público y métricas ya respetan vigencia operativa.

## Ubicación de datos (etapa inicial)

- upgrades por aviso: `listings.features.visibilityUpgrades`
- compras por paquete: `organizations.settings.portalUpgradePackages`

Esto evita migraciones pesadas en la etapa inicial y permite evolucionar luego a tablas dedicadas.

## UI operativa inicial

- ruta panel: `/upgrades`
- permite:
  - registrar upgrade por aviso
  - registrar paquete
  - ver estado y vigencia de ambos
  - diferenciar canal online vs on_demand

## Qué no hace esta etapa

- no activa pasarela full
- no activa cobro automático completo
- no habilita leads pagos
- no promete posiciones garantizadas en ranking core
