# Distribución portable macOS (Apple Silicon) — Anclora FileStudio

## Desktop PRO 0.2.0

El portable macOS soporta exclusivamente **Apple Silicon (arm64)**. No hay
build Intel (x64) — Rosetta 2 no está soportada ni probada.

## Artefacto

| Artefacto | Descripción |
|---|---|
| `Anclora-FileStudio-macOS-arm64.zip` | Paquete portable autocontenido |
| `Anclora-FileStudio-macOS-arm64.zip.sha256` | Checksum SHA-256 |

## Estado de firma y notarización

**Este paquete NO está firmado ni notarizado por Apple.** Es una decisión
explícita, no un descuido: firmar/notarizar requiere una cuenta de
Apple Developer Program y credenciales que este pipeline no gestiona.

Consecuencia práctica: macOS Gatekeeper bloqueará la primera ejecución con
un mensaje del tipo *"no se puede abrir porque el desarrollador no pudo
verificarse"*. Esto es esperado — ver la sección "Gatekeeper" abajo.

## Instalación y ejecución

```bash
# Verificar integridad
shasum -a 256 -c Anclora-FileStudio-macOS-arm64.zip.sha256

# Extraer
unzip Anclora-FileStudio-macOS-arm64.zip
cd Anclora-FileStudio-macOS-arm64

# Iniciar
./start-anclora-filestudio.sh
```

El navegador por defecto se abre automáticamente en `http://127.0.0.1:3847`
(o el siguiente puerto libre en el rango 3847-3857) una vez el servidor
responde en `/api/health`.

## Gatekeeper

Al ser un binario sin firma de Apple, la primera ejecución puede mostrar una
advertencia de seguridad. Para resolverlo, dentro de la carpeta extraída:

```bash
xattr -dr com.apple.quarantine .
```

Alternativamente: Ajustes del Sistema → Privacidad y seguridad → tras el
primer intento bloqueado, aparece un botón "Abrir de todas formas".

No se simula ni se falsea ningún estado de firma/notarización en el
`manifest.json` del paquete (`"signed": false, "notarized": false`).

## Requisitos del sistema

- macOS 13 (Ventura) o superior
- Apple Silicon (arm64) — M1/M2/M3/M4 y sucesores
- Node.js **ya incluido** (bundled) — no requiere instalación

## Herramientas opcionales (Homebrew)

El portable arranca y funciona (procesado de imágenes vía Sharp, historial
vía SQLite, motor de datos) sin ninguna herramienta externa. Las siguientes
capacidades se activan automáticamente si detectan el binario correspondiente
en el `PATH` del usuario en tiempo de ejecución:

```bash
brew install ffmpeg qpdf pandoc tesseract tesseract-lang poppler yt-dlp sevenzip
```

| Herramienta | Capacidad que habilita |
|---|---|
| `ffmpeg` / `ffprobe` | audio, vídeo, miniaturas (requiere el códec `libvorbis` para salida OGG/Vorbis — ver nota abajo) |
| `yt-dlp` | descarga de YouTube |
| `qpdf` | manipulación de PDF |
| `pandoc` | conversión de documentos |
| `tesseract` | OCR |
| `poppler` (`pdftoppm`) | PDF a imagen |
| `sevenzip` (`7zz`)/`7z` | archivos comprimidos |

### Nota sobre codecs de FFmpeg

FileStudio no exige una distribución concreta de FFmpeg (Homebrew, MacPorts,
build propia, etc.) — exige que el binario detectado tenga las
**capacidades** (codecs) que cada conversión necesita. Para salida
OGG/Vorbis en concreto, el binario debe incluir el codec `libvorbis`.

Algunas variantes de `ffmpeg` empaquetadas sin ese codec (por licencia o por
recorte de dependencias) reportan un `ffmpeg` funcional pero fallan
específicamente al codificar a OGG/Vorbis. Esto no es un fallo de detección
de FileStudio — el binario existe y se ejecuta — sino de capacidades del
binario instalado. Compruébalo directamente antes de reportar un problema:

