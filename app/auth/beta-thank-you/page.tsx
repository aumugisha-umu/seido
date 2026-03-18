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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary via-blue-700 to-brand-secondary p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block cursor-pointer hover:opacity-80 transition-opacity">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
              <Image
                src="/images/Logo/Logo_Seido_White.png"
                alt="SEIDO"
                width={107}
                height={40}
                sizes="107px"
                className="h-10 w-auto"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Demande bien reçue !
          </h1>

          <p className="text-gray-600 mb-6">
            Merci pour votre intérêt. Nous traitons chaque demande
            individuellement pour garantir la meilleure expérience possible.
          </p>

          {/* Next steps */}
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3 mb-4">
              <Clock className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Et maintenant ?
                </h3>
                <p className="text-sm text-gray-600">
                  Un membre de notre équipe vous recontactera
                  sous <strong className="text-brand-primary">48h</strong> pour
                  discuter de vos besoins et organiser votre accès.
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2 border-t border-brand-primary/20 pt-4 mt-4">
              <p className="flex items-start">
                <Mail className="w-4 h-4 text-brand-primary mr-2 mt-0.5 flex-shrink-0" />
                <span>Vérifiez votre boîte mail (et vos spams) dans les prochaines heures</span>
              </p>
              <p className="flex items-start">
                <span className="text-brand-primary mr-2 ml-0.5 font-bold">?</span>
                <span>Des questions ? Écrivez-nous à{' '}
                  <a href="mailto:contact@seido-app.com" className="text-brand-primary hover:underline">
                    contact@seido-app.com
                  </a>
                </span>
              </p>
            </div>
          </div>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 hover:text-brand-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <Link
            href="/auth/login"
            className="text-white/60 hover:text-white underline transition-colors text-sm"
          >
            Déjà un compte ? Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}
