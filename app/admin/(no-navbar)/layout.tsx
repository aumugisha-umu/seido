import type React from "react"

/**
 * 🎯 NO-NAVBAR LAYOUT - Pages sans navigation globale (Admin)
 *
 * Structure préventive pour futures pages de détails/création
 */

export default function NoNavbarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
