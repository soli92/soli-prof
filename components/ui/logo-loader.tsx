"use client";

import { useEffect, useMemo, useState } from "react";
import logoGold from "@soli92/solids/brand-assets/soli-icons/soli-icon-4x3-with-text-gold.svg";
import logoMono from "@soli92/solids/brand-assets/soli-icons/soli-icon-4x3-with-text-mono.svg";

type ThemeName = "light" | "dark" | string;

function useActiveTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveTheme = () => {
      const explicitTheme = root.dataset.theme;
      if (explicitTheme && explicitTheme.length > 0) {
        setTheme(explicitTheme);
        return;
      }
      setTheme(mediaQuery.matches ? "dark" : "light");
    };

    resolveTheme();

    const observer = new MutationObserver(resolveTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    mediaQuery.addEventListener("change", resolveTheme);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", resolveTheme);
    };
  }, []);

  return theme;
}

function isDarkLikeTheme(theme: ThemeName): boolean {
  return ["dark", "cyberpunk", "90s-party", "sasuke", "vegeta", "zoro"].includes(theme);
}

interface LogoLoaderProps {
  size?: number;
  message?: string;
  className?: string;
}

interface SoliLogoProps {
  className?: string;
  alt?: string;
}

export function SoliLogo({ className = "", alt = "Soli" }: SoliLogoProps) {
  const theme = useActiveTheme();
  const logoSrc = isDarkLikeTheme(theme) ? logoGold : logoMono;

  return <img src={logoSrc} alt={alt} className={className} />;
}

export function LogoLoader({ size = 112, message, className = "" }: LogoLoaderProps) {
  const theme = useActiveTheme();
  const logoSrc = useMemo(
    () => (isDarkLikeTheme(theme) ? logoGold : logoMono),
    [theme]
  );

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm"
        style={{ width: size, height: size }}
      >
        <img
          src={logoSrc}
          alt="Soli"
          className="h-full w-full object-contain animate-pulse"
        />
        <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary/70 animate-spin" />
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      ) : null}
    </div>
  );
}

interface LogoLoaderOverlayProps {
  message?: string;
}

export function LogoLoaderOverlay({ message = "Caricamento in corso..." }: LogoLoaderOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm">
      <LogoLoader message={message} />
    </div>
  );
}
