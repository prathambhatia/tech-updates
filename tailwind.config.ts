import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f6",
          100: "#ececea",
          200: "#d9d8d3",
          300: "#bdbcb4",
          400: "#9f9d93",
          500: "#7f7d73",
          600: "#67655d",
          700: "#515047",
          800: "#3a3932",
          900: "#272620"
        },
        accent: {
          400: "#148d83",
          500: "#0f766e",
          600: "#0b5f58"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "serif"]
      },
      boxShadow: {
        paper: "0 8px 40px rgba(18, 24, 40, 0.08)"
      },
      backgroundImage: {
        editorial:
          "radial-gradient(circle at 0% 0%, rgba(15, 118, 110, 0.12), transparent 40%), radial-gradient(circle at 90% 10%, rgba(80, 70, 60, 0.09), transparent 35%)"
      }
    }
  },
  plugins: [typography]
};

export default config;
