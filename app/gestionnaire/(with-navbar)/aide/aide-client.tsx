"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Search,
  Rocket,
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Wrench,
  Mail,
  Settings,
  HelpCircle,
  Home,
  Calendar,
  MessageSquare,
  FileCheck,
  Clock,
  Send,
  LinkIcon,
  Shield,
  Bell,
  CreditCard,
  Smartphone,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Download,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuideSection {
  id: string
  title: string
  icon: LucideIcon
  color: string
}

interface FAQItem {
  question: string
  answer: string
  category: string
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const SECTIONS: GuideSection[] = [
  { id: "premiers-pas", title: "Premiers pas", icon: Rocket, color: "text-emerald-600" },
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, color: "text-blue-600" },
  { id: "patrimoine", title: "Patrimoine", icon: Building2, color: "text-violet-600" },
  { id: "contacts", title: "Contacts", icon: Users, color: "text-green-600" },
  { id: "contrats", title: "Contrats", icon: FileText, color: "text-purple-600" },
  { id: "interventions", title: "Interventions", icon: Wrench, color: "text-orange-600" },
  { id: "emails", title: "Emails", icon: Mail, color: "text-cyan-600" },
  { id: "parametres", title: "Parametres", icon: Settings, color: "text-gray-600" },
  { id: "faq", title: "FAQ", icon: HelpCircle, color: "text-rose-600" },
]

// ---------------------------------------------------------------------------
// FAQ data (20 questions across 5 categories)
// ---------------------------------------------------------------------------

