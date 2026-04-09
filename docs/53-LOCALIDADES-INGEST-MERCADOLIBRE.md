# Localidades: ingest tipo Mercado Libre (backlog)

## Estado actual

- El portal arma un **catálogo vivo** desde avisos activos: pares `city` / `neighborhood` en `address` (JSON), agregados en SQL, y los **fusiona** con una lista corta de ciudades y barrios frecuentes (`mergeLocalityCatalogWithStaticSupplements` en `@propieya/shared`) para que el modal y el asistente sigan siendo útiles aunque el feed aún no cargue esa zona. Expuesto en `listing.localityCatalog` y en el pipeline conversacional.

## Objetivo futuro

- **Ingest periódico** de localidades normalizadas siguiendo un estándar de referencia alto (p. ej. jerarquía y nombres alineados a **Mercado Libre** u otro proveedor con cobertura multi-país), para:

  - reducir duplicados y variantes (“CABA” vs “Capital Federal”),
  - mapear IDs externos estables,
  - mejorar matching entre feeds y búsqueda.

## Notas de implementación (cuando se aborde)

- Tabla o materialized view de `locality_id`, `country`, `parent_id`, `label`, `aliases[]`, `source`, `updated_at`.
- Job de sync (cron o cola) con límites de API y versionado.
- El buscador puede seguir mostrando primero el catálogo “en producción” (avisos) y fusionar sugerencias del ingest como segunda capa.

No requiere cambiar el flujo de deploy documentado en `docs/DEPLOY-PASOS-URIs.md`.
