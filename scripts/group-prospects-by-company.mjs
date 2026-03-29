/**
 * Group PROSPECTS_QUALIFIES_BRUXELLES.csv by company (1 line = 1 société)
 * Output: docs/Sales/SOCIETES_IMMOBILIERES_BRUXELLES.csv
 */
import fs from "fs";
import path from "path";

const INPUT = path.join(process.cwd(), "docs/Sales/PROSPECTS_QUALIFIES_BRUXELLES.csv");
const OUTPUT = path.join(process.cwd(), "docs/Sales/SOCIETES_IMMOBILIERES_BRUXELLES.csv");

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalizeCo(name) {
  return name
    .trim()
    .toUpperCase()
    .replace(/['\u2019]/g, " ")
    .replace(/&/g, "ET")
    .replace(/\s+/g, " ")
    .replace(/ (SRL|SPRL|SA|BVBA|BV|NV|ASBL|VZW)$/i, "")
    .trim();
}

function q(v) {
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

const content = fs.readFileSync(INPUT, "utf8");
const lines = content.trim().split("\n");

const header = parseCsvLine(lines[0]);
const idx = {};
header.forEach((h, i) => (idx[h] = i));

const rows = lines
  .slice(1)
  .filter((l) => l.trim())
  .map(parseCsvLine);

// Group by normalized company name
const groups = new Map();

for (const row of rows) {
  const entreprise = row[idx.Entreprise] || "";
  const isIndep = !entreprise.trim();
  const normKey = isIndep
    ? "__indep_" + row[idx.Agent_ID]
    : normalizeCo(entreprise);

  if (!groups.has(normKey)) {
    groups.set(normKey, {
      entreprise: entreprise.trim() || row[idx.Agent_Nom] + " (ind.)",
      score: 0,
      tier: "",
      agents: [],
      statuts: new Set(),
      telephones: new Set(),
      emails: new Set(),
      adresses: new Set(),
      communes: new Set(),
      site_web: "",
      google_business: "",
      services: "",
      gestion_locative: "Non",
      syndic: "Non",
      vente: "Non",
      location: "Non",
      commercial: "Non",
      logiciel_actuel: "",
      google_note: "",
      google_nb_avis: "",
      pain_points: new Set(),
      points_positifs: new Set(),
      immoweb_total: 0,
      immoweb_location: 0,
      immoweb_vente: 0,
      portfolio_estime: 0,
      immoweb_activite: "",
      bce_numero: "",
      bce_forme: "",
      bce_date_creation: "",
      bce_nace: "",
      bce_desc_nace: "",
      angle_spin: "",
      liens_ipi: [],
    });
  }

  const g = groups.get(normKey);

  // Keep highest score / best tier
  const score = parseInt(row[idx.Score]) || 0;
  if (score > g.score) {
    g.score = score;
    g.tier = row[idx.Tier];
  }

  // Use first real company name
  if (entreprise.trim() && g.entreprise.endsWith("(ind.)")) {
    g.entreprise = entreprise.trim();
  }

  g.agents.push(row[idx.Agent_Nom]);

  // Aggregate contact info
  if (row[idx.Agent_Statut])
    row[idx.Agent_Statut]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => g.statuts.add(s));
  if (row[idx.Agent_Telephone])
    row[idx.Agent_Telephone]
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => g.telephones.add(t));
  if (row[idx.Agent_Email]) g.emails.add(row[idx.Agent_Email]);
  if (row[idx.Agent_Adresse]) g.adresses.add(row[idx.Agent_Adresse]);
  if (row[idx.Commune]) g.communes.add(row[idx.Commune]);

  // Take first non-empty for company-level fields
  if (row[idx.Site_Web] && !g.site_web) g.site_web = row[idx.Site_Web];
  if (row[idx.Google_Business] && !g.google_business)
    g.google_business = row[idx.Google_Business];
  if (row[idx.Services] && !g.services) g.services = row[idx.Services];
  if (row[idx.Gestion_Locative] === "Oui") g.gestion_locative = "Oui";
  if (row[idx.Syndic] === "Oui") g.syndic = "Oui";
  if (row[idx.Vente] === "Oui") g.vente = "Oui";
  if (row[idx.Location] === "Oui") g.location = "Oui";
  if (row[idx.Commercial] === "Oui") g.commercial = "Oui";
  if (row[idx.Logiciel_Actuel] && !g.logiciel_actuel)
    g.logiciel_actuel = row[idx.Logiciel_Actuel];
  if (row[idx.Google_Note] && !g.google_note)
    g.google_note = row[idx.Google_Note];
  if (row[idx.Google_Nb_Avis] && !g.google_nb_avis)
    g.google_nb_avis = row[idx.Google_Nb_Avis];
  if (row[idx.Pain_Points])
    row[idx.Pain_Points]
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => g.pain_points.add(s));
  if (row[idx.Points_Positifs])
    row[idx.Points_Positifs]
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => g.points_positifs.add(s));

  // Immoweb: take max
  const imTotal = parseInt(row[idx.Immoweb_Annonces_Total]) || 0;
  if (imTotal > g.immoweb_total) {
    g.immoweb_total = imTotal;
    g.immoweb_location = parseInt(row[idx.Immoweb_Location]) || 0;
    g.immoweb_vente = parseInt(row[idx.Immoweb_Vente]) || 0;
  }
  const portfolio = parseInt(row[idx.Portfolio_Estime]) || 0;
  if (portfolio > g.portfolio_estime) g.portfolio_estime = portfolio;
  if (row[idx.Immoweb_Activite] && !g.immoweb_activite)
    g.immoweb_activite = row[idx.Immoweb_Activite];

  // BCE: take first non-empty
  if (row[idx.BCE_Numero] && !g.bce_numero)
    g.bce_numero = row[idx.BCE_Numero];
  if (row[idx.BCE_Forme_Juridique] && !g.bce_forme)
    g.bce_forme = row[idx.BCE_Forme_Juridique];
  if (row[idx.BCE_Date_Creation] && !g.bce_date_creation)
    g.bce_date_creation = row[idx.BCE_Date_Creation];
  if (row[idx.BCE_NACE] && !g.bce_nace) g.bce_nace = row[idx.BCE_NACE];
  if (row[idx.BCE_Description_NACE] && !g.bce_desc_nace)
    g.bce_desc_nace = row[idx.BCE_Description_NACE];

  if (row[idx.Angle_SPIN] && !g.angle_spin)
    g.angle_spin = row[idx.Angle_SPIN];
  if (row[idx.Fiche_IPI]) g.liens_ipi.push(row[idx.Fiche_IPI]);
}

