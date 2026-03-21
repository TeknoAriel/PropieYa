# Referencia XML — mapeo para fichas de propiedad

## Fuente (Kiteprop / difusión tipo Zonaprop)

**URL del feed XML (guardar para cuando definamos el modelo de ficha en detalle):**

```
https://static.kiteprop.com/kp/difusions/13d87da051c790afaf09c7afd094f151d7d06290/zonaprop.xml
```

- **Propósito:** referencia de campos / estructura esperada en difusiones inmobiliarias (mapeo hacia `Listing` / ficha pública).
- **Estado:** solo referencia; la importación o sync **no está implementada** aún.
- **Nota:** si la URL devuelve error temporal, volver a intentar desde el navegador o pedir un export actualizado a la fuente.

## Próximos pasos (cuando se aborde)

1. Descargar el XML y listar nodos / atributos relevantes.
2. Tabla de equivalencias: XML → `packages/shared` (`Listing`, `features`, `media`, etc.).
3. Decidir si el ingest es batch (cron), manual (upload), o API.

## Relación con el código actual

- Ficha pública: `apps/web/src/app/propiedad/[id]/page.tsx`
- Schemas: `packages/shared/src/schemas/listing.ts`, tipos en `packages/shared/src/types/listing.ts`
