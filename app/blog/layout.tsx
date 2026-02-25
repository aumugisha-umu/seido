import type { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/landing-header'

export const metadata: Metadata = {
  title: {
    template: '%s | Blog SEIDO',
    default: 'Blog | SEIDO — Actualites gestion immobiliere Belgique',
  },
  description:
    'Articles et analyses sur la gestion immobiliere en Belgique : reglementation, copropriete, fiscalite, renovation energetique. Par Equipe Seido.',
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-purple-500 selection:text-white">
      {/* Background Gradients — same as landing/legal */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px]" />
      </div>

      {/* Shared header for all blog pages */}
      <LandingHeader showNav={false} showBlogNav={true} />

      <main className="relative z-10">{children}</main>

      {/* Shared footer for all blog pages */}
      <footer className="relative z-10 max-w-4xl mx-auto mt-16 pt-8 pb-8 border-t border-white/10 text-center text-sm text-white/40 px-4">
        <p>
          <strong className="text-white/60">UMUMENTUM SRL</strong> - SEIDO
        </p>
        <p className="mt-1">
          Rue de Grand-Bigard 14, 1082 Berchem-Sainte-Agathe, Belgique
        </p>
        <p className="mt-1">BCE : 0775.691.974 | TVA : BE0775691974</p>
      </footer>
    </div>
  )
}
