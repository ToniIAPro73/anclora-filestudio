export const ERROR_CODES = {
  INVALID_URL: 'INVALID_URL',
  UNSUPPORTED_HOST: 'UNSUPPORTED_HOST',
  PLAYLIST_NOT_SUPPORTED: 'PLAYLIST_NOT_SUPPORTED',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  VIDEO_UNAVAILABLE: 'VIDEO_UNAVAILABLE',
  CONTENT_RESTRICTED: 'CONTENT_RESTRICTED',
  PROVIDER_VERIFICATION: 'PROVIDER_VERIFICATION',
  YOUTUBE_BOT_VERIFICATION: 'YOUTUBE_BOT_VERIFICATION',
  PROVIDER_ACCESS_DENIED: 'PROVIDER_ACCESS_DENIED',
  DURATION_LIMIT_EXCEEDED: 'DURATION_LIMIT_EXCEEDED',
  FORMAT_NOT_AVAILABLE: 'FORMAT_NOT_AVAILABLE',
  DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
  RATE_LIMITED: 'RATE_LIMITED',
  JOB_ALREADY_ACTIVE: 'JOB_ALREADY_ACTIVE',
  QUEUE_FULL: 'QUEUE_FULL',
  CONVERSION_TIMEOUT: 'CONVERSION_TIMEOUT',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  OUTPUT_VERIFICATION_FAILED: 'OUTPUT_VERIFICATION_FAILED',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_EXPIRED: 'JOB_EXPIRED',
  DOWNLOAD_TOKEN_INVALID: 'DOWNLOAD_TOKEN_INVALID',
  DOWNLOAD_TOKEN_EXPIRED: 'DOWNLOAD_TOKEN_EXPIRED',
  CANCELLED: 'CANCELLED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RUNTIME_PACK_REQUIRED: 'RUNTIME_PACK_REQUIRED',
  RUNTIME_PACK_DOWNLOAD_FAILED: 'RUNTIME_PACK_DOWNLOAD_FAILED',
  RUNTIME_PACK_HASH_MISMATCH: 'RUNTIME_PACK_HASH_MISMATCH',
  RUNTIME_PACK_INSTALL_FAILED: 'RUNTIME_PACK_INSTALL_FAILED',
  RUNTIME_PACK_BROKEN: 'RUNTIME_PACK_BROKEN',
  RUNTIME_PACK_INCOMPATIBLE: 'RUNTIME_PACK_INCOMPATIBLE',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public status: number = 400,
    public technicalDetail?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_URL: 'La URL proporcionada no es válida.',
  UNSUPPORTED_HOST: 'El sitio web no es compatible. Usa enlaces de YouTube.',
  PLAYLIST_NOT_SUPPORTED: 'Las listas de reproducción no son compatibles actualmente.',
  VIDEO_NOT_FOUND: 'No se pudo encontrar el vídeo.',
  VIDEO_UNAVAILABLE: 'El vídeo no está disponible.',
  CONTENT_RESTRICTED: 'El contenido tiene restricciones de edad o región.',
  PROVIDER_VERIFICATION: 'El proveedor exige verificación de seguridad (Cloudflare o captcha) para acceder automáticamente. Este sitio puede no ser compatible.',
  YOUTUBE_BOT_VERIFICATION: 'YouTube ha rechazado el análisis automático de este vídeo (verificación anti-bot). El vídeo puede seguir funcionando desde el portable local o en otra red.',
  PROVIDER_ACCESS_DENIED: 'El proveedor ha denegado el acceso (HTTP 403). Puede ser temporal o requerir configuración adicional.',
  DURATION_LIMIT_EXCEEDED: 'El vídeo excede la duración máxima permitida.',
  FORMAT_NOT_AVAILABLE: 'El formato solicitado no está disponible para este vídeo.',
  DEPENDENCY_MISSING: 'Error: No se han encontrado las dependencias necesarias (yt-dlp/ffmpeg) en el servidor. Vercel no es compatible sin configuración adicional.',
  RATE_LIMITED: 'Demasiadas peticiones. Por favor, espera un momento.',
  JOB_ALREADY_ACTIVE: 'Ya tienes un proceso activo.',
  QUEUE_FULL: 'El servidor está saturado. Inténtalo más tarde.',
  CONVERSION_TIMEOUT: 'La conversión ha tardado demasiado tiempo.',
  CONVERSION_FAILED: 'Error durante la conversión del archivo.',
  OUTPUT_VERIFICATION_FAILED: 'No se pudo verificar el archivo generado.',
  JOB_NOT_FOUND: 'El proceso no existe o ha sido eliminado.',
  JOB_EXPIRED: 'El archivo ha caducado.',
  DOWNLOAD_TOKEN_INVALID: 'El token de descarga no es válido.',
  DOWNLOAD_TOKEN_EXPIRED: 'El token de descarga ha caducado.',
  CANCELLED: 'El proceso ha sido cancelado.',
  INTERNAL_ERROR: 'Ocurrió un error interno en el servidor.',
  RUNTIME_PACK_REQUIRED: 'Esta conversión requiere instalar un componente opcional.',
  RUNTIME_PACK_DOWNLOAD_FAILED: 'No se pudo descargar el componente opcional.',
  RUNTIME_PACK_HASH_MISMATCH: 'La verificación del componente opcional falló.',
  RUNTIME_PACK_INSTALL_FAILED: 'No se pudo instalar el componente opcional.',
  RUNTIME_PACK_BROKEN: 'El componente opcional instalado está dañado.',
  RUNTIME_PACK_INCOMPATIBLE: 'El componente opcional no es compatible con esta plataforma.',
};
