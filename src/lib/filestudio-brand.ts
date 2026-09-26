export const FILESTUDIO_BRAND = {
  name: "Anclora FileStudio",
  shortName: "FileStudio",
  description:
    "Convierte archivos de datos directamente en tu navegador. Para audio, vídeo, documentos y otras funciones avanzadas, usa la aplicación Desktop.",
  descriptionEn:
    "Convert data files directly in your browser. For audio, video, documents, and other advanced features, use the Desktop app.",
  siteUrl: "https://anclora-filestudio.vercel.app",
  logoPath: "/brand/anclora-filestudio.png",
  logoWebpPath: "/brand/anclora-filestudio.webp",
  iconPath: "/icon.png",
  faviconPath: "/favicon.ico",
  themeColor: "#14b8a6",
  /**
   * Commercial family classification for the Anclora SecureFlow SaaS tier.
   * FileStudio is the "Prepare" step: sellable standalone or in packs with
   * PurgeDoc (Protect), TableExtract (Extract) and CleanSheet (Automate).
   * See docs/governance/secureflow-integration-contract.md for the full
   * integration contract with the anclora-secureflow catalog/whitelist.
   */
  secureFlow: {
    family: "Anclora SecureFlow",
    capability: "Prepare",
    tagline:
      "Prepara, convierte y organiza tus archivos para que el resto del flujo Anclora SecureFlow pueda protegerlos, extraer su información o automatizarlos.",
    taglineEn:
      "Prepares, converts, and organizes your files so the rest of the Anclora SecureFlow workflow can protect, extract, or automate them.",
  },
} as const;
