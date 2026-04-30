# Launch readiness — Portal Propieya

**Tipo:** checklist única de validación pre-apertura y guía de QA manual breve.  
**Alcance:** `apps/web`, `apps/panel`, integraciones documentadas. **No** sustituye monitoreo continuo ni pen tests.

**URLs canónicas (producción):** ver `docs/CANONICAL-URLS.md`.

---

## 1. Auditoría de estado real (T1)

Valoración basada en **código e infraestructura documentada** en el repo; la confirmación final es **en producción/staging** con la checklist §3.

| Frente | Valoración | Comentario breve |
|--------|------------|------------------|
| A. Búsqueda | **OK p/ lanzamiento** (riesgo op.) | `listing.search`, relajación y mapa documentados; UI 24/48/96 en `/buscar`. Exige `DATABASE_URL` + ES opcional; sin DB es **bloqueante operativo**. |
| B. Ficha | **OK p/ lanzamiento** | Galería con índice, lightbox, swipe, similares y contacto en `propiedad/[id]`. |
| C. Cuenta comprador | **Riesgo medio** | Registro/login y `mis-alertas` / perfil existen; validar flujos reales (email, cookies, redirect). |
| D. Publicador | **Riesgo medio** | `/publicar` y flujo en panel: validar reglas de calidad, cupo y KiteProp según `docs/59` si aplica. |
| E. Comercial (upgrades) | **Riesgo medio** | Pago + webhook + notificaciones implementados; requiere credenciales MP y `RESEND_*` para email real. |
| F. Leads / consultas | **OK p/ lanzamiento** | CTA ficha y modal; sin abrir “leads pagos” en este cierre. |
| G. Webhook propiedades | **Riesgo medio** | Rutas bajo `api/webhooks` y crons: validar secretos y payload en entorno real. |
| H. Health / operaciones | **OK p/ lanzamiento** | `GET /api/health` (web) y `GET /api/health` (panel) verifican DB. |

**Bloqueantes típicos (no siempre visibles en código):**

- `DATABASE_URL` ausente o incorrecta en Vercel → `503` en `/api/health` y portal vacío/inestable.
- `TRUSTED_PANEL_ORIGINS` mal alineado al dominio del panel → errores tRPC / CORS.
- Secretos de webhook/MP/KiteProp incorrectos en prod.

**Conclusión T1:** En **código** no se identificó un fallo lógico único que imposibilite abrir; el riesgo principal es **configuración y verificación de extremo a extremo** antes del anuncio público.

---

## 2. Checklist de lanzamiento (T2)

Marcar en prod/staging. Leyenda: `☐` pendiente · `☑` ok · `N/A` no aplica.

### A. Búsqueda (`/buscar`)

- [ ] Búsqueda amplia (solo operación o zona muy genérica) devuelve resultados o mensaje claro.
- [ ] Búsqueda acotada por **ciudad** (ej. CABA, Rosario) devuelve resultados coherentes.
- [ ] Búsqueda por **barrio o localidad** (según dato en filtros) refina bien.
- [ ] Si existe **búsqueda por código** en el producto actual, validar 1–2 códigos reales.
- [ ] Paginación o tamaño de página **24 / 48 / 96** cambia la cantidad mostrada.
- [ ] “Exactos” vs ampliados / relajación: con filtros estrictos, comprobar mensaje o resultados ampliados según `docs/50` / copy del buscador.
- [ ] (Opcional) **Mapa**: mover bbox y alinear con lista.

### B. Ficha (`/propiedad/[id]`)

- [ ] Carga título, precio, datos clave, descripción.
- [ ] **Galería:** foto principal, cambio por **miniaturas** y **anterior/siguiente**.
- [ ] Clic en área principal abre **lightbox**; cierre (botón, Escape, o fondo) funciona.
- [ ] **Mobile:** swipe o flechas; sin corte de UI crítico.
- [ ] **Contacto** abre flujo (modal) sin error 500.
- [ ] Tira `portalVisibility` (si aplica a la ficha) coherente con anuncio.
- [ ] Sección **similares** (si hay inventario) enlaza a otra ficha.

