import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FILESTUDIO_BRAND } from "@/lib/filestudio-brand";

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

function assetHash(publicPath: string): string {
  try {
    const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 12);
  } catch {
    return "missing";
  }
}

const faviconVersion = assetHash("/favicon-32.png");
const iconVersion = assetHash("/icon.png");
const appleIconVersion = assetHash("/apple-touch-icon.png");

export const metadata: Metadata = {
  metadataBase: new URL(FILESTUDIO_BRAND.siteUrl),
  applicationName: FILESTUDIO_BRAND.name,
  title: {
    default: FILESTUDIO_BRAND.name,
    template: `%s | ${FILESTUDIO_BRAND.name}`,
  },
  description: FILESTUDIO_BRAND.description,
  icons: {
    icon: [
      { url: `/favicon-32.png?v=${faviconVersion}`, type: "image/png", sizes: "32x32" },
      { url: `/favicon-512.png?v=${assetHash("/favicon-512.png")}`, type: "image/png", sizes: "512x512" },
      { url: `/icon.png?v=${iconVersion}`, type: "image/png", sizes: "512x512" },
      { url: `/favicon.ico?v=${assetHash("/favicon.ico")}`, sizes: "any" },
    ],
    apple: { url: `/apple-touch-icon.png?v=${appleIconVersion}`, type: "image/png", sizes: "180x180" },
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
