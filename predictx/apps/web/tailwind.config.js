/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fefce8",
          100: "#fef9c3",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          900: "#713f12",
        },
        yes:  { DEFAULT: "#22c55e", light: "#dcfce7", dark: "#15803d" },
        no:   { DEFAULT: "#ef4444", light: "#fee2e2", dark: "#b91c1c" },
        surface: {
          0:   "#000000",
          1:   "#0a0a0a",
          2:   "#111111",
          3:   "#1a1a1a",
          4:   "#242424",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        body:    ["'DM Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        "xl":  "1rem",
        "2xl": "1.5rem",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-out",
        "slide-up":   "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-yes":  "pulseYes 2s ease-in-out infinite",
        "pulse-no":   "pulseNo 2s ease-in-out infinite",
        "ticker":     "ticker 30s linear infinite",
      },
      keyframes: {
        fadeIn:   { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:  { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseYes: { "0%,100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" },  "50%": { boxShadow: "0 0 0 6px rgba(34,197,94,0.15)" } },
        pulseNo:  { "0%,100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" },  "50%": { boxShadow: "0 0 0 6px rgba(239,68,68,0.15)" } },
        ticker:   { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
    },
  },
  plugins: [],
};
