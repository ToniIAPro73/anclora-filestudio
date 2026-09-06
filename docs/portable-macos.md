# Distribución portable y aplicación macOS (Apple Silicon) — Anclora FileStudio

## Desktop PRO 0.2.0

La distribución macOS soporta exclusivamente **Apple Silicon (arm64)**. No hay
build Intel (x64) — Rosetta 2 no está soportada ni probada.

## Artefactos de Release

A partir de la versión 0.2.0, el pipeline de release genera dos modalidades de distribución:

| Artefacto | Descripción | Destinatario |
|---|---|---|
| `Anclora-FileStudio-macOS-arm64.dmg` | Imagen de disco (.dmg) con `Anclora FileStudio.app` y acceso directo a `/Applications` | Usuarios de escritorio (instalación estándar Finder) |
| `Anclora-FileStudio-macOS-arm64.dmg.sha256` | Checksum SHA-256 de la imagen DMG | Verificación de integridad |
| `Anclora-FileStudio-macOS-arm64.zip` | Paquete portable autocontenido con scripts shell | Usuarios avanzados / entornos terminal |
| `Anclora-FileStudio-macOS-arm64.zip.sha256` | Checksum SHA-256 del paquete portable ZIP | Verificación de integridad |

---

## Estado de firma y notarización

**Estos paquetes NO están firmados ni notarizados por Apple.** Es una decisión
explícita, no un descuido: firmar y notarizar requiere una cuenta de
Apple Developer Program y certificados dedicados que este pipeline no gestiona.

