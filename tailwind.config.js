/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        // Material Design 3 Typography Scale (Complete)
        // https://m3.material.io/styles/typography/type-scale-tokens

        // Display - Hero titles, major headlines
        'display-lg': ['57px', { lineHeight: '64px', fontWeight: '400', letterSpacing: '-0.25px' }],
        'display-md': ['45px', { lineHeight: '52px', fontWeight: '400' }],
        'display-sm': ['36px', { lineHeight: '44px', fontWeight: '400' }],

        // Headline - Section titles
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '400' }],
        'headline-md': ['28px', { lineHeight: '36px', fontWeight: '400' }],
        'headline-sm': ['24px', { lineHeight: '32px', fontWeight: '400' }],

        // Title - Card titles, subsections
        'title-lg': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'title-md': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'title-sm': ['14px', { lineHeight: '20px', fontWeight: '500' }],

        // Body - Main content text
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],

        // Label - Buttons, form labels
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      colors: {
        // Base semantic colors (CSS vars already include oklch())
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Primary (Purple-Violet brand)
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          container: "var(--primary-container)",
          "on-container": "var(--on-primary-container)",
        },

        // Secondary (Blue connections)
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          container: "var(--secondary-container)",
          "on-container": "var(--on-secondary-container)",
        },

        // Tertiary (Cyan accent) - NEW
        tertiary: {
          DEFAULT: "var(--tertiary)",
          foreground: "var(--tertiary-foreground)",
          container: "var(--tertiary-container)",
          "on-container": "var(--on-tertiary-container)",
        },

        // Surface system (MD3)
        surface: {
          DEFAULT: "var(--surface)",
          dim: "var(--surface-dim)",
          bright: "var(--surface-bright)",
          "container-lowest": "var(--surface-container-lowest)",
          "container-low": "var(--surface-container-low)",
          container: "var(--surface-container)",
          "container-high": "var(--surface-container-high)",
          "container-highest": "var(--surface-container-highest)",
        },

        // On-surface (text colors)
        "on-surface": {
          DEFAULT: "var(--on-surface)",
          variant: "var(--on-surface-variant)",
        },

        // Outline
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },

        // Error/Destructive
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },

        // Legacy shadcn/ui compatibility
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },

        // Glassmorphism (dark mode)
        glass: {
          DEFAULT: "var(--glass-bg)",
          hover: "var(--glass-bg-hover)",
          active: "var(--glass-bg-active)",
          border: "var(--glass-border)",
          "border-accent": "var(--glass-border-accent)",
        },

        // SEIDO Brand Colors (for gradients)
        brand: {
          purple: 'oklch(0.58 0.15 300)', // Primary purple
          indigo: 'oklch(0.48 0.15 285)', // Deep indigo
          blue: 'oklch(0.62 0.12 250)',   // Secondary blue
          cyan: 'oklch(0.70 0.10 200)',   // Tertiary cyan
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // SEIDO Landing Page Animations
        "count-up": {
          from: { opacity: "0", transform: "scale(0.5)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.8)" },
        },
        "gradient": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // SEIDO Landing Page Animations
        "count-up": "count-up 2s ease-out",
        "glow": "glow 2s ease-in-out infinite",
        "gradient": "gradient 8s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
