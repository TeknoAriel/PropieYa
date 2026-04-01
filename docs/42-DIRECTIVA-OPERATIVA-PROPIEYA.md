# Directiva operativa Propieya — conocimiento y criterio anti-Frankenstein

**Estado:** source of truth **complementario** (no reemplaza `docs/00-fundacion-producto.md` ni `docs/38`; los ordena).  
**Objetivo:** evolucionar el producto **sumando valor** sin convertirlo en un conjunto de módulos desconectados.  
**Audiencia:** Producto, UX, ingeniería y agentes autónomos.

**Relación con otros docs**

| Documento | Rol |
|-----------|-----|
| `docs/00-fundacion-producto.md` | Fundación y alcance MVP/original |
| `docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md` | Criterios técnicos MLS, facets, mapa, semántica |
| `docs/41-PROPUESTA-VALOR-PORTAL.md` | Norte corto: descubrimiento, decisión, confianza, inventario |
| **`docs/42-DIRECTIVA-OPERATIVA-PROPIEYA.md`** | **Reglas de evolución, capas, prioridades y modo de trabajo** |
| `docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md` | Matriz, clasificación y backlog priorizado derivado de esta directiva |

---

## 1. Principio central

Propieya **no** debe evolucionar agregando módulos sueltos, vistosos o desconectados.

Toda mejora debe **fortalecer el núcleo** del producto, no crear una segunda app dentro de la app.

### Regla anti-Frankenstein

Solo se acepta una mejora si **cumple a la vez**:

1. Refuerza **búsqueda**, **decisión**, **confianza** o **calidad de inventario** (alineado a doc 41).  
2. **Reutiliza** flujos, datos y arquitectura existentes o ya previstos en el masterplan.  
3. Mejora **conversión**, **permanencia**, **calidad de lead** o **valor percibido**.  
4. **No** obliga a rediseñar todo el producto.  
5. **No** rompe la simplicidad ni vuelve caótica la UX.  
6. **No** desplaza la propuesta principal: **portal conversacional moderno, MLS-ready**.

Si una idea es interesante pero **no** cumple estas condiciones: **no** integrarla al core; dejarla como **extensión futura** o **add-on**.

---

## 2. Definición del núcleo

Propieya es un portal inmobiliario **conversacional**, moderno, cálido, **MLS-ready** y altamente usable.

El núcleo incluye (entre otros):

- Búsqueda asistida (IA + reglas), lenguaje cálido e inductivo.  
- UX simple, nada abrumadora; descubrimiento guiado.  
- Mapa potente y filtros profundos (con **progresividad**).  
- Inventario confiable, vigencia y reglas de calidad.  
- Estructura preparada para MLS y monetización B2B escalable.  
- Posibilidad institucional / white-label / redes (como **evolución**, no como ruido en MVP).

### Lo que el producto no debe ser

- Suite caótica de herramientas sin hilo.  
- Portal clásico con un chatbot pegado.  
- “Tinder inmobiliario” puro como centro.  
- Laboratorio visual de IA que opaque la búsqueda.  
- Frankenstein entre portal, CRM, MLS, BI, comparadores y experimentos sin orden.

---

## 3. Cuatro capas oficiales

Toda evolución debe **ubicarse** en una de estas capas (puede tocarse más de una con un mismo epic, pero con intención clara).

| Capa | Nombre | Contenido típico |
|------|--------|------------------|
| **A** | **Descubrimiento** | Conversación, sugerencias, coincidencias, relacionadas, mapa, búsquedas guardadas, alertas, exploración guiada. |
| **B** | **Decisión** | Comparadores, simuladores, ayudas compra/alquiler/inversión, motivos de match/recomendación, alerta de oportunidad, **un** centro de decisión ordenado (no diez herramientas sueltas). |
| **C** | **Confianza** | Vigencia, completitud, trazabilidad de origen, verificación profesional, señales antiestafa, calidad de inventario. |
| **D** | **Potenciación del inventario (B2B)** | Mejora visual IA, descripción automática, normalización, score de aviso, publicación asistida — como **add-on / monetización complementaria**, no como centro del portal público. |

**Prioridad de foco:** **A** y **C** forman gran parte del **core** percibido. **B** entra como **extensión nativa única y ordenada**. **D** como **add-on B2B**, no como núcleo de la experiencia buscador.

---

## 4. Capacidades MLS-ready (obligatorio en diseño)

Desde producto, datos y arquitectura se debe contemplar (coherente con doc 38):