const FAQ_DATA: FAQItem[] = [
  // General
  { category: "General", question: "Qu'est-ce que SEIDO ?", answer: "SEIDO est une plateforme de gestion immobiliere tout-en-un conçue pour les gestionnaires belges. Elle centralise vos biens, contacts, contrats, interventions et emails dans un seul outil." },
  { category: "General", question: "Combien de biens puis-je gerer avec SEIDO ?", answer: "Aucune limite technique. SEIDO gere de 1 a plus de 500 lots. Votre abonnement determine le nombre de lots inclus dans votre forfait." },
  { category: "General", question: "SEIDO est-il adapte a la legislation belge ?", answer: "Oui. SEIDO est conçu pour le marche belge et respecte le RGPD. Vos donnees sont hebergees de maniere securisee et conforme aux reglementations europeennes." },
  { category: "General", question: "Comment importer mes donnees existantes ?", answer: "Vous pouvez creer vos biens et contacts manuellement ou en lot. Pour les imports volumineux (plus de 50 lots depuis Excel), contactez-nous : nous vous aidons a migrer vos donnees en moins de 24h." },
  // Facturation
  { category: "Facturation", question: "Comment fonctionne l'essai gratuit ?", answer: "14 jours d'essai gratuit avec acces a toutes les fonctionnalites. Aucune carte bancaire requise. A la fin de l'essai, choisissez le forfait adapte a votre portefeuille." },
  { category: "Facturation", question: "Puis-je changer de forfait a tout moment ?", answer: "Oui. Modifiez votre abonnement a tout moment depuis Parametres > Abonnement. Le changement prend effet immediatement, facturation ajustee au prorata." },
  { category: "Facturation", question: "Comment annuler mon abonnement ?", answer: "Rendez-vous dans Parametres > Abonnement > Gerer l'abonnement. Vous conservez l'acces jusqu'a la fin de votre periode en cours. Vos donnees restent accessibles en lecture seule." },
  { category: "Facturation", question: "Puis-je exporter mes donnees si j'annule ?", answer: "Oui. Exportez vos donnees (biens, contacts, interventions) a tout moment depuis Parametres. Apres annulation, vos donnees restent accessibles en lecture seule pendant 30 jours." },
  // Securite
  { category: "Securite", question: "Mes donnees sont-elles en securite ?", answer: "Absolument. SEIDO utilise le chiffrement SSL/TLS, l'authentification securisee avec verification email, et des politiques de securite au niveau des lignes (RLS) qui garantissent que chaque equipe ne voit que ses propres donnees." },
  { category: "Securite", question: "Qui peut voir mes donnees ?", answer: "Seuls les membres de votre equipe. Les prestataires ne voient que leurs interventions assignees. Les locataires ne voient que leur lot. Aucun acces croise n'est possible." },
  { category: "Securite", question: "Comment fonctionne la connexion Google ?", answer: "SEIDO utilise Google OAuth 2.0, un standard de securite utilise par des millions d'applications. Nous ne stockons jamais votre mot de passe Google. Seuls votre nom et email sont recuperes." },
  // Mobile
  { category: "Mobile", question: "SEIDO fonctionne-t-il sur mobile ?", answer: "Oui. SEIDO est une Progressive Web App (PWA) accessible depuis tout navigateur mobile. Installez-la sur votre ecran d'accueil pour un acces rapide avec notifications push en temps reel." },
  { category: "Mobile", question: "Puis-je gerer des interventions depuis mon telephone ?", answer: "Oui. Creez, approuvez, assignez et suivez les interventions sur mobile. Prenez des photos, envoyez des messages et validez des devis directement depuis le terrain." },
  { category: "Mobile", question: "Les notifications push fonctionnent-elles sur mobile ?", answer: "Oui. Activez les notifications lors de votre premiere connexion. Alertes en temps reel pour les nouvelles interventions, messages, devis et mises a jour de statut." },
  // Integrations
  { category: "Integrations", question: "Comment connecter mon compte Gmail ?", answer: "Parametres > Emails > Ajouter une connexion Gmail. Autorisez SEIDO via Google OAuth. Vos emails se synchronisent automatiquement et vous pouvez les lier a vos interventions et biens." },
  { category: "Integrations", question: "Puis-je connecter plusieurs comptes email ?", answer: "Oui. Connectez autant de comptes Gmail ou IMAP que necessaire. Chaque membre de l'equipe peut connecter son propre compte pour centraliser toute la communication." },
  { category: "Integrations", question: "SEIDO s'integre-t-il avec d'autres outils ?", answer: "SEIDO s'integre avec Gmail (OAuth), les comptes IMAP generiques, et Stripe pour la facturation. D'autres integrations (Google Maps, calendriers) sont en cours de developpement." },
  // Collaboration
  { category: "General", question: "Comment inviter un collegue dans mon equipe ?", answer: "Allez dans Parametres > Equipe > Inviter un membre. Votre collegue recoit un email, cree son compte et accede aux memes donnees. Vous controlez ses acces depuis les parametres." },
  { category: "General", question: "Que voient mes locataires sur leur portail ?", answer: "Chaque locataire invite accede a un portail ou il peut signaler un probleme en 2 minutes, suivre l'avancement des interventions et consulter ses documents. Il ne voit que son lot, jamais les autres." },
  { category: "General", question: "Quel est le delai de reponse du support ?", answer: "Moins de 24h en semaine par email (support@seido-app.com). Pour les urgences techniques, nous repondons sous 2h pendant les heures ouvrables (lundi-vendredi, 9h-18h)." },
]

const FAQ_CATEGORIES = ["General", "Facturation", "Securite", "Mobile", "Integrations"]

// ---------------------------------------------------------------------------
// Helper: highlight search term in text
// ---------------------------------------------------------------------------

const highlightMatch = (text: string, query: string) => {
  if (!query || query.length < 2) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionHeading = ({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: LucideIcon
  color: string
  title: string
  subtitle: string
}) => (
  <div className="mb-4 sm:mb-6">
    <div className="flex items-center gap-3 mb-2">
      <div className={cn("p-2 rounded-lg bg-muted", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
    </div>
    <p className="text-muted-foreground text-sm sm:text-base ml-12">{subtitle}</p>
  </div>
)

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: LucideIcon
  title: string
  description: string
  color?: string
}) => (
  <div className="flex gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
    <div className={cn("mt-0.5 flex-shrink-0", color || "text-primary")}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  </div>
)

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="space-y-2 mt-2">
    {steps.map((step, i) => (
      <li key={i} className="flex gap-3 text-sm">
        <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {i + 1}
        </span>
        <span className="text-muted-foreground">{step}</span>
      </li>
    ))}
  </ol>
)

