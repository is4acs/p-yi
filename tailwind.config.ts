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
        // --- Palette Peyi v1.0 (design handoff avril 2026) --------------
        // Les teintes 50/100/500/600/700 sont les valeurs officielles du
        // handoff (basées sur les couleurs exactes du logo). Les teintes
        // 200/300/400/800/900 sont interpolées pour préserver l'échelle
        // complète utilisée par ~220 usages dans l'UI existante.
        peyi: {
          // Orange Solèy — fond du logo (#FF914C), couleur d'action
          orange: {
            50: "#FFF1E5",
            100: "#FFE0CB",
            200: "#FFC59D",
            300: "#FFA97A",
            400: "#FF9B63",
            500: "#FF914C",
            600: "#F57A2E",
            700: "#DB6418",
            800: "#A84C12",
            900: "#70310B",
            DEFAULT: "#FF914C",
          },
          // Vert Lawèt — lettre du logo (#7ED956), couleur de marque
          green: {
            50: "#EEFAE5",
            100: "#DAF3CC",
            200: "#C1EBAA",
            300: "#A4E285",
            400: "#91DE6D",
            500: "#7ED956",
            600: "#5FBE38",
            700: "#43961F",
            800: "#2E6813",
            900: "#1C3F0B",
            DEFAULT: "#7ED956",
          },
          // Vert Forêt — réservé dark mode / bandes éditoriales
          forest: {
            50: "#E3EEDA",
            100: "#B9D2AE",
            500: "#1E4D12",
            600: "#183E0E",
            700: "#122F0A",
            DEFAULT: "#1E4D12",
          },
          // Drapeau guyanais — accents éditoriaux uniquement (jamais CTA
          // ni erreur, ces rôles sont tenus par `destructive`).
          rouge: "#DA1A35",
          jaune: "#FFD93D",
        },

        // Neutres teintés orange (tonalité chaude Peyi)
        ink: {
          50: "#F6F2EB",
          100: "#E7E1D7",
          200: "#CFC6BA",
          300: "#A89C8E",
          500: "#6B5F53",
          700: "#3A322A",
          900: "#1C1712",
        },
        paper: "#FFFBF5",

        // Sémantique (héritée, inchangée)
        hot: "#EF4444",
        cold: "#3B82F6",
        warning: "#F59E0B",
        success: "#10B981",

        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        // Body — Inter (UI, paragraphes, formulaires)
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Display — Nunito (titres, marque, gros chiffres, boutons)
        display: [
          "var(--font-nunito)",
          "ui-rounded",
          "system-ui",
          "sans-serif",
        ],
        // Mono — JetBrains Mono (labels techniques, eyebrows, prix)
        mono: [
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        // Échelle sémantique Peyi (handoff avril 2026). Usage :
        //   <h1 className="font-display text-display-lg">…</h1>
        //   <span className="font-mono text-eyebrow uppercase">…</span>
        "display-xl": [
          "120px",
          { lineHeight: "0.95", letterSpacing: "-0.02em", fontWeight: "900" },
        ],
        "display-lg": [
          "96px",
          { lineHeight: "0.95", letterSpacing: "-0.02em", fontWeight: "900" },
        ],
        "display-md": [
          "64px",
          { lineHeight: "1", letterSpacing: "-0.015em", fontWeight: "800" },
        ],
        "title-lg": [
          "48px",
          { lineHeight: "1.05", letterSpacing: "-0.015em", fontWeight: "800" },
        ],
        "title-md": [
          "32px",
          { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        "title-sm": ["24px", { lineHeight: "1.2", fontWeight: "700" }],
        lede: ["18px", { lineHeight: "1.5", fontWeight: "400" }],
        eyebrow: [
          "12px",
          { lineHeight: "1.4", letterSpacing: "0.12em", fontWeight: "500" },
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 12px)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "temperature-pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
