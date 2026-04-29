import type { MetadataRoute } from "next";

const SOLIDS_ASSET_BASE =
  "https://unpkg.com/@soli92/solids@1.14.1/dist/brand-assets/soli-category-icons";
const SOLIDS_APP_ICON = `${SOLIDS_ASSET_BASE}/soli-icon-app-icon.png`;
const SOLIDS_LOGO = `${SOLIDS_ASSET_BASE}/soli-icon-logo.png`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soli Prof",
    short_name: "Soli Prof",
    description: "Il tuo tutor personale per imparare AI engineering in pubblico",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: SOLIDS_APP_ICON,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: SOLIDS_LOGO,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
