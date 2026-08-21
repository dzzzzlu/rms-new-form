import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#020B1A",
          900: "#041832",
          800: "#062347",
          700: "#0B3068",
          600: "#10408A",
          500: "#1A56B0",
          400: "#3B74D0",
          300: "#6B9DE0",
          200: "#A3C1ED",
          100: "#D1E1F6",
          50: "#EDF3FB",
        },
      },
      boxShadow: {
        sidebar: "4px 0 24px rgba(5,18,37,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
