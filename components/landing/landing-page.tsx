'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
    Building2, Users, Wrench, Home,
    CheckCircle2, ArrowRight, Zap, Shield, BarChart3, Mail,
    Sparkles, Globe, Smartphone, Clock, MessageSquare, TrendingUp,
    FileText, AlertTriangle
} from 'lucide-react'
import { faq } from '@/data/faq'
import { CountUp } from '@/components/ui/count-up'
import { DemoRequestForm } from './demo-request-form'
import { LandingHeader } from './landing-header'

/**
 * VERSION 2 - MODERN PREMIUM
 * Design Philosophy: "Wow" factor, Glassmorphism, Deep Gradients
 * - Dark mode dominant (or deep blue/violet theme)
 * - Glassmorphism cards
 * - Glowing effects
 * - 3D abstract imagery
 */

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.1 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}

export function LandingPage() {
    const [showDemoModal, setShowDemoModal] = useState(false)

    return (
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-purple-500 selection:text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Navigation Header - Shared Component */}
            <LandingHeader showNav={true} />

            {/* Hero Section - Background Video with Overlay */}
            <section className="relative z-10 min-h-[600px] md:min-h-[calc(100vh-73px)] flex items-center justify-start overflow-hidden">
                {/* Background Video */}
                <div className="absolute inset-0 z-0 bg-[#131426]">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    >
                        <source src="/videos/Image-to-Image-9b0ddc9b.webm" type="video/webm" />
                    </video>
                    {/* Gradient Overlay - Darker on left for text readability, transparent on right to show video */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#131426]/95 via-[#131426]/70 md:via-[#131426]/60 to-[#131426]/80 md:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#131426]/40 via-transparent to-[#131426]/60" />
                </div>

                <div className="container mx-auto px-4 py-12 md:py-0 relative z-10">
                    <div className="max-w-2xl">
                        <FadeIn delay={0}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 md:mb-8">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="landing-caption font-medium text-white/90">La référence des gestionnaires modernes</span>
                            </div>
                        </FadeIn>

                        <FadeIn delay={100}>
                            <h1 className="landing-display mb-6 md:mb-8 drop-shadow-2xl">
                                <span className="block text-white">
                                    La gestion locative
                                </span>
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                    simplifiée
                                </span>
                            </h1>
                        </FadeIn>

                        <FadeIn delay={200}>
                            <p className="landing-subtitle text-white/90 mb-8 md:mb-10 drop-shadow-lg">
                                Une plateforme intelligente qui connecte gestionnaires, prestataires et locataires.
                                <span className="text-white font-semibold"> Gagnez jusqu&apos;à 2h par jour en optimisant la gestion opérationnelle de votre patrimoine.</span>
                            </p>
                        </FadeIn>

                        <FadeIn delay={300}>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/auth/signup">
                                    <Button size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 text-base md:text-lg bg-white text-black hover:bg-white/90 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105">
                                        Essai gratuit 1 mois
                                    </Button>
                                </Link>
                                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 text-base md:text-lg border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-105" onClick={() => setShowDemoModal(true)}>
                                    <Mail className="w-4 md:w-5 h-4 md:h-5 mr-2 md:mr-3" />
                                    Demander une démo
                                </Button>
                            </div>
                        </FadeIn>

                        <FadeIn delay={400}>
                            <div className="pt-8 md:pt-12 flex items-center gap-4 md:gap-6 landing-caption text-white/80">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#0f172a] bg-gradient-to-br from-gray-600 to-gray-500" />
                                    ))}
                                </div>
                                <p className="font-medium">Rejoint par 500+ gestionnaires</p>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Combined Problem Section: Costs & Causes */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                {/* Part 1: The Hidden Costs */}
                <FadeIn>
                    <div className="text-center mb-12">
                        <h2 className="landing-h2 text-white mb-4">
                            Les coûts cachés de la gestion locative
                        </h2>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
                    <FadeIn delay={0}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={40} suffix="%" />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de votre temps perdu en coordination</div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={100}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={36000} suffix="€" separator=" " />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de coûts annuels par gestionnaire</div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={200}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={360} suffix="€" />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de perte cachée par bien/an</div>
                        </div>
                    </FadeIn>
                </div>

                <FadeIn delay={300}>
                    <p className="text-center landing-caption text-white/40 max-w-2xl mx-auto italic mb-16">
                        Sur base d&apos;un gestionnaire avec 100 biens en gestion et un taux horaire brut de 45€ (moyenne belge)
                    </p>
                </FadeIn>

                {/* Connector */}
                <FadeIn delay={400}>
                    <div className="flex flex-col items-center justify-center mb-16 space-y-4">
                        <div className="h-16 w-px bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
                        <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm landing-caption text-white/60">
                            D&apos;où viennent ces pertes ?
                        </div>
                        <div className="h-16 w-px bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
                    </div>
                </FadeIn>

                {/* Part 2: The Causes (Pain Points) */}
                <FadeIn>
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="landing-h2 text-white mb-4">
                            Vous reconnaissez-vous ?
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Les défis quotidiens qui rongent votre rentabilité
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                        { icon: MessageSquare, title: "Communication chaotique", desc: "SMS, emails, appels... Impossible de retrouver qui a dit quoi et quand." },
                        { icon: FileText, title: "Documents et information dispersés", desc: "Des heures perdues à chercher le bon document ou la bonne information au bon moment." },
                        { icon: AlertTriangle, title: "Multiples saisies, erreurs et perte d'informations", desc: "Ressaisir les mêmes infos plusieurs fois augmente le risque d'erreurs et de pertes de données critiques." }
                    ].map((item, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm h-full hover:-translate-y-2 hover:bg-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <item.icon className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="landing-h4 text-white mb-3">{item.title}</h3>
                                <p className="landing-body-sm text-white/60">
                                    {item.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* SEIDO Experience Section - Moved here after pain points */}
            <section id="features" className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="landing-h2 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                            Votre centre de commande
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Une plateforme conçue pour vous, le gestionnaire. Reprenez le contrôle de votre temps.
                        </p>
                    </div>
                </FadeIn>

                {/* Gestionnaire Hero Card */}
                <div id="roles" className="mb-16">
                    <FadeIn delay={0}>
                        <div className="relative group rounded-3xl overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                            {/* Gradient glow effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-3xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 md:p-10 bg-[#1e293b]/70 border border-purple-500/30 backdrop-blur-md">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="landing-h3 text-white">Tableau de bord Gestionnaire</h3>
                                        <p className="landing-caption text-purple-300">Tout votre patrimoine en un coup d&apos;œil</p>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <ul className="space-y-3">
                                        <li className="flex items-start landing-body-sm text-white/80">
                                            <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            <span><strong>Centralisez tout</strong> : emails, interventions et documents en un seul endroit</span>
                                        </li>
                                        <li className="flex items-start landing-body-sm text-white/80">
                                            <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            <span><strong>Gagnez 2h par jour</strong> grâce à l&apos;automatisation des tâches</span>
                                        </li>
                                    </ul>
                                    <ul className="space-y-3">
                                        <li className="flex items-start landing-body-sm text-white/80">
                                            <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            <span><strong>Décidez plus vite</strong> avec la comparaison de devis instantanée</span>
                                        </li>
                                        <li className="flex items-start landing-body-sm text-white/80">
                                            <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            <span><strong>Communiquez sans friction</strong> via le chat intégré par intervention</span>
                                        </li>
                                    </ul>
                                    <ul className="space-y-3">
                                        <li className="flex items-start landing-body-sm text-white/80">
                                            <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            <span><strong>Gardez le contrôle</strong> avec vos tableaux de bord en temps réel</span>
                                        </li>
                                        <li className="flex items-start landing-body-sm text-white/80">
                                            <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                            <span><strong>Client email intégré</strong> : synchronisez vos boîtes IMAP/SMTP</span>
                                        </li>
                                    </ul>
                                </div>
                                <p className="mt-6 landing-caption text-white/40">+ 15 autres fonctionnalités incluses</p>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                {/* Portails inclus - Benefit for gestionnaire */}
                <FadeIn delay={100}>
                    <div className="text-center max-w-3xl mx-auto mb-8">
                        <h3 className="landing-h3 text-white mb-3">
                            Des portails dédiés pour vos collaborateurs
                        </h3>
                        <p className="landing-subtitle text-white/60">
                            Quand vos prestataires et locataires sont autonomes, vous gagnez du temps.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Portail Prestataire - Benefice gestionnaire */}
                    <FadeIn delay={150} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-[#1e293b]/50 border border-white/10 backdrop-blur-md h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <Wrench className="w-8 h-8 text-green-400" />
                                    <div>
                                        <h3 className="landing-h4 text-white">Portail Prestataire</h3>
                                        <p className="landing-caption text-green-400/80">Inclus dans votre abonnement</p>
                                    </div>
                                </div>
                                <p className="landing-body-sm text-white/60 mb-5">Vos artisans ont tout ce qu&apos;il faut pour travailler efficacement :</p>
                                <ul className="space-y-3">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Fini les relances</strong> : ils reçoivent les missions avec photos et contexte</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Devis structurés</strong> : vous comparez en un clic sans ressaisir</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Rapports automatiques</strong> : photos et preuves du travail dans le dossier</span>
                                    </li>
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/10">
                                    <p className="landing-caption text-white/40">→ Résultat : moins de coordination, plus de réactivité</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Portail Locataire - Benefice gestionnaire */}
                    <FadeIn delay={250} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-[#1e293b]/50 border border-white/10 backdrop-blur-md h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <Home className="w-8 h-8 text-orange-400" />
                                    <div>
                                        <h3 className="landing-h4 text-white">Portail Locataire</h3>
                                        <p className="landing-caption text-orange-400/80">Inclus dans votre abonnement</p>
                                    </div>
                                </div>
                                <p className="landing-body-sm text-white/60 mb-5">Vos locataires se débrouillent seuls, vous respirez :</p>
                                <ul className="space-y-3">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Demandes structurées</strong> : fini les appels à 18h pour &quot;un truc qui fuit&quot;</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Suivi autonome</strong> : ils ne vous rappellent plus pour savoir où ça en est</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Validation digitale</strong> : clôture de l&apos;intervention en un clic</span>
                                    </li>
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/10">
                                    <p className="landing-caption text-white/40">→ Résultat : locataires satisfaits, moins de sollicitations</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                {/* Technical Features */}
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Zap,
                            title: "Vitesse Éclair",
                            desc: "Interface optimisée pour la productivité. Zéro temps de chargement.",
                            color: "text-yellow-400",
                            bg: "bg-yellow-400/10"
                        },
                        {
                            icon: Shield,
                            title: "Sécurité Maximale",
                            desc: "Données chiffrées, backups automatiques et conformité RGPD.",
                            color: "text-green-400",
                            bg: "bg-green-400/10"
                        },
                        {
                            icon: Globe,
                            title: "Accessible Partout",
                            desc: "Gérez vos biens depuis votre bureau ou en déplacement sur mobile.",
                            color: "text-blue-400",
                            bg: "bg-blue-400/10"
                        }
                    ].map((feature, i) => (
                        <FadeIn key={i} delay={i * 100}>
                            <div className="group p-8 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/10">
                                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="landing-h4 text-white mb-3">{feature.title}</h3>
                                <p className="landing-body text-white/60">
                                    {feature.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* Upcoming Features - Roadmap */}
            <section className="relative z-10 container mx-auto px-4 py-24 bg-[#1e293b]/30">
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>Bientôt disponible</span>
                        </div>
                        <h2 className="landing-h2 mb-6 text-white">
                            Le futur de la gestion immobilière
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Nous construisons l'outil ultime pour les gestionnaires ambitieux. Voici ce qui arrive.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {[
                        {
                            icon: Mail,
                            title: "Email Collaboratif & Actionnable",
                            desc: "Plus qu'une boîte mail : transformez chaque email en tâche, assignez-le à un collaborateur et discutez-en sans quitter l'interface. Fini les 'Re: Re: Re:' interminables.",
                            tags: ["Productivité", "Collaboration"]
                        },
                        {
                            icon: FileText,
                            title: "Suivi Administratif Complet",
                            desc: "Baux, états des lieux, inventaires... Tout est lié. Recevez des alertes pour les échéances, les indexations et les renouvellements. Ne ratez plus aucune date clé.",
                            tags: ["Sérénité", "Juridique"]
                        },
                        {
                            icon: BarChart3,
                            title: "Pilotage Financier 360°",
                            desc: "Connexion bancaire directe, réconciliation automatique des loyers, suivi des dépenses et régularisations de charges en un clic. Votre comptabilité en pilote automatique.",
                            tags: ["Finance", "Automatisation"]
                        }
                    ].map((item, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="relative h-full p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm overflow-hidden group hover:border-purple-500/30 transition-colors duration-300">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                                    <item.icon className="w-24 h-24 text-white rotate-12" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 ring-1 ring-white/20">
                                        <item.icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="landing-h4 text-white mb-4">{item.title}</h3>
                                    <p className="landing-body-sm text-white/60 mb-6 leading-relaxed">
                                        {item.desc}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        {item.tags.map((tag, j) => (
                                            <span key={j} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="landing-h2 text-white mb-4">
                            Comment ça marche ?
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Simple et rapide à mettre en place
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                    {[
                        { step: 1, title: "Créez votre compte", desc: "En 2 minutes, configurez votre espace et ajoutez vos biens." },
                        { step: 2, title: "Invitez vos équipes", desc: "Locataires et prestataires reçoivent leurs accès par email." },
                        { step: 3, title: "Gérez les demandes", desc: "Recevez, assignez et suivez toutes les interventions." },
                        { step: 4, title: "Gagnez du temps", desc: "Automatisation et transparence = moins de stress." }
                    ].map((item, i) => (
                        <FadeIn key={i} delay={i * 150}>
                            <div className="text-center space-y-3 group">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center justify-center text-xl font-bold mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/20">
                                    {item.step}
                                </div>
                                <h3 className="landing-h4 text-white">{item.title}</h3>
                                <p className="landing-body-sm text-white/60">
                                    {item.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* Testimonials - Glass Cards */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="landing-h2 mb-6 text-white">
                            Ils ne reviendraient pas en arrière
                        </h2>
                    </div>
                </FadeIn>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            name: "Thomas D.",
                            role: "Gestionnaire de 450 lots",
                            content: "Seido a divisé par 3 le temps que je passe au téléphone. Mes locataires sont ravis de l'app.",
                            rating: 5
                        },
                        {
                            name: "Sarah L.",
                            role: "Agence Immobilière",
                            content: "L'interface est magnifique et ultra fluide. On sent que c'est pensé pour nous.",
                            rating: 5
                        },
                        {
                            name: "Marc B.",
                            role: "Plombier Partenaire",
                            content: "Enfin des demandes claires avec des photos ! Je valide les devis sur mon mobile entre deux chantiers.",
                            rating: 5
                        }
                    ].map((t, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm h-full hover:bg-white/10 transition-colors">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <Sparkles key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                                <p className="landing-body text-white/80 mb-6 italic">"{t.content}"</p>
                                <div>
                                    <p className="landing-body font-bold text-white">{t.name}</p>
                                    <p className="landing-caption text-white/40">{t.role}</p>
                                </div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* Pricing - Gradient Borders */}
            <section id="pricing" className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="landing-caption font-medium text-green-400">Aucune carte bancaire requise</span>
                        </div>
                        <h2 className="landing-h2 mb-4 text-white">
                            1 mois gratuit pour vous convaincre
                        </h2>
                        <p className="landing-subtitle text-white/60 mb-6">
                            Testez toutes les fonctionnalités sans engagement. Payez uniquement si SEIDO vous fait gagner du temps.
                        </p>

                        {/* Freemium offer */}
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                                <Home className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="text-left">
                                <p className="landing-caption font-semibold text-white">5 biens ou moins ?</p>
                                <p className="landing-caption text-white/60">Gratuit à vie <span className="text-purple-400">(hors IA et API externes)</span></p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Mensuel */}
                    <FadeIn delay={0} className="h-full">
                        <div className="p-8 rounded-3xl border border-white/10 bg-[#1e293b]/50 backdrop-blur-md hover:bg-[#1e293b]/70 transition-colors flex flex-col h-full hover:scale-[1.02] duration-300 relative">
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-white/10 border border-white/20 rounded-full landing-overline text-white/80">
                                Après essai gratuit
                            </div>
                            <h3 className="landing-h3 text-white mb-2 mt-2">Mensuel</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">5€</span>
                                <span className="text-white/60">/lot/mois</span>
                            </div>
                            <ul className="space-y-3 mb-6 flex-grow">
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                                    <span><strong className="text-green-400">1er mois offert</strong></span>
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                                    Sans engagement
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                                    Import CSV inclus
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                                    Toutes les fonctionnalités
                                </li>
                            </ul>
                            <div className="pt-4 border-t border-white/10 mb-6">
                                <p className="landing-caption text-white/50">
                                    Service d&apos;import pro disponible : 500€/jour
                                </p>
                            </div>
                            <Link href="/auth/signup" className="w-full mt-auto">
                                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0 transition-all hover:scale-105">
                                    Démarrer mon essai gratuit
                                </Button>
                            </Link>
                        </div>
                    </FadeIn>

                    {/* Annuel - Glowing */}
                    <FadeIn delay={150} className="h-full">
                        <div className="relative p-8 rounded-3xl bg-[#1e293b]/80 backdrop-blur-md border border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.15)] flex flex-col h-full hover:scale-[1.02] transition-transform duration-300 hover:shadow-[0_0_60px_rgba(168,85,247,0.25)]">
                            {/* Badges */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
                                <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full landing-overline text-white flex items-center justify-center text-center">
                                    Populaire
                                </span>
                                <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full landing-overline text-white animate-pulse flex items-center justify-center text-center whitespace-nowrap">
                                    Import Pro Offert
                                </span>
                            </div>
                            <h3 className="landing-h3 text-white mb-2 mt-2">Annuel</h3>
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-bold text-white">50€</span>
                                <span className="text-white/60">/lot/an</span>
                            </div>
                            <p className="landing-caption text-purple-300 mb-6">Économisez 2 mois</p>

                            {/* Reference to Monthly */}
                            <div className="mb-4 pb-4 border-b border-white/10">
                                <p className="landing-caption text-white/60 flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-purple-400" />
                                    Tout ce qui est inclus dans Mensuel, plus :
                                </p>
                            </div>

                            {/* Exclusive Annual Benefits */}
                            <ul className="space-y-3 mb-6 flex-grow">
                                <li className="flex items-center text-white">
                                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                                    <span><strong>Service d&apos;import pro inclus</strong></span>
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                                    Données connectées et vérifiées
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                                    Priorité support
                                </li>
                            </ul>
                            <div className="pt-4 border-t border-purple-500/30 mb-6">
                                <p className="landing-caption text-purple-300">
                                    Notre équipe migre vos données (valeur jusqu&apos;à 2000€)
                                </p>
                            </div>
                            <Link href="/auth/signup" className="w-full mt-auto">
                                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/25 transition-all hover:scale-105">
                                    Démarrer mon essai gratuit
                                </Button>
                            </Link>
                        </div>
                    </FadeIn>
                </div>

                {/* Section explicative Import */}
                <FadeIn delay={200}>
                    <div className="max-w-4xl mx-auto mt-16 p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <h3 className="landing-h4 text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                            Vos données actuelles ? On s&apos;en occupe.
                        </h3>
                        <p className="landing-body text-white/70 mb-6">
                            Tous les abonnements incluent l&apos;import CSV standard. Mais si vous avez des années de données
                            dans Excel, un ancien logiciel, ou plusieurs sources différentes, notre service d&apos;import
                            professionnel s&apos;occupe de tout :
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <ul className="space-y-2">
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Nettoyage et formatage de vos fichiers
                                </li>
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Connexion automatique entre immeubles, lots et contacts
                                </li>
                            </ul>
                            <ul className="space-y-2">
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Vérification complète avant mise en production
                                </li>
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Zéro doublon, zéro perte de données
                                </li>
                            </ul>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-4 sm:gap-8">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="landing-caption text-white/80"><strong className="text-green-400">Gratuit</strong> avec l&apos;abonnement annuel</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-white/40"></span>
                                <span className="landing-caption text-white/60">500€/jour avec l&apos;abonnement mensuel</span>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </section>

            {/* Contact Section */}
            <section id="contact" className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="landing-h2 text-white mb-4">
                                Contactez-nous
                            </h2>
                            <p className="landing-subtitle text-white/60">
                                Une question ? Notre équipe vous répond sous 24h
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Contact Info */}
                            <div className="h-full flex flex-col gap-6">
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors flex-1">
                                    <Mail className="w-8 h-8 text-purple-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="landing-body font-semibold text-white mb-1">Email</h3>
                                        <a href="mailto:contact@seido-app.com" className="landing-body-sm text-white/60 hover:text-purple-400 transition-colors">
                                            contact@seido-app.com
                                        </a>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors flex-1">
                                    <Clock className="w-8 h-8 text-blue-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="landing-body font-semibold text-white mb-1">Disponibilité</h3>
                                        <p className="landing-body-sm text-white/60">Lundi - Dimanche</p>
                                        <p className="landing-body-sm text-white/60">9h00 - 18h00</p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors flex-1">
                                    <MessageSquare className="w-8 h-8 text-green-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="landing-body font-semibold text-white mb-1">Support</h3>
                                        <p className="landing-body-sm text-white/60">Réponse garantie sous 24h</p>
                                        <p className="landing-body-sm text-white/60">Support 7j/7</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form - Using DemoRequestForm */}
                            <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm h-full">
                                <DemoRequestForm variant="inline" />
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </section>

            {/* FAQ Section */}
            <section className="relative z-10 bg-[#1e293b]/30 py-24">
                <div className="container mx-auto px-4">
                    <FadeIn>
                        <div className="text-center mb-12">
                            <h2 className="landing-h2 text-white mb-4">
                                Questions fréquentes
                            </h2>
                            <p className="landing-subtitle text-white/60 max-w-2xl mx-auto">
                                Tout ce que vous devez savoir sur SEIDO
                            </p>
                        </div>
                    </FadeIn>

                    <div className="max-w-3xl mx-auto">
                        <Accordion type="single" collapsible className="space-y-4">
                            {faq.map((item, i) => (
                                <FadeIn key={item.id} delay={i * 50}>
                                    <AccordionItem
                                        value={`item-${item.id}`}
                                        className="bg-white/5 border border-white/10 rounded-xl px-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
                                    >
                                        <AccordionTrigger className="text-left hover:no-underline py-5">
                                            <span className="landing-body font-semibold text-white pr-4">
                                                {item.question}
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="landing-body-sm text-white/70 pb-5">
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                </FadeIn>
                            ))}
                        </Accordion>
                    </div>

                    <FadeIn delay={200}>
                        <div className="text-center mt-12">
                            <p className="landing-body text-white/60 mb-4">
                                Vous avez d'autres questions ?
                            </p>
                            <a
                                href="mailto:contact@seido-app.com"
                                className="inline-flex items-center gap-2 landing-body text-purple-400 hover:text-purple-300 font-medium transition-colors"
                            >
                                Contactez notre équipe
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 container mx-auto px-4 py-32 text-center">
                <FadeIn>
                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-[100px]" />
                        <h2 className="landing-h1 text-white mb-6 relative z-10">
                            Prêt à passer au niveau supérieur ?
                        </h2>
                        <p className="landing-subtitle text-white/60 mb-4 relative z-10">
                            Rejoignez l&apos;élite des gestionnaires immobiliers dès aujourd&apos;hui.
                        </p>
                        <p className="landing-body text-green-400 mb-10 relative z-10 font-medium">
                            1 mois gratuit, sans engagement, sans carte bancaire
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                            <Link href="/auth/signup">
                                <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    Démarrer mon essai gratuit
                                </Button>
                            </Link>
                        </div>
                    </div>
                </FadeIn>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 bg-[#020617] py-12">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="mb-4">
                                <Image
                                    src="/images/Logo/Logo_Seido_White_1.webp"
                                    alt="SEIDO"
                                    width={120}
                                    height={36}
                                    className="h-9 w-auto"
                                />
                            </div>
                            <p className="landing-caption text-white/40">
                                Plateforme de gestion immobilière moderne
                            </p>
                        </div>

                        <div>
                            <h3 className="landing-body font-semibold text-white mb-3">Produit</h3>
                            <ul className="space-y-2 landing-caption text-white/60">
                                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Sécurité</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="landing-body font-semibold text-white mb-3">Entreprise</h3>
                            <ul className="space-y-2 landing-caption text-white/60">
                                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="landing-body font-semibold text-white mb-3">Légal</h3>
                            <ul className="space-y-2 landing-caption text-white/60">
                                <li><Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
                                <li><Link href="/conditions-generales" className="hover:text-white transition-colors">CGU</Link></li>
                                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 text-center landing-caption text-white/40">
                        <p>© {new Date().getFullYear()} SEIDO. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>

            {/* Demo Request Modal */}
            <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
                <DialogContent className="bg-[#1e293b] border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Demander une démo</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Remplissez ce formulaire et notre équipe vous contactera sous 24h.
                        </DialogDescription>
                    </DialogHeader>
                    <DemoRequestForm
                        variant="modal"
                        onSuccess={() => setShowDemoModal(false)}
                        className="mt-4"
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}
