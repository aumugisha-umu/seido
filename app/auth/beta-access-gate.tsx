'use client'

/**
 * 🚀 PROGRAMME FONDATEURS 2026 - SEIDO
 *
 * Page de recrutement pour la beta privée avec deux modes d'accès:
 * 1. Mode Fondateurs (défaut): Formulaire de candidature au programme
 * 2. Mode Code Beta: Accès direct avec code pour testeurs existants
 *
 * Design premium inspiré des meilleures pratiques SaaS (Linear, Vercel, Supabase)
 * Stratégie UX basée sur les principes de Cialdini (rareté, réciprocité, autorité)
 */

import { useState, useActionState } from 'react'
import Image from 'next/image'
import {
  Lock, Loader2, Send, CheckCircle2,
  Building2, Users, Briefcase, Shield,
  Percent, Calendar, MessageSquare, Rocket
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validateBetaPassword, submitBetaInterest } from '@/app/actions/beta-actions'

const initialState = {
  success: false,
  error: undefined
}

// Profils recherchés pour le programme
const targetProfiles = [
  { icon: Building2, label: 'Gestionnaires en agence', color: 'text-purple-400' },
  { icon: Briefcase, label: 'Sociétés de gestion patrimoniale', color: 'text-blue-400' },
  { icon: Users, label: 'Administrateurs de biens', color: 'text-green-400' },
  { icon: Shield, label: 'Syndics professionnels', color: 'text-orange-400' },
]

// Avantages du programme Fondateurs
const founderBenefits = [
  {
    icon: Percent,
    title: '-25% garanti 3 ans',
    description: 'Tarif préférentiel sur le prix officiel, bloqué pendant 3 ans',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Calendar,
    title: 'Accès prioritaire',
    description: 'Utilisez SEIDO avant le lancement officiel fin 2026',
    color: 'from-purple-500 to-blue-500'
  },
  {
    icon: MessageSquare,
    title: 'Votre voix compte',
    description: 'Participez aux décisions de développement du produit',
    color: 'from-orange-500 to-red-500'
  },
]

export function BetaAccessGate() {
  // Défaut sur "interest" (Programme Fondateurs)
  const [activeTab, setActiveTab] = useState<'interest' | 'password'>('interest')

  // useActionState pour formulaire password
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    validateBetaPassword,
    initialState
  )

  // useActionState pour formulaire interest
  const [interestState, interestAction, isInterestPending] = useActionState(
    submitBetaInterest,
    initialState
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 py-8">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[100px]" />
      </div>

      {/* Conteneur principal - plus large pour accommoder le nouveau design */}
      <div className="w-full max-w-2xl relative z-10">
        {/* Logo SEIDO */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/Logo/Logo_Seido_Color.png"
              alt="SEIDO"
              width={200}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>

          <h1 className="landing-h2 text-white mb-2">
            Programme Fondateurs 2026
          </h1>
          <p className="landing-subtitle text-white/60 max-w-md mx-auto">
            Rejoignez les professionnels qui co-construisent l&apos;avenir de la gestion locative
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'interest' | 'password')}>
            {/* Onglets - Rejoindre en premier (par défaut) */}
            <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 m-4 rounded-lg border border-white/10">
              <TabsTrigger
                value="interest"
                className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white text-white/60"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Rejoindre le programme
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                <Lock className="w-4 h-4 mr-2" />
                J&apos;ai un code
              </TabsTrigger>
            </TabsList>

            {/* MODE 1: Programme Fondateurs (défaut) */}
            <TabsContent value="interest" className="p-6 pt-2">
              {/* Section Avantages */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {founderBenefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors"
                  >
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${benefit.color} flex items-center justify-center`}>
                      <benefit.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="landing-caption font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-xs text-white/50 leading-tight">{benefit.description}</p>
                  </div>
                ))}
              </div>

              {/* Section Profils Recherchés */}
              <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="landing-caption text-white/60 mb-3 text-center">
                  Nous recherchons des professionnels :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {targetProfiles.map((profile, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                    >
                      <profile.icon className={`w-4 h-4 ${profile.color} flex-shrink-0`} />
                      <span className="text-xs text-white/80">{profile.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulaire Fondateurs */}
              <form action={interestAction} className="space-y-4">
                {/* Ligne Prénom + Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-white landing-caption">
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
                    <Label htmlFor="lastName" className="text-white landing-caption">
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
                  <Label htmlFor="email" className="text-white landing-caption">
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

                {/* Téléphone */}
                <div>
                  <Label htmlFor="phone" className="text-white landing-caption">
                    Téléphone <span className="text-white/40">(optionnel)</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+32 470 12 34 56"
                    disabled={isInterestPending}
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                  />
                </div>

                {/* Ligne Société + Nombre de lots */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="company" className="text-white landing-caption">
                      Société
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Nom de votre société"
                      required
                      disabled={isInterestPending}
                      className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lotsCount" className="text-white landing-caption">
                      Lots gérés
                    </Label>
                    <Select name="lotsCount" required disabled={isInterestPending}>
                      <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white focus:bg-white/20">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-white/20">
                        <SelectItem value="1-10" className="text-white hover:bg-white/10">1 - 10 lots</SelectItem>
                        <SelectItem value="11-50" className="text-white hover:bg-white/10">11 - 50 lots</SelectItem>
                        <SelectItem value="51-200" className="text-white hover:bg-white/10">51 - 200 lots</SelectItem>
                        <SelectItem value="200+" className="text-white hover:bg-white/10">200+ lots</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Message optionnel */}
                <div>
                  <Label htmlFor="message" className="text-white landing-caption">
                    Message <span className="text-white/40">(optionnel)</span>
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Parlez-nous de vos attentes, vos défis actuels..."
                    disabled={isInterestPending}
                    className="mt-1 min-h-[80px] resize-none bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    maxLength={500}
                  />
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
                      Merci ! Votre candidature a bien été enregistrée.
                    </p>
                  </div>
                )}

                {/* Bouton Submit */}
                <Button
                  type="submit"
                  disabled={isInterestPending}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
                >
                  {isInterestPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Candidater au Programme Fondateurs
                    </>
                  )}
                </Button>

                {/* Signature Arthur */}
                <div className="pt-4 border-t border-white/10 text-center">
                  <p className="landing-caption text-white/60">
                    <span className="text-purple-400 font-medium">Arthur</span>, fondateur de SEIDO,
                    vous recontacte personnellement sous 48h
                  </p>
                </div>
              </form>
            </TabsContent>

            {/* MODE 2: Code Beta (pour testeurs existants) */}
            <TabsContent value="password" className="p-6 pt-2">
              <div className="mb-6">
                <h2 className="landing-h4 text-white mb-2">
                  Vous avez un code d&apos;accès ?
                </h2>
                <p className="landing-caption text-white/60">
                  Entrez votre code pour accéder directement à la plateforme
                </p>
              </div>

              <form action={passwordAction} className="space-y-4">
                {/* Champ Password */}
                <div>
                  <Label htmlFor="password" className="text-white landing-caption">
                    Code d&apos;accès beta
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Entrez votre code..."
                    required
                    disabled={isPasswordPending}
                    className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                    autoFocus={activeTab === 'password'}
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
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all hover:scale-[1.02]"
                >
                  {isPasswordPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Accéder à la plateforme
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-xs">
            Beta privée 2026 - Sélection en cours
          </p>
          <p className="text-white/60 text-sm mt-2">
            Vous rencontrez un problème ?{' '}
            <a
              href="mailto:contact@seido-app.com"
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
