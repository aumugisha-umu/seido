'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Users, Wrench, Home,
  CheckCircle2, Clock, MessageSquare, TrendingUp,
  Zap, Shield, BarChart3, Mail
} from 'lucide-react'
import { StatsSection } from './sections/stats-section'
import { TestimonialsSection } from './sections/testimonials-section'
import { FAQSection } from './sections/faq-section'

/**
 * VERSION 1 - RECOMMENDED
 * Design Philosophy: Clean, minimalist, professional
 * - Focus on clarity and readability
 * - Balanced information density
 * - Production-ready, accessible
 * - Mobile-first responsive design
 */

export function LandingPageV1() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/images/Logo/Picto_Seido_Color.png"
              alt="SEIDO"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <span className="text-xl font-bold text-foreground">SEIDO</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pour qui ?
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
          </nav>

          <div className="flex gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Se connecter</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="mb-4 animate-float">
            Rejoignez 500+ gestionnaires en Belgique
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
            Vos interventions immobilières gérées en 5 min au lieu de 2 heures
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Finies les relances par SMS, email, appel. SEIDO centralise tout.
            Vos locataires sont contents. Vous gagnez 1h30 par intervention.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth/signup">
              <Button size="lg" className="min-w-[200px]">
                Essai gratuit 14 jours
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="min-w-[200px]">
              <Mail className="w-4 h-4 mr-2" />
              Demander une démo
            </Button>
          </div>

          {/* Social Proof */}
          <div className="pt-8 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Carte bancaire non requise</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Support français 7j/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Screenshot */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border">
            <Image
              src="/images/mockup_desktop.png"
              alt="Dashboard SEIDO - Interface de gestion des interventions"
              width={1200}
              height={800}
              priority
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counters */}
      <StatsSection />

      {/* Pain Points Section */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Vous reconnaissez-vous ?
          </h2>
          <p className="text-lg text-muted-foreground">
            Les défis quotidiens de la gestion immobilière
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <MessageSquare className="w-10 h-10 text-destructive mb-2" />
              <CardTitle className="text-lg">Communication chaotique</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                SMS, emails, appels... Impossible de retrouver qui a dit quoi et quand.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="w-10 h-10 text-destructive mb-2" />
              <CardTitle className="text-lg">Perte de temps monstre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Des heures perdues à relancer prestataires et locataires pour un simple suivi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-destructive mb-2" />
              <CardTitle className="text-lg">Locataires insatisfaits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manque de transparence sur l'avancement des interventions = frustration.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              SEIDO centralise tout en un seul endroit
            </h2>
            <p className="text-lg text-muted-foreground">
              Une plateforme unique pour toutes vos interventions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Demandes centralisées
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tous vos locataires envoient leurs demandes au même endroit. Fini les emails perdus.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Coordination automatisée
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Assignez les prestataires, gérez les devis, suivez l'avancement en temps réel.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Transparence totale
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Locataires et prestataires voient l'état d'avancement. Plus besoin de relancer.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Historique complet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tous les échanges, documents et factures au même endroit. Audit trail parfait.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Notifications intelligentes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Alertes automatiques à chaque étape. Tout le monde reste informé sans effort.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Reporting simplifié
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tableaux de bord et statistiques pour piloter votre activité en un coup d'oeil.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-muted-foreground">
            Simple et rapide à mettre en place
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              1
            </div>
            <h3 className="font-semibold text-foreground">Créez votre compte</h3>
            <p className="text-sm text-muted-foreground">
              En 2 minutes, configurez votre espace et ajoutez vos biens.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              2
            </div>
            <h3 className="font-semibold text-foreground">Invitez vos équipes</h3>
            <p className="text-sm text-muted-foreground">
              Locataires et prestataires reçoivent leurs accès par email.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              3
            </div>
            <h3 className="font-semibold text-foreground">Gérez les demandes</h3>
            <p className="text-sm text-muted-foreground">
              Recevez, assignez et suivez toutes les interventions.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              4
            </div>
            <h3 className="font-semibold text-foreground">Gagnez du temps</h3>
            <p className="text-sm text-muted-foreground">
              Automatisation et transparence = moins de stress.
            </p>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Une solution pour chaque rôle
            </h2>
            <p className="text-lg text-muted-foreground">
              Interface adaptée à chaque utilisateur
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Gestionnaire */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <CardTitle className="text-foreground">Gestionnaire</CardTitle>
                <CardDescription>Gestion de patrimoine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Portfolio immobilier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Suivi interventions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Coordination équipes</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Prestataire */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Wrench className="w-7 h-7 text-green-600" />
                </div>
                <CardTitle className="text-foreground">Prestataire</CardTitle>
                <CardDescription>Services maintenance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Gestion interventions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Devis et facturation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Planning optimisé</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Locataire */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-orange-100 dark:bg-orange-950 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Home className="w-7 h-7 text-orange-600" />
                </div>
                <CardTitle className="text-foreground">Locataire</CardTitle>
                <CardDescription>Interface simplifiée</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Demandes faciles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Suivi temps réel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Communication directe</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section with Carousel */}
      <TestimonialsSection />

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tarifs simples et transparents
          </h2>
          <p className="text-lg text-muted-foreground">
            Pas de frais cachés, pas de surprise
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Mensuel */}
          <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Mensuel</CardTitle>
              <CardDescription>Flexibilité maximale</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold text-foreground">5€</span>
                <span className="text-muted-foreground">/bien/mois</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Interventions illimitées</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Utilisateurs illimités</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Support français 7j/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Stockage documents</span>
                </li>
              </ul>
              <Link href="/auth/signup" className="block pt-4">
                <Button variant="outline" size="lg" className="w-full">
                  Commencer
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Annuel */}
          <Card className="border-brand-purple shadow-xl relative hover:shadow-2xl hover:-translate-y-1 hover:border-brand-indigo transition-all duration-300 animate-glow">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-purple hover:bg-brand-indigo">
              Économisez 17%
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Annuel</CardTitle>
              <CardDescription>Meilleure offre ⭐</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold text-foreground">50€</span>
                <span className="text-muted-foreground">/bien/an</span>
              </div>
              <p className="text-sm text-brand-purple font-medium pt-2">
                Seulement 4.17€/mois par bien
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Interventions illimitées</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Utilisateurs illimités</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Support français 7j/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Stockage documents</span>
                </li>
              </ul>
              <Link href="/auth/signup" className="block pt-4">
                <Button size="lg" className="w-full">
                  Commencer
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Essai gratuit 14 jours • Sans engagement • Sans carte bancaire
        </p>
      </section>

      {/* FAQ Section with Accordion */}
      <FAQSection />

      {/* Final CTA */}
      <section className="bg-brand-gradient text-white py-20 animate-gradient">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Prêt à simplifier votre gestion immobilière ?
            </h2>
            <p className="text-lg opacity-90">
              Rejoignez les 500+ gestionnaires qui gagnent 1h30 par jour avec SEIDO
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/auth/signup">
                <Button size="lg" className="min-w-[200px] bg-white text-brand-purple hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                  Démarrer gratuitement
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="min-w-[200px] bg-transparent border-white text-white hover:bg-white/20">
                <Mail className="w-4 h-4 mr-2" />
                Contacter l'équipe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/images/Logo/Picto_Seido_Color.png"
                  alt="SEIDO"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="font-bold text-foreground">SEIDO</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plateforme de gestion immobilière moderne
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Produit</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Sécurité</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Entreprise</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Légal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">CGU</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2024 SEIDO. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
