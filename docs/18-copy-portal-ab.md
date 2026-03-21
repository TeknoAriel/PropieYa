# Copy del portal (A/B y reglas de lenguaje)

Los textos del home (hero, nav, destacados, cómo funciona) vienen de **packs** en `packages/shared/src/copy/portal-packs.ts`.

## Activar un pack

**Web (Vercel + local):**

```bash
NEXT_PUBLIC_PORTAL_COPY_PACK=regla_portal_v1
# o
NEXT_PUBLIC_PORTAL_COPY_PACK=variante_b_cercano
```

Cada pack tiene un **`title`** legible para pruebas de uso y aceptación.

## Mostrar el título en la UI (pruebas)

```bash
NEXT_PUBLIC_SHOW_COPY_PACK_LABEL=1
```

Aparece una franja arriba con el nombre del pack activo.

## Quitar una variante

Dejá solo `regla_portal_v1` como default y borrá o dejá de usar `variante_b_cercano` en env; para eliminar código, quitá el pack del archivo TypeScript y de `PORTAL_COPY_PACK_IDS`.
