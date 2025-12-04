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
        // Material Design 3 Typography Scale
        // https://m3.material.io/styles/typography/type-scale-tokens
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '400' }],
        'headline-md': ['28px', { lineHeight: '36px', fontWeight: '400' }],
        'headline-sm': ['24px', { lineHeight: '32px', fontWeight: '400' }],
        'title-lg': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'title-md': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'title-sm': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring))",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary))",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary))",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive))",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted))",
          foreground: "oklch(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "oklch(var(--accent))",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        // SEIDO Brand Colors (Purple/Indigo gradient)
        brand: {
          purple: 'oklch(0.5500 0.1800 300)', // #667eea
          indigo: 'oklch(0.4800 0.1500 285)', // #764ba2
        },
        // Landing page dark theme colors (flat keys for bg-landing-* classes)
        'landing-bg': '#0f172a',        // slate-900
        'landing-card': '#1e293b',      // slate-800
        'landing-overlay': '#131426',   // custom dark overlay
        'landing-footer': '#020617',    // slate-950
        // Intervention type colors (semantic)
        'type-plomberie': {
          DEFAULT: '#3b82f6',   // blue-500
          light: '#dbeafe',     // blue-100
          dark: '#1e3a8a',      // blue-900
        },
        'type-electricite': {
          DEFAULT: '#eab308',   // yellow-500
          light: '#fef9c3',     // yellow-100
          dark: '#713f12',      // yellow-900
        },
        'type-chauffage': {
          DEFAULT: '#f97316',   // orange-500
          light: '#ffedd5',     // orange-100
          dark: '#7c2d12',      // orange-900
        },
        'type-serrurerie': {
          DEFAULT: '#64748b',   // slate-500
          light: '#f1f5f9',     // slate-100
          dark: '#1e293b',      // slate-800
        },
        'type-toiture': {
          DEFAULT: '#f59e0b',   // amber-500
          light: '#fef3c7',     // amber-100
          dark: '#78350f',      // amber-900
        },
        'type-autre': {
          DEFAULT: '#6366f1',   // indigo-500
          light: '#e0e7ff',     // indigo-100
          dark: '#3730a3',      // indigo-900
        },
        // Semantic status colors
        success: {
          DEFAULT: '#22c55e',   // green-500
          light: '#dcfce7',     // green-100
          dark: '#14532d',      // green-900
          foreground: '#166534', // green-800
        },
        warning: {
          DEFAULT: '#f59e0b',   // amber-500
          light: '#fef3c7',     // amber-100
          dark: '#78350f',      // amber-900
          foreground: '#92400e', // amber-800
        },
        info: {
          DEFAULT: '#3b82f6',   // blue-500
          light: '#dbeafe',     // blue-100
          dark: '#1e3a8a',      // blue-900
          foreground: '#1e40af', // blue-800
        },
      },
      // Custom heights for layout components
      height: {
        'chat-open': '400px',
        'chat-closed': '56px',
        'email-preview': '600px',
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
