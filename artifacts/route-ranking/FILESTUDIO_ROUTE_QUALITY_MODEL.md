# FileStudio — Route Quality Model

Fase: Quality-Aware Routing & Route Ranking. Documento canónico del modelo de
calidad usado por `rankRoutes()` (`src/lib/conversion-routing/ranking.ts`) y
`composeRouteQuality()` (`src/lib/conversion-routing/quality.ts`).

## 1. Separación de responsabilidades (§1)

| Capa | Pregunta | Implementación |
| --- | --- | --- |
| Discovery | ¿Es alcanzable A → B? | `getAvailableEdges`, `findConversionRoutes` |
| Routing | ¿Qué rutas válidas existen? | BFS acotado, `MAX_INTERMEDIATES = 2` |
| Ranking | ¿Cuál da el mejor resultado final? | `rankRoutes`, `composeRouteQuality` |
| Execution | Ejecutar la ruta elegida | job processors, sin reconstruir rutas |

Ranking nunca decide disponibilidad (los engines unavailable ya no están en el
grafo) ni precio (no existe capa comercial).

## 2. Dimensiones de calidad (§8/§10)

Cada edge puede declarar `preservation` por dimensión, en rango 0..1:

`text`, `structure`, `layout`, `images`, `tables`, `metadata`,
`mediaQuality`, `resolution`, `alpha`.

No todas aplican a cada familia: una dimensión no tocada por ningún edge de la
ruta queda fuera de la normalización (ver §4) — nunca puntúa como 1.0 gratis
ni oculta una pérdida.

Metadata adicional por edge (`EdgeQualityProfile`):

- `irreversibleLosses`: pérdidas que ningún paso posterior puede recuperar
  (ej. `alpha` al ir a JPG, `structure/layout/tables/images` al ir a TXT).
- `reencodeRequired` + `pipelineMode` (`remux` | `transcode` | `na`): distinguen
  copia de payload vs recompresión (§31).
- `runtimeCost`: `low` | `medium` | `high` — coste técnico relativo, no económico.
- `stability`: 0..1, madurez del engine/adapter.
- `certification`: `benchmarked` (validado por E2E comparativo real),
  `engine-inferred` (anotación con evidencia), `unknown` (default conservador, §82).

## 3. Pesos por familia (§11)

`FAMILY_WEIGHTS` define el peso base de cada dimensión por familia de ruta
(document, image, audio, video, data, archive, other). `TARGET_WEIGHT_OVERRIDES`
ajusta por target concreto (ej. target `txt`/`md` ponen `layout`/`images` a ~0
porque el formato no los representa; target `pdf` conserva un 5% de `alpha`).

Peso efectivo de una dimensión = `family × targetOverride`. Las dimensiones con
peso 0 no castigan ni premian: el formato destino no puede representarlas.

## 4. Composición de ruta (§12/§13)

Bottleneck principle: la calidad de una ruta en cada dimensión es el **mínimo**
de los edges que tocan esa dimensión, no el promedio. Una pérdida irreversible
se propaga: `DOCX → TXT → PDF` queda limitada por el paso TXT aunque
`TXT → PDF` sea bueno.

```
routeScore =
    Σ( weight[dim] × minEdge(preservation[dim]) )  /  Σ( weight[dim] )
  − REENCODE_PENALTY(0.07) × max(0, reencodeGenerations − 1)
  × factores de certificación por edge (benchmarked 1.0, engine-inferred 0.98,
    unknown 0.92, experimental 0.85)
  con cap IRREVERSIBLE_LOSS_CAP = 0.84 si la ruta acumula pérdidas irreversibles
```

Justificación del bottleneck: un promedio oculta pérdidas severas (§12). El
mínimo garantiza que el peor paso relevante limita la ruta completa.

Penalización de re-encode: cada generación lossy adicional degrada; la primera
es inevitable si el target lo exige, las siguientes son evitables (§16/§17).

Cap de pérdida irreversible: una ruta que destruye estructura/alpha/etc. nunca
alcanza banda "excellent", aunque el paso final sea perfecto.

## 5. Política UNKNOWN (§83/§85)

