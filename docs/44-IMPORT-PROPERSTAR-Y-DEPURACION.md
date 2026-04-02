# Import Properstar (Kiteprop) y depuración de base

**Feed canónico (default en código):**  
`https://static.kiteprop.com/kp/difusions/f89cbd8ca785fc34317df63d29ab8ea9d68a7b1c/properstar.json`

Sobrescribible con **`YUMBLIN_JSON_URL`** en Vercel o `.env`.

---

## 1. Schema

Tras pull, aplicar columna nueva:

```bash
pnpm db:push
```

Crea **`listings.import_source_updated_at`**: copia de la **`last_update`** del ítem en el feed para decidir si se omite el reprocesado de ese `external_id`.

---

## 2. Comportamiento

| Tema | Detalle |
|------|--------|
| Descarga | El JSON sigue siendo **único** (no hay API por ID). Se ahorra **CPU/DB** omitiendo ítems cuyo `last_update` coincide con lo guardado. |
| Bajas | Si un `external_id` importado **no** aparece en el JSON, pasa a **`withdrawn`** (no visible en búsqueda). Con **`IMPORT_WITHDRAW_SCOPE=org`** (default recomendado con **un** feed), aplica a **toda** la org; con `source`, solo filas del mismo `import_feed_sources`. |
| Elasticsearch | El cron llama **`removeListingFromSearch`** por cada ID dado de baja en ese run. |
| Legado Yumblin | Otro `feed_url` en `import_feed_sources` o `YUMBLIN_JSON_URLS` sigue funcionando; con **varios** feeds, las bajas **no** usan scope org (evita borrar avisos de otro feed). |

---

## 3. Depuración al cambiar de feed (misma org)

1. Definir **`YUMBLIN_JSON_URL`** al nuevo JSON (o confiar en el default Properstar).
2. **`IMPORT_WITHDRAW_SCOPE=org`** en producción si solo hay un feed.
3. Ejecutar un sync completo: cron o `pnpm import:yumblin` (con `IMPORT_SYNC_ENFORCE_INTERVAL=false` en Vercel solo si hace falta forzar).
4. Opcional: **`pnpm reindex:es`** si hubo muchas bajas y el índice quedó con restos.

Listados antiguos del feed viejo que ya no estén en el JSON quedan **`withdrawn`** en el próximo sync completo (no hace falta borrar filas a mano salvo casos raros).

---

## 4. Vercel

En el proyecto **web** (Production): `YUMBLIN_JSON_URL`, `IMPORT_WITHDRAW_SCOPE`, `CRON_SECRET`, `DATABASE_URL`, etc., como en `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md`.
