/**
 * 🎉 PAGE BETA THANK YOU - SERVER COMPONENT
 *
 * Page de remerciement affichée après soumission d'une demande d'accès beta
 * Design moderne et rassurant pour confirmer la réception de la demande
 */

import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BetaThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-4">
      <div className="w-full max-w-lg">
        {/* Logo SEIDO */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
            <Image
              src="/images/Logo/Logo_Seido_White.png"
              alt="SEIDO"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icône de succès */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Merci de votre intérêt !
          </h1>

          {/* Message principal */}
          <p className="text-lg text-gray-600 mb-6">
            Votre demande d'accès a bien été enregistrée.
          </p>

          {/* Informations supplémentaires */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Que se passe-t-il ensuite ?
                </h3>
                <p className="text-sm text-gray-600">
                  Notre équipe va étudier votre demande et vous contacter rapidement à l'adresse email que vous avez fournie.
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Nous vous enverrons un email dès que l'accès sera disponible</span>
              </p>
              <p className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>En attendant, pensez à vérifier vos spams</span>
              </p>
              <p className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                <span>Des questions ? Contactez-nous à <a href="mailto:contact@seido.pm" className="text-purple-600 hover:underline">contact@seido.pm</a></span>
              </p>
            </div>
          </div>

          {/* CTA Retour */}
          <Link href="/">
            <Button
              variant="outline"
              className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-purple-100 text-sm">
            SEIDO - La gestion immobilière simplifiée
          </p>
        </div>
      </div>
    </div>
  )
}
