import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FILESTUDIO_BRAND } from "@/lib/filestudio-brand";
import { iconManifestHash, versionedPublicAsset } from "@/lib/branding/icon-metadata";

// ANCLORA_BRANDING_TYPOGRAPHY: las apps internas usan Inter como --font-sans.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: FILESTUDIO_BRAND.themeColor,
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(FILESTUDIO_BRAND.siteUrl),
  applicationName: FILESTUDIO_BRAND.name,
  manifest: `/site.webmanifest?v=${iconManifestHash()}`,
  title: {
    default: FILESTUDIO_BRAND.name,
    template: `%s | ${FILESTUDIO_BRAND.name}`,
  },
  description: FILESTUDIO_BRAND.description,
  icons: {
    icon: [
      { url: versionedPublicAsset("/favicon-32.png"), type: "image/png", sizes: "32x32" },
      { url: versionedPublicAsset("/favicon-512.png"), type: "image/png", sizes: "512x512" },
      { url: versionedPublicAsset("/icon.png"), type: "image/png", sizes: "512x512" },
      { url: versionedPublicAsset("/favicon.ico"), sizes: "any" },
    ],
    shortcut: [{ url: versionedPublicAsset("/favicon.ico"), sizes: "any" }],
    apple: { url: versionedPublicAsset("/apple-touch-icon.png"), type: "image/png", sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    siteName: FILESTUDIO_BRAND.name,
    title: FILESTUDIO_BRAND.name,
    description: FILESTUDIO_BRAND.description,
    url: FILESTUDIO_BRAND.siteUrl,
    images: [{ url: FILESTUDIO_BRAND.logoPath, width: 512, height: 512, alt: FILESTUDIO_BRAND.name }],
  },
  twitter: {
    card: "summary",
    title: FILESTUDIO_BRAND.name,
    description: FILESTUDIO_BRAND.description,
    images: [FILESTUDIO_BRAND.logoPath],
  },
  appleWebApp: {
    capable: true,
    title: FILESTUDIO_BRAND.shortName,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
