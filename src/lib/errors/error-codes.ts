// Unified error code system for Anclora FileStudio.
// All subsystems (engines, job processor, download, cleanup) use these codes
// so that error handling, logging, and client messages are consistent.

export type ErrorCode =
  | "TOOL_NOT_AVAILABLE"
  | "INPUT_UNSUPPORTED"
  | "INPUT_CORRUPTED"
  | "CAPABILITY_NOT_AVAILABLE"
  | "OUTPUT_FORMAT_INVALID"
  | "PROCESS_TIMEOUT"
  | "PROCESS_CANCELLED"
  | "ARTIFACT_VALIDATION_FAILED"
  | "INSUFFICIENT_DISK_SPACE"
  | "ARCHIVE_UNSAFE"
  | "OCR_LANGUAGE_MISSING"
  | "BATCH_PARTIAL_FAILURE"
  | "JOB_NOT_FOUND"
  | "ENGINE_NOT_FOUND"
  | "ENGINE_UNAVAILABLE"
  | "UNSAFE_PATH"
  | "ENGINE_EXECUTE_FAILED"
  | "VALIDATION_FAILED"
  | "INPUT_NOT_FOUND"
  | "MISSING_CONVERSION_ID"
  | "INVALID_STATE"
  | "RATE_LIMITED"
  | "CONCURRENCY_LIMIT"
  | "DEPENDENCY_MISSING"
  | "QUALITY_NOT_DELIVERED"
  | "SCANNED_CONTENT_REQUIRES_OCR"
  | "RUNTIME_PACK_REQUIRED"
  | "RUNTIME_PACK_DOWNLOAD_FAILED"
  | "RUNTIME_PACK_HASH_MISMATCH"
  | "RUNTIME_PACK_INSTALL_FAILED"
  | "RUNTIME_PACK_BROKEN"
  | "RUNTIME_PACK_INCOMPATIBLE"
  | "VIDEO_UNAVAILABLE"
  | "CONTENT_RESTRICTED"
  | "PROVIDER_VERIFICATION"
  | "YOUTUBE_BOT_VERIFICATION"
  | "YOUTUBE_LOGIN_REQUIRED"
  | "YOUTUBE_FORMAT_DELIVERY_403"
  | "YOUTUBE_GENERIC_ACCESS_DENIED"
  | "PROVIDER_ACCESS_DENIED"
  | "CONVERSION_TIMEOUT"
  | "INTERNAL_ERROR";

export interface AppError extends Error {
  code: ErrorCode;
  stage: string;
  engineId?: string;
  retryable: boolean;
  /**
   * True when the failure is a per-format CDN delivery error (e.g. a
   * YouTube HTTP 403 on one specific representation) and a DIFFERENT
   * source representation may still download fine. Drives the
   * deterministic candidate fallback in the media processor. Never true
   * for login/geo/age/private/content errors.
   */
  recoverable?: boolean;
  technicalDetail?: string; // redacted for logs only
}

// ── Retryable codes ───────────────────────────────────────────────────────────

const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  "PROCESS_TIMEOUT",
  "ENGINE_UNAVAILABLE",
  "INSUFFICIENT_DISK_SPACE",
  "RATE_LIMITED",
  "CONCURRENCY_LIMIT",
  "RUNTIME_PACK_DOWNLOAD_FAILED",
]);

