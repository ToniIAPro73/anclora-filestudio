# FileStudio Conversion Matrix Audit

Fecha: 2026-08-12  
Repo: `/home/toni/workspace/anclora/anclora-filestudio`  
Resultado: **FAIL**

No se modificó código. No se hicieron commits, push, cambios de versión, UI ni portables.

## Resumen Ejecutivo

FileStudio ya tiene piezas buenas, pero no tiene todavía una matriz canónica ejecutable.

Fuentes actuales:

- `src/lib/domain/format-catalog.ts`: catálogo formal de formatos. Se declara como fuente única de formatos.
- `src/lib/domain/operations.ts`: `OPERATION_CATALOG`, fuente parcial de operaciones declaradas.
- `src/lib/engines/**`: cada engine tiene su propia matriz real de capacidades.
- `src/lib/conversion-routing/**`: routing multietapa derivado solo de `OPERATION_CATALOG`.
- `src/lib/browser-conversion/capabilities.ts` y `src/lib/browser-tools/capabilities.ts`: matrices web separadas.
- `src/lib/capabilities/desktop-capabilities.ts`: grupos UX y “Más herramientas”.
- `src/components/presets/preset-manager.tsx`: presets con formatos manuales.
- `src/lib/detection/file-detector.ts`: detección con mapas de extensión/MIME/magic duplicados.
- `src/lib/media/supported-conversions.ts`: matriz legacy media.
- `apps/local-agent/src/operations.ts`: mapas propios para imágenes.

Conclusión: `FORMAT_CATALOG` debe mantenerse como fuente canónica de formatos. `OPERATION_CATALOG` debe evolucionar a la matriz canónica de conversiones, pero hoy no puede considerarse fiable porque no cubre todas las capacidades reales y contiene al menos una arista no ejecutable crítica: `pdf -> png` asignada a `qpdf`.

## Inventario de Formatos

Formatos en `FORMAT_CATALOG`: **50**

