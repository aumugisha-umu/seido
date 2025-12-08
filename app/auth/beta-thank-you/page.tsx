/**
 * 🎉 PAGE CONFIRMATION - PROGRAMME FONDATEURS 2026
 *
 * Page de confirmation affichée après soumission d'une candidature
 * Design moderne avec rappel des avantages et prochaines étapes
 */

import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ArrowLeft, Percent, Calendar, MessageSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BetaThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary via-blue-700 to-brand-secondary p-4">
      <div className="w-full max-w-lg">
        {/* Logo SEIDO */}
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

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icône de succès */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          {/* Titre */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Bienvenue dans le Programme Fondateurs !
          </h1>

          {/* Badge */}
          <span className="inline-block px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-sm font-medium mb-6">
            Candidature enregistrée
          </span>

          {/* Rappel avantages */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <Percent className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-700">-25%</p>
              <p className="text-sm text-gray-500">3 ans</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <Calendar className="w-5 h-5 text-brand-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-700">Accès</p>
              <p className="text-sm text-gray-500">Prioritaire</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <MessageSquare className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-700">Votre</p>
              <p className="text-sm text-gray-500">Voix compte</p>
            </div>
          </div>

          {/* Prochaine étape */}
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3 mb-4">
              <Clock className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Prochaine étape
                </h3>
                <p className="text-sm text-gray-600">
                  <strong className="text-brand-primary">Arthur</strong>, fondateur de SEIDO,
                  vous contactera personnellement sous <strong>48h</strong> pour discuter de vos besoins
                  et planifier votre onboarding.
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2 border-t border-brand-primary/20 pt-4 mt-4">
              <p className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Vérifiez vos emails (et vos spams) dans les prochaines heures</span>
              </p>
              <p className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Préparez vos questions sur SEIDO - Arthur y répondra !</span>
              </p>
              <p className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Des questions urgentes ? <a href="mailto:contact@seido-app.com" className="text-brand-primary hover:underline">contact@seido-app.com</a></span>
              </p>
            </div>
          </div>

          {/* CTA Retour */}
          <Link href="/">
            <Button
              variant="outline"
              className="w-full border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 hover:text-brand-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-brand-primary/20 text-sm mb-2">
            Programme co-développement 2026 - SEIDO
          </p>
          <Link
            href="/auth/login"
            className="text-brand-primary/40 hover:text-white underline transition-colors text-sm"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}
