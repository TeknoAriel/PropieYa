# Backlog: emprendimientos, multipaís, moneda y búsqueda

**Estado:** listado en `/emprendimientos` por **proyecto + unidades** (`development.listProjects`, ficha `/emprendimientos/[slug]`). Import: muchos avisos llegan como `apartments` en feed pero título «en pozo» — mapper corrige vía `matchDevelopmentUnitFromText`; reclasificar DB: `APPLY=1 ENV_FILE=apps/web/.env.prod.audit pnpm reclassify:development-units`. Ver `docs/68-KITEPROP-EMPRENDIMIENTOS-API-Y-PORTAL.md`.

---

## 1. Sección portal «Emprendimientos e inversiones»

- **Definición de negocio:** emprendimientos = edificios o unidades **en pozo** (sin entrega rápida), en la misma familia conceptual que **lotes** o **barrios** donde el horizonte de ocupación no es inmediato.
- **Portal:** una sección dedicada (evolucionar la página actual en `apps/web/src/app/emprendimientos/page.tsx`) con listado, filtros y ficha coherente con venta/alquiler.
- **Búsqueda «normal»** (`/buscar`, asistente, chips): debe poder **incluir o focalizar** emprendimientos además de stock con entrega inmediata, según intención del usuario.

---

## 2. Disponibilidad / horizonte de entrega

- Criterio frecuente: **entrega inmediata** vs **entrega en X años** (o rango).
- Filtros y modelo de datos deben expresar este eje; el **agente conversacional** debe interpretar frases del tipo «para dentro de dos años», «ya habitable», «en pozo», etc., y mapear a filtros o facetas.

---

## 3. Multipaís y moneda

- Preparar **país** y **moneda** en criterios de búsqueda, visualización de precios y respuestas del agente.
- **Heurística por defecto:** quien busca suele querer resultados **cerca de su zona** salvo que elija explícitamente **localidad**, **zona** o **país**.
- **Moneda habitual:** la del país donde se busca, o **USD** como alternativa común; el agente debe poder normalizar o aclarar cuando el usuario mezcla país y moneda en lenguaje natural.

---

## 4. Enlaces

- Sprints y orden: `docs/24-sprints-y-hitos.md`
- Norte portal: `docs/41-PROPUESTA-VALOR-PORTAL.md`
- Matriz maestra: `docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md`
