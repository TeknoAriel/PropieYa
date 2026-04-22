# Auditoría API KiteProp e integración portal

**Fecha:** 2026-04-22  
**Objetivo:** integrar propiedades/contacto/consulta de forma desacoplada sin inventar contratos.

---

## 1) Auditoría de endpoints reales

> Fuentes usadas:
> - feed real: `https://static.kiteprop.com/.../properstar.json`
> - verificación REST sin API key (respuesta `Unauthenticated` en endpoints existentes)
> - documentación pública MCP: [mcp.kiteprop.com](https://mcp.kiteprop.com/)
>
> Nota: en este entorno local no había `KITEPROP_API_KEY`, por eso no se pudo confirmar schema completo de respuesta REST autenticada.

| Endpoint | Método | Auth | Campos confirmados | Uso en Propieya |
|---|---|---|---|---|
| `/api/v1/profile` | GET | `X-API-Key` | endpoint existe (sin key responde `Unauthenticated`) | perfil de cuenta KiteProp (diagnóstico/integración) |
| `/api/v1/properties` | GET | `X-API-Key` | endpoint existe; feed real confirma shape de propiedades (id, public_code, title, content, city, neighborhood, images, agency, agent, etc.) | listado y fallback de detalle por `id/public_code` |
| `/api/v1/properties/{id}` | GET | `X-API-Key` | endpoint existe (sin key responde `Unauthenticated`) | detalle de propiedad |
| `/api/v1/contacts` | GET/POST | `X-API-Key` | endpoint existe (sin key responde `Unauthenticated`) | alta/búsqueda de contacto (lead/contacto) |
| `/api/v1/messages` | GET/POST | `X-API-Key` | endpoint existe (sin key responde `Unauthenticated`) | registrar consulta vinculada a propiedad/contacto |
| `/api/v1/leads` | GET/POST | `X-API-Key` | **no confirmado** (404 en sondeo sin key) | legado (mantener solo compatibilidad) |

---

## 2) Payload real observado (propiedades)

Del feed real de KiteProp/Properstar (muestra):

- Identidad: `id`, `public_code`, `last_update`
- Contenido: `title`, `content`, `property_type`, `property_type_old`
- Ubicación: `country`, `region`, `city`, `neighborhood`, `zone`, `address`, `latitude`, `longitude`
- Precios y operación: `for_sale`, `for_sale_price`, `for_rent`, `for_rent_price`, `for_temp_rental`, `currency`
- Atributos: `bedrooms`, `bathrooms`, `half_bathrooms`, `total_meters`, `covered_meters`, `semi_covered_meters`, etc.
- Media: `images[]` con `url`
- Contacto/owner del aviso:
  - `agent`: `id`, `name`, `email`, `phone`, `phone_whatsapp`, `avatar`
  - `agency`: `id`, `name`, `email`, `phone`, `logo`, `website`

Prioridad de contacto asignado implementada:
1. `assigned_user`
2. `user`
3. `agent`
4. `broker`
5. `advisor`
6. `seller_contact`
7. fallback a `agency`

---

## 3) Decisiones de integración

1. **Capa desacoplada:** `apps/web/src/lib/integrations/kiteprop-properties.ts`
   - `getPropertiesFromKiteProp(filters)`
   - `getPropertyByIdFromKiteProp(id)`
   - `getPropertyAssignedContact(property)`
   - `mapKitePropPropertyToPortalListing(raw)`
   - `mapKitePropContact(raw)`
   - `createPropertyInquiryInKiteProp(payload)` (guardado por flags)

2. **Sin inventar contrato de POST:**  
   `createPropertyInquiryInKiteProp` queda desactivado por defecto y exige `KITEPROP_ENABLE_INQUIRY_POST=1`.  
   Esto evita enviar payloads no confirmados.

3. **Contacto asignado en ficha:**  
   Se toma de `features.kitepropAssignedContact` (persistido en import) y opcionalmente se enriquece por API si:
   - `source === import`
   - hay `externalId`
   - `KITEPROP_API_KEY` presente
   - `KITEPROP_ENRICH_LISTING_CONTACT=1`

4. **WhatsApp correcto por aviso:**  
   prioridad `phone_whatsapp` → `phone`; sin ninguno, no se muestra CTA.

---

## 4) Qué falta para activación full inquiry POST

Para activar envío definitivo a KiteProp desde formulario del portal:

1. confirmar contrato exacto de `POST /contacts` (requeridos y nombres finales)
2. confirmar contrato exacto de `POST /messages` y referencia a `property_id/property_code`
3. validar en entorno con `KITEPROP_API_KEY` operativa y respuestas 2xx reales

Hasta entonces, la integración queda preparada y segura (sin POST inventado).