Consecuencia práctica: macOS Gatekeeper advertirá en la primera ejecución que
el desarrollador no puede ser verificado. Esto es esperado y no indica daño
ni manipulación del paquete. Ver la sección [Gatekeeper y autorización](#gatekeeper-y-autorización)
para los pasos de apertura en un solo clic.

---

## Métodos de instalación y uso

### 1. Imagen de disco DMG (Recomendado — experiencia Finder)

El DMG ofrece el flujo estándar de macOS sin requerir terminal ni dependencias de Electron:

1. **Verificar integridad (opcional pero recomendado):**
   ```bash
   shasum -a 256 -c Anclora-FileStudio-macOS-arm64.dmg.sha256
   ```
2. **Montar el DMG:** doble clic sobre `Anclora-FileStudio-macOS-arm64.dmg`.
3. **Instalar:** arrastra `Anclora FileStudio.app` a la carpeta `Applications` (proporcionada en el propio DMG).
4. **Desmontar:** expulsa la imagen de disco.
5. **Ejecutar:** abre `Anclora FileStudio` desde la carpeta `/Applications`, Spotlight o Launchpad.

La aplicación arranca silenciosamente en segundo plano (sin abrir ventana de terminal visible), comprueba la salud de la API local (`/api/health`) y abre automáticamente el navegador web predeterminado en `http://127.0.0.1:3847`.

Si se vuelve a hacer doble clic en la aplicación mientras ya está corriendo, detecta la instancia en ejecución y reutiliza la ventana del navegador sin lanzar procesos duplicados.

### 2. Paquete portable ZIP (Modo Terminal)

Para usuarios que prefieran ejecutarlo en una ruta local fija sin instalar en `/Applications`:

```bash
# Verificar integridad
shasum -a 256 -c Anclora-FileStudio-macOS-arm64.zip.sha256

# Extraer
unzip Anclora-FileStudio-macOS-arm64.zip
cd Anclora-FileStudio-macOS-arm64

# Iniciar
./start-anclora-filestudio.sh

# Detener
./stop-anclora-filestudio.sh
```

---

## Gatekeeper y autorización

Al tratarse de binarios sin firma de Apple, la primera ejecución requiere una autorización puntual:

### Método A: Desde la interfaz de macOS (Finder)
1. Haz clic derecho (o Control + clic) sobre `Anclora FileStudio.app` en `/Applications`.
2. Selecciona **Abrir** en el menú contextual.
3. En el diálogo que indica *"macOS no puede verificar el desarrollador de Anclora FileStudio"*, haz clic en **Abrir**.
*(Solo es necesario la primera vez; los lanzamientos posteriores arrancan directamente).*

Alternativamente, si se bloqueó al hacer doble clic:
- Ve a **Ajustes del Sistema** → **Privacidad y seguridad**.
- Desplázate hasta la sección **Seguridad** y haz clic en **Abrir de todas formas** junto al aviso de Anclora FileStudio.

### Método B: Desde Terminal
Si prefieres eliminar el atributo de cuarentena de Gatekeeper mediante línea de comandos:

```bash
# Para la aplicación instalada en /Applications:
xattr -dr com.apple.quarantine "/Applications/Anclora FileStudio.app"

# Para el paquete portable ZIP extraído:
xattr -dr com.apple.quarantine .
```

---

## Requisitos del sistema

- **Sistema operativo:** macOS 13 (Ventura), macOS 14 (Sonoma), macOS 15 (Sequoia) o superior.
- **Arquitectura:** Apple Silicon (arm64: chips M1, M2, M3, M4 y variantes).
- **Node.js:** **Ya incluido (bundled)** en versión arm64 — no requiere instalar Node.js en el sistema.
- **Sin dependencias de Electron:** El núcleo corre como servidor Next.js local optimizado e interactúa mediante el navegador del sistema.

---

## Dependencias externas y detección de herramientas

FileStudio funciona desde el primer momento para conversiones de imagen (mediante Sharp arm64 embebido), base de datos de historial (SQLite arm64 compilado) y transformaciones de datos.

Para motores de conversión avanzados (video, audio con Vorbis, documentos ofimáticos, OCR, PDF vectorial), FileStudio detecta dinámicamente las herramientas instaladas en el equipo.

### Independencia del PATH de Finder

Los procesos lanzados desde Finder mediante LaunchServices no cargan el entorno de sesión de un shell interactivo (`~/.zprofile` o `~/.zshrc`). Por ello, FileStudio implementa resolución reforzada (`src/lib/binary-resolution.ts`) y el launcher de la `.app` exporta rutas estándar:

- `/opt/homebrew/bin` y `/opt/homebrew/sbin` (Homebrew en Apple Silicon)
- `/usr/local/bin` (herramientas locales / Intel)
- `/Applications/LibreOffice.app/Contents/MacOS/soffice` (instalaciones de LibreOffice para macOS)

### Instalación de herramientas recomendadas (Homebrew)

```bash
brew install ffmpeg qpdf pandoc tesseract tesseract-lang poppler yt-dlp sevenzip
```

Para soporte ofimático (Word, Excel, PowerPoint a PDF/imágenes):
- Instalar LibreOffice descargándolo de su sitio web oficial o vía Homebrew Cask:
  ```bash
  brew install --cask libreoffice
  ```
  FileStudio detecta automáticamente `/Applications/LibreOffice.app/Contents/MacOS/soffice`.

### Capacidades de herramientas y Nota sobre FFmpeg / libvorbis

| Herramienta | Capacidad | Comentarios |
|---|---|---|
| `ffmpeg` / `ffprobe` | Audio, vídeo, miniaturas | Requiere que el binario disponga de los codecs necesarios para la tarea. |
| `soffice` | Documentos ofimáticos (DOCX, XLSX, PPTX, ODT...) | Detectado tanto en `/Applications/LibreOffice.app` como en `PATH`. |
| `yt-dlp` | Descarga de YouTube y metadatos | Utilizado para ingestión multimedia. |
| `qpdf` | Manipulación, linearización y cifrado de PDF | Operaciones PDF nativas. |
| `pandoc` | Conversión de Markdown / formatos de texto | Motor de documentos de texto. |
| `tesseract` | OCR y extracción de texto en imágenes | Requiere paquetes de idiomas deseados. |
| `poppler` (`pdftoppm`) | Conversión de páginas PDF a imágenes raster | Renderizado de documentos. |
| `sevenzip` (`7zz` o `7z`) | Extracción y compresión de archivos | Formatos ZIP, 7z, TAR, etc. |

#### Verificación de capability FFmpeg (libvorbis)

FileStudio no exige una fórmula específica de paquete (Homebrew vanilla, ffmpeg-full, MacPorts o compilación propia). Lo relevante es que el binario reporte la **capability del codec**, en particular `libvorbis` si se realizan conversiones hacia OGG/Vorbis:

```bash
ffmpeg -encoders | grep -E 'vorbis|libvorbis'
```

Si el encoder está presente, la capacidad queda plenamente habilitada.

---

## Arquitectura del App Bundle y Staging

La `.app` y el DMG se construyen reutilizando **exactamente el mismo payload del portable arm64 ya verificado**:

```text
Anclora-FileStudio-macOS-arm64.zip (construido y verificado)
  └── Repaquetizado como payload en:
      Anclora FileStudio.app/
      └── Contents/
          ├── Info.plist               # Bundle ID: com.anclora.filestudio, APPL
          ├── PkgInfo                  # APPL????
          ├── MacOS/
          │   └── Anclora FileStudio   # Launcher bash relocatable (resuelve rutas dinámicamente)
          └── Resources/
              ├── AppIcon.icns         # Icono nativo generado de public/brand/anclora-filestudio.png
              ├── app-build-info.json  # Provenance (commit exacto, versión, fecha)
              └── payload/             # Payload íntegro del portable
                  ├── runtime/node     # Node.js arm64 oficial (ABI 127)
                  ├── app/             # Next.js standalone compilado
                  ├── manifest.json    # Metadatos del build
                  └── tools/           # Herramientas auxiliares
```

Posteriormente, `hdiutil` genera `dist/release/Anclora-FileStudio-macOS-arm64.dmg` con un enlace simbólico a `/Applications` para permitir el arrastre visual directo.

### Persistencia y Datos en Modo .app

Para garantizar que la `.app` sea completamente relocatable (pudiendo ejecutarse incluso desde un DMG de solo lectura o desde cualquier directorio), los datos de usuario nunca se escriben dentro del bundle de la aplicación.

Se almacenan en el directorio estándar de usuario de macOS:
`$HOME/Library/Application Support/Anclora/FileStudio/`
- `data/`: Base de datos SQLite e información de puerto (`anclora-filestudio.port`).
- `temp/`: Ficheros temporales generados durante conversiones.
- `logs/`: Registro de ejecución (`app.log`).
- `anclora-filestudio.pid`: Control de instancia única en ejecución.
