import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  presets: [require("@soli92/solids/tailwind-preset")],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
