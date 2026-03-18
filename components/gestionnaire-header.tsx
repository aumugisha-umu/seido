"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { HEADER_PORTAL_ID } from "@/components/header-portal"
import { cn } from "@/lib/utils"

const LogoFull = () => (
  <Link
    href="/gestionnaire/dashboard"
    className="flex items-center flex-shrink-0 min-w-0"
  >
    <Image
      src="/images/Logo/Logo_Seido_Color_1.webp"
      alt="SEIDO"
      width={140}
      height={40}
      className="flex-shrink-0 h-8 w-auto"
      priority
    />
  </Link>
)

const LogoPicto = () => (
  <Link
    href="/gestionnaire/dashboard"
    className="flex items-center flex-shrink-0"
  >
    <Image
      src="/images/Logo/Picto_Seido_Color.png"
      alt="SEIDO"
      width={36}
      height={36}
      className="flex-shrink-0 h-9 w-9"
    />
  </Link>
)

/**
 * Full-width header bar for the gestionnaire layout.
 * The left section width matches the sidebar width so the separator
 * aligns with the sidebar's right border below.
 *
 * When sidebar is open:     [Toggle] [Logo Seido] | [Page content…]
 * When sidebar is collapsed: [Toggle] | [Logo Seido] [Page content…]
 */
export function GestionnaireHeader() {
  const { toggleSidebar, open, isMobile } = useSidebar()
  const showLogoInLeft = open || isMobile

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "h-14 flex items-stretch",
        "border-b bg-white dark:bg-background"
      )}
    >
      {/* Left section — width matches sidebar for vertical alignment */}
      <div
        className={cn(
          "flex items-center flex-shrink-0 transition-[width] duration-200 ease-linear",
          isMobile
            ? "w-auto px-3 gap-3"
            : open
              ? "w-(--sidebar-width) pl-2 pr-4 gap-3"
              : "w-(--sidebar-width-icon) pl-2"
        )}
      >
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center justify-center rounded-md flex-shrink-0",
            "transition-colors",
            open || isMobile
              ? "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              : "h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          )}
          aria-label={isMobile ? "Menu de navigation" : open ? "Réduire le menu" : "Ouvrir le menu"}
        >
          {isMobile ? (
            <Menu className="size-5" />
          ) : open ? (
            <PanelLeftClose className="size-5" />
          ) : (
            <PanelLeft className="size-5" />
          )}
        </button>

        {/* Logo — hidden on mobile, full on desktop (logo is in sidebar) */}
        {showLogoInLeft && !isMobile && <LogoFull />}
      </div>

      {/* Separator — aligned with sidebar border */}
      <div className="w-px bg-border flex-shrink-0" />

      {/* Picto only after separator when sidebar is collapsed */}
      {!showLogoInLeft && (
        <div className="flex items-center pl-4 flex-shrink-0">
          <LogoPicto />
        </div>
      )}

      {/* Portal target — page-specific header content renders here */}
      <div
        id={HEADER_PORTAL_ID}
        className="flex-1 flex items-center min-w-0 h-full overflow-hidden px-3 sm:px-6"
      />
    </header>
  )
}
