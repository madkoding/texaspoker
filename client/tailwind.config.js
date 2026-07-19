/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        felt: {
          DEFAULT: "#0b5d3b",
          dark: "#073d26",
          light: "#0f7a51",
        },
        gold: {
          DEFAULT: "#d4af37",
          light: "#f1d26a",
          dark: "#b8962e",
        },
        cream: "#faf6ee",
        // Classic brown palette for the page background (a "smoky room"
        // / old casino feel).
        coffee: {
          50: "#f5ede0",
          100: "#e6d6bc",
          200: "#cdb591",
          300: "#a98560",
          400: "#7a5a3a",
          500: "#5a3e26",
          600: "#3e2a18",
          700: "#2b1c10",
          800: "#1c1209",
          900: "#100a05",
        },
        wood: {
          DEFAULT: "#5a3e26",
          light: "#7a5a3a",
          dark: "#2b1c10",
        },
        ink: "#1a1a1a",
        pokerred: "#c0392b",
      },
      boxShadow: {
        card: "0 3px 6px rgba(0,0,0,.15)",
        lift: "0 8px 20px rgba(0,0,0,.3)",
        // Used for the floating table window to give it a "lifted" feel.
        "table": "0 30px 80px rgba(0,0,0,0.7), 0 0 0 6px #5a3e26, 0 0 0 14px #2b1c10",
      },
      backgroundImage: {
        felt: "radial-gradient(ellipse at center, #0f7a51 0%, #0b5d3b 45%, #073d26 100%)",
        // Subtle "parquet" wood pattern for the room behind the table.
        "wood-pattern":
          "repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 8px), radial-gradient(ellipse at top, #5a3e26 0%, #3e2a18 50%, #1c1209 100%)",
      },
    },
  },
  plugins: [],
};
