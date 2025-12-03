'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface HeroVideoProps {
  /** Additional CSS classes for the video container */
  className?: string
  /** Poster image to show while video loads */
  poster?: string
}

/**
 * Hero Video Component
 *
 * Displays different videos based on the current theme:
 * - Light mode: hero-light.webm (lavender/blue illustration)
 * - Dark mode: hero-dark.webm (dark version)
 *
 * Handles hydration mismatch by showing a placeholder during SSR
 * and switching to the correct video on client mount.
 */
export function HeroVideo({ className, poster }: HeroVideoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch - wait for client mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Video source based on theme
  const videoSrc = mounted
    ? resolvedTheme === 'dark'
      ? '/videos/hero-dark.webm'
      : '/videos/hero-light.webm'
    : '/videos/hero-light.webm' // Default for SSR

  return (
    <video
      key={mounted ? resolvedTheme : 'ssr'} // Force re-render on theme change
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      className={cn(
        'absolute inset-0 w-full h-full object-cover',
        // Smooth transition when video changes
        'transition-opacity duration-500',
        className
      )}
      // Accessibility: Video is decorative, no controls needed
      aria-hidden="true"
    />
  )
}

/**
 * Hero Video Container with overlay gradients
 * Use this if you need the full hero section with overlays
 */
export function HeroVideoContainer({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {/* Background video */}
      <HeroVideo />

      {/* Gradient overlays for text readability */}
      <div
        className={cn(
          'absolute inset-0 z-10',
          // Light mode: subtle gradient
          'bg-gradient-to-r from-surface/95 via-surface/70 to-surface/80',
          // Dark mode: stronger gradient for glassmorphism effect
          'dark:from-surface/95 dark:via-surface/60 dark:to-transparent'
        )}
      />

      {/* Bottom fade for smooth transition */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-32 z-10',
          'bg-gradient-to-t from-surface via-surface/50 to-transparent'
        )}
      />

      {/* Content overlay */}
      {children && <div className="relative z-20">{children}</div>}
    </div>
  )
}
