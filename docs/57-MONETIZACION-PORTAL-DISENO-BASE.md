# Monetización del portal — diseño base (Parte 7)

**Objetivo:** preparar arquitectura de producto y técnica para **ingresos medibles** (inmobiliarias, propietarios, leads) **sin romper UX** ni mezclar publicidad con relevancia de forma opaca.

**Relacionado:** `docs/49-ARQUITECTURA-PANEL-ESTADISTICAS-Y-TELEMETRIA.md`, `PORTAL_STATS_TERMINALS`, tabla `leads`, búsqueda ES (`apps/web/src/lib/search/query.ts`).

---

## 1. Principios (reglas duras)

1. **Relevancia primero, boost comercial acotado**  
   El usuario debe percibir resultados “útiles”; el boost pago solo **reordena dentro de un techo** o **sube posiciones** sin ocultar matches fuertes. Ver §3.

2. **Contacto solo por canal interno**  
   No exponer teléfono/email del publicador en HTML público hasta que reglas de negocio (plan, verificación, pago) lo permitan. El flujo por defecto: **CTA → formulario / mensaje → fila `leads` → notificación al publicador**.

3. **Trazabilidad por eventos**  
   Cada paso del embudo usa **terminales canónicos** (`PORTAL_STATS_TERMINALS`) + payload mínimo sin PII en analytics; PII solo en dominio `leads` / usuarios.

4. **Planes como capacidades, no como bifurcaciones de código infinitas**  
   Tabla (futura) tipo `organization_entitlements` o flags en `organizations`: límites numéricos + feature flags. El código pregunta “¿puede X?” no “¿es plan Oro?”.

---

## 2. Modelos de negocio (diseño)

### 2.1 Inmobiliarias (B2B)

| Elemento | Descripción |
|----------|-------------|
| **Planes** | Límites: avisos activos, usuarios, zonas, destacados/mes, **boost máximo** (ver §3). |
| **Ranking mejorado** | Boost controlado en ES (campo + cap) o capa de re-ranking post-query. |
| **Facturación** | Fuera de este doc (MP, Stripe, manual); el portal solo lee **estado de suscripción** y entitlements. |

### 2.2 Propietarios (B2C / self-serve)

| Elemento | Descripción |
|----------|-------------|
| **Base** | Publicación gratuita o de bajo costo con visibilidad estándar. |
| **Upsells** | Destacado temporal, más fotos, boost leve, “urgente”, visitas agendadas — siempre con **CTA claro** y sin oscurecer listados gratuitos de forma engañosa. |

### 2.3 Leads (core monetizable)

| Elemento | Descripción |
|----------|-------------|
| **Sistema interno** | Ya existe núcleo en `leads` (org, listing, contacto, mensaje, estado). Ampliar con `source`, gating y métricas. |
| **Contacto controlado** | Portal muestra “Contactar”; **no** datos directos salvo política explícita (ej. plan premium + opt-in del publicador). |
| **Activación** | Lead completo / entrega de dato / número de contactos/mes según plan; **feature flags** por org. |

---

## 3. Ranking: relevancia + boost comercial (sin “hacer trampa”)

### 3.1 Idea operativa

- **Score base** = lo que ya produce ES hoy (`_score` con texto, intent, facets, etc.).
- **Score comercial** = función acotada de un campo indexado (ej. `promoBoost` 0…`B_MAX` por plan).
- **Score final** = `f(scoreBase, scoreComercial)` con **techo** y **boost_mode** que no aplaste la relevancia.

Ejemplos de política (elegir una y documentar en producto):

- **Suma acotada:** `final = scoreBase + min(promoBoost, capOrg)` con `capOrg` según plan.  
- **Multiplicador suave:** `final = scoreBase * (1 + min(promoBoost, 0.15))` (máx. +15%).

### 3.2 Implementación futura en código

1. Indexar en documento ES (y en SQL para fallback) un número **`listingPromoBoost`** o **`orgBoostWeight`** normalizado.  
2. En `buildSearchBody`, envolver la query en `function_score` solo cuando exista inventario con boost > 0 **y** flag de producto “monetización activa”.  
3. **Tests:** mismos filtros con/sin boost — los avisos con match débil no deben superar match fuerte solo por boost.

### 3.3 Transparencia UX (recomendado)

- Etiqueta opcional “Destacado” / “Patrocinado” en cards (cumplimiento y confianza).

---

## 4. Contacto y leads (flujo)

```
Usuario → CTA "Contactar" → (opcional: auth / captcha) → Formulario
       → POST lead → `leads` + notificación al publicador
       → Panel: pipeline del lead
```

- **Gating:** middleware o procedimiento tRPC que valide `organization.canReceiveLeads`, cupo mensual, etc.  
- **Tracking:** terminal `LEAD_SUBMITTED` ya existe; añadir clics previos (§5).

---

## 5. Métricas y terminales

### 5.1 Embudo mínimo

| Métrica | Fuente sugerida | Terminal / tabla |
|--------|------------------|------------------|
| Impresiones listado | Agregado ES o muestreo | Futuro: batch / `listing.impression` (diseño) |
| Vista ficha | Ya | `listing.ficha.view` |
| Clic resultado → ficha | Nuevo | `listing.search.result_click` |
| Inicio contacto | Nuevo | `listing.contact.cta_click` |
| Lead creado | Ya | `lead.submitted` |
| Conversión | Agregado | `leads.converted` / estado en `leads` |

### 5.2 KPIs de monetización (panel)

- **Por org:** leads/mes, CPL implícito, uso de boost, CTR resultados → ficha.  
- **Por listing:** vistas, clics contacto, leads, tasa lead/vista.

Los IDs nuevos viven en `PORTAL_STATS_TERMINALS` (código); este doc solo fija el **contrato**.

---

## 6. Fases de implementación (orden sugerido)

1. **Fase A — Telemetría embudo:** cablear `result_click` y `contact.cta_click` en web (sin cambiar UX).  
2. **Fase B — Entitlements:** tabla/JSON por org + lectura en API de listados y leads.  
3. **Fase C — Boost ES:** campo + `function_score` con cap + tests.  
4. **Fase D — Gating contacto:** ocultar datos directos; mensajes solo vía lead.  
5. **Fase E — Billing:** integración externa; flags `subscription_status`.

---

## 7. Lo que no hace este documento

- Precios, packs comerciales, textos legales.  
- Implementación de pasarela de pago.  
- Cambios de schema migración (salvo que un sprint lo declare).

---

*Parte 7 — diseño base. Actualizado al añadir terminales de embudo en `@propieya/shared`.*
