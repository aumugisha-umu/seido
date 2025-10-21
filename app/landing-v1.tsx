import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Mail,
  Clock,
  ThumbsDown,
  Search,
  ArrowRight,
  Building2,
  Users,
  Wrench,
  Home,
  BarChart3,
  Zap,
  Eye,
  MessageSquare
} from "lucide-react"

export default function LandingV1() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================ */}
      {/* HEADER - Sticky Navigation */}
      {/* ============================================ */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/Logo/Logo_Seido_Color.png"
                alt="SEIDO - Gestion immobilière moderne"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#fonctionnalites"
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                Fonctionnalités
              </Link>
              <Link
                href="#tarifs"
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                Tarifs
              </Link>
              <Link
                href="#contact"
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Se connecter
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90">
                  Essai gratuit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================ */}
      {/* HERO SECTION - Above the Fold */}
      {/* ============================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 to-white py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8 text-center lg:text-left">
              {/* Badge */}
              <Badge variant="outline" className="inline-flex gap-2 px-4 py-2 text-sm">
                <Zap className="size-4 text-primary" />
                500+ lots gérés • 10 000+ interventions traitées
              </Badge>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Fini le calvaire de la coordination des interventions
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-gray-600 leading-relaxed">
                Centralisez vos demandes, coordonnez vos prestataires, satisfaites vos locataires.
                SEIDO simplifie la gestion de vos interventions de A à Z.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-lg px-8 py-6">
                    Commencer gratuitement
                    <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                <Link href="/gestionnaire/dashboard">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                    Voir la démo
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span>14 jours gratuits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span>Sans carte bancaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span>Support inclus</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative">
              <div className="relative rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                <Image
                  src="/images/mockup_desktop.png"
                  alt="Dashboard SEIDO - Interface de gestion des interventions"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 size-72 bg-primary/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-4 -left-4 size-72 bg-blue-400/10 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOCIAL PROOF BAR - Stats */}
      {/* ============================================ */}
      <section className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">87%</div>
              <div className="text-gray-600">de satisfaction locataires</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">70%</div>
              <div className="text-gray-600">de temps administratif économisé</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">10 000+</div>
              <div className="text-gray-600">interventions gérées</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PAIN POINTS SECTION */}
      {/* ============================================ */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              La gestion d'interventions, un cauchemar quotidien ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Les gestionnaires immobiliers perdent un temps précieux à gérer la coordination des interventions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Pain Point 1 */}
            <Card className="border-2 hover:border-gray-300 transition-colors">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <Mail className="size-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Communication chaotique</CardTitle>
                    <CardDescription className="text-base">
                      Emails, appels téléphoniques, WhatsApp... les demandes arrivent de partout.
                      Impossible de centraliser les informations.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Pain Point 2 */}
            <Card className="border-2 hover:border-gray-300 transition-colors">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Clock className="size-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Temps perdu</CardTitle>
                    <CardDescription className="text-base">
                      Des heures chaque semaine à relancer les prestataires, informer les locataires,
                      et faire le suivi manuel de chaque intervention.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Pain Point 3 */}
            <Card className="border-2 hover:border-gray-300 transition-colors">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                    <ThumbsDown className="size-6 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Locataires insatisfaits</CardTitle>
                    <CardDescription className="text-base">
                      87% des plaintes locataires viennent de mauvaises expériences de maintenance.
                      54% ne renouvellent pas leur bail à cause du mauvais service.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Pain Point 4 */}
            <Card className="border-2 hover:border-gray-300 transition-colors">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Search className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Manque de visibilité</CardTitle>
                    <CardDescription className="text-base">
                      Impossible de savoir en temps réel où en sont les interventions,
                      quels prestataires sont fiables, combien ça coûte vraiment.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SOLUTION SECTION */}
      {/* ============================================ */}
      <section className="py-20 bg-gradient-to-b from-blue-50/30 to-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="default" className="mb-4 px-4 py-2">
              La solution SEIDO
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Avec SEIDO, tout devient simple
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Une plateforme complète pour centraliser, coordonner et piloter toutes vos interventions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Benefit 1 */}
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors bg-white">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Workflow centralisé</CardTitle>
                    <CardDescription className="text-base">
                      Toutes les interventions au même endroit, du signalement à la clôture.
                      Plus de jonglage entre 10 outils différents.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Benefit 2 */}
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors bg-white">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <MessageSquare className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Coordination facilitée</CardTitle>
                    <CardDescription className="text-base">
                      Locataires, prestataires et équipes internes synchronisés en temps réel.
                      Notifications automatiques à chaque étape.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Benefit 3 */}
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors bg-white">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Eye className="size-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Visibilité totale</CardTitle>
                    <CardDescription className="text-base">
                      Dashboard en temps réel avec 11 statuts d'intervention.
                      Analytics, rapports automatiques, KPIs à jour en un coup d'œil.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Benefit 4 */}
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors bg-white">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Zap className="size-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Gain de temps massif</CardTitle>
                    <CardDescription className="text-base">
                      70% de temps administratif économisé grâce à l'automatisation.
                      Concentrez-vous sur l'essentiel : votre métier.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS - 3 Steps */}
      {/* ============================================ */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Démarrez en 3 étapes simples et commencez à gérer vos interventions efficacement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="relative text-center space-y-4">
              <div className="inline-flex size-16 rounded-full bg-primary text-white items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Créez votre patrimoine
              </h3>
              <p className="text-gray-600">
                Ajoutez vos bâtiments et lots en quelques clics.
                Importez vos contacts et documents existants.
              </p>
              {/* Connecting Arrow (hidden on mobile) */}
              <div className="hidden md:block absolute top-8 -right-6 size-12">
                <ArrowRight className="size-6 text-gray-300" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative text-center space-y-4">
              <div className="inline-flex size-16 rounded-full bg-primary text-white items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Gérez vos interventions
              </h3>
              <p className="text-gray-600">
                Workflow automatisé avec 11 statuts. De la demande initiale
                à la clôture, tout est suivi et tracé.
              </p>
              {/* Connecting Arrow (hidden on mobile) */}
              <div className="hidden md:block absolute top-8 -right-6 size-12">
                <ArrowRight className="size-6 text-gray-300" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4">
              <div className="inline-flex size-16 rounded-full bg-primary text-white items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Pilotez votre performance
              </h3>
              <p className="text-gray-600">
                Analytics en temps réel, rapports automatiques,
                KPIs à jour. Prenez les bonnes décisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FEATURES MULTI-ROLES */}
      {/* ============================================ */}
      <section id="fonctionnalites" className="py-20 bg-gray-50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Une plateforme pour tous vos collaborateurs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Chaque rôle dispose d'une interface adaptée à ses besoins spécifiques.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Gestionnaire Card */}
            <Card className="hover:shadow-lg transition-shadow bg-white">
              <CardHeader className="text-center space-y-4">
                <div className="size-16 rounded-xl bg-blue-100 flex items-center justify-center mx-auto">
                  <Building2 className="size-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl mb-2">Gestionnaire</CardTitle>
                  <CardDescription>Validation, suivi, rapports</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Validation des demandes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Suivi en temps réel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Analytics et KPIs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Gestion multi-propriétés</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Locataire Card */}
            <Card className="hover:shadow-lg transition-shadow bg-white">
              <CardHeader className="text-center space-y-4">
                <div className="size-16 rounded-xl bg-orange-100 flex items-center justify-center mx-auto">
                  <Home className="size-8 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-xl mb-2">Locataire</CardTitle>
                  <CardDescription>Demandes en 2 clics</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Signalement simplifié</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Suivi transparent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Notifications SMS/Email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Interface mobile-first</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Prestataire Card */}
            <Card className="hover:shadow-lg transition-shadow bg-white">
              <CardHeader className="text-center space-y-4">
                <div className="size-16 rounded-xl bg-green-100 flex items-center justify-center mx-auto">
                  <Wrench className="size-8 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl mb-2">Prestataire</CardTitle>
                  <CardDescription>Planning optimisé</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Devis intégrés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Planification facilitée</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Historique interventions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Vue mobile optimisée</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Admin Card */}
            <Card className="hover:shadow-lg transition-shadow bg-white">
              <CardHeader className="text-center space-y-4">
                <div className="size-16 rounded-xl bg-red-100 flex items-center justify-center mx-auto">
                  <Users className="size-8 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl mb-2">Admin</CardTitle>
                  <CardDescription>Vue d'ensemble</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Gestion des utilisateurs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Supervision complète</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Rapports cross-équipes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span>Configuration système</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PRODUCT DEMO - Screenshot Section */}
      {/* ============================================ */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Votre nouveau tableau de bord
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Interface moderne et intuitive pour gérer toutes vos interventions en un coup d'œil.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Main Screenshot */}
            <div className="relative rounded-xl shadow-2xl overflow-hidden border border-gray-200">
              <Image
                src="/images/mockup_desktop.png"
                alt="Interface SEIDO - Dashboard de gestion des interventions"
                width={1400}
                height={900}
                className="w-full h-auto"
              />
            </div>

            {/* Feature Highlights - Floating Cards */}
            <div className="hidden lg:block">
              {/* Highlight 1 - Top Left */}
              <div className="absolute -left-4 top-20 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <BarChart3 className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1">Statistiques en temps réel</div>
                    <div className="text-xs text-gray-600">
                      KPIs à jour, taux de satisfaction, délais moyens
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlight 2 - Top Right */}
              <div className="absolute -right-4 top-40 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1">11 statuts d'intervention</div>
                    <div className="text-xs text-gray-600">
                      Workflow complet de la demande à la clôture
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlight 3 - Bottom Left */}
              <div className="absolute -left-4 bottom-40 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Search className="size-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1">Filtres et recherche</div>
                    <div className="text-xs text-gray-600">
                      Trouvez n'importe quelle intervention en secondes
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlight 4 - Bottom Right */}
              <div className="absolute -right-4 bottom-20 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Zap className="size-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1">Notifications intelligentes</div>
                    <div className="text-xs text-gray-600">
                      Alertes automatiques à chaque changement de statut
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* PRICING SECTION */}
      {/* ============================================ */}
      <section id="tarifs" className="py-20 bg-gradient-to-b from-blue-50/30 to-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Tarification simple et transparente
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choisissez l'option qui convient le mieux à votre activité. Sans engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Pricing Card 1 - Monthly */}
            <Card className="relative border-2 hover:border-gray-300 transition-colors bg-white">
              <CardHeader className="text-center space-y-4 pb-8">
                <CardTitle className="text-2xl">Mensuel</CardTitle>
                <div className="space-y-2">
                  <div className="text-5xl font-bold text-gray-900">3€</div>
                  <div className="text-gray-600">par lot / mois</div>
                </div>
                <Badge variant="outline" className="mx-auto">
                  Flexible, sans engagement
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Toutes les fonctionnalités incluses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Support par email</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Mises à jour automatiques</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Résiliable à tout moment</span>
                  </li>
                </ul>
                <Link href="/auth/signup" className="block">
                  <Button variant="outline" className="w-full" size="lg">
                    Commencer l'essai gratuit
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pricing Card 2 - Yearly (Recommended) */}
            <Card className="relative border-2 border-primary hover:border-primary/80 transition-colors bg-white shadow-lg">
              {/* Recommended Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-white px-4 py-1.5">
                  ÉCONOMISEZ 33%
                </Badge>
              </div>

              <CardHeader className="text-center space-y-4 pb-8 pt-8">
                <CardTitle className="text-2xl">Annuel</CardTitle>
                <div className="space-y-2">
                  <div className="text-5xl font-bold text-primary">2€</div>
                  <div className="text-gray-600">par lot / mois</div>
                  <div className="text-sm text-gray-500">(soit 24€ / an)</div>
                </div>
                <Badge variant="default" className="mx-auto bg-green-600">
                  Recommandé
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Toutes les fonctionnalités incluses</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Support prioritaire</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">Mises à jour automatiques</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-semibold">8€ d'économies par lot / an</span>
                  </li>
                </ul>
                <Link href="/auth/signup" className="block">
                  <Button className="w-full bg-primary hover:bg-primary/90" size="lg">
                    Commencer l'essai gratuit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <span>Essai gratuit 14 jours</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <span>Pas de carte bancaire requise</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <span>Support inclus</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              Le prix est calculé par lot géré dans la plateforme.
              Ajoutez ou supprimez des lots à tout moment, votre facture s'ajuste automatiquement.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL CTA SECTION */}
      {/* ============================================ */}
      <section className="py-20 bg-gradient-to-br from-primary to-blue-600 text-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Prêt à simplifier votre gestion immobilière ?
            </h2>
            <p className="text-xl text-blue-100">
              Rejoignez les centaines de gestionnaires qui ont déjà adopté SEIDO
              et économisez 70% de votre temps administratif.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                  Commencer gratuitement
                  <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-100">
              <CheckCircle2 className="size-5" />
              <span>Sans engagement • Sans carte bancaire • 14 jours gratuits</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer id="contact" className="bg-gray-900 text-gray-300 py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Description */}
            <div className="space-y-4">
              <Image
                src="/images/Logo/Logo_Seido_White.png"
                alt="SEIDO"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              <p className="text-sm text-gray-400 leading-relaxed">
                La plateforme qui simplifie la gestion de vos interventions immobilières.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold text-white mb-4">Produit</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#fonctionnalites" className="hover:text-white transition-colors">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="#tarifs" className="hover:text-white transition-colors">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/gestionnaire/dashboard" className="hover:text-white transition-colors">
                    Voir la démo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="font-semibold text-white mb-4">Ressources</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="hover:text-white transition-colors">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-semibold text-white mb-4">Légal</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    CGU
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Confidentialité
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>© 2025 SEIDO. Plateforme de gestion immobilière moderne. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
