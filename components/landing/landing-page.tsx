'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
    Building2, Wrench, Home,
    CheckCircle2, ArrowRight, Zap, Shield, BarChart3, Mail,
    Sparkles, Smartphone, Clock, MessageSquare, TrendingUp,
    FileText, AlertTriangle, Linkedin,
    Phone, Search, Send, RefreshCw, RotateCcw
} from 'lucide-react'
import { faq } from '@/data/faq'
import { CountUp } from '@/components/ui/count-up'
import { Slider } from '@/components/ui/slider'
import { DemoRequestForm } from './demo-request-form'
import { LandingHeader } from './landing-header'
import { PricingCards } from '@/components/pricing-cards'
import { BlogArticleCard } from '@/components/blog/blog-article-card'
const TestimonialsSection = dynamic(
    () => import('./sections/testimonials-section').then(mod => ({ default: mod.TestimonialsSection })),
    { loading: () => <div className="py-16 md:py-24"><div className="container mx-auto px-4 text-center"><div className="h-8 w-64 mx-auto bg-white/5 rounded animate-pulse mb-8" /><div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />)}</div></div></div> }
)
import type { ArticleMeta } from '@/lib/blog'

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
            { threshold: 0.1, rootMargin: '50px' }
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

interface LandingPageProps {
    latestArticles?: ArticleMeta[]
}

