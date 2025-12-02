'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
    Building2, Users, Wrench, Home,
    CheckCircle2, ArrowRight, Zap, Shield, BarChart3, Mail,
    Sparkles, Globe, Smartphone, Clock, MessageSquare, TrendingUp
} from 'lucide-react'
import { faq } from '@/data/faq'
import { CountUp } from '@/components/ui/count-up'

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

            {/* Navigation Header - Glassmorphism */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f172a]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0f172a]/40">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 blur-lg opacity-50" />
                            <Image
                                src="/images/Logo/Picto_Seido_Color.png"
                                alt="SEIDO"
                                width={40}
                                height={40}
                                className="w-10 h-10 relative z-10"
                            />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">SEIDO</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Fonctionnalités
                        </a>
                        <a href="#roles" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Pour qui ?
                        </a>
                        <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Tarifs
                        </a>
                    </nav>

                    <div className="flex gap-3">
                        <Link href="/auth/login">
                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">Se connecter</Button>
                        </Link>
                        <Link href="/auth/signup">
                            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/25">
                                Commencer <Sparkles className="w-3 h-3 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section - Background Video with Overlay */}
            <section className="relative z-10 min-h-[calc(100vh-73px)] flex items-center justify-start overflow-hidden">
                {/* Background Video */}
                <div className="absolute inset-0 z-0 bg-[#131426]">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain object-right"
                    >
                        <source src="/videos/Image-to-Image-9b0ddc9b.webm" type="video/webm" />
                    </video>
                    {/* Gradient Overlay - Darker on left for text readability, transparent on right to show video */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#131426]/95 via-[#131426]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#131426]/40 via-transparent to-[#131426]/60" />
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-2xl">
                        <FadeIn delay={0}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-8">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-medium text-white/90">La référence des gestionnaires modernes</span>
                            </div>
                        </FadeIn>

                        <FadeIn delay={100}>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8 drop-shadow-2xl">
                                <span className="block text-white">
                                    La gestion locative
                                </span>
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                                    simplifiée
                                </span>
                            </h1>
                        </FadeIn>

                        <FadeIn delay={200}>
                            <p className="text-xl md:text-2xl text-white/90 leading-relaxed mb-10 drop-shadow-lg">
                                Une plateforme intelligente qui connecte gestionnaires, prestataires et locataires.
                                <span className="text-white font-semibold"> Gagnez jusqu'à 2h par jour en optimisant vos tâches opérationnelles.</span>
                            </p>
                        </FadeIn>

                        <FadeIn delay={300}>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/auth/signup">
                                    <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105">
                                        Essai gratuit 1 mois
                                    </Button>
                                </Link>
                                <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-105" onClick={() => setShowDemoModal(true)}>
                                    <Mail className="w-5 h-5 mr-3" />
                                    Demander une démo
                                </Button>
                            </div>
                        </FadeIn>

                        <FadeIn delay={400}>
                            <div className="pt-12 flex items-center gap-6 text-sm text-white/80">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0f172a] bg-gradient-to-br from-gray-600 to-gray-500" />
                                    ))}
                                </div>
                                <p className="font-medium">Rejoint par 500+ gestionnaires</p>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative z-10 container mx-auto px-4 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <FadeIn delay={0}>
                        <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                            <CountUp end={500} suffix="+" />
                        </div>
                        <div className="text-white/60">Gestionnaires</div>
                    </FadeIn>
                    <FadeIn delay={100}>
                        <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                            <CountUp end={15} suffix="k" />
                        </div>
                        <div className="text-white/60">Interventions</div>
                    </FadeIn>
                    <FadeIn delay={200}>
                        <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                            <CountUp end={98} suffix="%" />
                        </div>
                        <div className="text-white/60">Satisfaction</div>
                    </FadeIn>
                    <FadeIn delay={300}>
                        <div className="text-4xl md:text-5xl font-bold text-white mb-2">1h30</div>
                        <div className="text-white/60">Gagnées/jour</div>
                    </FadeIn>
                </div>
            </section>

            {/* Pain Points Section */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Vous reconnaissez-vous ?
                        </h2>
                        <p className="text-lg text-white/60">
                            Les défis quotidiens de la gestion immobilière
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                        { icon: MessageSquare, title: "Communication chaotique", desc: "SMS, emails, appels... Impossible de retrouver qui a dit quoi et quand." },
                        { icon: Clock, title: "Perte de temps monstre", desc: "Des heures perdues à relancer prestataires et locataires pour un simple suivi." },
                        { icon: TrendingUp, title: "Locataires insatisfaits", desc: "Manque de transparence sur l'avancement des interventions = frustration." }
                    ].map((item, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm h-full hover:-translate-y-2 hover:bg-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                                <item.icon className="w-10 h-10 text-red-400 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-white/60">
                                    {item.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* Solution Section */}
            <section className="relative z-10 bg-[#1e293b]/30 py-24">
                <div className="container mx-auto px-4">
                    <FadeIn>
                        <div className="max-w-4xl mx-auto text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                SEIDO centralise tout en un seul endroit
                            </h2>
                            <p className="text-lg text-white/60">
                                Une plateforme unique pour toutes vos interventions
                            </p>
                        </div>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="space-y-4">
                            {[
                                { title: "Demandes centralisées", desc: "Tous vos locataires envoient leurs demandes au même endroit. Fini les emails perdus." },
                                { title: "Coordination automatisée", desc: "Assignez les prestataires, gérez les devis, suivez l'avancement en temps réel." },
                                { title: "Transparence totale", desc: "Locataires et prestataires voient l'état d'avancement. Plus besoin de relancer." }
                            ].map((item, i) => (
                                <FadeIn key={i} delay={i * 100}>
                                    <div className="flex gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors">
                                        <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                            <p className="text-sm text-white/60">{item.desc}</p>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: "Historique complet", desc: "Tous les échanges, documents et factures au même endroit. Audit trail parfait." },
                                { title: "Notifications intelligentes", desc: "Alertes automatiques à chaque étape. Tout le monde reste informé sans effort." },
                                { title: "Reporting simplifié", desc: "Tableaux de bord et statistiques pour piloter votre activité en un coup d'oeil." }
                            ].map((item, i) => (
                                <FadeIn key={i} delay={(i + 3) * 100}>
                                    <div className="flex gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors">
                                        <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                                        <div>
                                            <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                            <p className="text-sm text-white/60">{item.desc}</p>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Comment ça marche ?
                        </h2>
                        <p className="text-lg text-white/60">
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
                                <h3 className="font-semibold text-white">{item.title}</h3>
                                <p className="text-sm text-white/60">
                                    {item.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* Features Grid - Glassmorphism */}
            <section id="features" className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                            Une expérience sans friction
                        </h2>
                        <p className="text-lg text-white/60">
                            Chaque pixel a été pensé pour vous faire gagner du temps.
                        </p>
                    </div>
                </FadeIn>

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
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-white/60 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* Roles Section - Dark Cards */}
            <section id="roles" className="relative z-10 container mx-auto px-4 py-24">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Gestionnaire */}
                    <FadeIn delay={0} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-[#1e293b]/50 border border-white/10 backdrop-blur-md h-full">
                                <Building2 className="w-10 h-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
                                <h3 className="text-2xl font-bold text-white mb-2">Gestionnaire</h3>
                                <p className="text-white/60 mb-6">Pilotez votre parc immobilier avec une vue d'ensemble inégalée.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center text-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2" /> Vue globale portfolio
                                    </li>
                                    <li className="flex items-center text-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2" /> Validation devis en 1 clic
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Prestataire */}
                    <FadeIn delay={150} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-[#1e293b]/50 border border-white/10 backdrop-blur-md h-full">
                                <Wrench className="w-10 h-10 text-green-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
                                <h3 className="text-2xl font-bold text-white mb-2">Prestataire</h3>
                                <p className="text-white/60 mb-6">Recevez des missions claires et facturez plus rapidement.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center text-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" /> Planning digitalisé
                                    </li>
                                    <li className="flex items-center text-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" /> Signature électronique
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Locataire */}
                    <FadeIn delay={300} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-[#1e293b]/50 border border-white/10 backdrop-blur-md h-full">
                                <Home className="w-10 h-10 text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
                                <h3 className="text-2xl font-bold text-white mb-2">Locataire</h3>
                                <p className="text-white/60 mb-6">Une application simple pour se sentir bien chez soi.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center text-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2" /> Signalement photo/vidéo
                                    </li>
                                    <li className="flex items-center text-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2" /> Suivi temps réel
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Testimonials - Glass Cards */}
            <section className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
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
                                <p className="text-white/80 mb-6 italic">"{t.content}"</p>
                                <div>
                                    <p className="font-bold text-white">{t.name}</p>
                                    <p className="text-sm text-white/40">{t.role}</p>
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
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
                            Investissement rentabilisé en 2 jours
                        </h2>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Mensuel */}
                    <FadeIn delay={0} className="h-full">
                        <div className="p-8 rounded-3xl border border-white/10 bg-[#1e293b]/50 backdrop-blur-md hover:bg-[#1e293b]/70 transition-colors flex flex-col h-full hover:scale-[1.02] duration-300">
                            <h3 className="text-2xl font-bold text-white mb-2">Mensuel</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">5€</span>
                                <span className="text-white/60">/lot/mois</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-grow">
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3" /> Sans engagement
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3" /> Tout illimité
                                </li>
                            </ul>
                            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0 mt-auto transition-all hover:scale-105">
                                Choisir Mensuel
                            </Button>
                        </div>
                    </FadeIn>

                    {/* Annuel - Glowing */}
                    <FadeIn delay={150} className="h-full">
                        <div className="relative p-8 rounded-3xl bg-[#1e293b]/80 backdrop-blur-md border border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.15)] flex flex-col h-full hover:scale-[1.02] transition-transform duration-300 hover:shadow-[0_0_60px_rgba(168,85,247,0.25)]">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-xs font-bold text-white uppercase tracking-wider animate-pulse">
                                Populaire
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Annuel</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">50€</span>
                                <span className="text-white/60">/lot/an</span>
                            </div>
                            <p className="text-sm text-purple-300 mb-6">Soit 2 mois offerts</p>
                            <ul className="space-y-4 mb-8 flex-grow">
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3" /> Priorité support
                                </li>
                                <li className="flex items-center text-white/80">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-3" /> Tout illimité
                                </li>
                            </ul>
                            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/25 mt-auto transition-all hover:scale-105">
                                Choisir Annuel
                            </Button>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="relative z-10 container mx-auto px-4 py-24">
                <FadeIn>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Contactez-nous
                            </h2>
                            <p className="text-lg text-white/60">
                                Une question ? Notre équipe vous répond sous 24h
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Contact Info */}
                            <div className="space-y-6 h-full flex flex-col">
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors">
                                    <Mail className="w-8 h-8 text-purple-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Email</h3>
                                        <a href="mailto:contact@seido.pm" className="text-white/60 hover:text-purple-400 transition-colors">
                                            contact@seido.pm
                                        </a>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors">
                                    <Clock className="w-8 h-8 text-blue-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Disponibilité</h3>
                                        <p className="text-white/60">Lundi - Dimanche</p>
                                        <p className="text-white/60">9h00 - 18h00</p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-4 hover:bg-white/10 transition-colors">
                                    <MessageSquare className="w-8 h-8 text-green-400 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Support</h3>
                                        <p className="text-white/60">Réponse garantie sous 24h</p>
                                        <p className="text-white/60">Support 7j/7</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form */}
                            <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm h-full">
                                <form className="space-y-4 h-full flex flex-col" onSubmit={(e) => { e.preventDefault(); alert('Merci ! Nous vous répondrons sous 24h.'); }}>
                                    <div>
                                        <Label htmlFor="contact-name" className="text-white">Nom complet *</Label>
                                        <Input
                                            id="contact-name"
                                            placeholder="Jean Dupont"
                                            required
                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="contact-email" className="text-white">Email *</Label>
                                        <Input
                                            id="contact-email"
                                            type="email"
                                            placeholder="jean@exemple.com"
                                            required
                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="contact-phone" className="text-white">Téléphone</Label>
                                        <Input
                                            id="contact-phone"
                                            type="tel"
                                            placeholder="+32 123 45 67 89"
                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <Label htmlFor="contact-message" className="text-white">Message *</Label>
                                        <Textarea
                                            id="contact-message"
                                            placeholder="Décrivez votre demande..."
                                            required
                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
                                            rows={6}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all hover:scale-105"
                                    >
                                        Envoyer le message
                                    </Button>
                                </form>
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
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Questions fréquentes
                            </h2>
                            <p className="text-lg text-white/60 max-w-2xl mx-auto">
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
                                            <span className="font-semibold text-white pr-4">
                                                {item.question}
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="text-white/70 pb-5 leading-relaxed">
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                </FadeIn>
                            ))}
                        </Accordion>
                    </div>

                    <FadeIn delay={200}>
                        <div className="text-center mt-12">
                            <p className="text-white/60 mb-4">
                                Vous avez d'autres questions ?
                            </p>
                            <a
                                href="mailto:contact@seido.pm"
                                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
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
                        <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 relative z-10">
                            Prêt à passer au niveau supérieur ?
                        </h2>
                        <p className="text-xl text-white/60 mb-10 relative z-10">
                            Rejoignez l'élite des gestionnaires immobiliers dès aujourd'hui.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                            <Link href="/auth/signup">
                                <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    Commencer maintenant
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
                            <div className="flex items-center gap-2 mb-4">
                                <Image
                                    src="/images/Logo/Picto_Seido_Color.png"
                                    alt="SEIDO"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8"
                                />
                                <span className="font-bold text-white">SEIDO</span>
                            </div>
                            <p className="text-sm text-white/40">
                                Plateforme de gestion immobilière moderne
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-3">Produit</h3>
                            <ul className="space-y-2 text-sm text-white/60">
                                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Sécurité</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-3">Entreprise</h3>
                            <ul className="space-y-2 text-sm text-white/60">
                                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-3">Légal</h3>
                            <ul className="space-y-2 text-sm text-white/60">
                                <li><a href="#" className="hover:text-white transition-colors">Confidentialité</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">CGU</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 text-center text-sm text-white/40">
                        <p>© {new Date().getFullYear()} SEIDO. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>

            {/* Demo Request Modal */}
            <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
                <DialogContent className="bg-[#1e293b] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Demander une démo</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Remplissez ce formulaire et notre équipe vous contactera sous 24h.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4 mt-4" onSubmit={(e) => { e.preventDefault(); setShowDemoModal(false); }}>
                        <div>
                            <Label htmlFor="name" className="text-white">Nom complet</Label>
                            <Input id="name" placeholder="Jean Dupont" required className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                        </div>
                        <div>
                            <Label htmlFor="email" className="text-white">Email professionnel</Label>
                            <Input id="email" type="email" placeholder="jean@exemple.com" required className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                        </div>
                        <div>
                            <Label htmlFor="company" className="text-white">Société</Label>
                            <Input id="company" placeholder="Nom de votre agence" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                        </div>
                        <div>
                            <Label htmlFor="lots" className="text-white">Nombre de lots gérés</Label>
                            <Input id="lots" type="number" placeholder="50" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                        </div>
                        <div>
                            <Label htmlFor="message" className="text-white">Message (optionnel)</Label>
                            <Textarea id="message" placeholder="Parlez-nous de vos besoins..." className="bg-white/10 border-white/20 text-white placeholder:text-white/40" rows={3} />
                        </div>
                        <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500">
                            Envoyer la demande
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