| ID | Extensiones | MIME principal | Categoría | Input | Output | Definiciones actuales | Conflictos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mp3 | mp3 | audio/mpeg | audio | sí | sí | catalog, ffmpeg, media legacy | none |
| m4a | m4a | audio/mp4 | audio | sí | sí | catalog, ffmpeg, media legacy | none |
| wav | wav | audio/wav | audio | sí | sí | catalog, ffmpeg, media legacy | none |
| flac | flac | audio/flac | audio | sí | sí | catalog, ffmpeg, media legacy | none |
| ogg | ogg | audio/ogg | audio | sí | sí | catalog, ffmpeg, detector | none |
| aac | aac | audio/aac | audio | sí | declarado parcial | catalog, OPERATION_CATALOG | engine FFmpeg no lo expone como output |
| mp4 | mp4 | video/mp4 | video | sí | sí | catalog, ffmpeg, media legacy | none |
| webm | webm | video/webm | video | sí | sí | catalog, ffmpeg, media legacy | none |
| mkv | mkv | video/x-matroska | video | sí | sí | catalog, ffmpeg, media legacy | none |
| avi | avi | video/x-msvideo | video | sí | no canonical output | catalog, ffmpeg | output no soportado |
| mov | mov | video/quicktime | video | sí | no canonical output | catalog, ffmpeg | output no soportado |
| wmv | wmv | video/x-ms-wmv | video | detector/catalog | no | catalog only | no engine real |
| ts | ts | video/mp2t | video | detector/catalog | no | catalog only | no engine real |
| jpeg | jpg, jpeg | image/jpeg | image | sí | sí | catalog, detector, sharp, browser | id `jpeg`, UI/API a veces `jpg` |
| png | png | image/png | image | sí | sí | catalog, detector, sharp, browser | none |
| webp | webp | image/webp | image | sí | sí | catalog, detector, sharp, browser | none |
| avif | avif | image/avif | image | sí | desktop output | catalog, detector, sharp | web lo marca avanzado/no browser |
| tiff | tiff, tif | image/tiff | image | sí | desktop output | catalog, detector, sharp | alias `tif` externo |
| gif | gif | image/gif | image | sí | sharp/ffmpeg output | catalog, detector, sharp, ffmpeg | OPERATION_CATALOG image convert no declara gif output |
| docx | docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | document | sí | sí | catalog, detector, pandoc, libreoffice, calibre | multiple engines |
| doc | doc | application/msword | document | sí | no | catalog, detector, libreoffice | OPERATION_CATALOG doc convert no lo declara |
| odt | odt | application/vnd.oasis.opendocument.text | document | sí | sí | catalog, detector, pandoc, libreoffice | Pandoc getCapabilities omite odt input |
| rtf | rtf | application/rtf | document | sí | no | catalog, detector, libreoffice | OPERATION_CATALOG no lo declara |
| xlsx | xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | spreadsheet | sí | sí | catalog, detector, libreoffice | OPERATION_CATALOG solo to PDF |
| xls | xls | application/vnd.ms-excel | spreadsheet | sí | no | catalog, detector, libreoffice | OPERATION_CATALOG no lo declara |
| ods | ods | application/vnd.oasis.opendocument.spreadsheet | spreadsheet | sí | sí | catalog, detector, libreoffice | partial |
| pptx | pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation | presentation | sí | sí | catalog, detector, libreoffice | OPERATION_CATALOG only PDF via office |
| ppt | ppt | application/vnd.ms-powerpoint | presentation | sí | no | catalog, detector, libreoffice | OPERATION_CATALOG no lo declara |
| odp | odp | application/vnd.oasis.opendocument.presentation | presentation | catalog/detector | no | catalog, detector | LibreOffice engine no lo lista como input |
| pdf | pdf | application/pdf | pdf | sí | sí | catalog, detector, qpdf, libreoffice, calibre, tesseract, browser | technical category separate from UX |
| epub | epub | application/epub+zip | ebook | sí | sí | catalog, detector, calibre | OPERATION_CATALOG no lo declara |
| mobi | mobi | application/x-mobipocket-ebook | ebook | sí | sí | catalog, detector, calibre | OPERATION_CATALOG no lo declara |
| azw3 | azw3 | application/vnd.amazon.ebook | ebook | sí | sí | catalog, detector, calibre | experimental |
| zip | zip | application/zip | archive | sí | sí | catalog, detector, 7zip, browser pdf split output | OPERATION_CATALOG no archives |
| 7z | 7z | application/x-7z-compressed | archive | sí | sí | catalog, detector, 7zip | OPERATION_CATALOG no archives |
| tar | tar | application/x-tar | archive | sí | sí | catalog, detector, 7zip | OPERATION_CATALOG no archives |
| gz | gz | application/gzip | archive | sí | no canonical output | catalog, detector, 7zip input | no matrix canonical |
| bz2 | bz2 | application/x-bzip2 | archive | sí | no | catalog, detector, 7zip input | no matrix canonical |
| xz | xz | application/x-xz | archive | sí | no | catalog, detector, 7zip input | no matrix canonical |
| json | json | application/json | structured-data | sí | sí | catalog, detector, data-ts, browser | none |
| yaml | yaml, yml | application/yaml | structured-data | sí | sí | catalog, detector, data-ts, browser | browser normaliza yml |
| toml | toml | application/toml | structured-data | sí | sí | catalog, detector, data-ts, browser | none |
| xml | xml | application/xml | structured-data | sí | sí | catalog, detector, data-ts, browser | none |
| csv | csv | text/csv | structured-data | sí | sí | catalog, detector, data-ts, browser | none |
| tsv | tsv | text/tab-separated-values | structured-data | sí | sí | catalog, detector, data-ts, browser | none |
| markdown | md, markdown | text/markdown | plain-text | sí | sí | catalog, detector, pandoc | OPERATION_CATALOG usa `md` |
| txt | txt | text/plain | plain-text | sí | sí | catalog, detector, pandoc, OCR output | none |
| html | html, htm | text/html | plain-text | sí | sí | catalog, detector, pandoc, calibre | OPERATION_CATALOG partially |
| rst | rst | text/x-rst | plain-text | sí | sí | catalog, detector, pandoc | none |
| tex | tex, latex | application/x-tex | plain-text | sí | sí | catalog, detector, pandoc | Pandoc usa `latex` internamente |

Formatos detectados/implementados fuera del catálogo: `jpg`, `tif`, `opus`, `aiff`, `wma`, `alac`, `flv`, `m4v`, `mts`, `bmp`, `ico`, `svg`, `heic`, `heif`, `azw`, `fb2`, `rar`, `wim`, `lz4`, `yml`, `htm`, `latex`, `srt`.

## Conversiones Directas

`OPERATION_CATALOG` declara:

- Operaciones: **18**
- Filas source-target declaradas: **222**
- Pares únicos declarados: **146**
- Sources únicos declarados: **28**
- Targets únicos declarados: **20**

Ejecución real aproximada por engines/browser:

- Filas directas implementadas aproximadas: **307**
- Pares únicos implementados aproximados: **239**

La diferencia existe porque los engines reales tienen matrices propias que `OPERATION_CATALOG` no contiene: `data-ts`, `calibre`, `sevenzip`, `tesseract`, matrices completas de `libreoffice`, browser tools y capacidades legacy media.

### Mapa Directo Actual por Engine