- Normalización multi-fuente, estandarización de atributos, **deduplicación**, trazabilidad de origen.  
- Historial de cambios, vigencia y freshness.  
- Organizaciones, permisos, visibilidad, reglas de distribución/republicación.  
- Preparación para cooperación entre actores.  
- Matching y ranking sobre inventario **normalizado**.

Toda mejora debe **respetar** esta dirección o explicitar por qué es solo experimental y fuera del core.

---

## 5. Búsqueda, filtros y asistente

El asistente no debe limitarse a filtros básicos: debe poder activar **atributos estructurados** alineados al modelo y al catálogo de facets.

**Regla:** todo atributo relevante de la fuente debe poder ser, a la larga: filtro manual, condición del asistente, campo indexable, sugerencia, alerta/búsqueda guardada, posible factor de ranking.

**Estrategia:** catálogo de facets versionado + `features` flexible + ES materializado para lo frecuente — **no** hardcodear eternamente solo un subconjunto (ver doc 38).

---

## 6. Filtros avanzados sin abrumar

Capas UX: (1) simple/asistida → (2) esenciales → (3) más opciones expandible → (4) contextuales por tipo/op/zona.

Objetivo: precisión alta **sin** formulario monstruo inicial.

---

## 7. Búsqueda por mapa (central)

Más que pins: lista sincronizada, viewport, clusters, área dibujada, polígono, radio, zonas, alertas geográficas, integración con filtros y asistente — según priorización por sprint, sin renunciar al diseño.

---

## 8. Variantes y semántica

Equivalencias (depto/departamento, pileta/piscina, etc.) vía alias, sinónimos y mapping por tipo de inmueble; impacto en manual, conversacional, alertas y ranking.

---

## 9. Mejoras que sí encajan en el masterplan (resumen)

- **A:** sugerencias, mejores coincidencias con motivo, relacionadas, mapa/zona, continuidad de búsqueda.  
- **B:** **un** estructura “centro de decisión” con simuladores/comparadores **ordenados**, no dispersos.  
- **C:** scores de vigencia/completitud, trazabilidad, verificación, señales de confianza.  
- **D (add-on):** potenciador de avisos IA para B2B.

---

## 10. Lo que no debe contaminar el core (ahora)

Estudio IA independiente, veinte herramientas sueltas, marketplace paralelo de servicios, microtransacciones que ensucien la búsqueda, gimmicks visuales como protagonistas, oferta sin control de calidad, monetización que opaque la experiencia.

Exploraciones posibles: backlog de fase posterior o add-on **desacoplado**.

---

## 11. Monetización por fases (orden)

1. **Core B2B:** planes por inventario/cupo/visibilidad, destacados, enterprise, instituciones/white-label, constructoras.  
2. **Valor extendido:** centro de decisión premium, verificación/confianza, módulos institucionales.  
3. **Add-ons IA:** potenciador visual/editorial, créditos, API/automatizaciones pro.

No mezclar todo desde el inicio; no diluir la propuesta comercial.

---

## 12. Prioridad de integración (orden sugerido)

**P1:** sugerencias inductivas, mejores coincidencias, mapa más potente, scores vigencia/completitud (visibles donde corresponda), verificación profesional básica, filtros enriquecidos + semántica de atributos.  

**P2:** centro de decisión (como capa única), alerta oportunidad, comparadores/simuladores, antiestafas, explicación de match/recomendación ampliada.  

**P3:** potenciador IA B2B, mejoras visuales, descripción automática, score editorial, paquetes premium.

---

## 13. Modo de trabajo del agente / equipo

1. Auditar definición actual y masterplan vigente.  
2. Detectar qué ya está contemplado y qué no.  
3. Clasificar cada mejora: **core inmediato**, **extensión nativa**, **add-on**, **no recomendado ahora**.  
4. Proponer solo integraciones **limpias** y coherentes.  
5. Mostrar encaje en producto, UX, datos, search, negocio y arquitectura.  
6. Evitar duplicaciones y solapamientos.  
7. Evitar rediseños masivos si se puede por capas.  
8. Priorizar **MVP limpio** sobre feature set inflado.

**Entregables estructurados:** ver **`docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md`**.

---

## 14. Restricción final

La meta no es “sumar más cosas”: la meta es que Propieya sea **mejor**.

Proteger: claridad, modernidad, calidez, simplicidad, profundidad real de búsqueda, confianza, escalabilidad, coherencia de negocio.

- Si suma ruido → no al core.  
- Si suma valor pero no es crítica → fase posterior.  
- Si fortalece búsqueda, decisión, confianza o calidad de inventario → prioridad alta.

---

*Versión 1.0 — 2026-04-01. Derivado de la directiva operativa aprobada por el propietario; mantener alineado con sprints en `docs/24-sprints-y-hitos.md`.*