const QuickStartCard = ({
  icon: Icon,
  title,
  description,
  href,
  steps,
  color,
  cta,
}: {
  icon: LucideIcon
  title: string
  description: string
  href: string
  steps: string[]
  color: string
  cta: string
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-muted", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <Accordion type="single" collapsible>
        <AccordionItem value="steps" className="border-none">
          <AccordionTrigger className="py-2 text-xs text-primary hover:no-underline">
            Voir les etapes
          </AccordionTrigger>
          <AccordionContent>
            <StepList steps={steps} />
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-primary hover:underline mt-3"
            >
              {cta} <ArrowRight className="h-3 w-3" />
            </Link>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
)

const StatusBadge = ({ label, color }: { label: string; color: string }) => (
  <Badge variant="outline" className={cn("text-xs", color)}>
    {label}
  </Badge>
)

// ---------------------------------------------------------------------------
// Section content components
// ---------------------------------------------------------------------------

const PremiersPasSection = () => (
  <div>
    <SectionHeading
      icon={Rocket}
      color="text-emerald-600"
      title="Premiers pas"
      subtitle="Decouvrez SEIDO en 10 minutes. Gagnez 2 heures des le premier jour."
    />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <QuickStartCard
        icon={Building2}
        title="Ajoutez votre premier immeuble"
        description="Centralisez vos lots en un seul endroit. Retrouvez n'importe quel bien en 5 secondes."
        href="/gestionnaire/biens"
        color="text-violet-600"
        cta="Creer mon premier immeuble"
        steps={[
          "Cliquez sur Patrimoine dans le menu lateral.",
          "Cliquez sur le bouton + Nouvel immeuble.",
          "Renseignez l'adresse — l'autocompletion vous aide.",
          "Ajoutez les details de l'immeuble (nombre d'etages, type).",
          "Validez. Ajoutez ensuite des lots depuis la fiche immeuble.",
        ]}
      />
      <QuickStartCard
        icon={Users}
        title="Creez vos contacts cles"
        description="Locataires, prestataires, proprietaires : tous au meme endroit. Fini les Post-it."
        href="/gestionnaire/contacts"
        color="text-green-600"
        cta="Ajouter mes contacts"
        steps={[
          "Allez dans Contacts via le menu lateral.",
          "Cliquez sur + Nouveau contact.",
          "Choisissez le type : locataire, prestataire ou proprietaire.",
          "Remplissez les coordonnees (nom, email, telephone).",
          "Validez. Invitez ensuite ce contact sur son portail dedie.",
        ]}
      />
      <QuickStartCard
        icon={Wrench}
        title="Lancez votre premiere intervention"
        description="Creez, assignez, suivez : tout en un flux. Plus rien ne se perd."
        href="/gestionnaire/operations"
        color="text-orange-600"
        cta="Creer une intervention"
        steps={[
          "Allez dans Interventions via le menu lateral.",
          "Cliquez sur + Nouvelle intervention.",
          "Selectionnez le bien concerne (immeuble ou lot).",
          "Decrivez le probleme et choisissez l'urgence.",
          "Assignez un prestataire — il sera notifie automatiquement.",
        ]}
      />
    </div>
  </div>
)

const DashboardSection = () => (
  <div>
    <SectionHeading
      icon={LayoutDashboard}
      color="text-blue-600"
      title="Pilotez votre portefeuille en temps reel"
      subtitle="Fini les 2h par jour a chercher dans 5 outils. Tout est ici, en un coup d'oeil."
    />

    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Vos indicateurs cles</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            icon={TrendingUp}
            title="Taux d'occupation"
            description="Lots occupes, vacants ou en attente : en un coup d'oeil. Identifiez les lots a pourvoir."
            color="text-blue-600"
          />
          <FeatureCard
            icon={Wrench}
            title="Interventions en cours"
            description="Actives, en attente de validation ou en retard. Plus besoin de compter manuellement."
            color="text-orange-600"
          />
          <FeatureCard
            icon={FileText}
            title="Contrats actifs"
            description="Baux actifs, a venir et expirant bientot. Montants des loyers consolides."
            color="text-purple-600"
          />
          <FeatureCard
            icon={Clock}
            title="Activite recente"
            description="Qui a fait quoi et quand ? Suivez votre equipe sans demander de rapport."
            color="text-gray-600"
          />
        </div>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="tips">
          <AccordionTrigger className="text-sm font-medium">
            Conseils pour tirer le maximum du Dashboard
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Consultez le dashboard chaque matin : identifiez les urgences en 30 secondes.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Cliquez sur un KPI pour acceder directement a la section concernee.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Plusieurs equipes ? Activez la vue consolidee pour tout voir en un clic.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
)

const PatrimoineSection = () => (
  <div>
    <SectionHeading
      icon={Building2}
      color="text-violet-600"
      title="Retrouvez n'importe quel bien en 5 secondes"
      subtitle="Tous vos lots organises en quelques clics. Plus besoin d'Excel ni de Post-it."
    />

    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Organisation de vos biens</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            icon={Building2}
            title="Onglet Immeubles"
            description="Vos immeubles avec adresse, nombre de lots et taux d'occupation. Cliquez pour le detail."
            color="text-violet-600"
          />
          <FeatureCard
            icon={Home}
            title="Onglet Lots"
            description="Appartements, commerces, garages. Filtrez par immeuble, occupation ou type de bien."
            color="text-indigo-600"
          />
        </div>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="create-building">
          <AccordionTrigger className="text-sm font-medium">Comment creer un immeuble ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Allez dans Patrimoine et cliquez sur + Nouvel immeuble.",
              "Entrez l'adresse — l'autocompletion Google vous aide.",
              "Ajoutez les details (type, etages, annee de construction).",
              "Validez. L'immeuble apparait avec 0 lot.",
              "Depuis la fiche, cliquez sur + Ajouter un lot pour creer vos lots.",
            ]} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="create-lot">
          <AccordionTrigger className="text-sm font-medium">Comment ajouter un lot ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Depuis un immeuble : fiche immeuble > Onglet Lots > + Ajouter un lot.",
              "Ou depuis la liste Lots : + Nouveau lot et selectionnez l'immeuble.",
              "Renseignez le type (appartement, commerce, garage), l'etage, la reference.",
              "Validez. Le lot est lie automatiquement a l'immeuble.",
            ]} />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Vous pouvez creer des lots independants (sans immeuble) pour les maisons individuelles.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="occupation">
          <AccordionTrigger className="text-sm font-medium">Comment suivre l&apos;occupation ?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              SEIDO calcule l&apos;occupation automatiquement. Un contrat actif = lot occupe.
              Contrat expire = lot vacant. Aucune mise a jour manuelle necessaire.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
)

