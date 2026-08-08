import type { CapabilityGroup } from "./capability-groups";

export type DesktopProGroupId =
  | "images"
  | "pdf"
  | "media"
  | "documents"
  | "ocr"
  | "archives"
  | "ebooks"
  | "structured";

export const DESKTOP_PRO_GROUPS: Array<CapabilityGroup & { id: DesktopProGroupId }> = [
  {
    id: "images",
    label: "Imágenes",
    description: "Convierte, comprime y prepara imágenes grandes con motores locales.",
    requiredTools: ["Browser", "Sharp"],
    operations: ["convert", "compress", "resize", "strip-metadata", "avif", "tiff", "batch"],
    quickMode: "JPG, PNG y WebP directamente en el navegador local.",
    proMode: "Sharp habilita AVIF, TIFF, lotes grandes, miniaturas y procesamiento más eficiente.",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Organiza, optimiza y procesa PDF sin subirlos a Internet.",
    requiredTools: ["Browser", "QPDF", "Poppler", "Tesseract"],
    operations: ["merge", "split", "reorder", "rotate", "linearize", "ocr", "images-to-pdf"],
    quickMode: "Unir, dividir, reordenar, rotar y crear PDF desde imágenes.",
    proMode: "QPDF, Poppler y Tesseract habilitan optimización, extracción pesada y OCR.",
  },
  {
    id: "media",
    label: "Audio y vídeo",
    description: "Convierte audio y vídeo locales o desde una URL permitida.",
    requiredTools: ["FFmpeg", "FFprobe", "yt-dlp"],
    operations: ["audio-convert", "video-convert", "extract-audio", "normalize", "trim", "thumbnail", "gif", "url"],
    quickMode: "Selecciona un archivo o URL y FileStudio detecta las salidas disponibles.",
    proMode: "FFmpeg procesa MP3, M4A, WAV, FLAC, OGG, MP4, WebM, MKV y derivados.",
  },
  {
    id: "documents",
    label: "Documentos",
    description: "Convierte documentos Office, texto y Markdown con motores locales.",
    requiredTools: ["LibreOffice", "Pandoc"],
    operations: ["office-to-pdf", "document-convert", "markdown", "html", "rst", "latex"],
    quickMode: "Carga documentos y revisa salidas compatibles.",
    proMode: "LibreOffice y Pandoc ejecutan conversiones locales de Office y texto.",
  },
  {
    id: "ocr",
    label: "OCR",
    description: "Extrae texto de imágenes o PDF escaneados sin subirlos a Internet.",
    requiredTools: ["Tesseract", "Poppler"],
    operations: ["image-to-text", "image-to-searchable-pdf", "pdf-to-text", "pdf-to-searchable-pdf"],
    quickMode: "Elige imagen o PDF y revisa si OCR está disponible.",
    proMode: "Tesseract y Poppler habilitan OCR por página con idiomas instalados.",
  },
  {
    id: "archives",
    label: "Archivos",
    description: "Lista, extrae y recompone archivos comprimidos con controles de seguridad.",
    requiredTools: ["7-Zip"],
    operations: ["list", "extract", "zip", "7z", "tar", "repack"],
    quickMode: "Analiza el archivo y FileStudio muestra operaciones seguras.",
    proMode: "7-Zip procesa ZIP, 7Z, TAR, GZ, RAR y variantes compatibles.",
  },
  {
    id: "ebooks",
    label: "Ebooks",
    description: "Convierte libros electrónicos entre formatos compatibles.",
    requiredTools: ["Calibre"],
    operations: ["epub", "mobi", "azw3", "pdf", "html-to-epub", "docx-to-epub"],
    quickMode: "Carga un ebook y revisa salidas disponibles.",
    proMode: "Calibre habilita EPUB, MOBI, AZW3 y conversiones derivadas.",
  },
  {
    id: "structured",
    label: "Más herramientas",
    description: "Convierte datos estructurados preservando privacidad y avisos de pérdida.",
    requiredTools: ["Data Engine"],
    operations: ["json", "yaml", "toml", "xml", "csv", "tsv"],
    quickMode: "JSON, YAML, TOML, XML, CSV y TSV en el navegador local.",
    proMode: "Data Engine mantiene parser CSV/TSV robusto y warnings de estructura.",
  },
];
