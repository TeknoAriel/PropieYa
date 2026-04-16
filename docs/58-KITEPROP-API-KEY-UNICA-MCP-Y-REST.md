# Kiteprop: una sola API key (MCP, REST, properties, POST)

**Estado:** referencia fija para evitar confusiones entre canales (MCP remoto, API REST, recursos de propiedades, POST a endpoints documentados por Kiteprop).

---

## 1. Regla de producto (Kiteprop → cliente)

En la plataforma Kiteprop existe **un único secreto** (API key) que sirve para:

- Cliente **MCP** (p. ej. Cursor, Claude, otros).
- **API REST** y rutas que exponga el mismo producto.
- **Properties** y demás recursos HTTP que documente Kiteprop.
- Llamadas **POST** (u otros verbos) a la API, cuando el contrato indique esa misma credencial.

**No** son dos claves distintas “por canal”: es **la misma secret** en el panel de Kiteprop.

### Dónde va según el canal

| Canal | Cómo se envía la misma key |
|-------|----------------------------|
| **MCP remoto** (config tipo JSON en el IDE) | En **cabeceras HTTP**, p. ej. `"X-API-Key": "<tu-api-key>"` junto a la URL del servidor MCP (`https://mcp.kiteprop.com/mcp` o la que indique la documentación vigente). |
| **REST / POST / properties** | Misma cadena secreta; el contrato de cada endpoint define el mecanismo (cabecera, `Authorization`, query, etc.). |

La **única diferencia habitual** respecto del MCP es **el mecanismo de transporte** (p. ej. MCP exige la key en `headers`), no el valor del secreto.

---

## 2. Qué no hacer

- No pedir ni inventar una “segunda API key” solo para MCP o solo para REST si el producto indica una credencial única.
- No commitear la key en el repo, en issues, ni en capturas sin censurar.
- No mezclar en documentación interna esta key con los secretos del **webhook de ingesta hacia Propieya** (ver §3).

---

## 3. Relación con el repo PropieYa (ingesta al portal)

La ingesta Properstar/Kiteprop hacia **este** monorepo usa secretos **del lado PropieYa** para que **Kiteprop (u operador)** llame a nuestro endpoint, p. ej. `POST /api/webhooks/kiteprop-ingest` con `Authorization: Bearer <KITEPROP_INGEST_WEBHOOK_SECRET>` (o `CRON_SECRET` según política). Eso está en `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md`.

- **API key de Kiteprop (§1):** credencial para **consumir** APIs/MCP **de** Kiteprop desde un cliente (IDE, script, integración saliente).
- **Secretos de webhook/cron del portal:** credenciales **nuestras** para **autenticar llamadas entrantes** al portal; su nombre y variables están en `.env.example` y en la doc de deploy.

Salvo que Kiteprop documente explícitamente que unifican ambos mundos, **tratarlos como conceptos distintos** y no asumir que el Bearer del webhook es la misma string que la API key del panel MCP/REST.

---

## 4. Mantenimiento

Si Kiteprop cambia URL del MCP, nombres de cabecera o el modelo de autenticación, actualizar **este archivo** y la guía oficial de Kiteprop enlazada desde su producto; no dispersar copias contradictorias en otros docs del monorepo: **enlazar aquí**.