### C. Cuenta comprador (portal)

- [ ] **Registro** (ruta pública de registro) completa o muestra error entendible.
- [ ] **Login** (y sesión persistente) ok.
- [ ] Tras login, **redirect** razonable (misma ficha o `/buscar` según flujo).
- [ ] **Búsquedas guardadas / alertas** (ruta `mis-alertas` u otra pública acordada): listar, crear, desactivar si el producto lo ofrece.
- [ ] **Perfil de demanda** carga y guarda sin error bloqueante.

### D. Publicador

- [ ] Página pública **Publicar** (`/publicar`) carga; enlaces a login/registro funcionan.
- [ ] **Panel** login, dashboard accesible.
- [ ] **Crear / editar** aviso (flujo mínimo).
- [ ] **Borrador** guarda si el flujo existe.
- [ ] **Publicar** y ver aviso en portal o mensaje de moderación/estado.
- [ ] Rechazo o **bloqueo** por calidad, cupo o perfil: mensaje claro (no fallo crudo tRPC).
- [ ] **Renovar** o extender según reglas de negocio vigentes.

### E. Comercial (panel)

- [ ] Solicitar **upgrade por aviso** (flujo mínimo).
- [ ] Solicitar **paquete** (si aplica a la org).
- [ ] **Pago** (sandbox o real según entorno) y vuelta sin estado roto.
- [ ] Tras aprobación, **activación** o mensaje de reconciliación acorde a `upgrades` / sección de compras.
- [ ] Revisar **“Mis compras / Mis upgrades”** y, si aplica, **reintento / cancelar / renovar** sin 500.
- [ ] (Opcional) notificaciones del ciclo de upgrade visibles o email si Resend está configurado.

### F. Integraciones y operación

- [ ] **Health portal:** `GET /api/health` → `200` y `checks.database.status: ok` (o investigar 503).
- [ ] **Health panel:** `GET` health del panel → `200`.
- [ ] **`/api/version`** en portal: `commit` coincide con el despliegue esperado (ver `AGENTS.md` y workflow Promote).
- [ ] **Webhook** de propiedades/ingest: prueba o log reciente acepta payload (no 401/500 indiscriminado); ver docs de ingesta.
- [ ] **KiteProp / lead sync:** solo si aplica a la cuenta: ver reglas de integración en docs internos, sin bloquear launch si el portal funciona en modo autónomo.

---

## 3. Guía de QA manual corta (T4) — 15–20 minutos

Destinatario: alguien con acceso a **navegador** y, si hace falta, **una cuenta de prueba** (comprador y otra publicador). Hacer en **producción** o **preview** con URL fijada al inicio.

1. **Abrir** `https://propieyaweb.vercel.app` → carga el home con cabecera y buscador. **OK =** sin error en blanco. *(No evaluar estética del home.)*  
2. **Ir a** `…/api/health` → **OK =** JSON con `status: "healthy"`. **Si 503,** detener e informar (DB).  
3. **Ir a** `…/api/version` → anotar `commit` (7 chars). **OK =** responde JSON.  
4. **Buscar** `/buscar` → una búsqueda sencilla (ej. alquiler + una ciudad) → **OK =** resultados o mensaje vacío con controles. Cambiar a **48** resultados.  
5. **Ficha** → abrir la primera propiedad; **OK =** precio, fotos, botón de contacto. Tocar **flechas** de galería y abrir **visor grande**; cerrar.  
6. **Cuenta** (si aplica) → `Registro` o `Login` desde enlace de cabecera → **OK =** vuelve al sitio. Abrir `mis-alertas` (o ruta de alertas) en sesión. **Si no hay credenciales,** marcar “N/A con observación”.  
7. **Publicar** en una pestaña nueva: `/publicar` → **OK =** CTA a login.  
8. **Panel** (URL de `docs/CANONICAL-URLS.md`) → login, vista principal **OK =** sin error de CORS. Abrir sección de **upgrades o propiedades** mínima.  
9. **Cierre** → anotar cualquier error visible en consola de red (403/500 en tRPC) para el release manager.