// Build output CSV
const outHeader = [
  "Entreprise", "Score", "Tier", "Nb_Agents", "Agents", "Statuts",
  "Telephones", "Emails", "Adresse", "Communes",
  "Site_Web", "Google_Business", "Services",
  "Gestion_Locative", "Syndic", "Vente", "Location", "Commercial",
  "Logiciel_Actuel", "Google_Note", "Google_Nb_Avis",
  "Pain_Points", "Points_Positifs",
  "Immoweb_Total", "Immoweb_Location", "Immoweb_Vente", "Portfolio_Estime",
  "Immoweb_Activite",
  "BCE_Numero", "BCE_Forme", "BCE_Date_Creation", "BCE_NACE",
  "BCE_Description_NACE",
  "Angle_SPIN", "Liens_IPI",
].join(",");

const sorted = [...groups.values()].sort(
  (a, b) => b.score - a.score || b.agents.length - a.agents.length
);

const outRows = sorted.map((g) =>
  [
    q(g.entreprise), g.score, g.tier, g.agents.length,
    q(g.agents.join(" | ")), q([...g.statuts].join(" | ")),
    q([...g.telephones].join(" | ")), q([...g.emails].join(" | ")),
    q([...g.adresses].join(" | ")), q([...g.communes].join(" | ")),
    q(g.site_web), q(g.google_business), q(g.services),
    g.gestion_locative, g.syndic, g.vente, g.location, g.commercial,
    q(g.logiciel_actuel), g.google_note, g.google_nb_avis,
    q([...g.pain_points].join("; ")), q([...g.points_positifs].join("; ")),
    g.immoweb_total, g.immoweb_location, g.immoweb_vente, g.portfolio_estime,
    g.immoweb_activite,
    q(g.bce_numero), q(g.bce_forme), q(g.bce_date_creation), q(g.bce_nace),
    q(g.bce_desc_nace),
    q(g.angle_spin), q(g.liens_ipi.join(" | ")),
  ].join(",")
);

const output = outHeader + "\n" + outRows.join("\n") + "\n";
fs.writeFileSync(OUTPUT, output);

// Stats
const multiAgent = sorted.filter((g) => g.agents.length >= 2);
console.log("Total societes:", sorted.length);
console.log("Dont multi-agents:", multiAgent.length);
console.log("Tier A:", sorted.filter((g) => g.tier === "A").length);
console.log("Tier B:", sorted.filter((g) => g.tier === "B").length);
console.log("Tier C:", sorted.filter((g) => g.tier === "C").length);
console.log("Tier D:", sorted.filter((g) => g.tier === "D").length);
console.log("\nTop 15 par score+taille:");
sorted
  .slice(0, 15)
  .forEach((g) =>
    console.log(" ", g.score, g.tier, g.agents.length + "ag", g.entreprise)
  );
console.log("\nOutput:", OUTPUT);
