"use client"

/**
 * Debug page: All 6 wizard confirmation pages rendered with mock data.
 * Navigate to /gestionnaire/debug/confirmations to review designs.
 *
 * Design pattern: Each section lives inside a white card (rounded-xl border bg-card).
 * Header stays bare. Accent cards for financial/important info.
 */

import { useState } from "react"
import { Building2, Home, MapPin, FileText, Users, Wrench, Calendar, CheckCircle2, AlertTriangle, Wallet, Clock, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSummaryBanner,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationContactGrid,
  ConfirmationDocumentList,
  ConfirmationFinancialHighlight,
} from "@/components/confirmation"

// ============================================================================
// Helpers
// ============================================================================

/** Reusable white card wrapper for sections */
function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-5 space-y-4", className)}>{children}</div>
}

/** Intervention list item */
function InterventionRow({ title, date, users }: { title: string; date: string; users?: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">— {date}</span>
      {users && <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">{users.join(", ")}</Badge>}
    </div>
  )
}

// ============================================================================
// Navigation
// ============================================================================

const PAGES = [
  { id: "immeuble", label: "Immeuble", icon: Building2 },
  { id: "lot", label: "Lot (independant)", icon: Home },
  { id: "bail", label: "Bail", icon: FileText },
  { id: "fournisseur", label: "Contrat fournisseur", icon: Wrench },
  { id: "contact", label: "Contact", icon: Users },
  { id: "intervention", label: "Intervention", icon: Calendar },
] as const

type PageId = typeof PAGES[number]["id"]

// ============================================================================
// 1. IMMEUBLE
// ============================================================================

function ImmeubleConfirmation() {
  return (
    <ConfirmationPageShell maxWidth="7xl">
      <ConfirmationEntityHeader
        icon={Building2}
        title="Residence Les Acacias"
        subtitle="3 lots dans cet immeuble"
        iconColor="blue"
        badges={[
          { label: "Immeuble", variant: "outline" },
          { label: "3 lots", variant: "secondary" },
        ]}
      />

      <ConfirmationSummaryBanner
        metrics={[
          { label: "Lots", value: "3", icon: <Home className="h-4 w-4" /> },
          { label: "Contacts", value: "5", icon: <Users className="h-4 w-4" /> },
          { label: "Documents", value: "4", icon: <FileText className="h-4 w-4" /> },
          { label: "Interventions", value: "2", icon: <Calendar className="h-4 w-4" /> },
        ]}
      />

      {/* Building info card */}
      <SectionCard>
        <ConfirmationSection title="Informations generales" compact>
          <ConfirmationKeyValueGrid
            columns={2}
            pairs={[
              { label: "Nom", value: "Residence Les Acacias" },
              { label: "Adresse", value: "12 Rue des Lilas" },
              { label: "Code postal", value: "1050" },
              { label: "Ville", value: "Ixelles" },
              { label: "Pays", value: "Belgique" },
              { label: "Description", value: "Immeuble de 3 etages, construit en 1985. Facade renovee en 2020.", fullWidth: true },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      {/* Building contacts card */}
      <SectionCard>
        <ConfirmationSection title="Contacts de l'immeuble" compact>
          <ConfirmationContactGrid
            columns={4}
            groups={[
              {
                type: "Gestionnaires",
                contacts: [{ id: "1", name: "Arthur Dupont", email: "arthur@seido.be", sublabel: "Admin" }],
              },
              {
                type: "Proprietaires",
                icon: <Users className="h-3.5 w-3.5" />,
                contacts: [{ id: "2", name: "Marie Laurent", email: "marie@email.com" }],
              },
              {
                type: "Prestataires",
                contacts: [
                  { id: "3", name: "PlomberieExpress", email: "contact@plomberie.be", sublabel: "Plomberie" },
                  { id: "4", name: "ElectroPro", email: "info@electro.be", sublabel: "Electricite" },
                ],
              },
              {
                type: "Autres",
                contacts: [],
                emptyLabel: "Aucun contact",
              },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      {/* Building docs + interventions in 2-col on large screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <ConfirmationSection title="Documents de l'immeuble" compact>
            <ConfirmationDocumentList
              slots={[
                { label: "Attestation incendie", fileCount: 1, fileNames: [{ name: "attestation-incendie-2026.pdf", url: "#preview-attestation" }], recommended: true },
                { label: "PEB / Certificat energetique", fileCount: 1, fileNames: [{ name: "peb-acacias.pdf", url: "#preview-peb" }], recommended: true },
                { label: "Reglement copropriete", fileCount: 0, recommended: true },
                { label: "Plan cadastral", fileCount: 0, recommended: false },
              ]}
            />
          </ConfirmationSection>
        </SectionCard>

        <SectionCard>
          <ConfirmationSection title="Interventions planifiees" compact>
            <div className="space-y-2">
              <InterventionRow title="Verification extincteurs" date="15/06/2026" users={["Arthur Dupont"]} />
              <InterventionRow title="Entretien chaudiere" date="01/10/2026" users={["PlomberieExpress"]} />
            </div>
          </ConfirmationSection>
        </SectionCard>
      </div>

      {/* Lot cards */}
      {[
        { ref: "APT-001", cat: "Appartement", floor: "1er", door: "A", desc: "2 chambres, balcon sud", contacts: 2, docs: 1, interventions: 1 },
        { ref: "APT-002", cat: "Appartement", floor: "2eme", door: "B", desc: "", contacts: 1, docs: 0, interventions: 0 },
        { ref: "GAR-001", cat: "Garage", floor: "Sous-sol", door: "G1", desc: "Place de parking couverte", contacts: 0, docs: 0, interventions: 0 },
      ].map((lot, i, arr) => (
        <SectionCard key={i}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="h-[18px] w-[18px] text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{lot.ref}</span>
                <Badge variant="secondary" className="text-[10px]">{lot.cat}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Etage {lot.floor} — Porte {lot.door}</p>
            </div>
            <span className="text-xs text-muted-foreground">Lot {i + 1}/{arr.length}</span>
          </div>

          <ConfirmationSection title="Caracteristiques" compact>
            <ConfirmationKeyValueGrid
              columns={3}
              pairs={[
                { label: "Etage", value: lot.floor },
                { label: "Porte", value: lot.door },
                { label: "Description", value: lot.desc || undefined, empty: !lot.desc },
              ]}
            />
          </ConfirmationSection>

          <ConfirmationSection title="Contacts" compact>
            <ConfirmationContactGrid
              columns={4}
              groups={[
                { type: "Gestionnaires", contacts: lot.contacts > 0 ? [{ id: "1", name: "Arthur Dupont", email: "arthur@seido.be" }] : [], emptyLabel: "Aucun" },
                { type: "Locataires", contacts: lot.contacts > 1 ? [{ id: "5", name: "Jean Martin", email: "jean@email.com" }] : [], emptyLabel: "Aucun" },
                { type: "Prestataires", contacts: [], emptyLabel: "Aucun" },
                { type: "Proprietaires", contacts: [], emptyLabel: "Aucun" },
              ]}
            />
          </ConfirmationSection>

          <ConfirmationSection title="Documents" compact>
            <ConfirmationDocumentList
              slots={[
                { label: "Etat des lieux", fileCount: lot.docs, fileNames: lot.docs > 0 ? [{ name: "edl-apt001.pdf", url: "#preview-edl" }] : [], recommended: true },
                { label: "Bail", fileCount: 0, recommended: false },
              ]}
            />
          </ConfirmationSection>

          {lot.interventions > 0 ? (
            <ConfirmationSection title="Interventions" compact>
              <InterventionRow title="Entretien chaudiere" date="15/10/2026" />
            </ConfirmationSection>
          ) : (
            <ConfirmationSection title="Interventions" compact>
              <p className="text-sm text-muted-foreground/60 italic">Aucune intervention planifiee</p>
            </ConfirmationSection>
          )}
        </SectionCard>
      ))}
    </ConfirmationPageShell>
  )
}

// ============================================================================
// 2. LOT INDEPENDANT
// ============================================================================

function LotConfirmation() {
  return (
    <ConfirmationPageShell maxWidth="5xl">
      <ConfirmationEntityHeader
        icon={MapPin}
        title="Lots independants"
        subtitle="2 lots a creer"
        iconColor="green"
        badges={[
          { label: "Independants", variant: "outline" },
        ]}
      />

      <ConfirmationSummaryBanner
        metrics={[
          { label: "Lots", value: "2", icon: <Home className="h-4 w-4" /> },
          { label: "Contacts", value: "3", icon: <Users className="h-4 w-4" /> },
          { label: "Documents", value: "2", icon: <FileText className="h-4 w-4" /> },
          { label: "Interventions", value: "1", icon: <Calendar className="h-4 w-4" /> },
        ]}
      />

      {[
        {
          ref: "STUDIO-A1", cat: "Studio", addr: "45 Avenue Louise, 1050 Bruxelles",
          floor: "3eme", door: "12", desc: "Studio meuble avec kitchenette",
          hasContacts: true, hasDocs: true, hasIntv: true,
        },
        {
          ref: "COM-B2", cat: "Commerce", addr: "78 Rue Neuve, 1000 Bruxelles",
          floor: "RDC", door: "", desc: "",
          hasContacts: true, hasDocs: false, hasIntv: false,
        },
      ].map((lot, i) => (
        <SectionCard key={i}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold">{lot.ref}</span>
                <Badge variant="secondary" className="text-[10px]">{lot.cat}</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{lot.addr}</p>
            </div>
            <span className="text-xs text-muted-foreground">Lot {i + 1}/2</span>
          </div>

          <ConfirmationSection title="Caracteristiques" compact>
            <ConfirmationKeyValueGrid
              columns={3}
              pairs={[
                { label: "Adresse", value: lot.addr, fullWidth: true },
                { label: "Etage", value: lot.floor },
                { label: "Porte", value: lot.door || undefined, empty: !lot.door },
                { label: "Description", value: lot.desc || undefined, empty: !lot.desc },
              ]}
            />
          </ConfirmationSection>

          <ConfirmationSection title="Contacts" compact>
            <ConfirmationContactGrid
              columns={4}
              groups={[
                { type: "Gestionnaires", contacts: [{ id: "1", name: "Arthur Dupont", email: "arthur@seido.be" }], emptyLabel: "Aucun" },
                { type: "Prestataires", contacts: lot.hasContacts ? [{ id: "3", name: "PlomberieExpress", sublabel: "Plomberie" }] : [], emptyLabel: "Aucun" },
                { type: "Proprietaires", contacts: [], emptyLabel: "Aucun" },
                { type: "Autres", contacts: [], emptyLabel: "Aucun" },
              ]}
            />
          </ConfirmationSection>

          <ConfirmationSection title="Documents" compact>
            <ConfirmationDocumentList
              slots={[
                { label: "Etat des lieux", fileCount: lot.hasDocs ? 1 : 0, fileNames: lot.hasDocs ? [{ name: "edl-studio.pdf", url: "#preview-edl-studio" }] : [], recommended: true },
                { label: "Photos", fileCount: lot.hasDocs ? 2 : 0, fileNames: lot.hasDocs ? [{ name: "photo1.jpg", url: "#preview-photo1" }, { name: "photo2.jpg", url: "#preview-photo2" }] : [], recommended: false },
              ]}
            />
          </ConfirmationSection>

          <ConfirmationSection title="Interventions" compact>
            {lot.hasIntv ? (
              <InterventionRow title="Verification compteurs" date="20/04/2026" />
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">Aucune intervention planifiee</p>
            )}
          </ConfirmationSection>
        </SectionCard>
      ))}
    </ConfirmationPageShell>
  )
}

// ============================================================================
// 3. BAIL
// ============================================================================

function BailConfirmation() {
  return (
    <ConfirmationPageShell maxWidth="5xl">
      <ConfirmationEntityHeader
        icon={FileText}
        title="Bail — APT-001"
        subtitle="Residence Les Acacias — 12 Rue des Lilas, 1050 Ixelles"
        iconColor="purple"
        badges={[
          { label: "Bail residentiel", variant: "outline" },
          { label: "36 mois", variant: "secondary" },
        ]}
      />

      {/* Desktop: 2 columns (content + financial sidebar) */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <div className="space-y-4 min-w-0">
          <SectionCard>
            <ConfirmationSection title="Informations generales" compact>
              <ConfirmationKeyValueGrid
                columns={2}
                pairs={[
                  { label: "Reference", value: "BAIL-2026-001" },
                  { label: "Titre", value: "Bail residentiel APT-001" },
                  { label: "Date de debut", value: "01/04/2026" },
                  { label: "Duree", value: "36 mois" },
                  { label: "Date de fin", value: "31/03/2029" },
                  { label: "Lot", value: "APT-001 — Residence Les Acacias" },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Signataires" compact>
              <ConfirmationContactGrid
                columns={2}
                groups={[
                  {
                    type: "Locataires",
                    contacts: [
                      { id: "5", name: "Jean Martin", email: "jean@email.com", sublabel: "Titulaire principal" },
                      { id: "6", name: "Sophie Martin", email: "sophie@email.com" },
                    ],
                  },
                  {
                    type: "Garants",
                    contacts: [
                      { id: "7", name: "Pierre Martin", email: "pierre@email.com", sublabel: "Parent" },
                    ],
                  },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Documents" compact>
              <ConfirmationDocumentList
                slots={[
                  { label: "Contrat de bail", fileCount: 1, fileNames: [{ name: "bail-apt001-signe.pdf", url: "#preview-bail" }], recommended: true },
                  { label: "Etat des lieux d'entree", fileCount: 1, fileNames: [{ name: "edl-entree-apt001.pdf", url: "#preview-edl-entree" }], recommended: true },
                  { label: "Attestation assurance", fileCount: 0, recommended: true },
                  { label: "Certificat de domicile", fileCount: 0, recommended: false },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Interventions planifiees" compact>
              <div className="space-y-2">
                <InterventionRow title="Entretien chaudiere" date="15/10/2026" />
                <InterventionRow title="Ramonage cheminee" date="01/11/2026" />
                <p className="text-xs text-muted-foreground pl-6">+ 1 intervention desactivee</p>
              </div>
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Rappel de loyer" icon={<Clock className="h-3.5 w-3.5" />} compact>
              <ConfirmationKeyValueGrid
                columns={2}
                pairs={[
                  { label: "Statut", value: "Active" },
                  { label: "Jour d'envoi", value: "25 du mois" },
                  { label: "Methode", value: "Email + notification push" },
                  { label: "Destinataire", value: "Jean Martin" },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>
        </div>

        {/* Financial sidebar + guarantee — accent cards */}
        <div className="order-first lg:order-last space-y-4">
          <ConfirmationFinancialHighlight
            title="Resume financier"
            icon={Wallet}
            lines={[
              { label: "Loyer mensuel", value: "900,00 EUR" },
              { label: "Charges", value: "150,00 EUR" },
              { label: "Type de charges", value: "Provisions", muted: true },
              { label: "Frequence", value: "Mensuel", muted: true },
            ]}
            totalLabel="Total mensuel"
            totalValue="1 050,00 EUR"
            className="lg:sticky lg:top-4"
          />

          {/* Guarantee — grouped with finances */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-700">Garantie locative</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium text-right">Garantie bancaire</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Montant</span>
                <span className="text-sm font-medium text-right">2 700,00 EUR</span>
              </div>
              <div className="pt-1 border-t border-blue-200">
                <span className="text-xs text-muted-foreground">Notes</span>
                <p className="text-sm font-medium">Compte bloque ING BE12 3456 7890</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConfirmationPageShell>
  )
}

// ============================================================================
// 4. CONTRAT FOURNISSEUR
// ============================================================================

function FournisseurConfirmation() {
  return (
    <ConfirmationPageShell maxWidth="3xl">
      <ConfirmationEntityHeader
        icon={Wrench}
        title="Contrats fournisseur"
        subtitle="Residence Les Acacias"
        iconColor="amber"
        badges={[
          { label: "2 contrats", variant: "secondary" },
        ]}
      />

      {/* Contract 1: full data */}
      <SectionCard>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <FileText className="h-[18px] w-[18px] text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">CF-ACAC-001</span>
              <Badge variant="secondary" className="text-[10px]">Ascenseur</Badge>
            </div>
            <p className="text-xs text-muted-foreground">KONE Belgique</p>
          </div>
        </div>
        <ConfirmationSection title="Details du contrat" compact>
          <ConfirmationKeyValueGrid
            columns={2}
            pairs={[
              { label: "Fournisseur", value: "KONE Belgique" },
              { label: "Cout", value: "250,00 EUR / mois" },
              { label: "Date de fin", value: "31/12/2027" },
              { label: "Preavis", value: "3 mois" },
              { label: "Description", value: "Contrat maintenance ascenseur — visites trimestrielles", fullWidth: true },
            ]}
          />
        </ConfirmationSection>
        <ConfirmationSection title="Documents" compact>
          <ConfirmationDocumentList
            slots={[
              { label: "Contrat", fileCount: 1, fileNames: [{ name: "contrat-kone-2026.pdf", url: "#preview-contrat-kone" }], recommended: true },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      {/* Contract 2: sparse data */}
      <SectionCard>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <FileText className="h-[18px] w-[18px] text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">CF-ACAC-002</span>
              <Badge variant="secondary" className="text-[10px]">Nettoyage</Badge>
            </div>
            <p className="text-xs text-muted-foreground">CleanPro SPRL</p>
          </div>
        </div>
        <ConfirmationSection title="Details du contrat" compact>
          <ConfirmationKeyValueGrid
            columns={2}
            pairs={[
              { label: "Fournisseur", value: "CleanPro SPRL" },
              { label: "Cout", value: "180,00 EUR / mois" },
              { label: "Date de fin", value: undefined, empty: true },
              { label: "Preavis", value: undefined, empty: true },
              { label: "Description", value: undefined, empty: true, fullWidth: true },
            ]}
          />
        </ConfirmationSection>
        <ConfirmationSection title="Documents" compact>
          <ConfirmationDocumentList
            slots={[
              { label: "Contrat", fileCount: 0, recommended: true },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      {/* Financial recap — accent card */}
      <ConfirmationFinancialHighlight
        title="Recap financier"
        icon={Wallet}
        lines={[
          { label: "CF-ACAC-001 (Ascenseur)", value: "250,00 EUR / mois" },
          { label: "CF-ACAC-002 (Nettoyage)", value: "180,00 EUR / mois" },
        ]}
        totalLabel="Total mensuel"
        totalValue="430,00 EUR"
      />
    </ConfirmationPageShell>
  )
}

// ============================================================================
// 5. CONTACT
// ============================================================================

function ContactConfirmation() {
  return (
    <ConfirmationPageShell maxWidth="3xl">
      <ConfirmationEntityHeader
        icon={Users}
        title="Jean-Pierre Delcourt"
        subtitle="Prestataire — Plomberie & chauffage"
        iconColor="green"
        badges={[
          { label: "Prestataire", variant: "outline" },
          { label: "Plomberie", variant: "secondary" },
        ]}
      />

      <SectionCard>
        <ConfirmationSection title="Coordonnees" compact>
          <ConfirmationKeyValueGrid
            columns={2}
            pairs={[
              { label: "Prenom", value: "Jean-Pierre" },
              { label: "Nom", value: "Delcourt" },
              { label: "Email", value: "jp.delcourt@plomberie.be" },
              { label: "Telephone", value: "+32 475 12 34 56" },
              { label: "Notes", value: "Disponible du lundi au vendredi, 8h-17h. Urgences le weekend sur appel.", fullWidth: true },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      <SectionCard>
        <ConfirmationSection title="Societe" compact>
          <ConfirmationKeyValueGrid
            columns={2}
            pairs={[
              { label: "Nom de la societe", value: "Delcourt Plomberie SPRL" },
              { label: "Numero TVA", value: "BE0123.456.789" },
              { label: "Adresse", value: "15 Rue du Commerce, 1000 Bruxelles", fullWidth: true },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      {/* Invitation — accent card (green tint for positive action) */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
        <ConfirmationSection title="Acces & invitation" compact>
          <ConfirmationKeyValueGrid
            columns={1}
            pairs={[
              { label: "Invitation a l'application", value: "Oui — une invitation sera envoyee par email" },
              { label: "Statut du compte", value: "Nouveau contact — aucun compte existant" },
            ]}
          />
        </ConfirmationSection>
      </div>

      <SectionCard>
        <ConfirmationSection title="Liaison" compact>
          <ConfirmationKeyValueGrid
            columns={1}
            pairs={[
              { label: "Type de liaison", value: "Immeuble" },
              { label: "Entite liee", value: "Residence Les Acacias — 12 Rue des Lilas, 1050 Ixelles" },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>
    </ConfirmationPageShell>
  )
}

// Contact with empty fields variant
function ContactConfirmationSparse() {
  return (
    <ConfirmationPageShell maxWidth="3xl">
      <ConfirmationEntityHeader
        icon={Users}
        title="Marie Dubois"
        subtitle="Locataire"
        iconColor="primary"
        badges={[
          { label: "Locataire", variant: "outline" },
        ]}
      />

      <SectionCard>
        <ConfirmationSection title="Coordonnees" compact>
          <ConfirmationKeyValueGrid
            columns={2}
            pairs={[
              { label: "Prenom", value: "Marie" },
              { label: "Nom", value: "Dubois" },
              { label: "Email", value: "marie.dubois@gmail.com" },
              { label: "Telephone", value: undefined, empty: true },
              { label: "Notes", value: undefined, empty: true, fullWidth: true },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      <SectionCard>
        <ConfirmationSection title="Societe" compact>
          <p className="text-sm text-muted-foreground/60 italic">Aucune societe (personne physique)</p>
        </ConfirmationSection>
      </SectionCard>

      <SectionCard>
        <ConfirmationSection title="Acces & invitation" compact>
          <ConfirmationKeyValueGrid
            columns={1}
            pairs={[
              { label: "Invitation a l'application", value: "Non" },
              { label: "Statut du compte", value: "Nouveau contact" },
            ]}
          />
        </ConfirmationSection>
      </SectionCard>

      <SectionCard>
        <ConfirmationSection title="Liaison" compact>
          <p className="text-sm text-muted-foreground/60 italic">Aucune liaison</p>
        </ConfirmationSection>
      </SectionCard>
    </ConfirmationPageShell>
  )
}

// ============================================================================
// 6. INTERVENTION
// ============================================================================

function InterventionConfirmation() {
  return (
    <ConfirmationPageShell maxWidth="5xl">
      <ConfirmationEntityHeader
        icon={Wrench}
        title="Fuite robinet cuisine"
        subtitle="APT-001 — Residence Les Acacias"
        iconColor="amber"
        badges={[
          { label: "Plomberie", variant: "outline" },
          { label: "Urgente", variant: "secondary", className: "border-amber-300 text-amber-700 bg-amber-50" },
        ]}
      />

      <ConfirmationSummaryBanner
        metrics={[
          { label: "Prestataires", value: "2", icon: <Users className="h-4 w-4" /> },
          { label: "Creneaux", value: "3", icon: <Calendar className="h-4 w-4" />, highlight: true },
          { label: "Photos", value: "2", icon: <FileText className="h-4 w-4" /> },
          { label: "Devis requis", value: "Oui", icon: <Wallet className="h-4 w-4" /> },
        ]}
      />

      {/* Desktop 2-col */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          <SectionCard>
            <ConfirmationSection title="Details de l'intervention" compact>
              <ConfirmationKeyValueGrid
                columns={2}
                pairs={[
                  { label: "Titre", value: "Fuite robinet cuisine" },
                  { label: "Categorie", value: "Plomberie" },
                  { label: "Urgence", value: "Urgente" },
                  { label: "Piece", value: "Cuisine" },
                  { label: "Description", value: "Le robinet de la cuisine fuit en continu. Tache d'humidite visible sous l'evier. Necessite une intervention rapide pour eviter les degats.", fullWidth: true },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Logement" compact>
              <ConfirmationKeyValueGrid
                columns={2}
                pairs={[
                  { label: "Type", value: "Appartement" },
                  { label: "Lot", value: "APT-001" },
                  { label: "Immeuble", value: "Residence Les Acacias" },
                  { label: "Etage", value: "1er" },
                  { label: "Adresse", value: "12 Rue des Lilas, 1050 Ixelles", fullWidth: true },
                  { label: "Locataire", value: "Jean Martin" },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          {/* Planning — accent card (primary tint for time-sensitive info) */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
            <ConfirmationSection title="Planification — Creneaux proposes" icon={<Calendar className="h-3.5 w-3.5" />} compact>
              <div className="space-y-2">
                {[
                  { date: "Lundi 14/04/2026", time: "09:00 - 12:00" },
                  { date: "Mardi 15/04/2026", time: "14:00 - 17:00" },
                  { date: "Mercredi 16/04/2026", time: "09:00 - 11:00" },
                ].map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-primary/10 bg-background px-3 py-2">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{slot.date}</span>
                    <span className="text-xs text-muted-foreground">{slot.time}</span>
                  </div>
                ))}
              </div>
            </ConfirmationSection>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <SectionCard>
            <ConfirmationSection title="Contacts assignes" compact>
              <ConfirmationContactGrid
                columns={2}
                groups={[
                  {
                    type: "Gestionnaires",
                    contacts: [{ id: "1", name: "Arthur Dupont", email: "arthur@seido.be" }],
                  },
                  {
                    type: "Prestataires",
                    contacts: [
                      { id: "3", name: "PlomberieExpress", email: "contact@plomberie.be", sublabel: "Plomberie" },
                      { id: "8", name: "AquaFix", email: "info@aquafix.be", sublabel: "Plomberie" },
                    ],
                  },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Instructions" compact>
              <ConfirmationKeyValueGrid
                columns={1}
                pairs={[
                  { label: "Message global", value: "Merci de contacter le locataire avant de vous presenter. Code porte: 4521B.", fullWidth: true },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Options" compact>
              <ConfirmationKeyValueGrid
                columns={1}
                pairs={[
                  { label: "Devis requis", value: "Oui — les prestataires doivent soumettre un devis" },
                  { label: "Mode d'assignation", value: "Groupe — tous les prestataires recoivent la demande" },
                  { label: "Confirmation requise", value: "Oui — chaque prestataire doit confirmer sa disponibilite" },
                ]}
              />
            </ConfirmationSection>
          </SectionCard>

          <SectionCard>
            <ConfirmationSection title="Photos jointes" compact>
              <div className="grid grid-cols-3 gap-2">
                {["fuite-robinet-1.jpg", "fuite-robinet-2.jpg"].map((name, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-2 flex flex-col items-center gap-1">
                    <div className="h-16 w-full rounded bg-muted/50 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">{name}</span>
                  </div>
                ))}
              </div>
            </ConfirmationSection>
          </SectionCard>
        </div>
      </div>
    </ConfirmationPageShell>
  )
}

// ============================================================================
// DEBUG PAGE
// ============================================================================

export default function DebugConfirmationsPage() {
  const [activePage, setActivePage] = useState<PageId>("immeuble")
  const [showSparseContact, setShowSparseContact] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed nav header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">DEBUG</Badge>
            <h1 className="text-sm font-bold">Pages de confirmation — Design Review</h1>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {PAGES.map((page) => {
              const Icon = page.icon
              return (
                <Button
                  key={page.id}
                  variant={activePage === page.id ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={() => setActivePage(page.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {page.label}
                </Button>
              )
            })}
          </div>
          {activePage === "contact" && (
            <div className="flex gap-2 mt-2">
              <Button
                variant={showSparseContact ? "outline" : "secondary"}
                size="sm"
                className="text-xs"
                onClick={() => setShowSparseContact(false)}
              >
                Complet (prestataire)
              </Button>
              <Button
                variant={showSparseContact ? "secondary" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setShowSparseContact(true)}
              >
                Minimal (locataire)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {activePage === "immeuble" && <ImmeubleConfirmation />}
        {activePage === "lot" && <LotConfirmation />}
        {activePage === "bail" && <BailConfirmation />}
        {activePage === "fournisseur" && <FournisseurConfirmation />}
        {activePage === "contact" && (showSparseContact ? <ContactConfirmationSparse /> : <ContactConfirmation />)}
        {activePage === "intervention" && <InterventionConfirmation />}
      </div>
    </div>
  )
}
