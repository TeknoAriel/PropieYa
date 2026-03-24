# Verificación de ingesta de propiedades

## Estado actual

- **101 propiedades activas** en la base de datos de producción
- Ingesta ejecutada con `./scripts/verificar-ingestion.sh --file=./scripts/fixtures/yumblin-test.json`
- Proyecto Vercel linkeado: `apps/web` → `propieya_web`

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

1. **Portal:** En Vercel → propieya_web → Domains → usar la URL asignada (ej. `propieya-web-xxx.vercel.app` o dominio custom)
2. **Home:** Debe mostrar "Propiedades destacadas" con las últimas publicadas
3. **Búsqueda:** `/buscar` — usa Elasticsearch si está configurado; si no, fallback a SQL (las 101 propiedades aparecen igual)

## Si Elasticsearch no indexa

Bonsai usa OpenSearch; el cliente `@elastic/elasticsearch` puede tener incompatibilidades. Opciones:

- Disparar el cron remoto (requiere CRON_SECRET):  
  `curl -H "Authorization: Bearer $CRON_SECRET" https://TU-URL/api/cron/sync-search`
- O evaluar migrar a `@opensearch-project/opensearch` para compatibilidad con Bonsai

La búsqueda funciona sin ES (fallback a SQL); las propiedades se ven en home y en `/buscar`.
