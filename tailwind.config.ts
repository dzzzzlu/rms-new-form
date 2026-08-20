import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#051225", // near-black navy, deepest shade
          900: "#0A1F44",
          800: "#0D2E63",
          700: "#0D47A1", // primary dark blue
          600: "#1257B8",
          500: "#1565C0", // primary blue
          400: "#1E88E5",
          300: "#42A5F5",
          200: "#90CAF9",
          100: "#BBDEFB",
          50: "#EAF3FD",
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
