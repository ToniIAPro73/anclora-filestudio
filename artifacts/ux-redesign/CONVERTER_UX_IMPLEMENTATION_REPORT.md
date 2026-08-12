# Informe de implementación — Rediseño UX del conversor (FileStudio)

Fecha: 2026-08-12
Alcance: Fases A–D del rediseño UX del conversor (motor de rutas multistep acotado, integración servidor, UI destination-first, validación completa).
Estado: **PASS** — ver `CONVERTER_UX_TEST_RESULTS.json` para el detalle máquina-legible.

## 1. Arquitectura encontrada

- **Shell Desktop PRO** (`src/components/desktop-pro/desktop-pro-shell.tsx`): pestañas por grupo (`DESKTOP_PRO_GROUPS`) más historial/diagnóstico; el workspace `NativeConversionWorkspace` implementa un asistente de 5 pasos (`source → analysis → format → progress → result`), obtiene capacidades vía `POST /api/capabilities` y crea trabajos vía `POST /api/jobs`.
- **Catálogo de operaciones** (`src/lib/domain/operations.ts`): `OPERATION_CATALOG` define, por operación, formatos de entrada/salida, motor (`engineId`), dependencias, perfil de pérdida (`LossProfile`) y de recursos. Es la única fuente de aristas de conversión.
- **Registro de motores** (`src/lib/engines/registry.ts`): 10 motores registrados con sondeo asíncrono y caché de 5 minutos (`probeEngine`, `diagnoseAllEngines`, `getCapabilities(descriptor)`).
- **Trabajos** (`src/lib/jobs/universal-job-processor.ts`, `src/server/desktop-routes/jobs-route.ts`): creación de jobs con `inputId` + `capabilityId`, resolución de motor/formato desde el id de capacidad, ejecución en directorio aislado `{tempDir}/{jobId}`, validación profunda del artefacto, nombrado final `buildConvertedOutputFileName` y limpieza coordinada.
- **UI previa**: `CompatibilityPanel` (lista de salidas con badges de motor), `PresetSelector` visible antes de elegir destino, CTA genérico.

## 2. Componentes creados/modificados

### Fase A — motor de rutas (`src/lib/conversion-routing/`)

| Archivo | Propósito |
| --- | --- |
| `types.ts` | Tipos `ConversionStep`, `ConversionRoute`, `ConversionEdge`, `RouteClassification`, `RouteRisk`, `QualityBand` (+ `ConversionRouteSummary` en Fase B). |
| `graph.ts` | `buildConversionGraph(availableEngineIds)`: lista de adyacencia desde `OPERATION_CATALOG`. |
| `scoring.ts` | Pesos por perfil de pérdida, factor experimental, penalización por pasos, `scoreConversionRoute`, `classifyRoute`, `routeRisk`, `qualityBand`. |
| `router.ts` | `findConversionRoutes` (BFS acotado), `selectBestConversionRoute` (determinista), `MAX_INTERMEDIATES = 2`. |
| `destinations.ts` | `getAvailableDestinations`, `getRecommendedDestinations` (+ `parseRouteCapabilityId`, `toConversionRouteSummary` en Fase B). |
| `index.ts` | Barrel de la API pública (sin dependencias de servidor). |
| `server.ts` (Fase B) | `getAvailableEngineIds()` desde `diagnoseAllEngines()` + herramientas reportadas en probes (`pdftoppm`) + `sharp` empaquetado. |

### Fase B — integración servidor

| Archivo | Cambio |
| --- | --- |
| `src/lib/domain/unified-analysis.ts` | Campo opcional `route?: ConversionRouteSummary` en `CapabilityInfo`; `normalizeCapabilityInfo` lo propaga. |
| `src/app/api/capabilities/route.ts` | Enriquecimiento de la ruta universal desktop: `attachConversionRoutes` (resumen en capacidades directas + entradas sintéticas multistep). Rutas legacy y vercel-web intactas. |
| `src/lib/jobs/multistep-processor.ts` | `processMultistepJob`: ejecución encadenada de pasos, validación, nombrado y progreso por paso; `extractMultistepRoute`. |
| `src/server/desktop-routes/jobs-route.ts` | Rama `route-{source}-{destination}` → `handleMultistepJob` (recalcula la ruta servidor-side; 422 controlado si no hay ruta). |
| `src/app/api/_desktop-route-loader.ts` | Registrado `@/lib/conversion-routing/server` en el mapa de importadores (necesario: el fallback dinámico no resuelve alias `@/`). |

### Fase C — UI

