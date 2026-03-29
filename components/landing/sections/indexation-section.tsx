'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Calculator, Mail, Building2, TrendingUp, Scale, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { calculateIndexation } from '@/lib/indexation/calculate'
import type { IndexationInput, IndexationOutcome, Region, PebLabel, BailType } from '@/lib/indexation/types'

// ─── PEB options per region ──────────────────────────────────

const PEB_OPTIONS_STANDARD: { value: PebLabel; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
  { value: 'inconnu', label: 'Inconnu' },
]

const PEB_OPTIONS_FLANDRE: { value: PebLabel; label: string }[] = [
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'inconnu', label: 'Absent / Inconnu' },
]

// ─── Component ───────────────────────────────────────────────

export function IndexationSection() {
  // Form state
  const [bailType, setBailType] = useState<BailType>('habitation')
  const [region, setRegion] = useState<Region | ''>('')
  const [peb, setPeb] = useState<PebLabel | ''>('')
  const [loyerBase, setLoyerBase] = useState('')
  const [dateSignature, setDateSignature] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [bailNonEnregistre, setBailNonEnregistre] = useState(false)

  // Result state
  const [result, setResult] = useState<IndexationOutcome | null>(null)

  // Email capture state
  const [email, setEmail] = useState('')
  const [nombreBiens, setNombreBiens] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<'lettre' | 'portfolio' | null>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)

  const pebOptions = region === 'flandre' ? PEB_OPTIONS_FLANDRE : PEB_OPTIONS_STANDARD
  const showPeb = bailType === 'habitation'
  const showBailNonEnregistre = bailType === 'habitation'

  const handleCalculate = useCallback(() => {
    if (!region || !loyerBase || !dateSignature || !dateDebut) return
    if (showPeb && !peb) return

    const input: IndexationInput = {
      bailType,
      region,
      peb: showPeb ? (peb as PebLabel) : null,
      loyerBase: parseFloat(loyerBase),
      dateSignature: new Date(dateSignature),
      dateDebut: new Date(dateDebut),
      bailNonEnregistre,
    }

    setResult(calculateIndexation(input))
  }, [bailType, region, peb, loyerBase, dateSignature, dateDebut, bailNonEnregistre, showPeb])

  const handleEmailSubmit = useCallback(async (type: 'lettre_indexation' | 'rapport_portfolio') => {
    if (!email || !consent || !result || !result.success) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type,
          calcul: {
            loyer: parseFloat(loyerBase),
            region,
            peb: showPeb ? peb : null,
            nouveauLoyer: result.result.nouveauLoyer,
            pourcentage: result.result.pourcentage,
            formule: result.result.formule,
          },
          nombreBiens: type === 'rapport_portfolio' && nombreBiens ? parseInt(nombreBiens) : undefined,
          honeypot: honeypotRef.current?.value ?? '',
          consent: true,
        }),
      })

      if (response.ok) {
        setSubmitted(type === 'lettre_indexation' ? 'lettre' : 'portfolio')
      }
    } catch {
      // Silent fail — lead might still be captured
    } finally {
      setSubmitting(false)
    }
  }, [email, consent, result, loyerBase, region, peb, showPeb, nombreBiens])

  const isFormValid = region && loyerBase && dateSignature && dateDebut && (bailType === 'commercial' || peb)

  return (
    <section id="indexation" className="relative z-10 py-16 md:py-24" aria-labelledby="heading-indexation">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 mb-4">
            <Calculator className="h-4 w-4 text-blue-300" />
            <span className="text-sm text-blue-300 font-medium">Outil gratuit</span>
          </div>
          <h2 id="heading-indexation" className="text-3xl md:text-4xl font-bold text-white mb-4">
            Calculez l&apos;indexation de votre loyer
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Résultat instantané avec les derniers indices santé. Couvre les 3 régions belges et les corrections PEB.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Calculator Card */}
          <div className="rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm p-6 md:p-8">

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

              {/* Type de bail */}
              <div className="md:col-span-2">
                <Label className="text-white/80 text-sm mb-2 block">Type de bail</Label>
                <div className="flex gap-3">
                  <Button
                    variant={bailType === 'habitation' ? 'default' : 'outline'}
                    size="sm"
                    className={bailType === 'habitation'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-white/20 text-white/70 hover:bg-white/10 bg-transparent'}
                    onClick={() => { setBailType('habitation'); setPeb('') }}
                  >
                    Habitation
                  </Button>
                  <Button
                    variant={bailType === 'commercial' ? 'default' : 'outline'}
                    size="sm"
                    className={bailType === 'commercial'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-white/20 text-white/70 hover:bg-white/10 bg-transparent'}
                    onClick={() => { setBailType('commercial'); setPeb(''); setBailNonEnregistre(false) }}
                  >
                    Commercial
                  </Button>
                </div>
              </div>

              {/* Région */}
              <div>
                <Label className="text-white/80 text-sm mb-2 block">Région</Label>
                <Select value={region} onValueChange={(v) => { setRegion(v as Region); setPeb('') }}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Choisir une région" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bruxelles">Bruxelles</SelectItem>
                    <SelectItem value="wallonie">Wallonie</SelectItem>
                    <SelectItem value="flandre">Flandre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PEB / EPC */}
              {showPeb && (
                <div>
                  <Label className="text-white/80 text-sm mb-2 block">
                    Certificat {region === 'flandre' ? 'EPC' : 'PEB'}
                  </Label>
                  <Select value={peb} onValueChange={(v) => setPeb(v as PebLabel)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Choisir le certificat" />
                    </SelectTrigger>
                    <SelectContent>
                      {pebOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Loyer de base */}
              <div>
                <Label className="text-white/80 text-sm mb-2 block">
                  Loyer de base (hors charges)
                  <span className="text-white/40 text-xs ml-1" title="Montant du loyer de base, hors provisions pour charges et frais">?</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    placeholder="850"
                    value={loyerBase}
                    onChange={(e) => setLoyerBase(e.target.value)}
                    className="bg-white/10 border-white/20 text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">€</span>
                </div>
              </div>

              {/* Date signature */}
              <div>
                <Label className="text-white/80 text-sm mb-2 block">Date de signature du bail</Label>
                <Input
                  type="date"
                  value={dateSignature}
                  onChange={(e) => setDateSignature(e.target.value)}
                  className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
                />
              </div>

              {/* Date début */}
              <div>
                <Label className="text-white/80 text-sm mb-2 block">Date de début du bail</Label>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
                />
              </div>

              {/* Bail non enregistré */}
              {showBailNonEnregistre && (
                <div className="md:col-span-2 flex items-center gap-2">
                  <Checkbox
                    id="bail-non-enregistre"
                    checked={bailNonEnregistre}
                    onCheckedChange={(v) => setBailNonEnregistre(v === true)}
                    className="border-white/30 data-[state=checked]:bg-amber-500"
                  />
                  <Label htmlFor="bail-non-enregistre" className="text-white/70 text-sm cursor-pointer">
                    Mon bail n&apos;est pas enregistré
                  </Label>
                </div>
              )}
            </div>

            {/* Calculate button */}
            <Button
              onClick={handleCalculate}
              disabled={!isFormValid}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl disabled:opacity-40"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Calculer l&apos;indexation
            </Button>

            {/* Edge case note */}
            <p className="text-white/30 text-xs mt-3 text-center">
              Ce simulateur utilise l&apos;indice santé. Si votre bail prévoit un autre indice ou une dérogation, ce calcul ne s&apos;applique pas.
            </p>
          </div>

          {/* ─── Result ─── */}
          {result && (
            <div className="mt-8 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm p-6 md:p-8">
              {!result.success ? (
                /* Error state */
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-amber-300 mb-1">Indexation non applicable</h3>
                    <p className="text-white/70">{result.error.message}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Main result */}
                  <div className="text-center mb-6">
                    <p className="text-white/50 text-sm mb-1">Votre nouveau loyer</p>
                    <p className="text-4xl md:text-5xl font-bold text-white mb-2">
                      {result.result.nouveauLoyer.toFixed(2)} <span className="text-2xl text-white/60">€/mois</span>
                    </p>
                    <p className="text-blue-300 font-medium">
                      +{result.result.pourcentage}% par rapport à {parseFloat(loyerBase).toFixed(2)} €
                    </p>
                  </div>

                  {/* Calculation summary */}
                  <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-white/40">Indice de départ</p>
                        <p className="text-white font-medium">{result.result.indiceDepart.value} <span className="text-white/40">({result.result.indiceDepart.mois})</span></p>
                      </div>
                      <div>
                        <p className="text-white/40">Nouvel indice</p>
                        <p className="text-white font-medium">{result.result.nouvelIndice.value} <span className="text-white/40">({result.result.nouvelIndice.mois})</span></p>
                      </div>
                      <div>
                        <p className="text-white/40">Correction PEB</p>
                        <p className="text-white font-medium">
                          {result.result.correctionPEB.type === 'aucune' ? 'Aucune' :
                           result.result.correctionPEB.type === 'facteur_correctif' ? `× ${result.result.correctionPEB.facteur.toFixed(4)}` :
                           result.result.correctionPEB.type === 'bloquee' ? 'Bloquée' :
                           'Loyer adapté'}
                        </p>
                      </div>
                    </div>
                    <p className="text-white/30 text-xs mt-3 font-mono">{result.result.formule}</p>
                  </div>

                  {/* Detailed explanation accordion */}
                  <Accordion type="single" collapsible className="mb-6">
                    <AccordionItem value="details" className="border-white/10">
                      <AccordionTrigger className="text-white/80 hover:text-white text-sm">
                        Comment ce calcul est-il effectué ?
                      </AccordionTrigger>
                      <AccordionContent className="text-white/60 text-sm space-y-4">
                        {/* Formula */}
                        <div className="flex gap-3">
                          <TrendingUp className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white/80 font-medium mb-1">La formule</p>
                            <p>Le nouveau loyer est calculé en multipliant le loyer de base par le rapport entre le nouvel indice santé et l&apos;indice de départ.</p>
                          </div>
                        </div>

                        {/* Indices */}
                        <div className="flex gap-3">
                          <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white/80 font-medium mb-1">Vos indices</p>
                            <p>
                              L&apos;indice de départ ({result.result.indiceDepart.value}) correspond au mois précédant
                              {region === 'flandre' ? ' le début du bail' : ' la signature du bail'} ({result.result.indiceDepart.mois}).
                              Le nouvel indice ({result.result.nouvelIndice.value}) est le dernier indice santé disponible ({result.result.nouvelIndice.mois}).
                            </p>
                          </div>
                        </div>

                        {/* PEB correction */}
                        <div className="flex gap-3">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white/80 font-medium mb-1">Correction PEB</p>
                            <p>{result.result.correctionPEB.explication}</p>
                          </div>
                        </div>

                        {/* Legal basis */}
                        <div className="flex gap-3">
                          <Scale className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white/80 font-medium mb-1">Base légale</p>
                            <p>{result.result.baseLegale}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Disclaimer */}
                  <p className="text-white/30 text-xs mb-6 text-center">
                    Cet outil fournit une estimation indicative de l&apos;indexation de votre loyer sur base de la législation en vigueur.
                    Il ne constitue pas un conseil juridique.
                  </p>

                  {/* ─── Email capture CTAs ─── */}
                  {!submitted ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Lettre d'indexation */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Mail className="w-5 h-5 text-blue-400" />
                            <h4 className="text-white font-semibold text-sm">Recevoir la lettre d&apos;indexation</h4>
                          </div>
                          <p className="text-white/50 text-xs mb-3">
                            Recevez un modèle de lettre pré-rempli avec vos données par email.
                          </p>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white/10 border-white/20 text-white mb-3"
                          />
                          <Button
                            onClick={() => handleEmailSubmit('lettre_indexation')}
                            disabled={!email || !consent || submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-40"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                            Envoyer la lettre
                          </Button>
                        </div>

                        {/* Portfolio */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-5 h-5 text-blue-400" />
                            <h4 className="text-white font-semibold text-sm">Calculer pour tout mon portefeuille</h4>
                          </div>
                          <p className="text-white/50 text-xs mb-3">
                            Indexation automatique de tous vos biens avec SEIDO.
                          </p>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white/10 border-white/20 text-white mb-2"
                          />
                          <Input
                            type="number"
                            min="1"
                            placeholder="Nombre de biens"
                            value={nombreBiens}
                            onChange={(e) => setNombreBiens(e.target.value)}
                            className="bg-white/10 border-white/20 text-white mb-3"
                          />
                          <Button
                            onClick={() => handleEmailSubmit('rapport_portfolio')}
                            disabled={!email || !consent || submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-40"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Building2 className="w-4 h-4 mr-2" />}
                            Recevoir les infos
                          </Button>
                        </div>
                      </div>

                      {/* RGPD consent */}
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="consent"
                          checked={consent}
                          onCheckedChange={(v) => setConsent(v === true)}
                          className="border-white/30 data-[state=checked]:bg-blue-600 mt-0.5"
                        />
                        <Label htmlFor="consent" className="text-white/50 text-xs cursor-pointer leading-relaxed">
                          J&apos;accepte de recevoir cet email. <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Politique de confidentialité</a>
                        </Label>
                      </div>

                      {/* Honeypot — invisible to users */}
                      <div className="absolute -left-[9999px]" aria-hidden="true">
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" ref={honeypotRef} />
                      </div>
                    </div>
                  ) : (
                    /* Success state */
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                      <p className="text-white font-semibold mb-1">
                        {submitted === 'lettre' ? 'Lettre envoyée !' : 'Demande envoyée !'}
                      </p>
                      <p className="text-white/50 text-sm">
                        {submitted === 'lettre'
                          ? 'Vérifiez votre boîte mail pour recevoir votre lettre d\'indexation pré-remplie.'
                          : 'Notre équipe vous contactera avec les détails pour indexer tout votre portefeuille.'
                        }
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
