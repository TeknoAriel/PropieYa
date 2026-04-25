# Matriz QA — publicación, cupos, consultas (Propieya)

**Alcance:** flujos reales según política de perfiles; sin E2E automatizado en este doc (validación manual + trazas de código).  
**Última verificación lógica/código:** 2026-04-25.

## A. Dueño directo (`owner_publisher` + org `individual_owner`)

| # | Caso | Cómo validar | Resultado esperado | Resultado |
|---|------|--------------|-------------------|-----------|
| A1 | /publicar sin sesión | Navegador anónimo | Elegir dueño/inmo o "Ya tengo cuenta" | OK: tarjetas + CTA a registro |
| A2 | Registro owner + next=/publicar | `registro?intent=owner_publisher&next=%2Fpublicar` | Tras registro, redirect a login con `next` | OK: `register-content` empuja a login |
| A3 | Vuelve al flujo con sesión | Login → /publicar | Muestra perfil, cupo, calidad, enlace al panel | OK: `publicar-entry` + `auth.me` |
| A4 | Crea aviso, borrador | Panel /propiedades/nueva | Guarda draft | OK: `listing.create` |
| A5 | Publica | Ficha + Publicar con datos válidos y fotos mín. | pasa `assessListingPublishability` | OK: lógica existente |
| A6 | Tope 3 avisos | 3 ítems en org (no archiv/withdrawn) + intento 4.º | Error claro o bloqueo UI | OK: cupo 3; create FORBIDDEN; /publicar y panel deshabilitan "nueva" |
| A7 | Límite alcanzado — mensaje | /publicar con 3/3 | Título "Límite…", CTA a panel, texto contacto | OK: `PUBLISHER_UX_COPY` + refetch `me` (`staleTime: 0`) para no ver cache viejo post-login |

## B. Inmobiliaria

| # | Caso | Resultado esperado | Resultado |
|---|------|-------------------|-----------|
| B1 | /publicar o login inmobiliaria | Misma UX con cupo "sin tope fijo" salvo `listing_limit` en DB | OK: `effectiveListingLimit` null para agency sin límite |
| B2 | Panel: crear y publicar | Misma validación de calidad | OK |

## C. Bloqueos (calidad / cuenta)

| # | Caso | Resultado |
|---|------|----------|
| C1 | Sin fotos o pocas al publicar | `listing.publish` rechaza con issues (mensaje existente) | OK: publishability |
| C2 | Precio inválido / placeholder | Mismo | OK: `UNSUPPORTED_PRICE` en shared |
| C3 | Título o descripción corto | Mismo | OK: min length en config |
| C4 | Aviso vencido / obsoleto | Flujo de renovación en panel; no ficha pública "activa" con lead en aviso inactivo | `lead.create` requiere listing `active` — OK |
| C5 | Cuenta suspendida | `isPublisherOrganizationStatusBlocked` + no crear | OK: auth.me + `listing.create` |
| C6 | Sin perfil publicador (seeker) | /publicar indica registro de publicador o otro mail | OK |

## D. Consultas (ficha)

| # | Caso | Resultado |
|---|------|----------|
| D1 | Contacto asignado (KiteProp) | `preferredWhatsappPhone` + datos en ficha | OK: `kiteprop-listing-contact` + propiedad page |
| D2 | CTA WhatsApp | Link `wa.me` con texto prellenado | OK: ficha |
| D3 | Formulario modal | `lead.create` + error legible (formatTrpc) | Ajuste: `formatTrpcUserMessage` en `contact-modal` |
| D4 | Borrador local en form | localStorage `propieya:lead-draft:<listingId>` | Ajuste: contact-modal |
| D5 | Sync KiteProp | `scheduleKitepropLeadSync` si plan pago y lead activado | OK: `lead.ts` + `kiteprop-lead-sync` |

## Correcciones puntuales aplicadas (Sprint QA)

- `auth.me` en `/publicar` sin caché obsoleta tras login (`staleTime: 0`, `refetchOnMount`)
- `contact-modal`: mensajes tRPC vía `formatTrpcUserMessage` + persistencia de borrador + copy de aviso
- `lead.create`: `NOT_FOUND` con mensaje explícito si el aviso no está activo

**Pruebas manuales recomendadas (una vez en staging):** A6 end-to-end en UI; lead desde ficha con plan free vs pago; WhatsApp con número de prueba.
