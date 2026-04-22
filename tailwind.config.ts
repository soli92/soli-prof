import type { Config } from "tailwindcss";

// Preset SoliDS (CJS, require per evitare problemi ESM)
const solidsPreset = require("@soli92/solids/tailwind-preset") as Config;

const config: Config = {
  presets: [solidsPreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
