/**
 * Fix prospects from _prospects_scored.json:
 * 1. Decode HTML entities
 * 2. Fix invalid emails
 * 3. Clean phones (remove +33, multi-value in primary)
 * 4. Remove solo agents without company (keep only real companies)
 * 5. Fix phone primary field (must be single phone, not comma-separated)
 * 6. Fix scoring for "stagiaire-only" companies that got high scores
 * 7. Remove duplicate companies
 * Then regenerate clean MD + CSV
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const SALES_DIR = join(process.cwd(), 'docs/sales')
const prospects = JSON.parse(readFileSync(join(SALES_DIR, '_prospects_scored.json'), 'utf-8'))

function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function fixEntitiesDeep(obj) {
  if (!obj || typeof obj !== 'object') return
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') obj[key] = decodeEntities(obj[key])
    else if (Array.isArray(obj[key])) {
      for (let i = 0; i < obj[key].length; i++) {
        if (typeof obj[key][i] === 'string') obj[key][i] = decodeEntities(obj[key][i])
        else fixEntitiesDeep(obj[key][i])
      }
    } else if (typeof obj[key] === 'object') fixEntitiesDeep(obj[key])
  }
}

let fixes = { entities: 0, emails: 0, phones: 0, dupes: 0, solos: 0, scoring: 0 }

// Fix each prospect
for (const p of prospects) {
  fixEntitiesDeep(p)
  fixes.entities++

  // Fix primary phone: must be single, Belgian
  if (p.contact?.phone) {
    const phones = p.contact.phone.split(/[,;]/).map(s => s.trim()).filter(s => s.startsWith('+32'))
    p.contact.phone = phones[0] || ''
    if (phones.length > 1) fixes.phones++
  }

  // Clean allPhones: only +32, remove +33 and empty
  if (p.contact?.allPhones) {
    const before = p.contact.allPhones.length
    p.contact.allPhones = p.contact.allPhones
      .flatMap(ph => ph.split(/[,;]/).map(s => s.trim()))
      .filter(ph => ph.startsWith('+32') && ph.length > 8 && !/^\+32\s*\(\s*\)\s*$/.test(ph))
    p.contact.allPhones = [...new Set(p.contact.allPhones)]
    if (p.contact.allPhones.length !== before) fixes.phones++
    if (!p.contact.phone && p.contact.allPhones.length > 0) p.contact.phone = p.contact.allPhones[0]
  }

  // Fix emails
  if (p.contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contact.email)) {
    const valid = (p.contact.allEmails || []).find(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    p.contact.email = valid || ''
    fixes.emails++
  }
  if (p.contact?.allEmails) {
    p.contact.allEmails = p.contact.allEmails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  }
}

// Remove solo agents (key starts with solo_) — they clutter the sales list
const beforeCount = prospects.length
const filtered = prospects.filter(p => !p.normalizedName?.startsWith('solo_'))
fixes.solos = beforeCount - filtered.length
console.log(`Removed ${fixes.solos} solo agents (no company)`)

// Deduplicate by normalized name
const seen = new Map()
const deduped = []
for (const p of filtered) {
  const key = p.normalizedName || p.name.toLowerCase().trim()
  if (seen.has(key)) {
    fixes.dupes++
    // Merge: keep the one with higher score
    const existing = seen.get(key)
    if (p.score > existing.score) { seen.set(key, p); const idx = deduped.indexOf(existing); if (idx >= 0) deduped[idx] = p }
  } else {
    seen.set(key, p)
    deduped.push(p)
  }
}
console.log(`Removed ${fixes.dupes} duplicates`)

// Sort by score
deduped.sort((a, b) => b.score - a.score)

console.log(`\nFixes: entities=${fixes.entities}, phones=${fixes.phones}, emails=${fixes.emails}, solos=${fixes.solos}, dupes=${fixes.dupes}`)
console.log(`Final: ${deduped.length} companies`)

// Count tiers
const tiers = { A: [], B: [], C: [], D: [] }
for (const p of deduped) tiers[p.tier].push(p)
console.log(`Tiers: A=${tiers.A.length}, B=${tiers.B.length}, C=${tiers.C.length}, D=${tiers.D.length}`)

// ─── Generate MD ───
const totalAgents = deduped.reduce((s, p) => s + p.agentCount, 0)

// Software stats
const softwareStats = {}
for (const p of deduped) {
  for (const s of (p.websiteData?.software_detected || [])) {
    if (s === 'sap') continue
    softwareStats[s] = (softwareStats[s] || 0) + 1
  }
}
const topSoftware = Object.entries(softwareStats).sort((a, b) => b[1] - a[1])

const serviceStats = { gestion_locative: 0, syndic: 0, vente: 0, location: 0, commercial: 0 }
for (const p of deduped) {
  const svc = p.websiteData?.services
  if (svc) for (const k of Object.keys(serviceStats)) if (svc[k]) serviceStats[k]++
}

const communeStats = {}
for (const p of deduped) { const c = p.commune || 'Inconnu'; communeStats[c] = (communeStats[c] || 0) + 1 }
const topCommunes = Object.entries(communeStats).sort((a, b) => b[1] - a[1]).slice(0, 15)

const allPainPoints = {}
for (const p of deduped) {
  for (const pt of (p.googleData?.pain_points || [])) {
    const key = pt.toLowerCase().trim()
    if (key.length > 3) allPainPoints[key] = (allPainPoints[key] || 0) + 1
  }
}
const topPainPoints = Object.entries(allPainPoints).sort((a, b) => b[1] - a[1]).slice(0, 15)

const tierLabels = { A: 'HOT — Appeler en priorite', B: 'WARM — Leads qualifies', C: 'COOL — Sequence email', D: 'LOW — Basse priorite' }

let md = `# Prospects Qualifies — Campagne Cold Calling Bruxelles

**Date :** 27 mars 2026
**Source :** IPI (Institut Professionnel Immobilier) + enrichissement multi-sources
**Objectif :** Campagne SPIN Selling pour SEIDO — gestion immobiliere SaaS

---

## Vue d'ensemble

| | Compte | % |
|---|---|---|
| **Entreprises qualifiees** | **${deduped.length}** | 100% |
| Tier A — Hot (score 70+) | **${tiers.A.length}** | ${(tiers.A.length / deduped.length * 100).toFixed(1)}% |
| Tier B — Warm (score 45-69) | ${tiers.B.length} | ${(tiers.B.length / deduped.length * 100).toFixed(1)}% |
| Tier C — Cool (score 25-44) | ${tiers.C.length} | ${(tiers.C.length / deduped.length * 100).toFixed(1)}% |
| Tier D — Low (score <25) | ${tiers.D.length} | ${(tiers.D.length / deduped.length * 100).toFixed(1)}% |
| **Agents IPI individuels** | **${totalAgents}** | — |

### Capacite d'appels estimee

| Tier | Entreprises | Duree estimee (10 appels/jour) |
|---|---|---|
| Tier A uniquement | ${tiers.A.length} | ~${Math.ceil(tiers.A.length / 10)} jours |
| Tier A + B | ${tiers.A.length + tiers.B.length} | ~${Math.ceil((tiers.A.length + tiers.B.length) / 10)} jours |
| Tous tiers | ${deduped.length} | ~${Math.ceil(deduped.length / 10)} jours |

---

## Insights strategiques

### Services detectes (sites web analyses)

| Service | Entreprises | Pertinence SEIDO |
|---|---|---|
| Gestion locative | ${serviceStats.gestion_locative} | Cible directe |
| Syndic | ${serviceStats.syndic} | Cible directe |
| Location | ${serviceStats.location} | Indicateur d'activite locative |
| Vente | ${serviceStats.vente} | Transaction pure (secondaire) |
| Commercial | ${serviceStats.commercial} | Segment different |

### Logiciels concurrents detectes

| Logiciel | Entreprises | Angle sales |
|---|---|---|
`
for (const [sw, count] of topSoftware) {
  const angle = sw === 'whise' ? 'Concurrent #1 — preparer pitch migration'
    : sw === 'omnicasa' ? 'Concurrent #2 — meme angle migration'
    : sw === 'bricks' ? 'PropTech concurrent — differencier par workflow'
    : sw === 'hubspot' ? 'CRM generaliste — manque le metier immo'
    : sw === 'salesforce' ? 'Enterprise CRM — trop lourd pour PME'
    : 'Portail / outil secondaire'
  md += `| ${sw.charAt(0).toUpperCase() + sw.slice(1)} | ${count} | ${angle} |\n`
}

md += `
### Pain points detectes (avis Google)

| Probleme | Frequence | Question SPIN associee |
|---|---|---|
`
for (const [pp, count] of topPainPoints) {
  const spin = pp.includes('communic') || pp.includes('repond') ? '"Comment vos locataires vous contactent-ils aujourd\'hui ?"'
    : pp.includes('factur') || pp.includes('compt') ? '"Comment gerez-vous la facturation et le suivi financier ?"'
    : pp.includes('delai') || pp.includes('attente') || pp.includes('retard') ? '"Quel est votre delai moyen de traitement d\'une demande ?"'
    : pp.includes('suivi') || pp.includes('gestion') ? '"Comment suivez-vous l\'avancement des interventions ?"'
    : '"Comment circule l\'information entre vous, vos prestataires et vos locataires ?"'
  md += `| ${pp} | ${count}x | ${spin} |\n`
}

md += `
### Repartition geographique

| Commune | Entreprises |
|---|---|
`
for (const [c, n] of topCommunes) md += `| ${c} | ${n} |\n`

md += `
---

## Scoring — Methodologie

| Critere | Points max | Detail |
|---|---|---|
| **Statut IPI** | 30 | Courtier+Syndic titulaire (30) > Syndic titulaire (25) > Courtier titulaire (15) > Stagiaire (5) |
| **Taille & Activite** | 25 | Gestion locative sur site (+8), Syndic sur site (+7), Nb agents 2-5 (+5) / 6+ (+10), Immoweb locations (+5/+10), BCE actif (+5) |
| **Pain Points** | 15 | Note Google <3.5 (+10), 3.5-4.0 (+5), Pain points documentes (+5/theme, max 15) |
| **Maturite digitale** | 15 | Site actif (+3), Pas de concurrent (+7) / Concurrent detecte (+5), Email (+2), Tel (+3) |
| **Contactabilite** | 15 | Tel direct (+5), Email (+5), Contacts supplementaires sur site (+3), Multi-canaux (+2) |
| **TOTAL** | **100** | |

**Tiers :** A (70+) = Hot | B (45-69) = Warm | C (25-44) = Cool | D (<25) = Low

---

`

for (const tier of ['A', 'B', 'C', 'D']) {
  const list = tiers[tier]
  if (list.length === 0) continue

  md += `## Tier ${tier} — ${tierLabels[tier]} (${list.length} entreprises)\n\n`

  for (const p of list) {
    md += `### ${p.name}\n`
    md += `**Score : ${p.score}/100** | **Statut :** ${p.statutLabel} | **Agents :** ${p.agentCount} | **Commune :** ${p.commune || '—'}\n\n`

    const phone = p.contact?.phone || '—'
    const email = p.contact?.email || '—'
    const site = p.contact?.site_web || '—'
    md += `| Contact | |\n|---|---|\n`
    md += `| Telephone | ${phone} |\n`
    if (p.contact?.allPhones?.length > 1) md += `| Autres tel. | ${p.contact.allPhones.slice(1, 4).join(', ')} |\n`
    md += `| Email | ${email} |\n`
    if (p.contact?.allEmails?.length > 1) md += `| Autres emails | ${p.contact.allEmails.slice(1, 4).join(', ')} |\n`
    md += `| Site web | ${site} |\n`
    if (p.agentNames?.length > 0) md += `| Agents IPI | ${p.agentNames.join(', ')} |\n`
    md += '\n'

    const lines = []
    if (p.services) lines.push(`**Services :** ${p.services}`)
    const sw = (p.websiteData?.software_detected || []).filter(s => s !== 'sap')
    if (sw.length > 0) lines.push(`**Logiciel actuel :** ${sw.join(', ')}`)
    if (p.googleData) {
      const g = p.googleData
      let gl = '**Avis Google :** '
      if (g.google_rating) { gl += `${g.google_rating}/5`; if (g.google_review_count) gl += ` (${g.google_review_count} avis)` }
      if (g.pain_points?.length > 0) gl += (g.google_rating ? ' — ' : '') + `Pain points : ${g.pain_points.join(', ')}`
      if (g.positive_points?.length > 0) gl += ` | Points positifs : ${g.positive_points.join(', ')}`
      if (gl !== '**Avis Google :** ') lines.push(gl)
    }
    if (p.immowebData) {
      const im = p.immowebData
      let il = '**Immoweb :** '
      if (im.total_listings) { il += `${im.total_listings} annonces`; if (im.rental_listings) il += ` (${im.rental_listings} loc, ${im.sale_listings||0} vente)` }
      if (im.estimated_portfolio) il += ` — Portfolio : ~${im.estimated_portfolio} lots`
      if (il !== '**Immoweb :** ') lines.push(il)
    }
    if (p.bceData) {
      const b = p.bceData; const parts = []
      if (b.legal_form) parts.push(b.legal_form)
      if (b.creation_date) { const y = b.creation_date.split('-')[0]; parts.push(`creee ${y}`) }
      if (b.bce_number) parts.push(`n. ${b.bce_number}`)
      if (b.nace_code) parts.push(`NACE ${b.nace_code}`)
      if (b.nace_description) parts.push(`(${b.nace_description})`)
      if (parts.length > 0) lines.push(`**BCE :** ${parts.join(', ')}`)
    }
    if (lines.length > 0) md += lines.join('\n') + '\n\n'

    if (p.spinAngle) {
      const angle = p.spinAngle.replace(/^"|"$/g, '')
      md += `> **Angle SPIN :** ${angle}\n\n`
    }

    md += `<details><summary>Detail du score (${p.score}/100)</summary>\n\n`
    md += `| Critere | Score |\n|---|---|\n`
    md += `| Statut IPI | ${p.breakdown.statutScore}/30 |\n`
    md += `| Taille & Activite | ${p.breakdown.sizeScore}/25 |\n`
    md += `| Pain Points | ${p.breakdown.painScore}/15 |\n`
    md += `| Maturite digitale | ${p.breakdown.digitalScore}/15 |\n`
    md += `| Contactabilite | ${p.breakdown.contactScore}/15 |\n`
    md += `</details>\n\n---\n\n`
  }
}

md += `\n---\n\n*Genere le ${new Date().toISOString().split('T')[0]} — Source : IPI + Sites web + Google Reviews + Immoweb + BCE/KBO*\n`
writeFileSync(join(SALES_DIR, 'PROSPECTS_QUALIFIES_BRUXELLES.md'), md, 'utf-8')

// ─── Generate CSV ───
const csvEsc = (v) => {
  if (!v) return ''
  const s = String(v)
  return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) ? '"' + s.replace(/"/g, '""') + '"' : s
}

const headers = ['Score','Tier','Entreprise','Statut_IPI','Nb_Agents','Agents_Noms','Commune','Adresse','Telephone_Principal','Tous_Telephones','Email_Principal','Tous_Emails','Site_Web','Services','Gestion_Locative','Syndic','Vente','Location','Commercial','Logiciel_Actuel','Google_Note','Google_Nb_Avis','Pain_Points','Points_Positifs','Immoweb_Annonces_Total','Immoweb_Location','Immoweb_Vente','Portfolio_Estime','Immoweb_Activite','BCE_Numero','BCE_Forme_Juridique','BCE_Date_Creation','BCE_NACE','BCE_Description_NACE','Score_Statut','Score_Taille','Score_PainPoints','Score_Digital','Score_Contact','Angle_SPIN','Fiche_IPI_URLs']

let csvOut = headers.join(',') + '\n'
for (const p of deduped) {
  const svc = p.websiteData?.services || {}
  const sw2 = (p.websiteData?.software_detected || []).filter(s => s !== 'sap')
  const g = p.googleData || {}; const im = p.immowebData || {}; const b = p.bceData || {}; const br = p.breakdown || {}
  const ipiUrls = (p.agentIds || []).map((id, idx) => {
    const agent = p.agentNames?.[idx] || ''
    const slug = agent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `https://www.ipi.be/agent-immobilier/${slug}-${id}`
  }).join(' | ')

  csvOut += [
    p.score, p.tier, csvEsc(p.name), csvEsc(p.statutLabel), p.agentCount,
    csvEsc((p.agentNames||[]).join('; ')), csvEsc(p.commune), '',
    csvEsc(p.contact?.phone), csvEsc((p.contact?.allPhones||[]).join('; ')),
    csvEsc(p.contact?.email), csvEsc((p.contact?.allEmails||[]).join('; ')),
    csvEsc(p.contact?.site_web), csvEsc(p.services),
    svc.gestion_locative?'Oui':'Non', svc.syndic?'Oui':'Non', svc.vente?'Oui':'Non', svc.location?'Oui':'Non', svc.commercial?'Oui':'Non',
    csvEsc(sw2.join('; ')),
    g.google_rating||'', g.google_review_count||'',
    csvEsc((g.pain_points||[]).join('; ')), csvEsc((g.positive_points||[]).join('; ')),
    im.total_listings||'', im.rental_listings||'', im.sale_listings||'', im.estimated_portfolio||'', csvEsc(im.activity_level),
    csvEsc(b.bce_number), csvEsc(b.legal_form), csvEsc(b.creation_date), csvEsc(b.nace_code), csvEsc(b.nace_description),
    br.statutScore||0, br.sizeScore||0, br.painScore||0, br.digitalScore||0, br.contactScore||0,
    csvEsc((p.spinAngle||'').replace(/^"|"$/g, '')), csvEsc(ipiUrls)
  ].join(',') + '\n'
}
writeFileSync(join(SALES_DIR, 'PROSPECTS_QUALIFIES_BRUXELLES.csv'), csvOut, 'utf-8')

// Save clean JSON too
writeFileSync(join(SALES_DIR, '_prospects_scored.json'), JSON.stringify(deduped, null, 2), 'utf-8')

console.log(`\nOutput: ${deduped.length} companies → MD + CSV + JSON`)
