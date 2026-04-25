# Leads: monitoreo operativo (producción)

Objetivo: tener una lectura rápida y accionable del flujo de consultas sin tocar la lógica principal de leads.

## Qué mirar (cada día)

- **Leads entrados hoy** (`leadsInWindow`).
- **Ruta de asignación** (`assignedBy`): `assigned_contact`, `publisher_user_fallback`, `organization_fallback`, `safe_ops_fallback`, `unknown`.
- **Pendientes** (`pendingInWindow`) y **pendientes viejos** (`pendingAging`).
- **Errores de sync KiteProp** (`syncErrorInWindow`) y `repeatedSyncErrors`.
- **Top listings/anunciantes** con más consultas (`topListings`).

## Endpoint operativo (protegido)

- URL: `/api/internal/ops/leads-health`
- Auth: `Authorization: Bearer <LEADS_OPS_SECRET>` (fallback `CRON_SECRET`)
- Query params:
  - `sinceHours` (default `24`)
  - `pendingOlderThanHours` (default `24`)

Ejemplo:

```bash
curl -sS "https://propieyaweb.vercel.app/api/internal/ops/leads-health?sinceHours=24&pendingOlderThanHours=24" \
  -H "Authorization: Bearer $LEADS_OPS_TOKEN"
```

## Script CLI rápido

Archivo: `apps/web/scripts/leads-ops-check.ts`

```bash
LEADS_OPS_BASE_URL="https://propieyaweb.vercel.app" \
LEADS_OPS_TOKEN="..." \
pnpm --filter @propieya/web exec tsx scripts/leads-ops-check.ts --sinceHours=24 --pendingOlderThanHours=24
```

## SQL de apoyo (manual)

### 1) Leads creados hoy

```sql
select date_trunc('day', created_at) as day, count(*) as total
from leads
where created_at >= now() - interval '1 day'
group by 1
order by 1 desc;
```

### 2) Distribución por ruta de asignación

```sql
select coalesce(enrichment->>'assignedBy', 'unknown') as assigned_by, count(*) as total
from leads
where created_at >= now() - interval '24 hours'
group by 1
order by total desc;
```

### 3) Errores de sync KiteProp

```sql
select
  coalesce(enrichment->'kiteprop'->>'syncStatus', 'not_attempted') as sync_status,
  count(*) as total
from leads
where created_at >= now() - interval '24 hours'
group by 1
order by total desc;
```

### 4) Pendientes viejos (> 24h)

```sql
select
  l.id,
  l.listing_id,
  li.title,
  l.created_at,
  round(extract(epoch from (now() - l.created_at))/3600.0, 1) as age_hours
from leads l
join listings li on li.id = l.listing_id
where l.access_status = 'pending'
  and l.created_at <= now() - interval '24 hours'
order by l.created_at asc
limit 50;
```

### 5) Patrón de error repetido

```sql
select
  coalesce(enrichment->'kiteprop'->>'lastError', 'unknown') as error_message,
  count(*) as total
from leads
where created_at >= now() - interval '24 hours'
  and coalesce(enrichment->'kiteprop'->>'syncStatus', '') = 'error'
group by 1
order by total desc
limit 10;
```

## Criterios mínimos de alerta (manual o automática)

- `highSyncErrors`: `syncErrorInWindow >= 10`
- `highPendingAging`: pendientes viejos `>= 20`
- `unknownRouteDetected`: `unknownRouteInWindow > 0`
- `suddenZeroLeads`: `leadsInWindow = 0` en ventana habitual

## Cómo interpretar

- **`assignedBy`**
  - `assigned_contact`: se asignó al contacto del aviso.
  - `publisher_user_fallback`: no había contacto asignado, se enruta al publicador.
  - `organization_fallback`: fallback a datos de organización.
  - `safe_ops_fallback`: fallback seguro sin usuario específico.
  - `unknown`: lead viejo o sin enrichment completo.
- **`syncStatus`**
  - `ok`: sincronizado con KiteProp.
  - `error`: hubo intento y falló (ver `lastError`).
  - `not_attempted`: no se intentó (ej. lead pendiente o integración no habilitada).

## Qué hacer si KiteProp falla

1. Confirmar que los leads se sigan guardando localmente (`leadsInWindow` crece).
2. Revisar `repeatedSyncErrors` y clasificar si es auth/contrato/red.
3. Corregir config/credenciales y reintentar activaciones pendientes según proceso operativo.
4. No pausar la captura: la persistencia local debe seguir siendo la fuente de verdad.