const ContactsSection = () => (
  <div>
    <SectionHeading
      icon={Users}
      color="text-green-600"
      title="Fini les contacts perdus dans WhatsApp"
      subtitle="Locataires, prestataires, proprietaires : tous au meme endroit. Plus jamais 'c'est dans ma tete'."
    />

    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Trois types de contacts</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={Home}
            title="Locataires"
            description="Chaque locataire avec son lot, ses coordonnees et l'historique complet des interventions."
            color="text-green-600"
          />
          <FeatureCard
            icon={Wrench}
            title="Prestataires"
            description="Plombiers, electriciens, peintres : coordonnees, societe et interventions realisees."
            color="text-orange-600"
          />
          <FeatureCard
            icon={Users}
            title="Proprietaires"
            description="Les proprietaires de vos biens geres avec leurs informations de contact."
            color="text-blue-600"
          />
        </div>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="invitations">
          <AccordionTrigger className="text-sm font-medium">Comment inviter un contact sur SEIDO ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Ouvrez la fiche du contact depuis Contacts.",
              "Cliquez sur Inviter ce contact.",
              "Un email d'invitation est envoye automatiquement.",
              "Le contact cree son compte et accede a son portail dedie.",
              "Retrouvez le statut de l'invitation dans l'onglet Invitations.",
            ]} />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Les prestataires invites peuvent recevoir des interventions, proposer des creneaux et envoyer des devis.
              Les locataires invites peuvent signaler des problemes et suivre les interventions de leur lot.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="companies">
          <AccordionTrigger className="text-sm font-medium">Comment gerer les societes ?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              L&apos;onglet Societes regroupe les contacts par entreprise. Creez une societe (nom, TVA, adresse)
              puis associez-y des contacts. Pratique pour les societes de maintenance avec plusieurs techniciens.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
)

