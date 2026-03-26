/**
 * Access Request Confirmation Page
 *
 * Shown after submitting an access request.
 * Reassures the user and sets expectations for next steps.
 */

import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ArrowLeft, Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demande enregistrée | SEIDO',
  robots: { index: false, follow: false },
}

export default function BetaThankYouPage() {
  return (
    <div className="fixed inset-0 z-20 bg-landing-bg overflow-y-auto">
      {/* Background Gradients — same as BetaAccessGate */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="w-full relative z-10 px-4 max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  src="/images/Logo/Logo_Seido_Color.png"
                  alt="SEIDO"
                  width={200}
                  height={60}
                  className="h-14 w-auto"
                  priority
                />
              </Link>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Demande bien reçue !
            </h1>

            <p className="text-white/60 mb-6">
              Merci pour votre intérêt. Nous traitons chaque demande
              individuellement pour garantir la meilleure expérience possible.
            </p>

            {/* Next steps */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3 mb-4">
                <Clock className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    Et maintenant ?
                  </h3>
                  <p className="text-sm text-white/60">
                    Un membre de notre équipe vous recontactera
                    sous <strong className="text-white">48h</strong> pour
                    discuter de vos besoins et organiser votre accès.
                  </p>
                </div>
              </div>

              <div className="text-sm text-white/60 space-y-2 border-t border-white/10 pt-4 mt-4">
                <p className="flex items-start">
                  <Mail className="w-4 h-4 text-brand-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Vérifiez votre boîte mail (et vos spams) dans les prochaines heures</span>
                </p>
                <p className="flex items-start">
                  <span className="text-brand-primary mr-2 ml-0.5 font-bold">?</span>
                  <span>Des questions ? Écrivez-nous à{' '}
                    <a href="mailto:contact@seido-app.com" className="text-brand-primary hover:text-brand-primary/80 underline transition-colors">
                      contact@seido-app.com
                    </a>
                  </span>
                </p>
              </div>
            </div>

            <Link href="/">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <Link
              href="/auth/login"
              className="text-brand-primary hover:text-brand-primary/80 underline transition-colors text-sm"
            >
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
