import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hijau: { DEFAULT: "#0E7A4A", tua: "#0B3B2A", muda: "#E7F3EC" },
        kilat: "#FFD54A",
        latar: "#F6F7F4",
        tinta: "#14201A",
        merah: "#DF3B3B",
        brand: { DEFAULT: "#A00000", tua: "#800000", terang: "#C00000", dalam: "#600000" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      animation: {
        "slide-up": "slide-up 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
