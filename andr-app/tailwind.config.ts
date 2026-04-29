import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2C2C2A", // Text chính
        muted: "#5F5E5A", // Text phụ
        surface: "#ffffff",
        canvas: "#F8F7F5", // Surface/Canvas
        brand: {
          50: "#F8F7F5",
          100: "#FAE8D8", // Light tint
          200: "#fce3b4",
          300: "#f9c884",
          400: "#F4A460", // Secondary
          500: "#E35336", // Primary CTA
          600: "#E35336", 
          700: "#c2422a",
          800: "#A0522D", // Dark accent
          900: "#7d3e23",
        },
        accent: "#F4A460",
        divider: "#F1EFE8",
        disabled: "#B4B2A9",
      },
      boxShadow: {
        panel: "0 1px 2px rgb(44 44 42 / 0.05)",
        "soft-md": "0 4px 12px 0 rgb(160 82 45 / 0.08)",
        "soft-lg": "0 12px 24px 0 rgb(160 82 45 / 0.12)",
        "soft-sm": "0 2px 4px 0 rgb(160 82 45 / 0.04)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Oxygen"',
          '"Ubuntu"',
          '"Cantarell"',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
