import type { Metadata, Viewport } from "next";
import "@soli92/solids/css/index.css";
import "./globals.css";

const SOLIDS_ASSET_BASE =
  "https://unpkg.com/@soli92/solids@1.14.1/dist/brand-assets/soli-category-icons";
const SOLIDS_APP_ICON = `${SOLIDS_ASSET_BASE}/soli-icon-app-icon.png`;
const SOLIDS_APPLE_TOUCH = `${SOLIDS_ASSET_BASE}/soli-icon-apple-touch.png`;
const SOLIDS_FAVICON = `${SOLIDS_ASSET_BASE}/soli-icon-favicon.png`;
const SOLIDS_LOGO = `${SOLIDS_ASSET_BASE}/soli-icon-logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL("https://soli-prof.vercel.app"),
  title: "Soli Prof - AI Tutor Personale",
  description:
    "Il tuo tutor personale per imparare AI engineering in pubblico",
  applicationName: "Soli Prof",
  authors: [{ name: "Soli", url: "https://github.com/soli92" }],
  creator: "soli92",
  keywords: [
    "ai engineering",
    "ai tutor",
    "learning",
    "claude",
    "prompt engineering",
  ],
  openGraph: {
    type: "website",
    title: "Soli Prof",
    description: "Il tuo tutor personale per imparare AI engineering in pubblico",
    url: "https://soli-prof.vercel.app",
    images: [
      {
        url: SOLIDS_LOGO,
        width: 512,
        height: 512,
        alt: "Soli Prof",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: SOLIDS_FAVICON, type: "image/png", sizes: "32x32" },
      { url: SOLIDS_APP_ICON, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: SOLIDS_APPLE_TOUCH, type: "image/png", sizes: "180x180" }],
    shortcut: [{ url: SOLIDS_FAVICON, type: "image/png", sizes: "32x32" }],
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Space+Grotesk:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel:wght@400;600;700&family=Courier+Prime&family=Crimson+Text:wght@600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Merriweather:wght@400;700&family=Orbitron:wght@400;500;600;700&family=Oswald:wght@400;600;700&family=Rajdhani:wght@500;600;700&family=Russo+One&family=Share+Tech+Mono&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