export function LandingPage({ latestArticles = [] }: LandingPageProps) {
    const [showDemoModal, setShowDemoModal] = useState(false)
    const [lotCount, setLotCount] = useState(3)

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500 selection:text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Navigation Header - Shared Component */}
            <LandingHeader showNav={true} />

            <main>
            {/* Hero Section - Background Video with Overlay */}
            <section className="relative z-10 min-h-[600px] md:min-h-[calc(100vh-73px)] flex items-center justify-start overflow-hidden">
                {/* Background Video - Desktop only, Image on mobile */}
                <div className="absolute inset-0 z-0 bg-slate-950">
                    {/* Mobile: Static gradient background */}
                    <div className="block md:hidden absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
                    
                    {/* Desktop: Video background */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="none"
                        poster="/images/preview_image.webp"
                        className="hidden md:block w-full h-full object-cover"
                    >
                        <source src="/videos/hero-video.webm" type="video/webm" />
                    </video>
                    
                    {/* Gradient Overlay - Darker on left for text readability, transparent on right to show video */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 md:via-slate-950/60 to-slate-950/80 md:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60" />
                </div>

                <div className="container mx-auto px-4 py-12 md:py-0 relative z-10">
                    <div className="w-full lg:w-6/10">

                        <h1 className="landing-display mb-6 md:mb-8 drop-shadow-2xl">
                            <span className="block text-white">
                                La gestion locative
                            </span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 dark:from-blue-400 dark:via-sky-400 dark:to-cyan-300">
                                en toute sérénité
                            </span>
                        </h1>

                        <p className="landing-subtitle text-white/90 mb-6 md:mb-8 drop-shadow-lg max-w-2xl">
                            Chaque demande déclenche une boucle qui prenait des jours à terminer. <br/> SEIDO centralise et automatise, vous décidez en quelques clics.<br/><span className="font-bold">De 10h à 1h par personne, par semaine.</span>
                        </p>
                        

                        <div className="flex flex-col sm:flex-row gap-4 mb-4 md:mb-6 max-w-2xl">
                            <Link href="/auth/signup">
                                <Button size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 text-base md:text-lg bg-white text-black hover:bg-white/90 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105">
                                    Essayer gratuitement
                                </Button>
                            </Link>
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 text-base md:text-lg border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-105"
                                onClick={() => setShowDemoModal(true)}
                            >
                                <Mail className="w-4 md:w-5 h-4 md:h-5 mr-2 md:mr-3" />
                                Voir SEIDO en action
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-8 md:mb-10 max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                                <CheckCircle2 className="h-4 w-4 text-blue-300" />
                                <span className="landing-caption text-white/80">Import excel/csv</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                                <CheckCircle2 className="h-4 w-4 text-blue-300" />
                                <span className="landing-caption text-white/80">Zéro formation requise</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                                <CheckCircle2 className="h-4 w-4 text-blue-300" />
                                <span className="landing-caption text-white/80">Portail locataires et prestataires</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Combined Problem Section: Costs & Causes */}
            <section className="relative z-10 container mx-auto px-4 py-24" aria-labelledby="heading-problem">
                {/* Part 1: The Hidden Costs */}
                <FadeIn>
                    <div className="text-center mb-12">
                        <h2 id="heading-problem" className="landing-h2 text-white mb-4">
                            Le vrai coût des boucles mal gérées
                        </h2>
                    </div>
                </FadeIn >

                <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
                    <FadeIn delay={0}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={40} suffix="%" />
                            </div>
                            <div className="landing-body text-white/80 font-medium">de votre temps <strong>englouti</strong> par les urgences</div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={100}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={36000} suffix="€" separator=" " />
                            </div>
                            <div className="landing-body text-white/80 font-medium"><strong>partis en fumée</strong> chaque année</div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={200}>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                            <div className="landing-h1 text-red-400 mb-2">
                                <CountUp end={2} suffix="h" />
                            </div>
                            <div className="landing-body text-white/80 font-medium"><strong>récupérables par jour</strong> avec le bon outil</div>
                        </div>
                    </FadeIn>
                </div>

                <FadeIn delay={300}>
                    <p className="text-center text-sm leading-relaxed text-white/40 max-w-2xl mx-auto italic mb-16">
                        Sur base d'un gestionnaire avec 100 biens en gestion et un taux horaire brut de 45€ (moyenne belge, source Federia/IPI)
                    </p>
                </FadeIn>

                {/* Part 2: The Causes (Pain Points) */}
                <FadeIn>
                    <div className="max-w-4xl mx-auto text-center mb-12">
                        <h2 className="landing-h2 text-white mb-4">
                            Le même schéma, en boucle, chaque jour
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Appel, email, WhatsApp — puis la recherche commence.
                        </p>
                    </div>
                </FadeIn>

                {/* Loop Flow Diagram */}
                {(() => {
                    const loopSteps = [
                        { icon: Phone, label: 'Déclencheur', sublabel: 'Appel / email / WhatsApp' },
                        { icon: Search, label: 'Recherche', sublabel: "Où est l'info ?" },
                        { icon: Send, label: 'Transmission', sublabel: 'Vous transmettez' },
                        { icon: Clock, label: 'Attente', sublabel: 'Silence radio' },
                        { icon: RefreshCw, label: 'Relance', sublabel: 'Vous relancez' },
                        { icon: RotateCcw, label: 'Recommence', sublabel: 'Retour case départ' },
                    ]
                    const isPain = (i: number) => i >= 3
                    return (
                        <div className="max-w-5xl mx-auto">
                            {/* Desktop: horizontal flow */}
                            <FadeIn>
                                <div className="hidden md:block">
                                    {/* Steps row */}
                                    <div className="flex items-start justify-between gap-2">
                                        {loopSteps.map((step, i) => (
                                            <div key={i} className="flex items-start flex-1">
                                                {/* Step */}
                                                <div className="flex flex-col items-center text-center flex-1">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${isPain(i) ? 'bg-red-500/15 border border-red-500/30' : 'bg-white/10 border border-white/10'}`}>
                                                        <step.icon className={`w-6 h-6 ${isPain(i) ? 'text-red-400' : 'text-white/70'}`} />
                                                    </div>
                                                    <span className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isPain(i) ? 'text-red-400' : 'text-white/80'}`}>
                                                        {step.label}
                                                    </span>
                                                    <span className="text-xs text-white/40">{step.sublabel}</span>
                                                </div>
                                                {/* Connector */}
                                                {i < loopSteps.length - 1 && (
                                                    <div className="flex items-center pt-6 -mx-1">
                                                        <div className={`w-6 border-t-2 border-dashed ${isPain(i + 1) ? 'border-red-500/40' : 'border-white/20'}`} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Return arc below */}
                                    <div className="relative mx-8 mt-4 mb-2">
                                        <div className="h-10 border-b-2 border-l-2 border-r-2 border-dashed border-red-500/40 rounded-b-3xl" />
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30">
                                            <span className="text-xs font-bold text-red-400">× 50 fois par jour</span>
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>

                            {/* Mobile: vertical flow */}
                            <FadeIn>
                                <div className="md:hidden">
                                    <div className="relative pl-10">
                                        {/* Vertical rail */}
                                        <div className="absolute left-4 top-0 bottom-16 w-0.5 bg-gradient-to-b from-white/20 via-white/20 to-red-500/40" />
                                        {loopSteps.map((step, i) => (
                                            <div key={i} className="relative flex items-start gap-4 mb-6">
                                                {/* Node on rail */}
                                                <div className={`absolute -left-6 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPain(i) ? 'bg-red-500/15 border border-red-500/30' : 'bg-white/10 border border-white/10'}`}>
                                                    <step.icon className={`w-5 h-5 ${isPain(i) ? 'text-red-400' : 'text-white/70'}`} />
                                                </div>
                                                {/* Text */}
                                                <div className="pt-1">
                                                    <span className={`text-sm font-semibold ${isPain(i) ? 'text-red-400' : 'text-white/80'}`}>
                                                        {step.label}
                                                    </span>
                                                    <span className="text-xs text-white/40 ml-2">{step.sublabel}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Return arc */}
                                        <div className="relative -left-6 mt-2 mb-2">
                                            <div className="w-10 h-8 border-b-2 border-l-2 border-dashed border-red-500/40 rounded-bl-2xl" />
                                            <div className="mt-2 inline-block px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30">
                                                <span className="text-xs font-bold text-red-400">× 50 fois par jour</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
                    )
                })()}
            </section >

            {/* SEIDO Experience Section - Moved here after pain points */}
            < section id="features" className="relative z-10 container mx-auto px-4 py-24" aria-labelledby="heading-features" >
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 id="heading-features" className="landing-h2 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                            Chaque étape de la boucle, court-circuitée
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Recherche, transmission, attente, relance — SEIDO les élimine une par une. Voici comment.
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
                            <div className="relative p-8 md:p-10 bg-slate-800/70 border border-blue-500/30 backdrop-blur-md">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="landing-h3 text-white">Fini la recherche. Fini l&apos;attente.</h3>
                                        <p className="text-sm leading-relaxed text-blue-300">L&apos;info est là avant même que vous la cherchiez.</p>
                                    </div>
                                </div>
                                <ul className="grid md:grid-cols-3 gap-4">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong className="line-through text-red-400/60 mr-1">Recherche</strong> <strong>→ Timeline complète</strong> — tout l&apos;historique au même endroit, sans fouiller.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong className="line-through text-red-400/60 mr-1">Attente</strong> <strong>→ Alertes intelligentes</strong> — notifié quand c&apos;est urgent, silence sinon.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong className="line-through text-red-400/60 mr-1">Relance</strong> <strong>→ Devis en 2 clics</strong> — demander, comparer, valider. Sans email.</span>
                                    </li>
                                </ul>
                                <p className="mt-6 text-sm leading-relaxed text-white/40">+ tableaux de bord, chat intégré, pilotage prestataires — chaque boucle se ferme en quelques clics.</p>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                {/* Portails inclus - Benefit for gestionnaire */}
                <FadeIn delay={100}>
                    <div className="text-center max-w-3xl mx-auto mb-8">
                        <h3 className="landing-h3 text-white mb-3">
                            Chacun coupe sa part de la boucle
                        </h3>
                        <p className="landing-subtitle text-white/60">
                            Le prestataire met à jour. Le locataire suit. Vous n&apos;avez plus à relayer.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Portail Prestataire - Benefice gestionnaire */}
                    <FadeIn delay={150} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-slate-800/50 border border-white/10 backdrop-blur-md h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <Wrench className="w-8 h-8 text-green-400" />
                                    <div>
                                        <h3 className="landing-h4 text-white">Le Portail Prestataire</h3>
                                        <p className="text-sm leading-relaxed text-green-400/80">Coupe les étapes 3 à 5 : transmission, attente, relance.</p>
                                    </div>
                                </div>
                                <p className="landing-body-sm text-white/60 mb-5">Le prestataire agit et met à jour — vous n&apos;êtes plus le relais.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>RDV autonome</strong> avec le locataire — sans passer par vous.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Rapport terrain</strong> (photos avant/après) — la mise à jour arrive toute seule.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Facture au bon dossier</strong> — plus de "c&apos;est pour quel bien déjà ?".</span>
                                    </li>
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/10">
                                    <p className="text-sm leading-relaxed text-white/40">→ Vous ne transmettez plus, vous ne relancez plus</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Portail Locataire - Benefice gestionnaire */}
                    <FadeIn delay={250} className="h-full">
                        <div className="relative group rounded-3xl overflow-hidden h-full hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-8 bg-slate-800/50 border border-white/10 backdrop-blur-md h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <Home className="w-8 h-8 text-orange-400" />
                                    <div>
                                        <h3 className="landing-h4 text-white">Le Portail Locataire</h3>
                                        <p className="text-sm leading-relaxed text-orange-400/80">Coupe les étapes 1 et 6 : le déclencheur est structuré, plus de recommencement.</p>
                                    </div>
                                </div>
                                <p className="landing-body-sm text-white/60 mb-5">Le locataire signale proprement et suit tout seul — il n&apos;a plus besoin de rappeler.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Signalement guidé</strong> (+ photos) — un déclencheur propre remplace l&apos;appel chaotique.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Suivi &quot;type colis&quot;</strong> — le locataire voit le statut, il arrête de rappeler.</span>
                                    </li>
                                    <li className="flex items-start landing-body-sm text-white/80">
                                        <CheckCircle2 className="w-4 h-4 text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <span><strong>Validation de fin</strong> — la boucle se ferme. Pas de &quot;retour case départ&quot;.</span>
                                    </li>
                                </ul>
                                <div className="mt-5 pt-4 border-t border-white/10">
                                    <p className="text-sm leading-relaxed text-white/40">→ Plus de cycle : signaler → résolu, point final</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                {/* Un seul outil pour tout */}
                <FadeIn delay={300}>
                    <div className="text-center max-w-3xl mx-auto mt-16 mb-12">
                        <h3 className="landing-h3 text-white mb-3">
                            Ce qui rend la coupure possible
                        </h3>
                        <p className="landing-body text-white/60">
                            Pas de formation. Pas de migration complexe. Vous coupez la boucle dès le premier jour.
                        </p>
                    </div>
                </FadeIn>

                {/* Technical Features */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            icon: Zap,
                            title: "Opérationnel ce soir",
                            desc: "Import CSV, invitations en masse. La boucle se coupe dès demain.",
                            color: "text-yellow-400",
                            bg: "bg-yellow-400/10"
                        },
                        {
                            icon: Shield,
                            title: "Preuve béton",
                            desc: "Photo + date + heure + qui. Plus besoin de reconstituer l'historique.",
                            color: "text-green-400",
                            bg: "bg-green-400/10"
                        },
                        {
                            icon: Smartphone,
                            title: "Bureau dans la poche",
                            desc: "Validez un devis depuis n'importe où. La boucle n'attend plus votre bureau.",
                            color: "text-blue-400",
                            bg: "bg-blue-400/10"
                        },
                        {
                            icon: Mail,
                            title: "Emails connectés",
                            desc: "Vos emails rattachés aux biens. Fini les recherches dans 4 boîtes différentes.",
                            color: "text-purple-400",
                            bg: "bg-purple-400/10"
                        }
                    ].map((feature, i) => (
                        <FadeIn key={i} delay={i * 100} className="h-full">
                            <div className="group h-full p-8 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
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
                            Import CSV inclus. Pour les données complexes (Excel, Smovin, Rentila, ou autre logiciel), on gère la migration. Conforme RGPD (APD belge).
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
            < section className="relative z-10 container mx-auto px-4 py-24 bg-slate-800/30" aria-labelledby="heading-roadmap" >
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            <span>Vision</span>
                        </div>
                        <h2 id="heading-roadmap" className="landing-h2 mb-6 text-white">
                            Une plateforme qui évolue avec vous
                        </h2>
                        <p className="landing-subtitle text-white/60">
                            Chaque étape raccourcit vos boucles. Jusqu&apos;à ce qu&apos;elles se ferment presque toutes seules.
                        </p>
                    </div>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {[
                        {
                            icon: Building2,
                            title: "Centraliser",
                            desc: "Toutes vos données, documents et interactions sur une seule plateforme. Recherche instantanée. Transfert en quelques clics.",
                            tags: ["Disponible"],
                            tagStyle: "bg-green-500/10 border-green-500/20 text-green-400"
                        },
                        {
                            icon: Zap,
                            title: "Automatiser",
                            desc: "Notifications intelligentes, rappels d'échéances, alertes de retard. Tout ce qui est prévisible est automatisé.",
                            tags: ["En cours"],
                            tagStyle: "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        },
                        {
                            icon: Sparkles,
                            title: "Anticiper",
                            desc: "Plus notre système apprend de vos habitudes, plus il vous libère du temps. Chaque boucle traitée rend la suivante plus rapide.",
                            tags: ["Bientôt"],
                            tagStyle: "bg-white/5 border-white/10 text-white/40"
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
                                            <span key={j} className={`px-3 py-1 rounded-full border text-xs ${item.tagStyle}`}>
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



            <TestimonialsSection />

            {/* Pricing - Gradient Borders */}
            < section id="pricing" className="relative z-10 container mx-auto px-4 py-24" aria-labelledby="heading-pricing" >
                <FadeIn>
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="landing-caption font-medium text-green-400">Aucune carte bancaire requise</span>
                        </div>
                        <h2 id="heading-pricing" className="landing-h2 mb-4 text-white">
                            Un mois pour voir la différence
                        </h2>
                        <p className="landing-subtitle text-white/60 mb-6">
                            Testez avec vos vraies données. Gardez tout si ça vous convient. Partez sans friction sinon.
                        </p>

                        {/* Freemium offer */}
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-blue-500/20">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20">
                                <Home className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="text-left">
                                <p className="landing-caption font-semibold text-white">1-2 biens ?</p>
                                <p className="landing-caption text-white/60">Gratuit à vie <span className="text-blue-400">(hors IA et API externes)</span></p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* Slider nombre de biens */}
                <FadeIn delay={0}>
                    <div className="max-w-md mx-auto mb-12 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-500/20">
                                    <Home className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="text-white/80 font-medium">Nombre de biens</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{lotCount} <span className="text-sm font-normal text-white/60">lots</span></span>
                        </div>
                        <Slider
                            value={[lotCount]}
                            onValueChange={(v) => setLotCount(v[0])}
                            min={1}
                            max={1000}
                            step={1}
                            className="w-full [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-blue-500 [&_[data-slot=slider-range]]:to-blue-400 [&_[data-slot=slider-thumb]]:border-blue-400 [&_[data-slot=slider-thumb]]:bg-white"
                        />
                        {lotCount >= 1000 ? (
                            <p className="text-sm text-blue-400 font-medium mt-3 text-center">
                                1000+ biens ? <a href="#contact" className="underline hover:text-blue-300">Contactez-nous</a> pour une offre personnalisée.
                            </p>
                        ) : (
                            <p className="text-sm text-white/50 mt-3 text-center">
                                Déplacez le curseur pour calculer votre tarif
                            </p>
                        )}
                        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-white/10">
                            <span className="text-xs text-white/60 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                Sans carte bancaire
                            </span>
                            <span className="text-xs text-white/60 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                Données exportables
                            </span>
                            <span className="text-xs text-white/60 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                Résiliation en 1 clic
                            </span>
                        </div>
                    </div>
                </FadeIn>

                {/* Pricing Cards */}
                <FadeIn delay={150}>
                    <PricingCards
                        variant="dark"
                        lotCount={lotCount}
                        className="max-w-4xl mx-auto"
                    />
                </FadeIn>


            </section >

            {/* Contact Section */}
            < section id="contact" className="relative z-10 container mx-auto px-4 py-24" aria-labelledby="heading-contact" >
                <FadeIn>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 id="heading-contact" className="landing-h2 text-white mb-4">
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
            < section id="faq" className="relative z-10 bg-slate-800/30 py-24" aria-labelledby="heading-faq" >
                <div className="container mx-auto px-4">
                    <FadeIn>
                        <div className="text-center mb-12">
                            <h2 id="heading-faq" className="landing-h2 text-white mb-4">
                                Questions fréquentes — Gestion locative SEIDO
                            </h2>
                            <p className="landing-subtitle text-white/60 max-w-2xl mx-auto">
                                Normal. Voici ce qu'on nous demande le plus souvent.
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

            {/* Blog Section — 3 Latest Articles */}
            {latestArticles.length > 0 && (
                <section id="blog" className="relative z-10 container mx-auto px-4 py-24" aria-labelledby="heading-blog">
                    <FadeIn>
                        <div className="text-center mb-12">
                            <Badge className="mb-4 bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/10">
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                Blog
                            </Badge>
                            <h2 id="heading-blog" className="landing-h2 text-white mb-4">
                                Actualités gestion immobilière Belgique
                            </h2>
                            <p className="landing-body text-white/60 max-w-2xl mx-auto">
                                Analyses, decryptages et conseils pratiques pour gestionnaires immobiliers, proprietaires et syndics.
                            </p>
                        </div>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
                        {latestArticles.map((article, i) => (
                            <FadeIn key={article.slug} delay={i * 100}>
                                <BlogArticleCard article={article} className="h-full" />
                            </FadeIn>
                        ))}
                    </div>

                    <FadeIn delay={300}>
                        <div className="text-center">
                            <Link href="/blog">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-full px-8"
                                >
                                    Voir tous les articles
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </FadeIn>
                </section>
            )}

            {/* CTA Section */}
            < section className="relative z-10 container mx-auto px-4 py-32 text-center" >
                <FadeIn>
                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-[100px]" />
                        <p className="landing-h1 text-white mb-6 relative z-10">
                            Et si lundi prochain était différent ?
                        </p>
                        <p className="landing-subtitle text-white/60 mb-4 relative z-10">
                            Des boucles plus courtes. Des décisions plus rapides. Zéro engagement.
                        </p>
                        <p className="landing-body text-green-400 mb-10 relative z-10 font-medium">
                            1 mois gratuit, sans carte bancaire
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                            <Link href="/auth/signup">
                                <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    Essayer gratuitement — 1 mois offert
                                </Button>
                            </Link>
                        </div>
                    </div>
                </FadeIn>
            </section >

            </main>

            {/* Footer */}
            < footer className="relative z-10 border-t border-white/10 bg-slate-950 py-12" >
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
                            <p className="text-sm leading-relaxed text-white/40 mb-4">
                                Moins de boucles. Plus de temps.
                            </p>
                            <p className="text-sm leading-relaxed text-white/40 text-xs">
                                © {new Date().getFullYear()} SEIDO. Tous droits réservés.
                            </p>
                        </div>


                        <div>
                            <p className="landing-body font-semibold text-white mb-3">Contact</p>
                            <ul className="space-y-2 landing-caption text-white/60">
                                <li><a href="mailto:contact@seido-app.com" className="hover:text-white transition-colors">contact@seido-app.com</a></li>
                                <li>Bruxelles, Belgique</li>
                                <li className="flex items-center gap-2 pt-2">
                                    <Shield className="w-3 h-3 text-green-400" />
                                    <span>RGPD — Hebergement EU</span>
                                </li>
                                <li className="pt-2">
                                    <a href="https://www.linkedin.com/company/seido-app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                        <span>Suivez-nous sur LinkedIn</span>
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <p className="landing-body font-semibold text-white mb-3">Produit</p>
                            <ul className="space-y-2 landing-caption text-white/60">
                                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="landing-body font-semibold text-white mb-3">Légal</p>
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
                <DialogContent className="bg-slate-800 border-white/10 text-white sm:max-w-lg">
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
