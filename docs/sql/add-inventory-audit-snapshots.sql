-- Snapshots diarios de auditoría de inventario (cron inventory-audit).
-- Idempotente: una fila por día UTC; re-ejecución actualiza la misma fila.

CREATE TABLE IF NOT EXISTS inventory_audit_snapshots (
  snapshot_date DATE PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb
);