Edges sin anotación caen a `defaultEdgeQuality(lossProfile)` con
`certification: "unknown"` y factor 0.92. Una ruta UNKNOWN corta **no** desplaza
a una BENCHMARKED buena: el factor multiplica el score y `certification` es
tiebreaker explícito por delante de steps y coste.

## 6. Tiebreakers (§45)

Orden total determinista (`compareRankedRoutes`):

1. **quality score desc** — el mejor resultado final esperado gana (§3/§4).
2. **irreversible loss count asc** — a igual score, menos destrucción.
3. **certification rank desc** — benchmarked > engine-inferred > unknown (§85).
4. **steps asc** — ruta simple solo como desempate de calidad equivalente (§5).
5. **runtime cost asc** — coste técnico, nunca económico (§32/§42).
6. **stable route id asc** — último recurso determinista, sin aleatoriedad (§44/§46).

Justificación: la calidad es el objetivo del producto; la irreversibilidad es
el riesgo mayor a igual score; la certificación evita que lo no medido gane a
lo medido; steps y coste solo deciden entre rutas que el usuario no puede
distinguir; el routeId garantiza reproducibilidad byte a byte.

Heurísticas eliminadas: `direct-first` y `shortest-first` como criterio
primario (§4/§5). Una directa destructiva pierde contra una multistep fiel;
una corta solo gana empatando en calidad.

## 7. Reason codes (§28)

`explainRouteChoice()` emite códigos estables, sin copy UX en core:

- `HIGHER_FIDELITY`, `HIGHER_LAYOUT_FIDELITY`, `PRESERVES_TABLES`,
  `PRESERVES_IMAGES`, `PRESERVES_ALPHA`, `PRESERVES_RESOLUTION`
- `AVOIDS_LOSSY_INTERMEDIATE`, `AVOIDS_IRREVERSIBLE_LOSS`, `AVOIDS_REENCODE`,
  `REMUX_OVER_TRANSCODE`
- `HIGHER_STABILITY`, `CERTIFIED_ROUTE`
- `SHORTER_EQUIVALENT_ROUTE`, `LOWER_RUNTIME_COST`, `DETERMINISTIC_TIEBREAK`
- `ONLY_VIABLE_ROUTE`

Rechazos (la ruta queda visible al final, discovery sigue honesto, §35/§36):
`UNSAFE_CARDINALITY`, `CATASTROPHIC_STRUCTURAL_LOSS`, `UNSUPPORTED_CONTENT_PATH`,
`KNOWN_BROKEN_ADAPTER`.

## 8. Source-aware ranking (§29/§30)

`rankRoutes(routes, { sourceAnalysis })` acepta hechos medidos del archivo real
(`hasTextLayer`, `kind: pdf-text | pdf-scanned | pdf-mixed`). Si el source no
cumple `contentRequirements` de un edge (hoy: `requiresTextLayer` en las
extracciones PDF→TXT/HTML/MD/DOCX), la ruta se rechaza con
`UNSUPPORTED_CONTENT_PATH` en vez de producir un output vacío (§15/§37 de la
fase quick-wins).

## 9. Fallback policy (§75–§77)

Diseñada, **no activada**. `rankRoutes` devuelve todas las alternativas
ordenadas, así el ejecutor puede caer a la siguiente ruta viable solo ante
fallo transitorio de engine — nunca ante `invalid source`,
`unsupported content` o `quality guard`. Si se activara, el resultado debe
registrar `selectedRoute`, `routeReason`, `fallbackUsed`: fallback nunca
silencioso. En esta fase el ejecutor corre una única ruta (la rank 1) y el
fallo se reporta al usuario.

## 10. Ejemplos certificados por benchmark

Ver `FILESTUDIO_ROUTE_BENCHMARK_RESULTS.md` y
`tests/integration/route-ranking-benchmark.test.ts`:

- `AAC → MP3`: directa (1 re-encode) gana al detour vía WAV (2 re-encodes).
- `PNG → PDF`: directa (embed con alpha) gana al detour vía JPG.
- `JPG → PDF`: empate de calidad, gana la directa por steps.
- `TS → MP4`: preferencia remux sobre transcode (`REMUX_OVER_TRANSCODE`).
- `MD → PDF`: gana la ruta con mejor fidelidad estructural, no la más corta.
- `PDF → DOCX`: la directa certificada gana a cualquier detour destructivo.