export function isRetryable(code: ErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createAppError(
  code: ErrorCode,
  message: string,
  options: {
    stage?: string;
    engineId?: string;
    retryable?: boolean;
    recoverable?: boolean;
    technicalDetail?: string;
    cause?: Error;
  } = {}
): AppError {
  const err = new Error(message) as AppError;
  err.name = "AppError";
  err.code = code;
  err.stage = options.stage ?? "unknown";
  err.engineId = options.engineId;
  err.retryable = options.retryable ?? isRetryable(code);
  err.recoverable = options.recoverable;
  err.technicalDetail = options.technicalDetail;
  if (options.cause) {
    err.cause = options.cause;
  }
  return err;
}

// ── User-facing messages (Spanish) ────────────────────────────────────────────

export const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  TOOL_NOT_AVAILABLE: "La herramienta necesaria no está instalada.",
  INPUT_UNSUPPORTED: "El archivo de entrada no es compatible.",
  INPUT_CORRUPTED: "El archivo de entrada está corrupto o no se puede leer.",
  CAPABILITY_NOT_AVAILABLE: "La conversión solicitada no está disponible.",
  OUTPUT_FORMAT_INVALID: "El formato de salida solicitado no es válido.",
  PROCESS_TIMEOUT: "La conversión ha tardado demasiado tiempo.",
  PROCESS_CANCELLED: "El proceso ha sido cancelado.",
  ARTIFACT_VALIDATION_FAILED: "No se pudo verificar el archivo generado.",
  INSUFFICIENT_DISK_SPACE: "No hay suficiente espacio en disco para realizar la conversión.",
  ARCHIVE_UNSAFE: "El archivo comprimido contiene entradas inseguras.",
  OCR_LANGUAGE_MISSING: "Falta el idioma requerido para el reconocimiento óptico de caracteres.",
  BATCH_PARTIAL_FAILURE: "Algunas conversiones del lote han fallado.",
  JOB_NOT_FOUND: "El proceso no existe o ha sido eliminado.",
  ENGINE_NOT_FOUND: "El motor de conversión no fue encontrado.",
  ENGINE_UNAVAILABLE: "El motor de conversión no está disponible en este momento.",
  UNSAFE_PATH: "La ruta del archivo no es segura.",
  ENGINE_EXECUTE_FAILED: "Error durante la ejecución del motor de conversión.",
  VALIDATION_FAILED: "La validación del archivo de salida ha fallado.",
  INPUT_NOT_FOUND: "El archivo de entrada no fue encontrado.",
  MISSING_CONVERSION_ID: "Falta el identificador de conversión.",
  INVALID_STATE: "El estado del proceso no es válido para esta operación.",
  RATE_LIMITED: "Demasiadas peticiones. Por favor, espera un momento.",
  CONCURRENCY_LIMIT: "Se ha alcanzado el límite de conversiones simultáneas.",
  DEPENDENCY_MISSING: "No se han encontrado las dependencias necesarias (ffprobe/ffmpeg/yt-dlp). Verifica la instalación.",
  QUALITY_NOT_DELIVERED: "La resolución entregada es inferior a la solicitada. El vídeo puede no tener ese formato disponible.",
  SCANNED_CONTENT_REQUIRES_OCR: "Este PDF parece estar escaneado y no contiene texto editable suficiente. Para convertirlo a un documento editable necesitas usar OCR.",
  RUNTIME_PACK_REQUIRED: "Esta conversión requiere instalar un componente opcional.",
  RUNTIME_PACK_DOWNLOAD_FAILED: "No se pudo descargar el componente opcional.",
  RUNTIME_PACK_HASH_MISMATCH: "La verificación del componente opcional falló.",
  RUNTIME_PACK_INSTALL_FAILED: "No se pudo instalar el componente opcional.",
  RUNTIME_PACK_BROKEN: "El componente opcional instalado está dañado.",
  RUNTIME_PACK_INCOMPATIBLE: "El componente opcional no es compatible con esta plataforma.",
  VIDEO_UNAVAILABLE: "El vídeo no está disponible, ha sido eliminado o la URL no existe.",
  CONTENT_RESTRICTED: "El contenido tiene restricciones de edad o región.",
  PROVIDER_VERIFICATION:
    "El proveedor exige verificación de seguridad (Cloudflare o captcha) para acceder automáticamente. Este sitio puede no ser compatible.",
  YOUTUBE_BOT_VERIFICATION:
    "YouTube ha rechazado el análisis automático de este vídeo (verificación anti-bot). El vídeo puede seguir funcionando desde el portable local o en otra red.",
  YOUTUBE_LOGIN_REQUIRED:
    "El vídeo requiere iniciar sesión en YouTube para verse (contenido privado, restringido por edad o con acceso limitado). No se puede descargar sin una cuenta autorizada.",
  YOUTUBE_FORMAT_DELIVERY_403:
    "YouTube ha denegado la entrega de una representación concreta del vídeo (HTTP 403 en el CDN). Se reintenta automáticamente con una representación alternativa.",
  YOUTUBE_GENERIC_ACCESS_DENIED:
    "YouTube ha denegado el acceso (HTTP 403). Puede ser temporal o requerir configuración adicional.",
  PROVIDER_ACCESS_DENIED:
    "El proveedor ha denegado el acceso (HTTP 403). Puede ser temporal o requerir configuración adicional.",
  CONVERSION_TIMEOUT: "La conversión ha tardado demasiado tiempo.",
  INTERNAL_ERROR: "Ocurrió un error interno en el servidor.",
};