const ContratsSection = () => (
  <div>
    <SectionHeading
      icon={FileText}
      color="text-purple-600"
      title="Plus jamais oublier une echeance"
      subtitle="Vos baux se suivent tout seuls. Alertes automatiques 60 jours avant chaque echeance."
    />

    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Suivi automatique des contrats</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Cycle de vie d&apos;un contrat :</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge label="A venir" color="text-blue-600 border-blue-200" />
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <StatusBadge label="Actif" color="text-emerald-600 border-emerald-200" />
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <StatusBadge label="Expire" color="text-amber-600 border-amber-200" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Les transitions sont automatiques. Un contrat &quot;a venir&quot; passe en &quot;actif&quot; a la date de debut,
              puis en &quot;expire&quot; a la date de fin. Notification 60 jours avant l&apos;expiration.
            </p>
          </div>
        </div>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="create-contract">
          <AccordionTrigger className="text-sm font-medium">Comment creer un contrat ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Allez dans Contrats et cliquez sur + Nouveau contrat.",
              "Selectionnez le lot concerne.",
              "Choisissez le locataire (ou creez-le a la volee).",
              "Renseignez les dates, le loyer, le depot de garantie et les charges.",
              "Ajoutez des documents (bail signe, etat des lieux) si disponibles.",
              "Validez. Le contrat est actif et le lot passe en 'occupe'.",
            ]} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="alerts">
          <AccordionTrigger className="text-sm font-medium">Comment fonctionnent les alertes d&apos;echeance ?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              SEIDO detecte automatiquement les contrats proches de leur date de fin.
              Vous recevez une notification 60 jours avant l&apos;expiration pour anticiper le renouvellement.
              Les contrats expirant sont visibles sur le dashboard.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
)

const InterventionsSection = () => (
  <div>
    <SectionHeading
      icon={Wrench}
      color="text-orange-600"
      title="Reduisez vos appels de 70%"
      subtitle="Chaque intervention est suivie, documentee, et tout le monde est notifie automatiquement."
    />

    <div className="space-y-4">
      {/* Workflow visuel */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Le workflow en 9 etapes</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3">
          Chaque intervention suit un parcours clair. Tous les participants sont notifies a chaque etape.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <StatusBadge label="Demande" color="text-blue-600 border-blue-200" />
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <StatusBadge label="Approuvee" color="text-emerald-600 border-emerald-200" />
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <StatusBadge label="Planification" color="text-violet-600 border-violet-200" />
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <StatusBadge label="Planifiee" color="text-indigo-600 border-indigo-200" />
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <StatusBadge label="Cloturee" color="text-gray-600 border-gray-200" />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Une intervention peut aussi etre rejetee ou annulee a tout moment.
        </p>
      </Card>

      {/* Fonctionnalites cles */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Fonctionnalites cles</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            icon={FileCheck}
            title="Gestion des devis"
            description="Demandez un devis, comparez, approuvez ou rejetez. Tout est trace dans le dossier."
            color="text-orange-600"
          />
          <FeatureCard
            icon={Calendar}
            title="Planification de creneaux"
            description="Le prestataire propose, vous confirmez. Plus de ping-pong telephonique."
            color="text-violet-600"
          />
          <FeatureCard
            icon={MessageSquare}
            title="Conversations integrees"
            description="Chat de groupe + canal prive gestionnaire-prestataire. Tout reste dans le dossier."
            color="text-blue-600"
          />
          <FeatureCard
            icon={FileText}
            title="Documents et photos"
            description="Photos du probleme, factures, rapports : tout est lie a l'intervention."
            color="text-green-600"
          />
        </div>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="create-intervention">
          <AccordionTrigger className="text-sm font-medium">Comment creer une intervention ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Allez dans Interventions et cliquez sur + Nouvelle intervention.",
              "Selectionnez le bien concerne (immeuble ou lot specifique).",
              "Decrivez le probleme, choisissez le type et le niveau d'urgence.",
              "Activez 'Demander un devis' si necessaire.",
              "Assignez un prestataire — notification push instantanee.",
              "Suivez l'avancement en temps reel depuis la fiche.",
            ]} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="quotes">
          <AccordionTrigger className="text-sm font-medium">Comment fonctionne le systeme de devis ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Lors de la creation, activez 'Demander un devis'.",
              "Le prestataire soumet son devis (montant + description).",
              "Vous recevez une notification : acceptez ou rejetez.",
              "Si accepte, l'intervention passe en planification.",
              "Si rejete, le prestataire peut soumettre un nouveau devis.",
            ]} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="time-slots">
          <AccordionTrigger className="text-sm font-medium">Comment planifier un creneau ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Apres approbation (et devis accepte si necessaire), le prestataire propose des creneaux.",
              "Vous ou le locataire selectionnez le creneau qui convient.",
              "Le prestataire est notifie du creneau confirme.",
              "L'intervention passe en 'Planifiee' avec la date convenue.",
            ]} />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Plus besoin de 10 appels pour trouver un creneau. Le prestataire propose, vous confirmez.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="conversations">
          <AccordionTrigger className="text-sm font-medium">Comment utiliser les conversations ?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-2">Chaque intervention dispose de canaux de discussion :</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0" /> <strong>Groupe</strong> — Visible par tous (gestionnaire, prestataire, locataire).</li>
              <li className="flex gap-2"><MessageSquare className="h-4 w-4 text-orange-500 flex-shrink-0" /> <strong>Prestataire-Gestionnaire</strong> — Canal prive, invisible pour le locataire.</li>
              <li className="flex gap-2"><MessageSquare className="h-4 w-4 text-green-500 flex-shrink-0" /> <strong>Locataire-Gestionnaire</strong> — Canal prive pour echanger avec le locataire.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
)