| Source | Target | Engine | Plataforma | Loss | OCR | Declarado | Implementado | Runtime verified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jpeg/png/webp/avif/tiff/gif | jpeg/png/webp/avif/tiff/gif | sharp-image | desktop/local | per target | no | partial | sí | smoke PNG→WEBP, JPG→PNG |
| jpeg/jpg/png/webp | jpeg/png/webp | browser-canvas | web | lossy/metadata risk | no | browser only | sí | browser tests |
| mp3/m4a/wav/flac/ogg | mp3/m4a/wav/flac/ogg | ffmpeg-media | desktop/local | per target | no | sí | sí | smoke WAV→MP3 |
| mp4/webm/mkv/avi/mov | mp4/webm/mkv | ffmpeg-media | desktop/local | lossy/remux | no | sí | sí | partial |
| video | mp3/m4a/wav/flac/ogg | ffmpeg-media | desktop/local | mixed | no | sí | sí | partial |
| video | gif/jpg/srt | ffmpeg-media | desktop/local | mixed | no | partial | sí | not all covered |
| pdf | pdf | qpdf | desktop/local | lossless/metadata-risk | no | sí | sí | smoke linearize |
| pdf | png | qpdf declared, should be Poppler | desktop/local | lossy-controlled | no | sí | no | no |
| image | txt/pdf | tesseract | desktop/local | lossy | sí | no | sí | PNG→TXT smoke |
| pdf | txt | tesseract + pdftoppm | desktop/local | lossy | sí | declared | sí | not full smoke |
| markdown/md/html/rst/docx/odt/tex/txt | md/html/docx/odt/rst/tex/txt | pandoc | desktop/local | mixed | no | partial | sí | MD→DOCX/HTML smoke |
| docx/doc/odt/rtf | pdf/odt/docx | libreoffice | desktop/local | mixed | no | partial | sí | DOCX→PDF smoke |
| xlsx/xls/ods | pdf/ods/xlsx | libreoffice | desktop/local | mixed | no | partial | sí | not fully covered |
| pptx/ppt | pdf/pptx | libreoffice | desktop/local | mixed | no | partial | sí | not fully covered |
| epub/mobi/azw3/html/docx | epub/mobi/azw3/pdf | calibre | desktop/local | mixed | no | no | sí | EPUB→PDF conditional |
| zip/7z/tar/gz/bz2/xz/rar/wim/lz4 | zip/7z/tar | sevenzip | desktop/local | lossless | no | no | sí | ZIP extract smoke only |
| json/yaml/toml/xml/csv/tsv | json/yaml/toml/xml/csv/tsv | data-ts | desktop/local | mixed | no | no | sí | JSON→YAML, CSV→JSON smoke |
| json/yaml/toml/xml/csv/tsv | json/yaml/toml/xml/csv/tsv | browser-data | web | mixed | no | browser matrix | sí | browser tests |
| pdf/jpeg/png/webp | pdf/zip | browser-pdf | web | metadata-risk | no | browser tools | sí | browser tests |

### Duplicados Declarados

`OPERATION_CATALOG` genera duplicados por operación genérica superpuesta:

- Imágenes: `image:convert`, `image:resize`, `image:optimize` declaran muchos pares idénticos.
- Audio: `media:convert-audio`, `media:trim`, `media:normalize-audio` duplican muchos pares.
- Vídeo/audio: `media:trim`, `media:extract-audio`, `media:convert-video` crean aristas semánticamente herramientas, no conversiones puras.
- Documentos: `docx->pdf` y `odt->pdf` aparecen por `doc:convert` y `office:to-pdf`.

Conflictos principales:

- `pdf->png`: declarado con `qpdf`, no ejecutable por QPDF.
- `md` vs `markdown`: IDs inconsistentes entre catálogo y operaciones.
- `jpg` vs `jpeg`: output canonical en catálogo es `jpg`, engines exponen `jpeg`.
- `ico`: aparece como output de `image:favicon`, pero no existe en `FORMAT_CATALOG`.
- `svg`: aparece como input de `image:favicon`, pero no existe en `FORMAT_CATALOG`.
- `gif`: `SharpEngine` puede output `gif`, `OPERATION_CATALOG image:convert` no lo declara.
- Archives, ebooks, data y OCR están implementados pero no integrados de forma completa en `OPERATION_CATALOG`.

## Motores

