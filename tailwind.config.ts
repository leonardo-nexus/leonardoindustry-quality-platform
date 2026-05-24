import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        leo: {
          page: "hsl(var(--bg-page))",
          base: "hsl(var(--bg-base))",
          sidebar: "hsl(var(--bg-sidebar))",
          card: "hsl(var(--bg-card))",
          card2: "hsl(var(--bg-card-2))",
          border: "hsl(var(--border-leo))",
          text: "hsl(var(--text-primary))",
          muted: "hsl(var(--text-muted))",
        },
        brand: {
          blue: "#1d4ed8",
          "blue-dark": "#1e3a8a",
          cyan: "#06b6d4",
          green: "#10b981",
        },
        status: {
          green: "#10b981",
          blue: "#3b82f6",
          yellow: "#eab308",
          orange: "#f97316",
          red: "#ef4444",
          black: "#0a0a0a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1d4ed8 0%, #0891b2 50%, #10b981 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
