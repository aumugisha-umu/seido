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
    const [isVisible, setIsVisible] = useState(true)
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
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[100px]" />
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
                        preload="none"
                        className="w-full h-full object-cover"
                    >
                        <source src="/videos/hero-video.webm" type="video/webm" />
                    </video>
                    {/* Gradient Overlay - Darker on left for text readability, transparent on right to show video */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#131426]/95 via-[#131426]/70 md:via-[#131426]/60 to-[#131426]/80 md:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#131426]/40 via-transparent to-[#131426]/60" />
                </div>

                <div className="container mx-auto px-4 py-12 md:py-0 relative z-10">
                    <div className="w-full lg:w-6/10">

                        <h1 className="landing-display mb-6 md:mb-8 drop-shadow-2xl">
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 dark:from-blue-400 dark:via-sky-400 dark:to-cyan-300">
                                La sérénité retrouvée
                            </span>
                            <span className="block text-white">
                                pour les gestionnaires immobiliers
                            </span>
                        </h1>

                        <FadeIn delay={200}>
                            <p className="landing-subtitle text-white/90 mb-6 md:mb-8 drop-shadow-lg max-w-2xl">
                                Grâce au suivi des interventions techniques sur une plateforme unique : <span className="font-bold">demandes</span>, <span className="font-bold">devis</span>, <span className="font-bold">planning</span>, <span className="font-bold">photos</span> et <span className="font-bold">factures</span>, collaborez avec vos locataires et prestataires pour plus de transparence, plus d'efficacité, et moins de relances.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-8 md:mb-10 max-w-2xl">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                                    <CheckCircle2 className="h-4 w-4 text-blue-300" />
                                    <span className="landing-caption text-white/80">Traçabilité complète</span>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                                    <CheckCircle2 className="h-4 w-4 text-blue-300" />
                                    <span className="landing-caption text-white/80">Suivi temps réel</span>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                                    <CheckCircle2 className="h-4 w-4 text-blue-300" />
                                    <span className="landing-caption text-white/80">Moins d’appels & relances</span>
                                </div>
                            </div>
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
                    </div>
                </div>
            </section>

            {/* Combined Problem Section: Costs & Causes */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                {/* Part 1: The Hidden Costs */}
                <FadeIn>
                    <div className="text-center mb-12">
                        <h2 className="landing-h2 text-white mb-4">
                            Le vrai coût du mode pompier
                        </h2>
                    </div>
                </FadeIn >

                <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
                    <FadeIn delay={0}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={40} suffix="%" />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de temps perdu sur des urgences techniques</div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={100}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={36000} suffix="€" separator=" " />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de coûts cachés par gestionnaire / an</div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={200}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={360} suffix="€" />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de pertes évitables par bien / an</div>
                        </div>
                    </FadeIn>
                </div>

                <FadeIn delay={300}>
                    <p className="text-center landing-caption text-white/40 max-w-2xl mx-auto italic mb-16">
                        Sur base d'un gestionnaire avec 100 biens en gestion et un taux horaire brut de 45€ (moyenne belge)
                    </p>
                </FadeIn>

                {/* Part 2: The Causes (Pain Points) */}
                <FadeIn>
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="landing-h2 text-white mb-4">
                            Là où ça se casse toujours
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Trois scénarios qui reviennent en boucle.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                        { icon: MessageSquare, title: "Téléphone arabe", desc: "L’info circule mal, les délais explosent." },
                        { icon: AlertTriangle, title: "Trou noir", desc: "Après l’ordre: plus de visibilité." },
                        { icon: FileText, title: "Jungle admin", desc: "Devis, photos, factures dispersés." }
                    ].map((item, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm h-full hover:-translate-y-2 hover:bg-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
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
            </section >

            {/* SEIDO Experience Section - Moved here after pain points */}
            < section id="features" className="relative z-10 container mx-auto px-4 py-24" >
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="landing-h2 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                            Votre centre de contrôle
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Interventions pilotées en temps réel, avec historique et preuves au même endroit.
                        </p>
                    </div>
                </FadeIn>

                {/* Gestionnaire Hero Card */}
                <div id="roles" className="mb-16">
                    <FadeIn delay={0}>
                        <div className="relative group rounded-3xl overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                            {/* Gradient glow effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 rounded-3xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 md:p-10 bg-[#1e293b]/70 border border-blue-500/30 backdrop-blur-md">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="landing-h3 text-white">Vos interventions sous haute surveillance</h3>
                                        <p className="landing-caption text-blue-300">Moins de suivi, plus de contrôle</p>
                                    </div>
                                </div>
                                <ul className="grid md:grid-cols-3 gap-4">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Traçabilité totale</strong> : demande → intervention → facture.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Devis simplifiés</strong> : demander, comparer, valider.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Alertes utiles</strong> : uniquement quand une action est requise.</span>
                                    </li>
                                </ul>
                                <p className="mt-6 landing-caption text-white/40">+ tableaux de bord, relances, chat, pilotage prestataires…</p>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                {/* Portails inclus - Benefit for gestionnaire */}
                <FadeIn delay={100}>
                    <div className="text-center max-w-3xl mx-auto mb-8">
                        <h3 className="landing-h3 text-white mb-3">
                            Déléguez sans perdre le contrôle
                        </h3>
                        <p className="landing-subtitle text-white/60">
                            Chacun fait sa part. Vous gardez la visibilité.
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
                                        <h3 className="landing-h4 text-white">Le Portail Prestataire</h3>
                                        <p className="landing-caption text-green-400/80">Ils s'auto-gèrent, vous validez</p>
                                    </div>
                                </div>
                                <p className="landing-body-sm text-white/60 mb-5">Des interventions claires, côté terrain.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>RDV autonome</strong> avec le locataire.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Rapport terrain</strong> (photos avant/après).</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Facture au bon dossier</strong>, automatiquement.</span>
                                    </li>
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/10">
                                    <p className="landing-caption text-white/40">→ Moins d’allers-retours et de relances</p>
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
                                        <h3 className="landing-h4 text-white">Le Portail Locataire</h3>
                                        <p className="landing-caption text-orange-400/80">Responsabilisez vos occupants</p>
                                    </div>
                                </div>
                                <p className="landing-body-sm text-white/60 mb-5">Des demandes plus claires, moins de friction.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Signalement guidé</strong> (+ photos).</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Suivi “type colis”</strong> : statut clair.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Validation de fin</strong> : vous savez que c’est réglé.</span>
                                    </li>
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/10">
                                    <p className="landing-caption text-white/40">→ Locataires rassurés, moins de conflits</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                {/* Un seul outil pour tout */}
                <FadeIn delay={300}>
                    <div className="text-center max-w-3xl mx-auto mt-16 mb-12">
                        <h3 className="landing-h3 text-white mb-3">
                            Pensé pour vous faciliter la vie
                        </h3>
                        <p className="landing-body text-white/60">
                            Simple à déployer. Facile à suivre. Conçu pour le terrain.
                        </p>
                    </div>
                </FadeIn>

                {/* Technical Features */}
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Zap,
                            title: "Mise en place immédiate",
                            desc: "Créez vos immeubles, invitez, commencez.",
                            color: "text-yellow-400",
                            bg: "bg-yellow-400/10"
                        },
                        {
                            icon: Shield,
                            title: "Preuves & Historique",
                            desc: "Photos, échanges, validations horodatées.",
                            color: "text-green-400",
                            bg: "bg-green-400/10"
                        },
                        {
                            icon: Smartphone,
                            title: "Mobile First",
                            desc: "Tout dans la poche, partout.",
                            color: "text-blue-400",
                            bg: "bg-blue-400/10"
                        }
                    ].map((feature, i) => (
                        <FadeIn key={i} delay={i * 100}>
                            <div className="group p-8 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
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

                {/* Section explicative Import */}
                <FadeIn delay={200}>
                    <div className="max-w-4xl mx-auto mt-16 p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <h3 className="landing-h4 text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            Vos données actuelles ? On s'en occupe.
                        </h3>
                        <p className="landing-body text-white/70 mb-6">
                            Import CSV inclus. Pour les données complexes (Excel / ancien logiciel), on gère la migration.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <ul className="space-y-2">
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Nettoyage & formatage
                                </li>
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Liens immeubles / lots / contacts
                                </li>
                            </ul>
                            <ul className="space-y-2">
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Vérification avant mise en prod
                                </li>
                                <li className="flex items-start landing-caption text-white/80">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                    Zéro doublon, zéro perte
                                </li>
                            </ul>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-4 sm:gap-8">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="landing-caption text-white/80"><strong className="text-green-400">Gratuit</strong> avec l'abonnement annuel</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-white/40"></span>
                                <span className="landing-caption text-white/60">De 500€ à 2000€ selon la taille et la complexité des données</span>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </section >

            {/* Upcoming Features - Roadmap */}
            < section className="relative z-10 container mx-auto px-4 py-24 bg-[#1e293b]/30" >
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>Vision</span>
                        </div>
                        <h2 className="landing-h2 mb-6 text-white">
                            Aujourd'hui l'opérationnel, demain tout le reste
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            On commence par le plus douloureux : les interventions. Puis on étend au reste du patrimoine.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {[
                        {
                            icon: Mail,
                            title: "Inbox Unifiée",
                            desc: "Chaque email devient une action, assignée et suivie.",
                            tags: ["Bientôt", "Collaboration"]
                        },
                        {
                            icon: FileText,
                            title: "Gestion Administrative",
                            desc: "Baux & documents liés aux biens, avec alertes.",
                            tags: ["Bientôt", "Juridique"]
                        },
                        {
                            icon: BarChart3,
                            title: "Pilotage Financier",
                            desc: "Loyers, charges, réconciliation : vue claire et actionnable.",
                            tags: ["Bientôt", "Finance"]
                        }
                    ].map((item, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="relative h-full p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm overflow-hidden group hover:border-blue-500/30 transition-colors duration-300 flex flex-col">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                                    <item.icon className="w-24 h-24 text-white rotate-12" />
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
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
            </section >



            {/* Testimonials - Glass Cards */}
            < section className="relative z-10 container mx-auto px-4 py-24" >
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
                            content: "Moins d’appels, plus de visibilité. Mes locataires adorent.",
                            rating: 5
                        },
                        {
                            name: "Sarah L.",
                            role: "Agence Immobilière",
                            content: "Simple, fluide, et vraiment pensé pour le terrain.",
                            rating: 5
                        },
                        {
                            name: "Marc B.",
                            role: "Plombier Partenaire",
                            content: "Demandes claires avec photos. Tout sur mobile.",
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
            </section >

            {/* Pricing - Gradient Borders */}
            < section id="pricing" className="relative z-10 container mx-auto px-4 py-24" >
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
                            Testez tout, sans engagement. Continuez seulement si ça vous fait gagner du temps.
                        </p>

                        {/* Freemium offer */}
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-blue-500/20">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20">
                                <Home className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="text-left">
                                <p className="landing-caption font-semibold text-white">5 biens ou moins ?</p>
                                <p className="landing-caption text-white/60">Gratuit à vie <span className="text-blue-400">(hors IA et API externes)</span></p>
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
                            </ul>
                            <div className="pt-4 border-t border-white/10 mb-6">
                                <p className="landing-caption text-white/50">
                                    Service d'import pro disponible : 500€/jour
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
                        <div className="relative p-8 rounded-3xl bg-[#1e293b]/80 backdrop-blur-md border border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col h-full hover:scale-[1.02] transition-transform duration-300 hover:shadow-[0_0_60px_rgba(59,130,246,0.25)]">
                            {/* Badges */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
                                <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full landing-overline text-white flex items-center justify-center text-center">
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
                            <p className="landing-caption text-blue-300 mb-6">Économisez 2 mois</p>

                            {/* Reference to Monthly */}
                            <div className="mb-4 pb-4 border-b border-white/10">
                                <p className="landing-caption text-white/60 flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-blue-400" />
                                    Inclus (Annuel) :
                                </p>
                            </div>

                            {/* Exclusive Annual Benefits */}
                            <ul className="space-y-3 mb-6 flex-grow">
                                <li className="flex items-center text-white">
                                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0" />
                                    <span><strong>Service d'import pro inclus</strong></span>
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0" />
                                    Données connectées & vérifiées
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0" />
                                    Priorité support
                                </li>
                            </ul>
                            <div className="pt-4 border-t border-blue-500/30 mb-6">
                                <p className="landing-caption text-blue-300">
                                    Notre équipe migre vos données (valeur jusqu'à 2000€)
                                </p>
                            </div>
                            <Link href="/auth/signup" className="w-full mt-auto">
                                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-0 shadow-lg shadow-blue-500/25 transition-all hover:scale-105">
                                    Démarrer mon essai gratuit
                                </Button>
                            </Link>
                        </div>
                    </FadeIn>
                </div>


            </section >

            {/* Contact Section */}
            < section id="contact" className="relative z-10 container mx-auto px-4 py-24" >
                <FadeIn>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="landing-h2 text-white mb-4">
                                Contactez-nous
                            </h2>
                            <p className="landing-subtitle text-white/60">
                                Une question ? Réponse sous 24h.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Contact Info */}
                            <div className="h-full flex flex-col gap-6">
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors flex-1">
                                    <Mail className="w-8 h-8 text-blue-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="landing-body font-semibold text-white mb-1">Email</h3>
                                        <a href="mailto:contact@seido-app.com" className="landing-body-sm text-white/60 hover:text-blue-400 transition-colors">
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
            </section >

            {/* FAQ Section */}
            < section id="faq" className="relative z-10 bg-[#1e293b]/30 py-24" >
                <div className="container mx-auto px-4">
                    <FadeIn>
                        <div className="text-center mb-12">
                            <h2 className="landing-h2 text-white mb-4">
                                Questions fréquentes
                            </h2>
                            <p className="landing-subtitle text-white/60 max-w-2xl mx-auto">
                                Les réponses aux questions les plus fréquentes.
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
            </section >

            {/* CTA Section */}
            < section className="relative z-10 container mx-auto px-4 py-32 text-center" >
                <FadeIn>
                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-[100px]" />
                        <h2 className="landing-h1 text-white mb-6 relative z-10">
                            Prêt à reprendre le contrôle ?
                        </h2>
                        <p className="landing-subtitle text-white/60 mb-4 relative z-10">
                            Démarrez en quelques minutes.
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
            </section >

            {/* Footer */}
            < footer className="relative z-10 border-t border-white/10 bg-[#020617] py-12" >
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="mb-4">
                                <Image
                                    src="/images/Logo/Logo_Seido_White_1.webp"
                                    alt="SEIDO"
                                    width={96}
                                    height={36}
                                    sizes="96px"
                                    className="h-9 w-auto"
                                />
                            </div>
                            <p className="landing-caption text-white/40 mb-4">
                                Interventions maîtrisées. Gestion simplifiée.
                            </p>
                            <p className="landing-caption text-white/40 text-xs">
                                © {new Date().getFullYear()} SEIDO. Tous droits réservés.
                            </p>
                        </div>


                        <div> </div>


                        <div>
                            <h3 className="landing-body font-semibold text-white mb-3">Produit</h3>
                            <ul className="space-y-2 landing-caption text-white/60">
                                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
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
                </div>
            </footer >

            {/* Demo Request Modal */}
            < Dialog open={showDemoModal} onOpenChange={setShowDemoModal} >
                <DialogContent className="bg-[#1e293b] border-white/10 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Demander une démo</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Laissez vos infos. Réponse sous 24h.
                        </DialogDescription>
                    </DialogHeader>
                    <DemoRequestForm
                        variant="modal"
                        onSuccess={() => setShowDemoModal(false)}
                        className="mt-4"
                    />
                </DialogContent>
            </Dialog >
        </div >
    )
}
