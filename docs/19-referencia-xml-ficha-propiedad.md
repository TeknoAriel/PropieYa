# Referencia XML/JSON — mapeo para fichas de propiedad

## Fuentes Kiteprop (para importar cuando haga falta)

### Feed XML (Zonaprop)

```
https://static.kiteprop.com/kp/difusions/13d87da051c790afaf09c7afd094f151d7d06290/zonaprop.xml
```

### Feed JSON (Yumblin)

```
https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json
```

- **Propósito:** referencia de campos / estructura esperada en difusiones inmobiliarias (mapeo hacia `Listing` / ficha pública).
- **Nota:** si la URL devuelve error temporal, volver a intentar desde el navegador o pedir un export actualizado a la fuente.

### Importar JSON (Yumblin)

Script: `pnpm import:yumblin`

```bash
# Desde URL (default)
DATABASE_URL=postgres://... pnpm import:yumblin

# Desde archivo local
pnpm import:yumblin -- --file=./yumblin.json

# Con org/usuario específicos (opcional; si no, usa la primera org y miembro)
IMPORT_ORGANIZATION_ID=xxx IMPORT_PUBLISHER_ID=yyy pnpm import:yumblin
```

Mapper: `packages/shared/src/xml/yumblin-mapper.ts`. Ajustar `getValue` / keys si el feed tiene otra estructura.

## Próximos pasos (cuando se aborde)

1. Descargar el XML y listar nodos / atributos relevantes.
2. Tabla de equivalencias: XML → `packages/shared` (`Listing`, `features`, `media`, etc.).
3. Decidir si el ingest es batch (cron), manual (upload), o API.

## Relación con el código actual

- Ficha pública: `apps/web/src/app/propiedad/[id]/page.tsx`
- Schemas: `packages/shared/src/schemas/listing.ts`, tipos en `packages/shared/src/types/listing.ts`
- **Stub de mapeo (aliases por campo lógico):** `packages/shared/src/xml/property-ficha-map.ts` (`XML_LISTING_FIELD_ALIASES`, `listXmlFieldAliases`)
- **Mapper JSON Yumblin:** `packages/shared/src/xml/yumblin-mapper.ts` (`mapYumblinItem`, `extractListingsFromFeed`)