| Engine | Propósito | Inputs | Outputs | Windows | Linux | Web | Detección | Health/current call sites |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LibreOffice | Office/ODF a PDF/cross-convert | docx, doc, odt, rtf, xlsx, xls, ods, pptx, ppt | pdf, odt, docx, ods, xlsx, pptx | sí, portable/env/PATH | sí, PATH | no | `--version`/`--headless --version` | `libreoffice-engine`, registry, capabilities |
| Pandoc | texto/documentos | markdown, md, html, htm, rst, docx, odt, latex, tex, txt | md, html, docx, odt, rst, tex, txt | sí | sí | no | `pandoc --version` | `pandoc-engine`, registry |
| Sharp | imágenes | jpeg, jpg, png, webp, avif, tiff, gif | jpeg, png, webp, avif, tiff, gif | sí npm native | sí npm native | no; browser usa canvas | dynamic import | `sharp-engine`, background-removal |
| FFmpeg | audio/vídeo | mp3, m4a, wav, flac, ogg, mp4, webm, mkv, avi, mov | mp3, m4a, wav, flac, ogg, mp4, webm, mkv, gif, jpg, srt | sí | sí | no | ffmpeg+ffprobe `-version` | `ffmpeg-engine`, media legacy |
| FFprobe | análisis media | media | descriptor | sí | sí | no | `ffprobe -version` | `ffmpeg-engine`, `media/probe` |
| QPDF | PDF tools | pdf | pdf | sí | sí | no | `qpdf --version` | `qpdf-engine` |
| Poppler/pdftoppm | raster PDF helper | pdf | png pages | sí | sí | no | `pdftoppm -v` only inside Tesseract | no standalone engine |
| Tesseract | OCR | image, pdf | txt, searchable pdf for image | sí | sí | no | `tesseract --version`, `--list-langs`; pdftoppm for PDF | `tesseract-engine` |
| Calibre | ebooks | epub, mobi, azw3, html, docx | mobi, azw3, pdf, epub | sí | sí | no | `ebook-convert --version` | `calibre-engine` |
| 7-Zip | archive extract/repack | zip, 7z, tar, gz, bz2, xz, rar, wim, lz4 | zip, 7z, tar | sí | sí | no | `7z i` | `sevenzip-engine` |
| Browser | web-safe local tools | jpeg, jpg, png, webp, pdf, structured data | jpeg, png, webp, pdf, zip, structured data | browser | browser | sí | runtime target/browser APIs | browser tools/capabilities |
| data-ts | structured data | json, yaml, toml, xml, csv, tsv | same set | sí | sí | sí via browser-data | dynamic imports | `data-engine`, browser conversion |

## PDF -> PNG Root Cause

ROOT CAUSE: `OPERATION_CATALOG` declares `pdf:to-png` with `engineId: "qpdf"` and dependencies `["qpdf", "pdftoppm"]`. `QpdfEngine` only exposes and executes `linearize`, `extract-pages`, `rotate`, `decrypt`, all PDF->PDF. No QPDF code path rasterizes pages. Poppler `pdftoppm` is detected only as a dependency inside `TesseractEngine` for PDF OCR, not as an executable conversion engine.

SEVERITY: **HIGH**

AFFECTED ROUTES:

- `pdf -> png`
- `docx -> pdf -> png`
- `html/md/rst/tex -> pdf -> png`
- `pdf -> png -> jpeg/webp/avif/tiff/ico`
- Any synthetic multistep route using `pdf:to-png`

Bug location:

- Catalog: wrong engine assignment.
- Routing: trusts catalog edge and dependency availability.
- Capability mapping: checks engine IDs/dependencies, not engine step implementation.
- Execution: fails later because `multistep-processor` revalidates against real engine capabilities and QPDF has no `png` capability.

Correct architectural fix later: introduce a real `poppler`/`pdf-raster` edge implementation or remove/filter `pdf->png` until implemented. Do not assign rasterization to QPDF.

## OCR

### OCR como Herramienta

| Source | Target | Engine | Output | Language options | Layout options | Windows | Linux | Web | Implemented | Tested |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| png/jpeg/jpg/tiff/tif/webp | txt | tesseract | text/plain | detected langs, default spa+eng, fallback eng/spa/first | none | sí | sí | no | sí | PNG->TXT smoke |
| png/jpeg/jpg/tiff/tif/webp | pdf | tesseract | searchable PDF | same | Tesseract PDF renderer | sí | sí | no | sí | not clear full coverage |
| pdf | txt | tesseract + pdftoppm | text/plain | same | page images at DPI, max 50 pages | sí | sí | no | sí | partial/unit, no heavy smoke seen |

### OCR como Modo de Conversión

No hay modo formal por edge como `pdf->docx standard` vs `pdf->docx with OCR`. OCR aparece como capacidades separadas de Tesseract (`ocr-image-to-text`, `ocr-image-to-pdf`, `ocr-pdf-to-text`) y como operación `pdf:ocr` en `OPERATION_CATALOG`. No hay `Image -> DOCX` ni `PDF -> searchable PDF` implementado para PDFs según el código leído.

