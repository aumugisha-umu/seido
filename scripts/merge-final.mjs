/**
 * Final merge: base agents + 4 enrichment axes → scored prospects → MD + CSV
 * Fixes: HTML entities, invalid emails/phones, SAP false positives
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SALES_DIR = join(process.cwd(), 'docs/sales')

// ─── Helpers ───
function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
function deepDecode(obj) {
  if (!obj || typeof obj !== 'object') return
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string') obj[k] = decodeEntities(obj[k])
    else if (Array.isArray(obj[k])) obj[k].forEach((v, i) => { if (typeof v === 'string') obj[k][i] = decodeEntities(v); else deepDecode(v) })
    else if (typeof obj[k] === 'object') deepDecode(obj[k])
  }
}
const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
function cleanPhone(raw) {
  if (!raw) return ''
  let p = raw.trim()
  // Convert old format: 02/217.00.32 → +32 2 217 00 32
  p = p.replace(/^0(\d)\/(\d{3})\.(\d{2})\.(\d{2})$/, '+32 $1 $2 $3 $4')
  // Remove duplicate +32 prefix: +32 (4) +32483534308 → +32483534308
  const dupMatch = p.match(/\+32\s*\(\d\)\s*(\+32\d+)/)
  if (dupMatch) p = dupMatch[1]
  // Remove parentheses and extra spaces
  p = p.replace(/[()]/g, '').replace(/\s+/g, ' ').trim()
  return p
}
const isValidPhone = p => p && /^\+32[\s\d]{8,}$/.test(p) && p.replace(/\s/g, '').length >= 11
const norm = s => (s || '').toLowerCase().trim().replace(/\s+(sa|srl|nv|bv|sprl|bvba)$/i, '').trim()

// ─── Parse base agents ───
console.log('Parsing consolidated MD...')
const consolMD = readFileSync(join(SALES_DIR, 'AGENTS_IMMOBILIERS_BRUXELLES_CONSOLIDE.md'), 'utf-8')
const agents = []
let curPage = 0
for (const line of consolMD.split('\n')) {
  const pm = line.match(/^## Page (\d+)/); if (pm) { curPage = parseInt(pm[1]); continue }
  const fm = line.match(/\[Fiche\]\((https:\/\/[^)]+)\)/); if (!fm || !line.startsWith('|')) continue
  const raw = line.slice(1, line.lastIndexOf('|')).split('|'); if (raw.length < 8) continue
  agents.push({
    nom: decodeEntities(raw[0].trim()), id: raw[1].trim(),
    entreprise: decodeEntities(raw[2].trim()), adresse: decodeEntities(raw[3].trim()),
    telephone: raw[4].trim(), email: raw[5].trim(),
    site_web: raw[6].trim(), statut: decodeEntities(raw[7].trim()), url: fm[1], page: curPage
  })
}
console.log(`  ${agents.length} agents`)

// ─── Load enrichments ───
const loadJSON = (name) => { const p = join(SALES_DIR, name); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : [] }
const websiteData = loadJSON('_enrichment_websites.json')
const googleData = loadJSON('_enrichment_google.json')
const immowebData = loadJSON('_enrichment_immoweb.json')
const bceData = loadJSON('_enrichment_bce.json')
console.log(`  Enrichments: websites=${websiteData.length}, google=${googleData.length}, immoweb=${immowebData.length}, bce=${bceData.length}`)

// Index by agent ID
const wsById = new Map(); for (const w of websiteData) wsById.set(w.id, w)

// Index by company name (normalized) — try multiple normalizations for fuzzy match
function matchCompany(enrichArr) {
  const map = new Map()
  for (const item of enrichArr) {
    const names = [item.entreprise, item.name, item.company].filter(Boolean)
    for (const n of names) {
      map.set(norm(n), item)
      map.set(n.toLowerCase().trim(), item)
    }
    // Also index by agent_ids
    for (const id of (item.agent_ids || [])) map.set(`id:${id}`, item)
  }
  return map
}
const googleMap = matchCompany(googleData)
const immowebMap = matchCompany(immowebData)
const bceMap = matchCompany(bceData)

// ─── Group by company ───
const companyMap = new Map()
for (const a of agents) {
  const key = (a.entreprise && a.entreprise !== '—' && a.entreprise !== '[Non disponible]')
    ? norm(a.entreprise) : null
  if (!key) continue // skip solo agents without company
  if (!companyMap.has(key)) companyMap.set(key, { name: a.entreprise, agents: [], originalName: a.entreprise })
  companyMap.get(key).agents.push(a)
}
console.log(`  ${companyMap.size} unique companies (${agents.length - Array.from(companyMap.values()).reduce((s,c) => s+c.agents.length, 0)} solo agents excluded)`)

// ─── Build & score prospects ───
const prospects = []
for (const [key, company] of companyMap) {
  const agentList = company.agents
  // Sort to get best contact first
  agentList.sort((a, b) => {
    const score = ag => (ag.telephone ? 1 : 0) + (ag.email ? 1 : 0) + (ag.site_web && ag.site_web !== '—' ? 1 : 0)
    return score(b) - score(a)
  })
  const best = agentList[0]

  // Statut analysis
  const statuts = agentList.map(a => a.statut)
  const hasCST = statuts.some(s => s.includes('Courtier') && s.includes('Syndic') && s.includes('titulaire'))
  const hasST = statuts.some(s => s.includes('Syndic') && s.includes('titulaire'))
  const hasCT = statuts.some(s => s.includes('Courtier') && s.includes('titulaire'))
  const hasStag = statuts.some(s => s.includes('stagiaire'))

  let statutLabel = hasCST ? 'Courtier+Syndic titulaire' : hasST ? 'Syndic titulaire' : hasCT ? 'Courtier titulaire' : statuts[0] || 'Inconnu'
  if (hasStag && !statutLabel.includes('stagiaire')) statutLabel += ' + stagiaires'

  // ── SCORING ──
  // A. Statut (0-30)
  const statutScore = hasCST ? 30 : hasST ? 25 : hasCT ? 15 : hasStag ? 5 : 0

  // Website enrichment: find from any agent in company
  const ws = agentList.map(a => wsById.get(a.id)).find(w => w?.site_active) || null
  const svc = ws?.services || {}

  // B. Size & Activity (0-25)
  let sizeScore = 0
  if (svc.gestion_locative) sizeScore += 8
  if (svc.syndic) sizeScore += 7
  if (agentList.length >= 6) sizeScore += 10
  else if (agentList.length >= 2) sizeScore += 5
  // Immoweb bonus
  const imData = immowebMap.get(key) || immowebMap.get(norm(company.originalName)) || immowebMap.get(`id:${best.id}`)
  if (imData?.rental_listings >= 30) sizeScore += 10
  else if (imData?.rental_listings >= 10) sizeScore += 5
  // BCE bonus
  const bcData = bceMap.get(key) || bceMap.get(norm(company.originalName)) || bceMap.get(`id:${best.id}`)
  if (bcData?.status === 'active') sizeScore += 5
  sizeScore = Math.min(sizeScore, 25)

  // C. Pain Points (0-15)
  const gData = googleMap.get(key) || googleMap.get(norm(company.originalName)) || googleMap.get(`id:${best.id}`)
  let painScore = 5 // default unknown
  if (gData) {
    painScore = 0
    if (gData.google_rating && gData.google_rating < 3.5) painScore += 10
    else if (gData.google_rating && gData.google_rating < 4.0) painScore += 5
    const ppCount = (gData.pain_points || []).length
    painScore += Math.min(ppCount * 5, 15)
  }
  painScore = Math.min(painScore, 15)

  // D. Digital Maturity (0-15)
  let digitalScore = 0
  if (ws?.site_active) digitalScore += 3
  const software = (ws?.software_detected || []).filter(s => s !== 'sap')
  if (software.length > 0) digitalScore += 5; else if (ws) digitalScore += 7
  if (best.email) digitalScore += 2
  if (best.telephone) digitalScore += 3
  digitalScore = Math.min(digitalScore, 15)

  // E. Contactability (0-15)
  let contactScore = 0
  if (best.telephone) contactScore += 5
  if (best.email) contactScore += 5
  if (ws?.extra_contacts?.emails?.length > 0 || ws?.extra_contacts?.phones?.length > 0) contactScore += 3
  if (best.telephone && best.email) contactScore += 2
  contactScore = Math.min(contactScore, 15)

  const score = statutScore + sizeScore + painScore + digitalScore + contactScore
  const tier = score >= 70 ? 'A' : score >= 45 ? 'B' : score >= 25 ? 'C' : 'D'

  // Services label
  const serviceNames = []
  if (svc.gestion_locative) serviceNames.push('Gestion locative')
  if (svc.syndic) serviceNames.push('Syndic')
  if (svc.vente) serviceNames.push('Vente')
  if (svc.location) serviceNames.push('Location')
  if (svc.commercial) serviceNames.push('Commercial')

  // SPIN angle
  let spinAngle
  if (gData?.pain_points?.length > 0) {
    spinAngle = `Vos clients mentionnent "${gData.pain_points[0]}" — comment gerez-vous le suivi des demandes aujourd'hui ?`
  } else if (software.length > 0) {
    spinAngle = `${software[0]} couvre-t-il bien votre workflow d'interventions et de suivi locataire ?`
  } else if (svc.syndic) {
    spinAngle = "Comment gerez-vous le volume de demandes de vos coproprietaires ?"
  } else {
    spinAngle = "Comment circule l'information quand un locataire signale un probleme ?"
  }

  // Commune
  const addrMatch = best.adresse?.match(/(\d{4})\s+([A-Za-zÀ-ÿ\-\s]+)$/)
  const commune = addrMatch ? addrMatch[2].trim() : ''

  // Clean phones
  let allPhones = [...new Set(agentList.map(a => a.telephone).filter(Boolean))]
    .flatMap(p => p.split(/[,;]/).map(s => s.trim()))
    .map(cleanPhone)
    .filter(isValidPhone)
  allPhones = [...new Set(allPhones)]
  const primaryPhone = allPhones[0] || ''

  // Clean emails
  let allEmails = [...new Set(agentList.map(a => a.email).filter(Boolean))]
    .flatMap(e => e.split(/[,;]/).map(s => s.trim()))
    .filter(isValidEmail)
  allEmails = [...new Set(allEmails)]
  const primaryEmail = allEmails[0] || ''

  // Clean site_web
  let siteWeb = best.site_web || ''
  if (siteWeb === '—') siteWeb = ''
  if (siteWeb) siteWeb = siteWeb.split(/[,;]/)[0].trim()

  // Decode entities in google data
  if (gData) deepDecode(gData)
  if (imData) deepDecode(imData)
  if (bcData) deepDecode(bcData)

  prospects.push({
    name: company.originalName,
    normalizedName: key,
    score, tier,
    breakdown: { statutScore, sizeScore, painScore, digitalScore, contactScore },
    agentCount: agentList.length,
    agentsRaw: agentList, // individual agent data for CSV export
    agentIds: agentList.map(a => a.id),
    agentNames: agentList.map(a => a.nom),
    statutLabel, commune,
    contact: { phone: primaryPhone, allPhones, email: primaryEmail, allEmails, site_web: siteWeb },
    services: serviceNames.join(', '),
    websiteData: ws ? { site_active: ws.site_active, title: ws.title, services: ws.services, software_detected: software, extra_contacts: ws.extra_contacts, team_size_estimate: ws.team_size_estimate } : null,
    googleData: gData ? { google_rating: gData.google_rating, google_review_count: gData.google_review_count, pain_points: gData.pain_points, positive_points: gData.positive_points, review_themes: gData.review_themes } : null,
    immowebData: imData ? { total_listings: imData.total_listings, rental_listings: imData.rental_listings, sale_listings: imData.sale_listings, estimated_portfolio: imData.estimated_portfolio, activity_level: imData.activity_level } : null,
    bceData: bcData ? { bce_number: bcData.bce_number, legal_form: bcData.legal_form, nace_code: bcData.nace_code, nace_description: bcData.nace_description, creation_date: bcData.creation_date, status: bcData.status } : null,
    spinAngle
  })
}

// Sort by score descending
prospects.sort((a, b) => b.score - a.score)

const tiers = { A: [], B: [], C: [], D: [] }
for (const p of prospects) tiers[p.tier].push(p)
console.log(`\n${prospects.length} companies scored`)
console.log(`Tier A: ${tiers.A.length} | Tier B: ${tiers.B.length} | Tier C: ${tiers.C.length} | Tier D: ${tiers.D.length}`)
console.log(`Score range: ${prospects[prospects.length-1]?.score} - ${prospects[0]?.score}`)
console.log(`With enrichments: web=${prospects.filter(p=>p.websiteData).length}, google=${prospects.filter(p=>p.googleData).length}, immoweb=${prospects.filter(p=>p.immowebData).length}, bce=${prospects.filter(p=>p.bceData).length}`)

// Save JSON
writeFileSync(join(SALES_DIR, '_prospects_scored.json'), JSON.stringify(prospects, null, 2), 'utf-8')

// ─── Generate MD ───
const totalAgents = prospects.reduce((s, p) => s + p.agentCount, 0)
const softwareStats = {}
for (const p of prospects) for (const s of (p.websiteData?.software_detected || [])) softwareStats[s] = (softwareStats[s] || 0) + 1
const topSoftware = Object.entries(softwareStats).sort((a, b) => b[1] - a[1])

const serviceStats = { gestion_locative: 0, syndic: 0, vente: 0, location: 0, commercial: 0 }
for (const p of prospects) { const s = p.websiteData?.services; if (s) for (const k of Object.keys(serviceStats)) if (s[k]) serviceStats[k]++ }

const communeStats = {}
for (const p of prospects) { const c = p.commune || 'Inconnu'; communeStats[c] = (communeStats[c] || 0) + 1 }
const topCommunes = Object.entries(communeStats).sort((a, b) => b[1] - a[1]).slice(0, 15)

const allPP = {}
for (const p of prospects) for (const pt of (p.googleData?.pain_points || [])) { const k = pt.toLowerCase().trim(); if (k.length > 3) allPP[k] = (allPP[k] || 0) + 1 }
const topPP = Object.entries(allPP).sort((a, b) => b[1] - a[1]).slice(0, 15)

const TL = { A: 'HOT — Appeler en priorite', B: 'WARM — Leads qualifies', C: 'COOL — Sequence email', D: 'LOW — Basse priorite' }

let md = `# Prospects Qualifies — Campagne Cold Calling Bruxelles

**Date :** 27 mars 2026
**Source :** IPI (Institut Professionnel Immobilier) + enrichissement multi-sources
**Objectif :** Campagne SPIN Selling pour SEIDO — gestion immobiliere SaaS

---

## Vue d'ensemble

| | Compte | % |
|---|---|---|
| **Entreprises qualifiees** | **${prospects.length}** | 100% |
| Tier A — Hot (score 70+) | **${tiers.A.length}** | ${(tiers.A.length/prospects.length*100).toFixed(1)}% |
| Tier B — Warm (score 45-69) | ${tiers.B.length} | ${(tiers.B.length/prospects.length*100).toFixed(1)}% |
| Tier C — Cool (score 25-44) | ${tiers.C.length} | ${(tiers.C.length/prospects.length*100).toFixed(1)}% |
| Tier D — Low (score <25) | ${tiers.D.length} | ${(tiers.D.length/prospects.length*100).toFixed(1)}% |
| **Agents IPI individuels** | **${totalAgents}** | — |

### Capacite d'appels estimee
| Tier | Entreprises | Duree (10 appels/jour) |
|---|---|---|
| Tier A | ${tiers.A.length} | ~${Math.ceil(tiers.A.length/10)} jours |
| Tier A+B | ${tiers.A.length+tiers.B.length} | ~${Math.ceil((tiers.A.length+tiers.B.length)/10)} jours |
| Tous | ${prospects.length} | ~${Math.ceil(prospects.length/10)} jours |

---

## Insights strategiques

### Services detectes (sites web)
| Service | Entreprises | Pertinence SEIDO |
|---|---|---|
| Gestion locative | ${serviceStats.gestion_locative} | Cible directe |
| Syndic | ${serviceStats.syndic} | Cible directe |
| Location | ${serviceStats.location} | Indicateur d'activite locative |
| Vente | ${serviceStats.vente} | Transaction pure |
| Commercial | ${serviceStats.commercial} | Segment different |

### Logiciels concurrents
| Logiciel | Entreprises | Angle sales |
|---|---|---|
`
for (const [sw, count] of topSoftware) {
  const a = sw==='whise'?'Concurrent #1 — pitch migration':sw==='omnicasa'?'Concurrent #2':sw==='bricks'?'PropTech concurrent':sw==='hubspot'?'CRM generaliste':sw==='salesforce'?'Enterprise CRM':'Portail secondaire'
  md += `| ${sw.charAt(0).toUpperCase()+sw.slice(1)} | ${count} | ${a} |\n`
}
md += `\n### Pain points (avis Google)\n| Probleme | Freq | Question SPIN |\n|---|---|---|\n`
for (const [pp,c] of topPP) {
  const q = pp.includes('communic')||pp.includes('repond')?'"Comment vos locataires vous contactent-ils ?"':pp.includes('factur')||pp.includes('compt')?'"Comment gerez-vous la facturation ?"':pp.includes('delai')||pp.includes('retard')?'"Quel est votre delai moyen de traitement ?"':'"Comment circule l\'information entre vous et vos locataires ?"'
  md += `| ${pp} | ${c}x | ${q} |\n`
}
md += `\n### Repartition geographique\n| Commune | Entreprises |\n|---|---|\n`
for (const [c,n] of topCommunes) md += `| ${c} | ${n} |\n`

md += `\n---\n\n## Methodologie de scoring\n| Critere | Max | Detail |\n|---|---|---|\n`
md += `| Statut IPI | 30 | Courtier+Syndic tit. (30) > Syndic tit. (25) > Courtier tit. (15) > Stagiaire (5) |\n`
md += `| Taille & Activite | 25 | Gestion locative (+8), Syndic (+7), Multi-agents (+5/+10), Immoweb loc. (+5/+10), BCE (+5) |\n`
md += `| Pain Points | 15 | Google <3.5 (+10), <4.0 (+5), Pain points documentes (+5/theme) |\n`
md += `| Maturite digitale | 15 | Site actif (+3), Pas concurrent (+7)/Concurrent (+5), Email (+2), Tel (+3) |\n`
md += `| Contactabilite | 15 | Tel (+5), Email (+5), Extras sur site (+3), Multi-canaux (+2) |\n`
md += `| **TOTAL** | **100** | Tier A (70+) / B (45-69) / C (25-44) / D (<25) |\n\n---\n\n`

for (const tier of ['A','B','C','D']) {
  if (tiers[tier].length === 0) continue
  md += `## Tier ${tier} — ${TL[tier]} (${tiers[tier].length} entreprises)\n\n`
  for (const p of tiers[tier]) {
    md += `### ${p.name}\n**Score : ${p.score}/100** | **Statut :** ${p.statutLabel} | **Agents :** ${p.agentCount} | **Commune :** ${p.commune||'—'}\n\n`
    md += `| Contact | |\n|---|---|\n| Telephone | ${p.contact.phone||'—'} |\n`
    if (p.contact.allPhones.length>1) md += `| Autres tel. | ${p.contact.allPhones.slice(1,4).join(', ')} |\n`
    md += `| Email | ${p.contact.email||'—'} |\n`
    if (p.contact.allEmails.length>1) md += `| Autres emails | ${p.contact.allEmails.slice(1,4).join(', ')} |\n`
    md += `| Site web | ${p.contact.site_web||'—'} |\n`
    if (p.agentNames.length>0) md += `| Agents IPI | ${p.agentNames.join(', ')} |\n`
    md += '\n'
    const lines = []
    if (p.services) lines.push(`**Services :** ${p.services}`)
    if (p.websiteData?.software_detected?.length>0) lines.push(`**Logiciel actuel :** ${p.websiteData.software_detected.join(', ')}`)
    if (p.googleData) {
      let gl='**Avis Google :** '
      if (p.googleData.google_rating) { gl+=`${p.googleData.google_rating}/5`; if(p.googleData.google_review_count)gl+=` (${p.googleData.google_review_count} avis)` }
      if (p.googleData.pain_points?.length>0) gl+=(p.googleData.google_rating?' — ':'')+'Pain points : '+p.googleData.pain_points.join(', ')
      if (p.googleData.positive_points?.length>0) gl+=' | Positifs : '+p.googleData.positive_points.join(', ')
      if (gl!=='**Avis Google :** ') lines.push(gl)
    }
    if (p.immowebData) {
      let il='**Immoweb :** '
      if(p.immowebData.total_listings){il+=`${p.immowebData.total_listings} annonces`;if(p.immowebData.rental_listings)il+=` (${p.immowebData.rental_listings} loc, ${p.immowebData.sale_listings||0} vente)`}
      if(p.immowebData.estimated_portfolio)il+=` — Portfolio : ~${p.immowebData.estimated_portfolio} lots`
      if(il!=='**Immoweb :** ')lines.push(il)
    }
    if (p.bceData) {
      const parts=[];if(p.bceData.legal_form)parts.push(p.bceData.legal_form);if(p.bceData.creation_date){const y=p.bceData.creation_date.split('-')[0]||p.bceData.creation_date;parts.push(`creee ${y}`)};if(p.bceData.bce_number)parts.push(`n. ${p.bceData.bce_number}`);if(p.bceData.nace_code)parts.push(`NACE ${p.bceData.nace_code}`)
      if(parts.length>0)lines.push(`**BCE :** ${parts.join(', ')}`)
    }
    if(lines.length>0) md+=lines.join('\n')+'\n\n'
    md += `> **Angle SPIN :** ${p.spinAngle}\n\n`
    md += `<details><summary>Detail score (${p.score}/100)</summary>\n\n| Critere | Score |\n|---|---|\n| Statut IPI | ${p.breakdown.statutScore}/30 |\n| Taille & Activite | ${p.breakdown.sizeScore}/25 |\n| Pain Points | ${p.breakdown.painScore}/15 |\n| Maturite digitale | ${p.breakdown.digitalScore}/15 |\n| Contactabilite | ${p.breakdown.contactScore}/15 |\n</details>\n\n---\n\n`
  }
}
md += `\n*Genere le ${new Date().toISOString().split('T')[0]} — IPI + Sites web + Google Reviews + Immoweb + BCE/KBO*\n`
writeFileSync(join(SALES_DIR, 'PROSPECTS_QUALIFIES_BRUXELLES.md'), md, 'utf-8')

// ─── CSV (1 row per agent, company enrichment repeated) ───
const esc=(v)=>{if(!v)return '';const s=String(v);return(s.includes(',')||s.includes('"')||s.includes('\n')||s.includes(';'))?'"'+s.replace(/"/g,'""')+'"':s}
const H=['Score','Tier','Entreprise','Agent_Nom','Agent_ID','Agent_Statut','Agent_Telephone','Agent_Email','Agent_Adresse','Commune','Nb_Agents_Societe','Site_Web','Google_Business','Services','Gestion_Locative','Syndic','Vente','Location','Commercial','Logiciel_Actuel','Google_Note','Google_Nb_Avis','Pain_Points','Points_Positifs','Immoweb_Annonces_Total','Immoweb_Location','Immoweb_Vente','Portfolio_Estime','Immoweb_Activite','BCE_Numero','BCE_Forme_Juridique','BCE_Date_Creation','BCE_NACE','BCE_Description_NACE','Score_Statut','Score_Taille','Score_PainPoints','Score_Digital','Score_Contact','Angle_SPIN','Fiche_IPI']
let csv=H.join(',')+'\n'
let totalRows = 0
for(const p of prospects){
  const s=p.websiteData?.services||{};const g=p.googleData||{};const im=p.immowebData||{};const b=p.bceData||{};const br=p.breakdown
  for (const agent of p.agentsRaw) {
    const agentPhone = cleanPhone(agent.telephone || '')
    const agentEmail = (agent.email && isValidEmail(agent.email)) ? agent.email : ''
    const slug = agent.nom.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    const ficheUrl = `https://www.ipi.be/agent-immobilier/${slug}-${agent.id}`
    const googleBizUrl = `https://www.google.com/maps/search/${encodeURIComponent(p.name + ' ' + (p.commune || 'Bruxelles'))}`
    csv+=[p.score,p.tier,esc(p.name),esc(agent.nom),agent.id,esc(agent.statut),esc(isValidPhone(agentPhone)?agentPhone:''),esc(agentEmail),esc(agent.adresse),esc(p.commune),p.agentCount,esc(p.contact.site_web),esc(googleBizUrl),esc(p.services),s.gestion_locative?'Oui':'Non',s.syndic?'Oui':'Non',s.vente?'Oui':'Non',s.location?'Oui':'Non',s.commercial?'Oui':'Non',esc((p.websiteData?.software_detected||[]).join('; ')),g.google_rating||'',g.google_review_count||'',esc((g.pain_points||[]).join('; ')),esc((g.positive_points||[]).join('; ')),im.total_listings||'',im.rental_listings||'',im.sale_listings||'',im.estimated_portfolio||'',esc(im.activity_level),esc(b.bce_number),esc(b.legal_form),esc(b.creation_date),esc(b.nace_code),esc(b.nace_description),br.statutScore,br.sizeScore,br.painScore,br.digitalScore,br.contactScore,esc(p.spinAngle),esc(ficheUrl)].join(',')+'\n'
    totalRows++
  }
}
writeFileSync(join(SALES_DIR, 'PROSPECTS_QUALIFIES_BRUXELLES.csv'), csv, 'utf-8')
console.log(`CSV: ${totalRows} rows (1 per agent, ${prospects.length} companies)`)
console.log(`\nOutput: MD + CSV + JSON (${prospects.length} companies)`)
