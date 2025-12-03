'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

/**
 * Providers wrapper for the application
 * Includes theme management with next-themes
 *
 * Configuration:
 * - attribute="class" : Uses Tailwind's class-based dark mode
 * - defaultTheme="system" : Respects user's OS preference
 * - enableSystem : Enables automatic system theme detection
 * - disableTransitionOnChange : Prevents flash during theme change
 */
export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
