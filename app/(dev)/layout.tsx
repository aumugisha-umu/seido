/**
 * Layout pour les pages de développement
 * Ces pages ne sont accessibles qu'en mode développement
 */

export default function DevLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple passthrough - uses root layout
  return <>{children}</>
}