## Archives

La sección “Archivos” mezcla conversiones y herramientas.

Conversiones implementadas:

- `zip/7z/tar/gz/bz2/xz/rar/wim/lz4 -> zip/7z/tar` vía `sevenzip` repack, con controles de path traversal, entry count y expansion ratio.

Herramientas:

- extract.
- list/inspect se menciona en catalog/UX, pero el engine leído expone `extract` y `repack`; no vi una API de listing completa integrada como conversión.
- browser PDF split puede devolver `zip`, pero eso es empaquetado de resultados, no archive conversion.

Futuro: las conversiones de contenedor van a la matriz. `extract`, `inspect`, `hash`, `list` van a una capa ToolOperation separada.

## Más Herramientas

Capacidades actuales bajo “Más herramientas”:

- `structured`: JSON/YAML/TOML/XML/CSV/TSV. Clasificación: **CONVERSION**.
- Browser PDF tools: merge/split/reorder/rotate/images-to-pdf. Clasificación: **TOOL** salvo images-to-pdf que puede modelarse como conversion edge image->pdf.
- Image browser tools: convert/compress/resize/read-exif/strip-exif/batch. Clasificación: convert = **CONVERSION**, compress/resize/strip/read = **TOOL**.
- OCR group: **OCR**.
- diagnostics/toolchain/status panels: **SYSTEM**.

La arquitectura final no debe tener una categoría semántica “Más herramientas”. Debe derivar:

- Datos estructurados.
- PDF tools.
- Image tools.
- OCR.
- Sistema/diagnóstico.

## Source -> Target Actual

Ejemplos representativos derivados de la matriz real encontrada:

DOCX:

- `-> pdf` LibreOffice, Pandoc declared.
- `-> md/html/odt/rst/txt` Pandoc.
- `-> epub` Calibre.
- `-> png/jpeg/webp/avif/tiff/ico` router cree posible vía PDF->PNG, pero hoy inválido por QPDF.

PDF:

- `-> pdf` QPDF/browser tools.
- `-> txt` Tesseract OCR.
- `-> png` declarado pero no ejecutable.
- `-> jpeg/webp/avif/tiff/ico` multistep inválido vía `png`.

PNG:

- `-> jpeg/webp/avif/tiff/gif` Sharp.
- `-> txt/pdf` OCR Tesseract.
- `-> pdf` browser images-to-pdf.
- `-> ico` OPERATION_CATALOG declara via `image:favicon`, implementation Sharp no tiene ICO output.

JSON:

- `-> yaml/toml/xml/csv/tsv` data-ts/browser.

ZIP:

- `-> 7z/tar` 7-Zip repack.
- extract tool.

## Convertir A

Debe ser inversión de la misma matriz, nunca lista paralela.

Ejemplos:

PDF acepta sources reales:

- `docx/doc/odt/rtf/xlsx/xls/ods/pptx/ppt` vía LibreOffice.
- `epub` vía Calibre.
- `image` vía Tesseract image searchable PDF y browser images-to-pdf.
- `pdf` vía QPDF/browser tools.
- `md/html/rst` vía Pandoc.

TXT acepta:

- `image` vía OCR.
- `pdf` vía OCR.
- `markdown/html/rst/docx/odt` vía Pandoc.

EPUB acepta:

- `mobi/azw3/html/docx` vía Calibre.

ZIP acepta:

- archive repack sources via 7-Zip.
- PDF split output bundle in browser as tool artifact, not canonical archive conversion.

## Multistep

Implementación actual en `src/lib/conversion-routing/`:

- Algoritmo: BFS acotado.
- Máximo de intermediarios: **2** (`MAX_INTERMEDIATES = 2`, máximo 3 edges).
- Scoring: producto de pesos por loss profile x penalización por intermediarios x factor experimental.
- Determinismo: catálogo order, then score desc, steps asc, first `operationId` asc.
- Ciclos: visited set por path.
- Usa `OPERATION_CATALOG`: sí.
- Runtime filtering: filtra `engineId` y dependencies presentes por `getAvailableEngineIds`.
- Engine filtering: no valida que el engine implemente el par; solo ID/dependencies.

Con todos los deps del catálogo disponibles:

- Best reachable routes: **273**
- Direct best routes: **144**
- Multistep best routes: **129**
- Multistep “clean”: **100**
- Multistep lossy: **29**

Clasificación:

- VALID: rutas multistep cuyas steps tienen capability real equivalente. Requiere reconciliar con engine-local matrices; no todas se verificaron.
- INVALID_ENGINE: todas las rutas que incluyen `pdf->png(qpdf/pdf:to-png)`.
- LOSSY: rutas con `structural-risk` o `lossy`, por ejemplo document->pdf->ocr text.
- UNVERIFIED: rutas generadas desde operaciones-tool como `trim` para crear contenedores media sin input media real.
- CYCLIC/BAD: BFS evita ciclos directos por visited set.