const EmailsSection = () => (
  <div>
    <SectionHeading
      icon={Mail}
      color="text-cyan-600"
      title="Vos emails classes automatiquement"
      subtitle="Fini les 15 minutes a chercher un email. Connectez Gmail : chaque email est lie a son dossier."
    />

    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Fonctionnalites email</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            icon={LinkIcon}
            title="Liaison aux entites"
            description="Liez un email a une intervention, un bien ou un contact. Retrouvez-le depuis n'importe quel dossier."
            color="text-cyan-600"
          />
          <FeatureCard
            icon={Send}
            title="Suivi des reponses"
            description="Qui a repondu, quand, dans quel fil ? Plus de 'je n'ai pas recu votre email'."
            color="text-blue-600"
          />
          <FeatureCard
            icon={Shield}
            title="Liste noire"
            description="Bloquez les expediteurs indesirables. Archivez leurs emails existants en un clic."
            color="text-red-600"
          />
          <FeatureCard
            icon={Mail}
            title="Multi-comptes"
            description="Connectez plusieurs comptes Gmail ou IMAP. Chaque membre centralise ses emails."
            color="text-green-600"
          />
        </div>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="connect-gmail">
          <AccordionTrigger className="text-sm font-medium">Comment connecter mon compte Gmail ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Allez dans Parametres > Emails.",
              "Cliquez sur Ajouter une connexion Gmail.",
              "Autorisez SEIDO via la fenetre Google OAuth.",
              "Vos emails se synchronisent automatiquement.",
              "Rendez-vous dans Emails pour les lier a vos entites.",
            ]} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="link-email">
          <AccordionTrigger className="text-sm font-medium">Comment lier un email a une intervention ?</AccordionTrigger>
          <AccordionContent>
            <StepList steps={[
              "Ouvrez l'email dans la section Emails.",
              "Cliquez sur le bouton Lier a une entite.",
              "Recherchez l'intervention, le bien ou le contact.",
              "Validez. L'email apparait dans l'onglet Emails de l'entite liee.",
            ]} />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Selection multiple disponible pour lier plusieurs emails en une fois.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
)

const ParametresSection = () => (
  <div>
    <SectionHeading
      icon={Settings}
      color="text-gray-600"
      title="Deleguez sans perdre le controle"
      subtitle="Configurez SEIDO a votre façon. Equipe, connexions email et abonnement."
    />

    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Sections disponibles</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            icon={Mail}
            title="Connexions email"
            description="Ajoutez ou supprimez vos comptes Gmail et IMAP. Gerez votre liste noire."
            color="text-cyan-600"
          />
          <FeatureCard
            icon={CreditCard}
            title="Abonnement"
            description="Forfait actuel, nombre de lots utilises et facturation Stripe. Tout est transparent."
            color="text-green-600"
          />
          <FeatureCard
            icon={Users}
            title="Profil et equipe"
            description="Modifiez vos infos, votre avatar. Invitez des collegues et gerez les acces."
            color="text-blue-600"
          />
          <FeatureCard
            icon={Bell}
            title="Notifications"
            description="Activez ou desactivez les notifications push et email selon vos preferences."
            color="text-amber-600"
          />
          <FeatureCard
            icon={Download}
            title="Export de donnees"
            description="Exportez vos biens, contacts et interventions a tout moment. Vos donnees vous appartiennent."
            color="text-gray-600"
          />
        </div>
      </Card>
    </div>
  </div>
)

