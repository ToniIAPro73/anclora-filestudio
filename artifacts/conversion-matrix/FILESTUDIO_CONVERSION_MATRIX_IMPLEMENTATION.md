# FileStudio Canonical Conversion Matrix Implementation

Fecha: 2026-08-12  
Fase: FASE 2 - Implementacion de la Matriz Canonica de Conversion  
Resultado: **PASS**

## Implementado

Se añadió una capa canónica derivada de las estructuras existentes:

- `FORMAT_CATALOG`: conserva el catálogo base y añade normalización canónica.
- `OPERATION_CATALOG`: corrige `pdf:to-png`, añade operation IDs faltantes para data, ebook, archive, OCR, browser y GIF.
- `src/lib/conversion-matrix/`: define engines canónicos, runtime capabilities, edges directos, disponibilidad efectiva y direct conversion lookup.
- `src/lib/conversion-routing/`: ahora construye el grafo desde edges efectivamente disponibles, no desde declaraciones crudas.
- `/api/capabilities`: el enriquecimiento multietapa se deriva de rutas efectivas y normaliza aliases.
- desktop job route: recomputa rutas multietapa con source/target normalizados.

## Formatos Canónicos

Total: **50**

Regla: el ID canónico usado por la matriz es `FormatDefinition.outputExtension`.

Aliases normalizados:

| Alias | Canonical |
| --- | --- |
| jpeg | jpg |
| jpg | jpg |
| markdown | md |
| md | md |
| latex | tex |
| tex | tex |
| yml | yaml |
| htm | html |
| tif | tiff |

Clasificación de formatos auditados no incorporados como canónicos:

- `MISSING_CANONICAL_FORMAT`: `opus`, `aiff`, `wma`, `flv`, `m4v`, `mts`, `bmp`, `ico`, `svg`, `heic`, `heif`, `fb2`, `rar`, `wim`, `lz4`, `srt`.
- `ENGINE_INTERNAL`: `alac`.
- `LEGACY`: `azw`.
- `INVALID`: `jpg-large`.

## Matriz

| Métrica | Valor |
| --- | ---: |
| Direct edges | 209 |
| Implemented edges | 208 |
| Available Windows | 199 |
| Available Linux | 199 |
| Available Web | 39 |
| Declared without implementation | 1 |
| Implemented but not canonical declaration | 74 |
| Disabled invalid edges | 1 |
| Multistep available | 84 |

La matriz distingue:

- `declared`
- `implemented`
- `enabled`
- runtime engine state
- dependency availability
- environment compatibility

## PDF -> PNG

Estado: **disabled**

ENGINE: none for effective routing.

QPDF ya no publicita rasterización. La declaración legacy `pdf:to-png` fue movida a `engineId: "poppler"` en `OPERATION_CATALOG`, marcada `enabled: false` e `implemented: false`. En la matriz queda una edge diagnóstica deshabilitada con nota de binding inválido legacy.

Runtime probe:

```text
/usr/bin/pdftoppm
pdftoppm version 24.02.0
```

Aunque `pdftoppm` existe en esta máquina, no se activó `PDF -> PNG` porque no hay adapter standalone integrado que produzca artifact final y validación. Poppler queda reconocido como runtime dependency para OCR PDF->TXT vía Tesseract, no como edge PDF->PNG.

## QPDF

Invalid bindings found:

- legacy `pdf:to-png`.

Current routing bindings:

- none. QPDF PDF->PDF operations son tools estructurales y no se usan como conversion edges del grafo.

## APIs

Implementadas:

- `getTargetsForSource(source, availableEngineIds, options)`
- `getSourcesForTarget(target, availableEngineIds, options)`
- `getDirectConversion(source, target, runtime, options)`
- `getEffectiveAvailability(edge, runtime)`
- `isAvailable(source, target, environment, availableEngineIds)`
- `getBestRoute(source, target, availableEngineIds, options)`

`Convertir a` y `Convertir desde` ahora pueden consultar la misma matriz: source->targets y target<-sources son vistas inversas del mismo grafo efectivo.

## Routing

Se conserva:

- BFS bounded.
- `MAX_INTERMEDIATES = 2`.
- cycle guard.
- scoring determinista.
- tie-break determinista.

Cambio clave: el grafo se construye con `getAvailableEdges(runtime)`. El flujo normal no recibe edges deshabilitados, sin implementación, sin engine, con dependencia ausente o de plataforma incorrecta.

Rutas inválidas excluidas:

- `pdf -> png` vía QPDF.
- `gif/png -> ico` sin implementación ICO.
- `svg -> ico` sin formato canónico/adapter.
- rutas accidentales basadas en tools como trim, thumbnail, resize, compress, rotate.

## Duplicate Registries

Migrated:

- conversion-routing graph source.
- capabilities route multistep enrichment.
- desktop multistep job route recomputation.
- operation catalog PDF->PNG invalid QPDF binding.

Pending:

- engine-local capability matrices.
- browser tool capability display matrix.
- desktop capability groups.
- presets target format list.
- detector extension/MIME maps.
- legacy media supported-conversions.
- local-agent image format maps.

Estos quedan como adaptadores temporales o pendientes. No se eliminaron masivamente en esta fase.

## Tests Agregados/Actualizados

- Alias canonicalization.
- Matrix consistency.
- declared vs implemented vs runtime availability.
- PDF->PNG regression.
- QPDF no rasterization routing.
- runtime availability states.
- getTargetsForSource.
- getSourcesForTarget.
- getDirectConversion.
- getBestRoute executable-only.
- invalid route exclusion.
- capabilities route enrichment without invalid ICO synthesis.

## Validacion

```text
pnpm typecheck: PASS
pnpm lint: PASS, 3 warnings preexistentes next/no-img-element
pnpm test: PASS, 865 passed, 1 skipped
pnpm build: PASS
```

Portable:

```text
pnpm build:portable:linux: PASS
pnpm verify:portable:linux: PASS, 54 checks
Linux artifact: dist/linux/Anclora-FileStudio-Linux-x64.tar.zst
Linux SHA-256: 116267022cd1a149f417487bebe908e3a3dafae5ed86a1abc33c8a424074e0eb

pnpm build:portable:windows: PASS
pnpm verify:portable:windows: PASS, 98 checks
Windows artifact: dist/windows/Anclora-FileStudio-Windows-x64-Core.zip
Windows SHA-256: 8bf49ea5991a41d452923f7785c5932dc9ebfd546c031159fd437f61d5b03f60
```

## Riesgos

- Los engine-local matrices siguen existiendo y deben migrarse gradualmente.
- OCR sigue como capability/edge separada, no como modo UX completo.
- PDF->PNG requiere adapter Poppler real antes de habilitarse.
- Web sigue limitado a adapters browser reales.
- Algunos operations en `OPERATION_CATALOG` son todavía de granularidad operación, no edge-level completo.

## Resultado

**FILESTUDIO CANONICAL CONVERSION MATRIX: PASS**

La afirmación objetivo queda cubierta para el grafo efectivo: si una conversión se muestra como ruta disponible desde la matriz/routing nuevos, FileStudio conoce el edge, implementationId, engine y disponibilidad runtime que la ejecutarán en ese entorno.