## Modelo Canónico Propuesto

No crear `new-conversion-registry.ts` de entrada. Evolucionar:

- `FORMAT_CATALOG` sigue como catálogo canónico de formatos.
- `OPERATION_CATALOG` se convierte en **Conversion Matrix** canónica.
- Engines dejan de mantener matrices divergentes o las exponen como implementación validable contra `OPERATION_CATALOG`.
- Browser matrix se integra como edges con `runtimeTargets: ["vercel-web"]` y `engineId: "browser"`.

Modelo mínimo:

```ts
type FormatDefinition = {
  id: FormatId;
  extensions: string[];
  canonicalExtension: string;
  mimeTypes: string[];
  category: TechnicalCategory;
  uxCategory: UxCategory;
  aliases: string[];
  inputSupported: boolean;
  outputSupported: boolean;
};

type ConversionEdge = {
  id: OperationId;
  source: FormatId;
  target: FormatId;
  engineId: EngineId;
  operation: string;
  implementation: "implemented" | "declared-only" | "tool-only";
  mode: "conversion" | "tool" | "ocr";
  platforms: RuntimeTarget[];
  dependencies: string[];
  lossProfile: LossProfile;
  ocr: "none" | "required" | "optional";
  cost: OperationCost;
  constraints: RuntimeConstraint[];
};

type RuntimeCapability = {
  engineId: EngineId;
  platform: RuntimeTarget;
  available: boolean;
  version: string | null;
  dependencies: Record<string, HealthState>;
  health: "healthy" | "degraded" | "unavailable";
};

type ConversionRoute = {
  source: FormatId;
  target: FormatId;
  steps: ConversionEdge[];
  score: number;
  quality: QualityProfile;
  effectiveAvailability: Availability;
};
```

APIs:

- `getFormat(id)`
- `getAllFormats()`
- `getTargetsForSource(source, environment)`
- `getSourcesForTarget(target, environment)`
- `getDirectConversion(source, target, environment)`
- `findRoutes(source, target, environment)`
- `getBestRoute(source, target, environment)`
- `supportsOCR(source, target, environment)`
- `isAvailable(source, target, environment)`
- `getConversionCost(source, target, mode, environment)`

## Estados Canónicos

No usar un único enum que mezcle conceptos.

Separar:

```ts
technicalSupport:
  | "supported-direct"
  | "supported-multistep"
  | "unsupported"

runtimeAvailability:
  | "available"
  | "unavailable-engine"
  | "unavailable-dependency"
  | "unavailable-platform"
  | "unavailable-health"
  | "blocked-policy"

quality:
  | "lossless"
  | "lossy-controlled"
  | "lossy"
  | "metadata-risk"
  | "layout-risk"
  | "structural-risk"

featureMode:
  | "standard"
  | "ocr"
  | "tool"
```

La UI puede derivar labels compuestos: `SUPPORTED_DIRECT`, `SUPPORTED_MULTISTEP`, `SUPPORTED_WITH_OCR`, `SUPPORTED_LOSSY`, `UNAVAILABLE_ENGINE`, `UNSUPPORTED`.

## Disponibilidad Real

`effectiveAvailability`:

```text
DECLARED EDGE
+ IMPLEMENTATION BINDING
+ PLATFORM COMPATIBLE
+ ENGINE AVAILABLE
+ DEPENDENCY AVAILABLE
+ RUNTIME HEALTH
+ INPUT CONSTRAINTS
= AVAILABLE
```

Regla: la UI nunca debe mostrar `available` si la ruta fallará por engine/dependency ausente o por implementación inexistente. En ese caso puede mostrar “requiere instalación” o “no soportado todavía”, pero no una opción ejecutable.

## Taxonomía UX Propuesta

Categorías recomendadas según capacidades reales:

- Documentos: document + pdf + plain-text.
- Imágenes: image + vector si se añade luego.
- Audio.
- Vídeo.
- Ebooks.
- Archivos comprimidos.
- Datos: structured-data merece categoría propia porque hay engine real y browser matrix completa.
- Otros: solo residual/unknown.

Presentaciones y hojas de cálculo pueden ser subcategorías de Documentos por ahora; sus capacidades reales dependen de LibreOffice y son principalmente a PDF/cross Office. Vector no merece categoría propia todavía: `svg` aparece en operaciones/UI pero no está en el catálogo canónico ni tiene engine completo.

