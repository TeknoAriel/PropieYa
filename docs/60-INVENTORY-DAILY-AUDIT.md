# Auditoría diaria de inventario

Cron HTTP: **`GET /api/cron/inventory-audit`** (Vercel: `15 7 * * *` UTC, ver `apps/web/vercel.json`).

## Auth

Si existe `CRON_SECRET` en el entorno, enviar:

`Authorization: Bearer <CRON_SECRET>`

## Qué hace

- Lee el feed JSON canónico (`YUMBLIN_JSON_URL` o default Properstar) y cuenta ítems con `extractListingsFromFeed`.
- Agrega conteos en tabla `listings` por `status` y totales clave (`active`, `withdrawn`, `rejected`, `suspended`, `draft`).
- Opcional: activos en Rosario (venta / alquiler) vía `address->>'city'`.
- Compara con el **último snapshot anterior** en `inventory_audit_snapshots` (no necesariamente el día calendario previo si hubo fallos).
- Upsert idempotente por **`snapshot_date` (UTC, fecha del día de ejecución)**.
- Log estructurado en stdout: una línea JSON con `event: "inventory_daily_audit"`.
- Telemetría: `portal_stats_events` con terminal `inventory.audit.daily`.
- Webhook opcional: `INVENTORY_AUDIT_WEBHOOK_URL` (+ `INVENTORY_AUDIT_WEBHOOK_SECRET` como Bearer si aplica).

## Esquema DB

Parche SQL: `docs/sql/add-inventory-audit-snapshots.sql` (también en `manifest.txt`). Drizzle: `inventory_audit_snapshots` en `@propieya/database`.

**Producción:** ejecutar ese SQL una vez en Neon (o `pnpm db:push` en un entorno con la misma URL) **antes** del primer cron; si la tabla no existe, el endpoint responde 500 al intentar el upsert.

## Umbrales (env)

| Variable | Default | Uso |
|----------|---------|-----|
| `INVENTORY_AUDIT_ACTIVE_DROP_PCT_ALERT` | `5` | Alerta si `active` baja ≥ este % vs snapshot anterior. |
| `INVENTORY_AUDIT_WITHDRAWN_RISE_PCT_ALERT` | `20` | Alerta si `withdrawn` sube ≥ este % vs snapshot anterior. |
| `INVENTORY_AUDIT_DANGEROUS_ABS_DELTA_ACTIVE` | `1000` | Alerta si caída absoluta de `active` ≥ este número. |
| `INVENTORY_AUDIT_ALERT_FEED_ZERO` | `true` | Alerta `feed_count_zero` si el feed parsea a 0 ítems (sin error HTTP). |
| `INVENTORY_AUDIT_ALERT_FEED_FETCH_FAIL` | `true` | Alerta `feed_fetch_failed:…` si falla descarga o parseo. |
| `INVENTORY_AUDIT_FEED_TIMEOUT_MS` | `45000` | Timeout del fetch del feed (máx. 120000). |
| `INVENTORY_AUDIT_FEED_URL` | — | Override de URL de feed solo para esta auditoría (si no hay `YUMBLIN_JSON_URL`). |

## Ejemplo de respuesta JSON (200)

```json
{
  "ok": true,
  "snapshot_date_utc": "2026-04-24",
  "alerts": ["feed_count_zero"],
  "metrics": {
    "feed_count": 0,
    "feed_error": null,
    "db_total": 27891,
    "active_total": 24592,
    "withdrawn_total": 120,
    "rejected_total": 45,
    "suspended_total": 12,
    "draft_total": 800,
    "rosario_active_sale": 2100,
    "rosario_active_rent": 400,
    "by_status": { "active": 24592, "withdrawn": 120 },
    "previous_snapshot_date_utc": "2026-04-23",
    "delta_active_vs_previous": -3,
    "delta_active_percent_vs_previous": -0.01,
    "delta_withdrawn_vs_previous": 2,
    "delta_withdrawn_percent_vs_previous": 1.69,
    "delta_feed_vs_previous": 0,
    "thresholds": {
      "active_drop_pct": 5,
      "withdrawn_rise_pct": 20,
      "dangerous_abs_delta_active": 1000,
      "alert_feed_zero": true,
      "alert_feed_fetch_fail": true
    }
  }
}
```

## Ejemplo de línea de log

```json
{"event":"inventory_daily_audit","snapshot_date_utc":"2026-04-24","feed_count":0,"db_total":27891,"active_total":24592,"withdrawn_total":120,"alerts":["feed_count_zero"]}
```
