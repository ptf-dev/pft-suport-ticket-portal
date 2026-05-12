import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        "bg-elev": "hsl(var(--bg-elev))",
        "bg-sunken": "hsl(var(--bg-sunken))",
        ink: "hsl(var(--ink))",
        "ink-soft": "hsl(var(--ink-soft))",
        "ink-mute": "hsl(var(--ink-mute))",
        "ink-faint": "hsl(var(--ink-faint))",
        line: "hsl(var(--line))",
        "line-soft": "hsl(var(--line-soft))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          ink: "hsl(var(--accent-ink))",
          soft: "hsl(var(--accent-soft))",
        },
        pulse: "hsl(var(--pulse))",
        danger: {
          DEFAULT: "hsl(var(--danger))",
          soft: "hsl(var(--danger-soft))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          soft: "hsl(var(--warn-soft))",
        },
        ok: {
          DEFAULT: "hsl(var(--ok))",
          soft: "hsl(var(--ok-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          soft: "hsl(var(--info-soft))",
        },
        mute: "hsl(var(--mute))",
        background: "hsl(var(--bg))",
        foreground: "hsl(var(--ink))",
        primary: {
          50: "hsl(var(--accent-soft))",
          100: "hsl(var(--accent-soft))",
          200: "hsl(var(--accent-soft))",
          300: "hsl(var(--accent))",
          400: "hsl(var(--accent))",
          500: "hsl(var(--accent))",
          600: "hsl(var(--accent))",
          700: "hsl(var(--accent))",
          800: "hsl(var(--accent-ink))",
          900: "hsl(var(--accent-ink))",
          950: "hsl(var(--accent-ink))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      spacing: {
        "128": "32rem",
        "144": "36rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px hsl(var(--ink) / 0.04), 0 8px 24px -12px hsl(var(--ink) / 0.08)",
        card: "0 1px 0 hsl(var(--line)), 0 1px 2px hsl(var(--ink) / 0.04)",
        ink: "0 2px 0 0 hsl(var(--ink))",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "fade-up": "fadeUp 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
