'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  /** Show as simple toggle (2 states) or dropdown (3 states with system) */
  variant?: 'toggle' | 'dropdown'
  /** Additional CSS classes */
  className?: string
}

/**
 * Theme Toggle Component
 *
 * Two variants:
 * - toggle: Simple light/dark switch with animated icon
 * - dropdown: Full menu with Light/Dark/System options
 *
 * Follows WCAG accessibility guidelines with proper aria-labels
 */
export function ThemeToggle({ variant = 'toggle', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return placeholder to prevent layout shift
    return (
      <Button variant="ghost" size="icon" className={cn('h-9 w-9', className)} disabled>
        <Sun className="h-5 w-5" />
        <span className="sr-only">Chargement du thème</span>
      </Button>
    )
  }

  // Simple toggle variant
  if (variant === 'toggle') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn('h-9 w-9 relative', className)}
        aria-label={`Basculer vers le mode ${resolvedTheme === 'dark' ? 'clair' : 'sombre'}`}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
        <span className="sr-only">
          {resolvedTheme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        </span>
      </Button>
    )
  }

  // Dropdown variant with system option
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9', className)}
          aria-label="Sélectionner le thème"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Sélectionner le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(theme === 'light' && 'bg-accent')}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Clair</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(theme === 'dark' && 'bg-accent')}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Sombre</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn(theme === 'system' && 'bg-accent')}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Système</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
