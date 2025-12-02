'use client'

/**
 * 🔐 BETA ACCESS GATE - SEIDO
 *
 * Composant de protection beta avec deux modes d'accès:
 * 1. Mode Password: Accès direct avec code beta
 * 2. Mode Interest: Formulaire de demande d'accès
 *
 * Design moderne inspiré des meilleures pratiques SaaS (Linear, Vercel, Supabase)
 */

import { useState, useActionState } from 'react'
import Image from 'next/image'
import { Lock, Mail, Loader2, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { validateBetaPassword, submitBetaInterest } from '@/app/actions/beta-actions'

const initialState = {
  success: false,
  error: undefined
}

export function BetaAccessGate() {
  const [activeTab, setActiveTab] = useState<'password' | 'interest'>('password')

  // ✅ useActionState pour formulaire password
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    validateBetaPassword,
    initialState
  )

  // ✅ useActionState pour formulaire interest
  const [interestState, interestAction, isInterestPending] = useActionState(
    submitBetaInterest,
    initialState
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      {/* Conteneur principal */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo SEIDO */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/Logo/Logo_Seido_Color.png"
              alt="SEIDO"
              width={240}
              height={72}
              className="h-16 w-auto"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Accès Anticipé
          </h1>
          <p className="text-white/60">
            SEIDO est actuellement en phase beta
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'password' | 'interest')}>
            {/* Onglets */}
            <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 m-4 rounded-lg border border-white/10">
              <TabsTrigger
                value="password"
                className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Lock className="w-4 h-4 mr-2" />
                Code Beta
              </TabsTrigger>
              <TabsTrigger
                value="interest"
                className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Mail className="w-4 h-4 mr-2" />
                Être prévenu
              </TabsTrigger>
            </TabsList>

            {/* MODE 1: Password Access */}
            <TabsContent value="password" className="p-6 pt-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Vous avez un code beta ?
                </h2>
                <p className="text-sm text-white/60">
                  Entrez votre code d'accès pour rejoindre la beta privée
                </p>
              </div>

              <form action={passwordAction} className="space-y-4">
                {/* Champ Password */}
                <div>
                  <Label htmlFor="password" className="text-white">
                    Code d'accès beta
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Entrez votre code..."
                    required
                    disabled={isPasswordPending}
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Message d'erreur */}
                {passwordState.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-200">{passwordState.error}</p>
                  </div>
                )}

                {/* Bouton Submit */}
                <Button
                  type="submit"
                  disabled={isPasswordPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
                >
                  {isPasswordPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Accéder à la beta
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* MODE 2: Interest Form */}
            <TabsContent value="interest" className="p-6 pt-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Rejoignez la liste d'attente
                </h2>
                <p className="text-sm text-white/60">
                  Laissez-nous vos coordonnées, nous vous contacterons dès l'ouverture
                </p>
              </div>

              <form action={interestAction} className="space-y-4">
                {/* Champ Email */}
                <div>
                  <Label htmlFor="email" className="text-white">
                    Adresse email professionnelle
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vous@entreprise.com"
                    required
                    disabled={isInterestPending}
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                  />
                </div>

                {/* Champ Message */}
                <div>
                  <Label htmlFor="message" className="text-white">
                    Parlez-nous de votre besoin
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Ex: Je gère 25 immeubles à Bruxelles et cherche une solution moderne..."
                    required
                    disabled={isInterestPending}
                    className="mt-1 min-h-[100px] resize-none bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    maxLength={500}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Minimum 10 caractères, maximum 500
                  </p>
                </div>

                {/* Message d'erreur */}
                {interestState.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-200">{interestState.error}</p>
                  </div>
                )}

                {/* Message de succès */}
                {interestState.success && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-200">
                      Merci ! Nous avons bien reçu votre demande.
                    </p>
                  </div>
                )}

                {/* Bouton Submit */}
                <Button
                  type="submit"
                  disabled={isInterestPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
                >
                  {isInterestPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Rejoindre la liste d'attente
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            Vous rencontrez un problème ?{' '}
            <a
              href="mailto:contact@seido.pm"
              className="text-purple-400 hover:text-purple-300 underline transition-colors"
            >
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
