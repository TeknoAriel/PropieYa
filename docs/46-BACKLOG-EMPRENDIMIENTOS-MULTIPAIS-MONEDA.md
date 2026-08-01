# Backlog: emprendimientos, multipaís, moneda y búsqueda

**Estado:** listado en `/emprendimientos` por **proyecto + unidades** (`development.listProjects`, ficha `/emprendimientos/[slug]`). Import: muchos avisos llegan como `apartments` en feed pero título «en pozo» — mapper corrige vía `matchDevelopmentUnitFromText`; reclasificar DB: `APPLY=1 ENV_FILE=apps/web/.env.prod.audit pnpm reclassify:development-units`. Títulos genéricos («Departamento») se **desambiguan** con barrio/calle y se ignoran claves `departamento|ciudad` persistidas (`resolveDevelopmentProjectIdentity`). Ver `docs/68-KITEPROP-EMPRENDIMIENTOS-API-Y-PORTAL.md`.

---

## 1. Sección portal «Emprendimientos e inversiones»

- **Definición de negocio:** emprendimientos = edificios o unidades **en pozo** (sin entrega rápida), en la misma familia conceptual que **lotes** o **barrios** donde el horizonte de ocupación no es inmediato.
- **Portal:** listado con filtro **Entrega** (`?entrega=pozo|proxima`): pozo/obra vs a estrenar / < ~6 meses (`inferDevelopmentDeliveryHorizon`).
- **Búsqueda «normal»** (`/buscar`, asistente, chips): «en pozo» / «para dentro de N años» + tipología → `development_unit` vía `matchDevelopmentUnitFromText`.

---

## 2. Disponibilidad / horizonte de entrega

- **Hecho (v0):** filtro en `/emprendimientos` + badge de horizonte; parseo de `deliveryDate` (JUNIO 2027, ISO, etc.).
- **Hecho (v1):** facet `?entrega=pozo|proxima` en `/buscar` (sesión v2 + SQL/ES); el asistente / `q` entiende «ya habitable» vs «en pozo» / «para dentro de N años» (`extractDeliveryHorizonFilterFromQuery`).
- **Hecho (v2):** multi-turno: `entrega` viaja en `previousContext` / `sessionStorage` del bloque conversacional; chips «Ya habitable» / «En pozo»; golden A#13a/b.

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
