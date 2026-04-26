import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/lib/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          50: "#f5f6f7",
          100: "#e6e7ea",
          200: "#c4c7cc",
          300: "#9ea3ab",
          400: "#6e7480",
          500: "#4b5160",
          600: "#363b48",
          700: "#252934",
          800: "#181b23",
          900: "#0e1016",
          950: "#06070b",
        },
        apex: {
          50: "#e7feff",
          100: "#c5fbff",
          200: "#8ff6ff",
          300: "#4eedff",
          400: "#1ad8f5",
          500: "#00b8d4",
          600: "#0093ad",
          700: "#08758a",
          800: "#0d5d6f",
          900: "#0d4c5c",
          950: "#022f3c",
        },
        rev: {
          50: "#fff1f1",
          100: "#ffdfdf",
          200: "#ffc4c4",
          300: "#ff9b9b",
          400: "#ff5f5f",
          500: "#ff1f3d",
          600: "#ed0a2c",
          700: "#c80020",
          800: "#a3061f",
          900: "#870b1f",
          950: "#4b020c",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        apex: "0 0 0 1px rgba(26, 216, 245, 0.4), 0 8px 32px -8px rgba(26, 216, 245, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