La categoría destino no debe limitar source. `Convertir -> Imágenes -> PNG` debe consultar `getSourcesForTarget("png")` y aceptar imagen/video/PDF/documento si hay ruta válida y disponible.

## Coste

No implementar pricing ahora.

Punto de enganche:

```ts
type OperationCost = {
  model: "included" | "credits" | "metered";
  components: Array<"base-conversion" | "multistep" | "ocr" | "ai" | "batch">;
};
```

Agregación por ruta:

- base conversion por edge.
- penalización multistep.
- OCR si `ocr !== "none"`.
- AI si engine futuro lo requiere.
- batch por número/peso de inputs.

## Migración

| Current file/module | Current responsibility | Keep | Refactor | Remove | Migrate to | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `src/lib/domain/format-catalog.ts` | formatos, MIME, extensiones | sí | añadir aliases, UX category, input/output flags | no | canonical Format Catalog | bajo |
| `src/lib/domain/operations.ts` | operaciones declaradas parciales | sí | convertir a matriz edge-level completa | no | canonical Conversion Matrix | alto |
| `src/lib/conversion-routing/**` | BFS/scoring/routes | sí | validar implementation + runtime per edge | no | canonical routing API | medio |
| `src/lib/engines/**` | ejecución y capability generation | sí | capabilities derivadas de matrix; engines validan bindings | no | Engine adapters | alto |
| `src/lib/engines/pdf/qpdf-engine.ts` | PDF tools | sí | eliminar responsabilidad raster | no | QPDF tool/edge pdf->pdf | alto por bug |
| `src/lib/engines/ocr/tesseract-engine.ts` | OCR | sí | formalizar OCRCapability | no | OCR mode/tool edges | medio |
| Poppler absent | PDF raster helper | no | crear adapter si se decide | no | future `poppler` engine | alto |
| `src/lib/browser-conversion/capabilities.ts` | browser structured matrix | sí temporal | migrar edges web | eventual | Conversion Matrix runtime=web | medio |
| `src/lib/browser-tools/capabilities.ts` | web tool groups | sí | derivar desde matrix/tool catalog | eventual | Runtime capabilities + UX | medio |
| `src/lib/capabilities/desktop-capabilities.ts` | manual UX groups | sí temporal | derivar groups | partial | UX derived taxonomy | medio |
| `src/lib/detection/file-detector.ts` | detector + duplicate maps | sí | derive extension/MIME maps from catalog where possible | no | Format Catalog lookups | medio |
| `src/lib/media/supported-conversions.ts` | legacy media matrix | temporal | converge with FFmpeg engine matrix | sí later | OPERATION_CATALOG edges | medio |
| `src/components/presets/preset-manager.tsx` | manual target presets | temporal | validate targets from matrix | no | Matrix-derived presets | bajo |
| `apps/local-agent/src/operations.ts` | local-agent image maps | sí | import canonical formats | no | SDK/shared matrix subset | medio |
| `apps/api`, `apps/worker` | service foundation | sí | do not claim parity | no | consume shared matrix contracts later | alto infra |
| jobs/history | execution persistence | sí | store route id/edge ids/capability snapshot | no | route snapshot metadata | medio |

## Fases de Migración

1. Freeze audit findings. Add tests that prove current known inconsistencies, especially `pdf->png` declared but not executable.
2. Normalize format IDs: aliases `jpg->jpeg`, `md->markdown`, `tex/latex`, `yml->yaml`, `tif->tiff`, add missing real outputs like `ico` or remove invalid ops.
3. Extend `OPERATION_CATALOG` to edge-level canonical matrix. Include mode, platforms, implementation binding, dependencies, OCR, cost placeholder.
4. Reconcile engine-local matrices against canonical edges. Engines should expose capabilities by filtering canonical edges for descriptor + runtime, not by private divergent tables.
5. Integrate browser edges into the same matrix with `runtimeTargets: ["vercel-web"]`.
6. Fix routing to use only canonical edges with `implementation === "implemented"` and `effectiveAvailability === "available"`.
7. Split ToolOperation from ConversionEdge: PDF merge/split/rotate, image resize/compress, archive extract/list, metadata tools.
8. Implement `getTargetsForSource` and `getSourcesForTarget` as inverse queries over the same filtered matrix.
9. Store route snapshots in jobs/history for reproducibility.
10. Derive UX categories, selectors, presets and technical details from APIs. Remove manual user-visible lists.

## Blockers

- `pdf->png` has no executable engine binding.
- `OPERATION_CATALOG` lacks archives, ebooks, structured data, full OCR, full LibreOffice, full Sharp and browser edges.
- Format aliases are inconsistent across catalog, operations, detector and engines.
- Some operations are tools but modeled as conversions, which pollutes routing.
- Runtime availability is per engine, not per edge implementation.
- Service/worker/local-agent parity is explicitly incomplete by repo instructions.

