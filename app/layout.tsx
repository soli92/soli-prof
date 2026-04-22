import type { Metadata, Viewport } from "next";
import "@soli92/solids/css/index.css";
import "./globals.css";

export const metadata: Metadata = {
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
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      </head>
      <body>{children}</body>
    </html>
  );
}
