import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Atlantic Blue palette
        atlantic: {
          50: "#e8eef5",
          100: "#c5d5e8",
          200: "#9fb9d8",
          300: "#7a9ec8",
          400: "#5e8abc",
          500: "#4276b0",
          600: "#2c5f8a",
          700: "#1e3a5f",
          800: "#162d4a",
          900: "#0e1f35",
          950: "#081525",
        },
        // Gold accent palette
        gold: {
          50: "#fdf8eb",
          100: "#f9edcc",
          200: "#f0d88f",
          300: "#e6c252",
          400: "#d4af37",
          500: "#c9a84c",
          600: "#b8952e",
          700: "#967726",
          800: "#7a6120",
          900: "#654f1b",
          950: "#3a2d0f",
        },
        // Semantic aliases
        premium: {
          bg: "#1e3a5f",
          "bg-light": "#2c5f8a",
          border: "#d4af37",
          "border-light": "#e6c252",
          accent: "#c9a84c",
          text: "#ffffff",
          "text-muted": "#c5d5e8",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["Cormorant Garamond", "Garamond", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "premium-gradient": "linear-gradient(135deg, #1e3a5f 0%, #2c5f8a 50%, #1e3a5f 100%)",
        "gold-gradient": "linear-gradient(135deg, #c9a84c 0%, #d4af37 50%, #e6c252 100%)",
        "card-gradient": "linear-gradient(145deg, rgba(30, 58, 95, 0.9) 0%, rgba(44, 95, 138, 0.7) 100%)",
      },
      boxShadow: {
        premium: "0 4px 20px rgba(212, 175, 55, 0.15)",
        "premium-lg": "0 8px 40px rgba(212, 175, 55, 0.2)",
        "premium-glow": "0 0 30px rgba(212, 175, 55, 0.3)",
      },
      borderRadius: {
        premium: "12px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "gold-shimmer": "goldShimmer 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        goldShimmer: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
