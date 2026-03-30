'use client'

/**
 * Invite-Only Access Gate — SEIDO
 *
 * Contact form for requesting access to the platform.
 * Agencies are added manually by admin after review.
 */

import { useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Loader2, Send, CheckCircle2,
  Shield, Sparkles, HeadphonesIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitBetaInterest } from '@/app/actions/beta-actions'

const initialState = {
  success: false,
  error: undefined
}

const valueProps = [
  {
    icon: Shield,
    title: 'Qualité garantie',
    description: 'Chaque utilisateur bénéficie d\'un accompagnement personnalisé',
  },
  {
    icon: HeadphonesIcon,
    title: 'Import gratuit',
    description: 'Nous importons vos données existantes gratuitement',
  },
  {
    icon: Sparkles,
    title: 'Opérationnel en 10 min',
    description: 'Interface intuitive, prise en main immédiate sans formation',
  },
]

export function BetaAccessGate() {
  const [interestState, interestAction, isInterestPending] = useActionState(
    submitBetaInterest,
    initialState
  )

  return (
    <div className="fixed inset-0 z-20 bg-landing-bg overflow-y-auto">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="w-full relative z-10 px-4 max-w-5xl">
          {/* Logo SEIDO */}
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

            <h1 className="landing-h2 text-white mb-3">
              Accès sur invitation
            </h1>
            <p className="landing-subtitle text-white/60 max-w-lg mx-auto">
              Pour garantir un service d'excellence à chaque utilisateur,
              l'accès à SEIDO se fait actuellement sur invitation.
            </p>
          </div>

          {/* Main card */}
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

              {/* LEFT — Value props */}
              <div className="lg:w-[340px] lg:flex-shrink-0 space-y-4">
                <div className="space-y-3">
                  {valueProps.map((prop, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                        <prop.icon className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-0.5">{prop.title}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">{prop.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-white/70 leading-relaxed">
                    Nous traitons chaque demande individuellement.
                    Un membre de notre équipe vous recontactera
                    sous <strong className="text-white">48h</strong> pour
                    discuter de vos besoins et organiser votre accès.
                  </p>
                </div>
              </div>

              {/* RIGHT — Form */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Demandez votre accès
                  </h2>
                  <p className="text-sm text-white/60">
                    Laissez-nous vos coordonnées et nous vous recontacterons rapidement.
                  </p>
                </div>

                <form action={interestAction} className="flex-1 flex flex-col gap-4">
                  {/* First + Last name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName" className="text-white text-sm">
                        Prénom
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Jean"
                        required
                        disabled={isInterestPending}
                        className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-white text-sm">
                        Nom
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Dupont"
                        required
                        disabled={isInterestPending}
                        className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email" className="text-white text-sm">
                      Email professionnel
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="jean.dupont@agence.com"
                      required
                      disabled={isInterestPending}
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone" className="text-white text-sm">
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+32 470 12 34 56"
                      required
                      disabled={isInterestPending}
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    />
                  </div>

                  {/* Message */}
                  <div className="flex-1 flex flex-col">
                    <Label htmlFor="message" className="text-white text-sm">
                      Décrivez votre activité
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Ex: Je gère 25 immeubles à Bruxelles et cherche une solution moderne..."
                      required
                      disabled={isInterestPending}
                      className="mt-1 flex-1 min-h-[80px] resize-none bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                      maxLength={500}
                    />
                  </div>

                  {/* Error */}
                  {interestState.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-200">{interestState.error}</p>
                    </div>
                  )}

                  {/* Success */}
                  {interestState.success && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-200">
                        Merci ! Votre demande a bien été enregistrée.
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isInterestPending}
                    className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02]"
                  >
                    {isInterestPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Demander mon accès
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <p className="text-white/60 text-sm">
                Une question ?{' '}
                <a
                  href="mailto:info@seido-app.com"
                  className="text-brand-primary hover:text-brand-primary/80 underline transition-colors"
                >
                  info@seido-app.com
                </a>
              </p>
              <span className="text-white/40 hidden sm:inline">|</span>
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
    </div>
  )
}