## Risks

- Exposing false positives in UI if routing remains catalog-only.
- Breaking mature desktop flows if engine-local matrices are removed before canonical edge parity.
- Web/Desktop divergence if browser matrix is not represented as runtime-specific edges.
- User confusion from categories if technical category and UX category are conflated.
- Test gaps for archives repack, Calibre matrix, LibreOffice spreadsheets/presentations, PDF OCR and browser PDF artifact outputs.

## Salida Obligatoria

FORMATS FOUND: **50** canonical in `FORMAT_CATALOG`; 24 extra detected/implemented aliases or missing canonical formats.

DIRECT CONVERSIONS FOUND: **146** unique declared pairs in `OPERATION_CATALOG`; about **239** implemented unique pairs across real engines/browser.

DECLARED BUT NOT EXECUTABLE:

- `pdf -> png` via QPDF.
- `png/svg -> ico` via Sharp catalog, because SharpEngine does not implement ICO output and `svg/ico` are not canonical formats.
- Several catalog-only routes become suspect when operation is really a tool (`trim`, `thumbnail`, `normalize`) and not general conversion.

ENGINES FOUND: LibreOffice, Pandoc, Sharp, FFmpeg, FFprobe, QPDF, Poppler/pdftoppm helper, Tesseract, Calibre, 7-Zip, Browser, data-ts, background-removal.

OCR TOOL CAPABILITIES:

- Image -> TXT.
- Image -> searchable PDF.
- PDF -> TXT via pdftoppm + Tesseract.

OCR CONVERSION-MODE CAPABILITIES:

- Not modeled canonically today. OCR is separate capability/operation, not a mode variant per conversion edge.

MULTISTEP ROUTES FOUND: **129** best multistep routes under all declared catalog deps.

MULTISTEP VALID: not fully certifiable in this round; many likely valid if engines exist, but validation requires canonical implementation binding.

MULTISTEP INVALID: all routes containing `pdf->png(qpdf/pdf:to-png)`; examples include `docx->pdf->png` and `html->pdf->png`.

PDF→PNG ROOT CAUSE: wrong catalog edge: QPDF assigned to rasterization; Poppler should own rasterization or route must be unavailable.

CURRENT SOURCE OF TRUTH: fragmented. `FORMAT_CATALOG` for formats, `OPERATION_CATALOG` partial declared conversions, engine-local matrices for real execution.

PROPOSED SOURCE OF TRUTH: `FORMAT_CATALOG + evolved OPERATION_CATALOG as canonical Conversion Matrix + EngineRegistry RuntimeCapabilities`.

DUPLICATE REGISTRIES: format detector maps, engine-local matrices, browser matrices, desktop groups, presets, UI maps, media legacy matrix, local-agent maps.

CONFLICTS: `pdf->png`, `md/markdown`, `jpg/jpeg`, `tex/latex`, `svg/ico`, incomplete archives/ebooks/data/OCR in operation catalog.

PROPOSED CANONICAL MODEL: `FormatDefinition`, `ConversionEdge`, `ConversionRoute`, `RuntimeCapability`, `OCRCapability`, `OperationCost`.

PROPOSED "CONVERT FROM" API: `getTargetsForSource(source, environment)` filters canonical edges/routes by source and effective availability.

PROPOSED "CONVERT TO" API: `getSourcesForTarget(target, environment)` is inverse query over same matrix, no second list.

PROPOSED ROUTING API: `findRoutes(source, target, environment)`, `getBestRoute(...)`, max intermediates configurable with canonical edge validation.

PROPOSED RUNTIME AVAILABILITY API: `getRuntimeCapabilities(environment)`, `isAvailable(source,target,environment)`, `getEffectiveAvailability(edge, environment)`.

PROPOSED UX CATEGORIES: Documentos, Imágenes, Audio, Vídeo, Ebooks, Archivos comprimidos, Datos, Otros. Presentations/spreadsheets under Documentos for now; Vector not separate yet.

MIGRATION PHASES: 10 phases listed above.

BLOCKERS: executable binding gaps, duplicate matrices, tool-vs-conversion mixing, format alias drift, missing tests.

RISKS: false UI availability, desktop regressions, web divergence, service parity overclaiming.

CONVERSION MATRIX ARCHITECTURE AUDIT: **FAIL**

## Pass/Fail

FAIL.

Reason: se identificaron formatos, conversiones, motores, OCR, inconsistencias, causa de PDF->PNG, routing actual y modelo/plan recomendado; pero el estado actual no cumple el principio no negociable. Todavía hay listas manuales visibles/semivisibles y rutas declaradas no ejecutables.