| Archivo | Cambio |
| --- | --- |
| `src/components/converter/destination-picker.tsx` | Nuevo. Selector de destino (radiogroup accesible, badges sin motores ni scores, secciones recomendados/todos, buscador >12, expansor). |
| `src/components/converter/conversion-route-summary.tsx` | Nuevo. Resumen de ruta `DOCX → HTML → EPUB`, clasificación, banda de calidad, nota 100 % local. |
| `src/components/converter/technical-details.tsx` | Nuevo. `<details>` colapsado con motor (nombre de display), ruta y privacidad; exporta `ENGINE_DISPLAY_NAMES`. |
| `src/components/desktop-pro/desktop-pro-shell.tsx` | Pestaña «Convertir» primera y por defecto; workspace con `DestinationPicker`, resumen de ruta, detalles técnicos, presets tras `<details>` y solo con destino elegido; CTA `Convertir a {FORMAT}`; CTA «Convertir a otro formato». |
| `src/components/converter/artifact-result-card.tsx` | «Nueva» → «Procesar otro archivo» (i18n); botón opcional «Convertir a otro formato». |
| `src/components/presets/preset-manager.tsx` | Renombrado a «configuraciones» y todas las cadenas a i18n; modelo de datos y localStorage sin cambios. |
| `src/i18n/es.ts` / `src/i18n/en.ts` | ~55 claves nuevas (`destinations.*`, `route.*`, `convert.startTo`, `convert.advancedConfig`, `config.*`, `result.*`). |
| `vitest.config.ts` | Patrón include ampliado a `*.test.{ts,tsx}` para tests de componentes. |

## 3. Routing: grafo, búsqueda y scoring

- **Grafo**: para cada operación del catálogo cuyo `engineId` y dependencias estén disponibles (misma regla que `getCompatibleOperations`, con `sharp` siempre disponible por ir empaquetado), se genera una arista por cada par `inputFormat × outputFormat` en orden de catálogo (determinista). `experimental` se toma del `FormatDefinition` del formato destino. Las auto-aristas (`pdf→pdf`) se omiten: no son transitables en la búsqueda y no aportan rutas.
- **Búsqueda**: BFS sobre caminos (cola de caminos, conjunto de visitados por camino para evitar ciclos), profundidad máxima `maxIntermediates + 1` aristas, con **invariante dura**: `maxIntermediates` se clampa a 2, de modo que ninguna ruta devuelta supera 2 formatos intermedios. Se recogen todas las rutas hasta esa profundidad, no solo la más corta.
- **Scoring**: producto de pesos por arista (`lossless 1.0`, `lossy-controlled 0.9`, `lossy 0.75`, `structural-risk 0.6`; ×0.85 si el destino es experimental) multiplicado por la penalización de pasos (directo 1.0, un intermedio 0.9, dos 0.8). Constantes exportadas y ajustables.
- **Clasificación**: `direct` (1 paso sin pérdida/lossy-controlled), `lossy` (cualquier arista lossy o structural-risk), si no `multistep`. Riesgo: alto con structural-risk, medio con lossy o 2 intermedios. Bandas: excellent ≥0.85, good ≥0.65, format-loss ≥0.45, si no not-recommended.
- **Selección determinista**: score descendente, luego menos pasos, luego primer `operationId` (localeCompare).

## 4. Capacidades reutilizadas

- `OPERATION_CATALOG` y sus helpers como fuente de aristas y regla de dependencias.
- Caché de probes del registro (`diagnoseAllEngines`) para disponibilidad sin re-sondear.
- Helpers de `universal-job-processor` ya exportados: `validateOutputArtifact`, `buildConvertedOutputFileName`, `getOutputMimeType`, `buildUserErrorMessage` (sin tocar ese archivo).
- `buildDescriptor` (file-detector) para describir artefactos intermedios; `coordinatedCleanup` para limpieza (los intermedios viven en `{tempDir}/{jobId}`); `checkDiskSpace`; `ensurePathSafety`.
- Patrón expansor «Ver N opciones más», patrón `<details>/<summary>` existente, sistema i18n de claves planas con interpolación, `ENGINE_DISPLAY_NAMES` (convención del panel previo).

## 5. Nuevas estructuras

- `src/lib/conversion-routing/*` (motor puro + helper de servidor aislado fuera del barrel).
- `src/lib/jobs/multistep-processor.ts` (procesador de rutas; spec de ruta persistida en `options_json.multistepRoute`).
- `src/components/converter/destination-picker.tsx`, `conversion-route-summary.tsx`, `technical-details.tsx`.
- Campo `route` en `CapabilityInfo` y capacidades sintéticas `route-{source}-{destination}`.

## 6. Contrato API

`CapabilityInfo` gana un campo opcional (retrocompatible):

```json
"route": {
  "steps": [{ "source": "jpeg", "target": "png" }, { "source": "png", "target": "ico" }],
  "classification": "direct | multistep | lossy",
  "risk": "low | medium | high",
  "qualityBand": "excellent | good | format-loss | not-recommended",
  "recommended": true
}
```

