/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bamboo: {
          50: "#F7F5EE",
          100: "#EDE7D4",
          200: "#E0D4AC",
          300: "#D2BE80",
          400: "#C4A858",
          500: "#A88B3D",
          600: "#8B6F2E",
          700: "#6B5424",
          800: "#4A3A1A",
          900: "#2D2310",
        },
        bambooGreen: {
          50: "#EFF6EE",
          100: "#D5E7D3",
          200: "#A8CFA4",
          300: "#7BB676",
          400: "#5B9D57",
          500: "#5B8C5A",
          600: "#476E46",
          700: "#355134",
          800: "#233523",
          900: "#121A12",
        },
        bambooBrown: {
          50: "#FAF6F1",
          100: "#F0E4D3",
          200: "#E0C8A7",
          300: "#CEAB76",
          400: "#B88A4A",
          500: "#8B5A2B",
          600: "#6E4621",
          700: "#523419",
          800: "#372210",
          900: "#1C1108",
        },
        bambooCream: {
          50: "#FDFBF5",
          100: "#F8F3E3",
          200: "#F0E6C8",
          300: "#E8DFC7",
          400: "#D9CC9F",
          500: "#C9B878",
          600: "#A89655",
          700: "#7E7140",
          800: "#564E2C",
          900: "#2D2917",
        },
        warning: {
          DEFAULT: "#C0392B",
          light: "#E74C3C",
          dark: "#922B21",
        },
      },
      fontFamily: {
        kai: ['"LXGW WenKai"', '"霞鹜文楷"', '"KaiTi"', 'serif'],
        song: ['"Noto Serif SC"', '"Source Han Serif SC"', '"SimSun"', 'serif'],
      },
      boxShadow: {
        bamboo: "0 4px 12px rgba(91, 140, 90, 0.15), 0 1px 3px rgba(62, 39, 35, 0.08)",
        "bamboo-hover": "0 8px 24px rgba(91, 140, 90, 0.2), 0 2px 6px rgba(62, 39, 35, 0.12)",
        inner: "inset 0 2px 4px rgba(62, 39, 35, 0.1)",
      },
      backgroundImage: {
        "bamboo-texture":
          "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 90, 43, 0.04) 2px, rgba(139, 90, 43, 0.04) 4px)",
        "woven-pattern":
          "linear-gradient(45deg, rgba(91,140,90,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(91,140,90,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(91,140,90,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(91,140,90,0.05) 75%)",
      },
      backgroundSize: {
        "woven-sm": "8px 8px",
        "woven-md": "16px 16px",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "draw-line": "drawLine 1s ease-out forwards",
        "weave-in": "weaveIn 0.5s ease-out forwards",
        "pulse-border": "pulseBorder 1.5s ease-in-out infinite",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(192, 57, 43, 0.4)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 0 8px rgba(192, 57, 43, 0)" },
        },
        pulseBorder: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(192, 57, 43, 0.6)" },
          "50%": { boxShadow: "0 0 0 4px rgba(192, 57, 43, 0.2)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        weaveIn: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