**“Todo OK”** para esta guía: pasos 2, 3, 4, 5 y 8 sin fallos; el resto según cuentas disponibles.

---

## 4. Bugs bloqueantes corregidos en esta tarea (T3)

- En la iteración que añade **solo este documento**, no se corrigió código de aplicación: no se identificó **bug crítico** de implementación exigible sin reproducir en runtime.
- Los **bloqueantes reales** suelen ser **entorno** (ver §1 y §3 paso 2). Resolverlos es previo a declarar go-live comercial.

---

## 5. Estado final de lanzamiento (T5) — plantilla a completar

Tras ejecutar la checklist §2 o la guía §3 en **producción** con el commit desplegado:

- **Listo para lanzar**  
  o  
- **Listo con observaciones** (anotar en §6 “Observaciones”)

**Bloqueantes restantes (si quedan):**  
*…completar tras QA…*

**Riesgos medios:** entorno, email no configurado, ES degradado, límites Vercel (ver `docs/DEPLOY-CONTEXTO-AGENTES.md`).

**Mejoras pospost-lanzamiento (no retrasan apertura):** refinamientos de copy, monitoreo APM, golden tests de búsqueda ampliados, etc.

---

## 6. Cumplimiento (T6)

| Ítem | Estado |
|------|--------|
| Checklist y guía en repo | `docs/60-LAUNCH-READINESS-PORTAL.md` |
| Cambios de producto (home/buscador/monet/panel no esencial) | Ninguno en la iteración doc-only |
| Buscador / motor | Sin modificaciones de código asociado a este documento |
| Despliegue y `/api/version` | Tras `push` a rama de deploy, verificar `commit` vía `curl` / `pnpm verificar:deploy` según `AGENTS.md` |

**Verificación de commit desplegado (operador):**

```bash
curl -sS https://propieyaweb.vercel.app/api/version
# Comparar "commit" con: git rev-parse --short HEAD
```

Si el `commit` en producción **no** coincide con el del repo, el **Promote** / Vercel no desplegó aún: revisar Actions y cola de despliegue, no reabrir búsqueda o home sin bug crítico.

---

## 7. Si no podés registrarte ni publicar (error de base de datos)

Síntoma: en registro o login aparece un error de **tablas faltantes** / `relation does not exist` (o en Vercel un mensaje genérico de servicio no disponible).

**Causa:** el proyecto de Vercel usa un `DATABASE_URL` cuyo PostgreSQL **no tiene el esquema Drizzle aplicado**.

**Acción (quien administra Neon/DB):**

1. Copiar `DATABASE_URL` **exacta** de Vercel → proyecto **web** (y la del **panel** si difiere).
2. En máquina con el repo: `pnpm db:push` o migraciones documentadas, apuntando a esa URL (o ejecutar el SQL equivalente en el SQL editor de Neon).
3. Verificar `GET https://propieyaweb.vercel.app/api/health` → `status: "healthy"`.
4. Reintentar registro y publicar.

Sin este paso, el **panel B2B** tampoco puede operar aunque la UI exista (no es “panel sin terminar” por front: suele ser el mismo bloqueo de datos).

---

## Referencias

- `AGENTS.md` — CI, deploy, `verificar:deploy`  
- `docs/CANONICAL-URLS.md`  
- `docs/50-BUSCADOR-PORTAL-ESTABILIDAD-Y-FALLBACK.md`  
- `docs/REGISTRO-BLOQUEOS.md` — incidencias externas conocidas  
