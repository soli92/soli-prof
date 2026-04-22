import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soli Prof – Tutor IA per AI Engineering",
  description:
    "Il tuo tutor personale per imparare AI engineering in pubblico",
  viewport: "width=device-width, initial-scale=1",
  generator: "Next.js",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
