# Mapeo Zonaprop XML → Campos filtrables

Referencia del feed XML Zonaprop (Kiteprop) para identificar **todos** los campos que sirven como filtros de búsqueda por texto o asistente. **No usamos este XML como importador** (se usa Yumblin/JSON), pero la estructura es referencia para mapear campos.

**URL referencia (feed completo OpenNavent, ~tens MB):**  
https://static.kiteprop.com/kp/difusions/13d87da051c790afaf09c7afd094f151d7d06290/zonaprop.xml

**Muestra en repo (un solo aviso):** `docs/samples/zonaprop-kiteprop-one-aviso.xml`  
**Mapeo código:** `packages/shared/src/xml/zonaprop-opennavent-map.ts` (`OPENNAVENT_XML_STRUCTURE`, `OPENNAVENT_CARACTERISTICA_NOMBRE_TO_ROLE`).

### Estructura OpenNavent (Kiteprop)

| XML | Uso en Propieya |
|-----|-----------------|
| `OpenNavent` / `Avisos` / `Aviso` | Un listing |
| `codigoAviso`, `claveReferencia` | Referencia externa / trazabilidad |
| `titulo`, `descripcion` | `title`, `description` |
| `tipoDePropiedad/tipo` | `propertyType` (normalizar texto → enum) |
| `precios/precio`: `monto`, `moneda`, `operacion` | `priceAmount`, `priceCurrency`, `operationType` |
| `valorMantenimiento` | `price.expenses` (expensas / mantenimiento) |
| `localizacion`: `Ubicacion`, `direccion`, `latitud`, `longitud`, `codigoPostal`, `muestraMapa` | `address`, `location`, `hideExactAddress` según mapa |
| `caracteristicas/caracteristica`: `nombre` (`CATEGORIA|CLAVE`), `valor` o `idValor` | Dormitorios, baños, superficies, amenities, etc. (ver mapa TS) |

Las claves `nombre` tipo `PRINCIPALES|DORMITORIO`, `MEDIDAS|SUPERFICIE_CUBIERTA`, `SERVICIOS|ASCENSOR` se resuelven a roles internos en `opennaventCharacteristicRole()`.

---

## Campos del XML → Filtros

### Amenities (booleanos)

| Campo en feed | Amenity interno | Ejemplo de búsqueda |
|---------------|-----------------|---------------------|
| `balcon`, `balcony` | `balcony` | "con balcón" |
| `terraza`, `terrace` | `terrace` | "terraza" |
| `cochera`, `garage`, `garages` | `parking` | "garage", "cochera" |
| `aire_acondicionado` | `air_conditioning` | "aire acondicionado" |
| `calefaccion`, `heating` | `heating` | "calefacción" |
| `chimenea`, `fireplace` | `fireplace` | "chimenea" |
| `contra_frente`, `front_facing` | `front_facing` | "contra frente" |
| `apto_credito`, `financiacion` | `credit_approved` | "apto crédito" |
| `pileta`, `piscina`, `pool` | `pool` | "pileta" |
| `parrilla`, `bbq` | `bbq` | "parrilla" |
| `jardin`, `garden` | `garden` | "jardín" |
| `ascensor`, `elevator` | `elevator` | "ascensor" |
| `portero`, `doorman` | `doorman` | "portero" |

### Campos numéricos y textuales

| Campo en feed | Campo interno | Ejemplo de búsqueda |
|---------------|---------------|---------------------|
| `superficie_total`, `m2_totales`, `total_meters` | `surfaceTotal` | "más de 80 m2", "100 metros" |
| `m2_cubiertos`, `covered_meters` | `surfaceCovered` | (indexado para filtros) |
| `dormitorios`, `bedrooms`, `ambientes` | `bedrooms` | "2 dormitorios", "3 ambientes" |
| `banos`, `bathrooms` | `bathrooms` | "2 baños" |
| `cocheras`, `garages`, `garage_count` | `garages` | "1 cochera", "2 garages" |
| `piso`, `floor`, `floor_number` | `floor` | "piso 3", "planta 5" |
| `total_pisos`, `total_floors` | `totalFloors` | (indexado para filtros) |
| `escalera`, `staircase`, `entrada` | `escalera` | "escalera B", "entrada A" |
| `orientacion`, `orientation` | `orientation` | (indexado para filtros) |
| `precio`, `price` | `priceAmount` | "desde 50000", "hasta 100000" |

---

## Cómo funciona el filtro

1. **Búsqueda por texto (`q`):** Si el usuario escribe "departamento con balcón más de 80 m2 piso 3 escalera B", el sistema extrae:
   - amenity: `balcony`
   - minSurface: 80
   - floorMin/Max: 3
   - escalera: "B"
2. **Filtro explícito:** El API acepta `minSurface`, `maxSurface`, `minBedrooms`, `minBathrooms`, `minGarages`, `floorMin`, `floorMax`, `escalera`, `amenities`, etc.
3. **Import Yumblin:** El mapper extrae todos estos campos del feed y los guarda en la DB (surfaceCovered, garages, features.floor, features.escalera, etc.).
4. **Sin menús desplegables:** Los filtros se activan por texto libre o asistente.

---

## Implementación

- **OpenNavent (estructura real del feed):** `packages/shared/src/xml/zonaprop-opennavent-map.ts`
- **Mapeo XML → campos genéricos:** `packages/shared/src/xml/property-ficha-map.ts`
- **Extracción de texto:** `packages/shared/src/search-term-extractor.ts` (`extractFiltersFromQuery`)
- **Amenities:** `packages/shared/src/amenity-mapping.ts`
- **Mapper Yumblin:** `packages/shared/src/xml/yumblin-mapper.ts`
- **Query ES y SQL:** `apps/web/src/lib/search/query.ts`, `apps/web/src/server/routers/listing.ts`