```bash
ffmpeg -encoders | grep -E 'vorbis|libvorbis'
```

Si no aparece nada, reinstala o recompila FFmpeg con soporte `libvorbis`
(la mayoría de builds recientes de `brew install ffmpeg` ya lo incluyen).
No se documenta aquí una fórmula específica porque el requisito real es la
capacidad del codec, no el origen del paquete.

Esta es la misma arquitectura que el portable Linux (detección de
herramientas del sistema, sin bundling estático de binarios GPL/externos de
terceros) — ver [`docs/portable-linux.md`](portable-linux.md). El runner de
CI **sí** usa Homebrew durante la construcción para poblar `manifest.json`
con las versiones detectadas, pero el artefacto distribuido no depende de
que el usuario final tenga Homebrew instalado.

## Runtime embebido

| Componente | Origen | Arquitectura |
|---|---|---|
| Node.js v22.22.1 (ABI 127) | `nodejs.org`, SHA-256 fijado en `scripts/toolchain.lock.json` | Mach-O arm64 |
| `better-sqlite3` | Recompilado en build-time contra el ABI del Node embebido | Mach-O arm64 |
| `sharp` (`@img/sharp-darwin-arm64` + `@img/sharp-libvips-darwin-arm64`) | pnpm store, prebuilt oficial | Mach-O arm64 |

## Scripts incluidos

| Script | Función |
|---|---|
| `start-anclora-filestudio.sh` | Inicia la aplicación (detecta instancia existente, escribe/lee puerto, espera `/api/health`, abre navegador con `open`) |
| `stop-anclora-filestudio.sh` | Detiene la aplicación (por PID, sin matar el grupo de procesos del terminal) |
| `diagnose-anclora-filestudio.sh` | Diagnóstico: runtime, módulos nativos, herramientas del sistema, estado de cuarentena |

## Estructura interna

```text
Anclora-FileStudio-macOS-arm64/
├── start-anclora-filestudio.sh
├── stop-anclora-filestudio.sh
├── diagnose-anclora-filestudio.sh
├── LEEME.txt
├── VERSION.txt
├── manifest.json
├── THIRD_PARTY_NOTICES.txt
├── SBOM.cdx.json
├── runtime/node       # Node.js embebido (Mach-O arm64)
├── app/               # Aplicación Next.js standalone compilada
├── data/              # Base de datos SQLite + fichero de puerto (no borrar al actualizar)
├── temp/              # Ficheros temporales de conversión
└── logs/              # Logs de ejecución (app.log)
```

## Datos y persistencia

Los datos se guardan en `./data/` — no borrar esta carpeta al actualizar de
versión. El fichero `./data/anclora-filestudio.port` registra el puerto de
la instancia activa; `./anclora-filestudio.pid` registra el PID.

## Diseño: portable shell vs `.app` nativo

Se evaluaron dos opciones (ver AGENTS.md / decisión de diseño de este
cambio):

- **A) Portable con launcher shell (elegida)**: reutiliza exactamente la
  misma arquitectura que Linux (Next.js standalone + Node embebido + script
  de arranque), sin introducir Electron ni otra dependencia pesada.
- **B) Bundle `.app` nativo**: exigiría reestructurar el arranque como app
  bundle (`Contents/MacOS/`, `Info.plist`, icono, gestión de ciclo de vida
  vía `NSApplication` o un wrapper), lo cual no aporta valor funcional
  inmediato y sí complejidad no trivial dado que el "runtime" real es un
  servidor Node.js + navegador, no una app de UI nativa.

**Se implementó la opción A.** La opción B queda documentada como evolución
posterior si en el futuro se decide ofrecer doble clic desde Finder sin
pasar por una terminal.

## Limitaciones conocidas

- Sin firma ni notarización Apple (ver arriba).
- Sin build Intel x64 (solo Apple Silicon).
- Las herramientas externas (ffmpeg, pandoc, qpdf, tesseract, poppler,
  yt-dlp) no vienen embebidas — se detectan si están instaladas (p. ej. vía
  Homebrew). Ver [Herramientas opcionales](#herramientas-opcionales-homebrew).
