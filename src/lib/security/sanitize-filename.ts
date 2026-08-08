export function sanitizeFilename(filename: string): string {
  // Remove control characters and reserved characters for Windows/Linux
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/^\.+/, "") // Remove leading dots
    .replace(/[. ]+$/, ""); // Remove trailing spaces or dots

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Fallback for empty names
  return sanitized || "archivo-convertido";
}