Sin ids de motor/operación en el resumen. Destinos solo alcanzables en varios pasos se ofrecen como capacidades sintéticas con id `route-{source}-{destination}`, `state: "available"` y `lossProfile` derivado del peor paso. El servidor nunca acepta pasos del cliente: al crear el job recalcula la ruta con la disponibilidad actual y responde 422 `ROUTE_NOT_AVAILABLE` si no existe o es `not-recommended`.

## 7. Tests añadidos

| Archivo | Tests |
| --- | --- |
| `tests/unit/conversion-routing/router.test.ts` | 17 |
| `tests/unit/conversion-routing/scoring.test.ts` | 9 |
| `tests/unit/conversion-routing/destinations.test.ts` | 4 |
| `tests/unit/multistep-processor.test.ts` | 7 |
| `tests/integration/capabilities-route-enrichment.test.ts` | 3 |
| `tests/integration/capabilities-api.test.ts` (bloque nuevo) | 2 |
| `tests/unit/components/destination-picker.test.tsx` | 12 |
| **Total nuevos** | **54** |

Cobertura: rutas directa/1/2 intermedios, rechazo de 3 intermedios (incluso con `maxIntermediates` inflado), ciclos, motores/dependencias no disponibles, empate determinista, clasificaciones, invariante ≤2, encadenado de pasos, fallo intermedio controlado, nombrado final `documento.epub`, progreso por paso, enriquecimiento de capacidades (directa + sintética), badges/selección/teclado/buscador/CTA en UI.

## 8. Diferencias respecto a la spec

1. **Auto-aristas omitidas** en `buildConversionGraph` (la spec pedía «todo par input×output»); no son transitables ni útiles para routing.
2. **Lista curada `plain-text` añadida** (`["md","html","pdf","txt"]`): sin ella, markdown/html no tendrían recomendados (categoría `plain-text`, no `document`).
3. **Ruta persistida en `options_json`**: `JobRow` no tiene columna de metadatos; AC-FN-010 queda best-effort vía `stage` + options (durable).
4. **Gate de síntesis**: solo se sintetizan destinos `classification === "multistep"` con banda ≠ `not-recommended`; rutas multistep con pérdida no se ofrecen como opciones nuevas.
5. **Capacidades sintéticas**: `engineId` (obligatorio en `CapabilityInfo`) = motor del primer paso; `mobilePortability: "desktop-only"`.
6. **Ids recomendados con ids del catálogo de operaciones** (`md`, `jpeg`), no de `FORMAT_CATALOG` (`markdown`).
7. **Test del handler HTTP en archivo nuevo** (`capabilities-route-enrichment.test.ts`) porque `vi.mock` es por archivo y rompería los tests reales del registro; el archivo de integración existente recibió aserciones deterministas del módulo de routing.
8. **Agrupación por categoría omitida** en el selector (lista plana + buscador >12), por la cláusula de simplicidad.
9. **«Convertir a otro formato»** resetea al paso de formato conservando el archivo analizado (la máquina de estados lo permitía).
10. **`ENGINE_DISPLAY_NAMES` duplicado** en `technical-details.tsx` (la copia de `CompatibilityPanel` no está exportada; el panel quedó intacto).
11. **TechnicalDetails muestra solo el motor primario**: el resumen de ruta cliente no incluye motores por paso (contrato seguro de Fase B).
12. **Frase de utilidad del destino** reutiliza `analysis.category.*` en lugar de crear ~15 claves nuevas de copy.
13. **jsdom ya estaba en devDependencies**: los tests de componente usan directiva `@vitest-environment jsdom` por archivo; no se añadieron dependencias.

## 9. Decisiones técnicas y riesgos pendientes

- **Cobertura del grafo limitada a `OPERATION_CATALOG`**: el catálogo no cubre hoy ebooks como entrada (no hay operación `ebook:convert`), datos estructurados como entrada en operaciones, ni archivos como salida; las rutas multistep reales son pocas (p. ej. `gif → png → ico`). Es una limitación del catálogo, no del motor.
- **`ico` sin entrada en `FORMAT_CATALOG`**: tolerado (experimental=false por defecto, MIME fallback, sin chequeo de magic bytes), pero convendría darlo de alta si se ofrece como destino habitual.
- **Duplicación consciente de ~50 líneas** en `multistep-processor` (plan/ejecución/guardas/persistencia) para no refactorizar `universal-job-processor`; candidata a extracción compartida en una iteración futura.
- **Smoke manual DOCX→EPUB pendiente**: hay tests de integración del endpoint y unitarios del procesador con motores mock, pero falta un smoke E2E real de una conversión multistep de extremo a extremo (requiere binarios y entorno desktop preparado).
- **Criterios UI sin test comportamental**: separación Conversión/Herramientas y gating de presets se verifican por typecheck + revisión de código; no hay test E2E de la shell (Playwright existe pero fuera de alcance de esta fase).
- **Warning de build preexistente**: Turbopack advierte sobre operaciones fs dinámicas en `src/lib/config.ts`/route-loader; no relacionado con este rediseño.
