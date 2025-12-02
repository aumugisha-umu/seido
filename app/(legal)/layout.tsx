import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | SEIDO',
    default: 'Documents Légaux | SEIDO',
  },
  description: 'Documents légaux et politique de confidentialité de SEIDO, plateforme de gestion immobilière.',
}

/**
 * Layout partagé pour toutes les pages légales
 * Style cohérent avec la landing page (dark mode, gradients)
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-purple-500 selection:text-white">
      {/* Background Gradients - Same as landing */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}