const FAQSection = ({ searchQuery }: { searchQuery: string }) => {
  const filteredFAQ = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return FAQ_DATA
    const lower = searchQuery.toLowerCase()
    return FAQ_DATA.filter(
      (item) =>
        item.question.toLowerCase().includes(lower) ||
        item.answer.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    )
  }, [searchQuery])

  const groupedFAQ = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {}
    for (const cat of FAQ_CATEGORIES) {
      const items = filteredFAQ.filter((item) => item.category === cat)
      if (items.length > 0) groups[cat] = items
    }
    return groups
  }, [filteredFAQ])

  const categoryIcons: Record<string, LucideIcon> = {
    General: HelpCircle,
    Facturation: CreditCard,
    Securite: Shield,
    Mobile: Smartphone,
    Integrations: LinkIcon,
  }

  return (
    <div>
      <SectionHeading
        icon={HelpCircle}
        color="text-rose-600"
        title="Questions frequentes"
        subtitle="Les reponses aux questions les plus courantes de nos utilisateurs."
      />

      {filteredFAQ.length === 0 ? (
        <Card className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune question ne correspond a votre recherche &quot;{searchQuery}&quot;.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFAQ).map(([category, items]) => {
            const CatIcon = categoryIcons[category] || HelpCircle
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <Accordion type="single" collapsible>
                  {items.map((item, i) => (
                    <AccordionItem key={i} value={`${category}-${i}`}>
                      <AccordionTrigger className="text-sm text-left">
                        {highlightMatch(item.question, searchQuery)}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground">{highlightMatch(item.answer, searchQuery)}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const AidePageClient = () => {
  const [activeSection, setActiveSection] = useState("premiers-pas")
  const [searchQuery, setSearchQuery] = useState("")
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    const el = sectionRefs.current[sectionId]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return SECTIONS
    const lower = searchQuery.toLowerCase()
    return SECTIONS.filter((s) => {
      // Always show FAQ if search is active (FAQ has its own internal filter)
      if (s.id === "faq") return true
      return s.title.toLowerCase().includes(lower) || s.id.toLowerCase().includes(lower)
    })
  }, [searchQuery])

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "premiers-pas": return <PremiersPasSection />
      case "dashboard": return <DashboardSection />
      case "patrimoine": return <PatrimoineSection />
      case "contacts": return <ContactsSection />
      case "contrats": return <ContratsSection />
      case "interventions": return <InterventionsSection />
      case "emails": return <EmailsSection />
      case "parametres": return <ParametresSection />
      case "faq": return <FAQSection searchQuery={searchQuery} />
      default: return null
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Search bar — sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 sm:px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher dans l'aide..."
            aria-label="Rechercher dans le guide d'aide"
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile tabs — horizontal scroll */}
      <div className="md:hidden overflow-x-auto border-b bg-background" role="tablist" aria-label="Sections du guide">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {filteredSections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`section-${section.id}`}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[44px]",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="h-4 w-4" />
                {section.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r bg-muted/30 flex-shrink-0">
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-3" aria-label="Sections du guide">
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left min-h-[44px]",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : section.color)} />
                    <span className="truncate">{section.title}</span>
                  </button>
                )
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8 sm:space-y-12">
            {filteredSections.map((section) => (
              <div
                key={section.id}
                id={`section-${section.id}`}
                ref={(el) => { sectionRefs.current[section.id] = el }}
                className="scroll-mt-16"
              >
                {renderSection(section.id)}
                {section.id !== filteredSections[filteredSections.length - 1]?.id && (
                  <Separator className="mt-8 sm:mt-12" />
                )}
              </div>
            ))}

            {/* Footer */}
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Vous ne trouvez pas la reponse a votre question ?
              </p>
              <a
                href="mailto:info@seido-app.com"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-1"
              >
                Contactez notre equipe — reponse sous 24h <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
