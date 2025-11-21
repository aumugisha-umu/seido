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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-4">
      {/* Conteneur principal */}
      <div className="w-full max-w-md">
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

          <h1 className="text-3xl font-bold text-white mb-2">
            Accès Anticipé
          </h1>
          <p className="text-purple-100">
            SEIDO est actuellement en phase beta
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'password' | 'interest')}>
            {/* Onglets */}
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 m-4 rounded-lg">
              <TabsTrigger
                value="password"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Lock className="w-4 h-4 mr-2" />
                Code Beta
              </TabsTrigger>
              <TabsTrigger
                value="interest"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Être prévenu
              </TabsTrigger>
            </TabsList>

            {/* MODE 1: Password Access */}
            <TabsContent value="password" className="p-6 pt-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Vous avez un code beta ?
                </h2>
                <p className="text-sm text-gray-600">
                  Entrez votre code d'accès pour rejoindre la beta privée
                </p>
              </div>

              <form action={passwordAction} className="space-y-4">
                {/* Champ Password */}
                <div>
                  <Label htmlFor="password" className="text-gray-700">
                    Code d'accès beta
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Entrez votre code..."
                    required
                    disabled={isPasswordPending}
                    className="mt-1"
                    autoFocus
                  />
                </div>

                {/* Message d'erreur */}
                {passwordState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{passwordState.error}</p>
                  </div>
                )}

                {/* Bouton Submit */}
                <Button
                  type="submit"
                  disabled={isPasswordPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3"
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Rejoignez la liste d'attente
                </h2>
                <p className="text-sm text-gray-600">
                  Laissez-nous vos coordonnées, nous vous contacterons dès l'ouverture
                </p>
              </div>

              <form action={interestAction} className="space-y-4">
                {/* Champ Email */}
                <div>
                  <Label htmlFor="email" className="text-gray-700">
                    Adresse email professionnelle
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vous@entreprise.com"
                    required
                    disabled={isInterestPending}
                    className="mt-1"
                  />
                </div>

                {/* Champ Message */}
                <div>
                  <Label htmlFor="message" className="text-gray-700">
                    Parlez-nous de votre besoin
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Ex: Je gère 25 immeubles à Bruxelles et cherche une solution moderne..."
                    required
                    disabled={isInterestPending}
                    className="mt-1 min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 10 caractères, maximum 500
                  </p>
                </div>

                {/* Message d'erreur */}
                {interestState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{interestState.error}</p>
                  </div>
                )}

                {/* Message de succès */}
                {interestState.success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-600">
                      Merci ! Nous avons bien reçu votre demande.
                    </p>
                  </div>
                )}

                {/* Bouton Submit */}
                <Button
                  type="submit"
                  disabled={isInterestPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3"
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
          <p className="text-purple-100 text-sm">
            Vous rencontrez un problème ?{' '}
            <a
              href="mailto:contact@seido.pm"
              className="underline hover:text-white transition-colors"
            >
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
