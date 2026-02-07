import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jarvis HUD palette
        holo: {
          primary: "rgb(var(--holo-primary) / <alpha-value>)",
          secondary: "rgb(var(--holo-secondary) / <alpha-value>)",
          danger: "rgb(var(--holo-danger) / <alpha-value>)",
          warning: "rgb(var(--holo-warning) / <alpha-value>)",
          surface: "rgb(var(--holo-surface) / <alpha-value>)",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Consolas", "Monaco", "monospace"],
        display: ["Orbitron", "sans-serif"],
      },
      animation: {
        "scan": "scanline 4s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "border-flow": "border-flow 3s linear infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "matrix-drop": "matrix-drop 5s linear infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "crt-flicker": "crt-flicker 0.15s infinite",
      },
      keyframes: {
        scanline: {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5", boxShadow: "0 0 10px currentColor" },
          "50%": { opacity: "1", boxShadow: "0 0 30px currentColor" },
        },
        "border-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.8" },
        },
        "matrix-drop": {
          "0%": { transform: "translateY(-100%)", opacity: "1" },
          "100%": { transform: "translateY(100vh)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "crt-flicker": {
          "0%": { opacity: "0.97" },
          "50%": { opacity: "1" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hud-grid": `
          linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
        `,
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-sm": "0 0 10px",
        "glow-md": "0 0 20px",
        "glow-lg": "0 0 40px",
        "glow-emerald": "0 0 20px rgba(16, 185, 129, 0.3)",
        "glow-rose": "0 0 20px rgba(244, 63, 94, 0.3)",
        "glow-blue": "0 0 20px rgba(59, 130, 246, 0.3)",
        "inner-glow": "inset 0 0 20px rgba(16, 185, 129, 0.1)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
