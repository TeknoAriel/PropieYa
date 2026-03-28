# Onboarding: buscadores, dueños, inmobiliarias

**Complementa:** `docs/00-fundacion-producto.md`, `docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md`, `docs/39-MONETIZACION-MERCADOPAGO.md`.

## Personas y registro

| Persona | `account_intent` (DB) | Organización | Panel |
|---------|------------------------|--------------|--------|
| **Buscador tradicional** | `seeker` | No (solo usuario) | No requerido; opcional login para alertas y perfil de demanda |
| **Dueño que vende/alquila** | `owner_publisher` | Sí: tipo `individual_owner`, nombre `Particular — {nombre}` | Sí, para cargar avisos |
| **Inmobiliaria / equipo** | `agency_publisher` | Sí: tipo `real_estate_agency`, nombre indicado en el formulario | Sí |

### Dónde registrarse

- **Portal web:** `/registro` — flujo en dos pasos (elegir perfil + datos).
- **Desde el panel (login):** enlace a `{NEXT_PUBLIC_WEB_APP_URL}/registro?intent=agency_publisher` (predispuesto a inmobiliaria; se puede cambiar en el portal).

### Después del registro

- Todos reciben credenciales y entran por `/login` (web) o panel con el mismo backend auth.
- **Publicadores:** usar `/publicar` en el portal para ir al login del panel y gestionar propiedades.

## Monetización (visión)

- **Buscadores:** capa gratuita amplia; opcionalmente premium (alertas avanzadas, informes) vía Mercado Pago en fases posteriores.
- **Dueños / inmobiliarias:** planes por cantidad de avisos, destacados, vigencia extendida — cobro vía pasarela documentada en `39`.

## Criterios ampliados de producto

Búsqueda MLS-ready, filtros facetados, mapa y semántica: **`docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md`**.
