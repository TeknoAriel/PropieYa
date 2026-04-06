# Verificación de ingesta de propiedades

## Estado actual

- **101 propiedades activas** en la base de datos de producción
- Ingesta ejecutada con `./scripts/verificar-ingestion.sh --file=./scripts/fixtures/yumblin-test.json`
- Proyecto Vercel linkeado: `apps/web` → `propie-ya-web`

## Cómo ejecutar la verificación

Desde la raíz del repo:

```bash
./scripts/verificar-ingestion.sh
```

O con archivo de datos:

```bash
./scripts/verificar-ingestion.sh --file=./scripts/fixtures/yumblin-test.json
```

El script hace:
1. `vercel env pull` (requiere `vercel link` en apps/web)
2. Import de propiedades (feed remoto o archivo)
3. Publicación de drafts importados
4. Sync a Elasticsearch (remoto vía cron o local)
5. Limpieza

## Dónde verificar

1. **Portal:** URL canónica `https://propieyaweb.vercel.app` (proyecto `propie-ya-web` en Vercel; ver `docs/DEPLOY-CONTEXTO-AGENTES.md`)
2. **Home:** Debe mostrar "Propiedades destacadas" con las últimas publicadas
3. **Búsqueda:** `/buscar` — usa Elasticsearch si está configurado; si no, fallback a SQL (las 101 propiedades aparecen igual)

## Si el índice de búsqueda no indexa

Bonsai usa OpenSearch: el portal usa `@opensearch-project/opensearch` cuando la URL es Bonsai o `USE_OPENSEARCH=1` (ver `apps/web/src/lib/search/listing-search-engine.ts` y `docs/34-ELASTICSEARCH-BONSAI-CONFIG.md`).

- Cron remoto (requiere `CRON_SECRET`):  
  `curl -H "Authorization: Bearer $CRON_SECRET" https://propieyaweb.vercel.app/api/cron/sync-search`
- Local: `ENV_FILE=apps/web/.env.prod.verificar pnpm reindex:bonsai`

La búsqueda funciona sin índice (fallback a SQL); las propiedades se ven en home y en `/buscar`.
