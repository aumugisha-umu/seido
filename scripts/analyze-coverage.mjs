import { readFileSync } from "fs";
const csv = readFileSync("docs/Sales/PROSPECTS_QUALIFIES_BRUXELLES.csv", "utf8");
const lines = csv.trim().split("\n");
let noPhone = 0, noEmail = 0, hasSite = 0, hasGoogle = 0, hasIPI = 0;
const total = lines.length - 1;
for (let i = 1; i < lines.length; i++) {
  const r = lines[i];
  if (r.indexOf("+32") === -1 && r.indexOf("0032") === -1) noPhone++;
  if (r.indexOf("@") === -1) noEmail++;
  if (r.indexOf("ipi.be") !== -1) hasIPI++;
  if (r.indexOf("google.com/maps") !== -1) hasGoogle++;
  // Count site_web column (col 11, 0-indexed)
}
// Parse header to find Site_Web index
const header = lines[0].split(",");
const siteIdx = header.indexOf("Site_Web");
let withSite = 0;
for (let i = 1; i < lines.length; i++) {
  // Simple: check if there's a URL that's not ipi/google
  const fields = lines[i].split(",");
  const site = fields[siteIdx] || "";
  if (site && site.startsWith("http") && !site.includes("ipi.be") && !site.includes("google.com")) withSite++;
}
console.log("Total agents:", total);
console.log("Sans telephone:", noPhone, "(" + (noPhone / total * 100).toFixed(1) + "%)");
console.log("Sans email:", noEmail, "(" + (noEmail / total * 100).toFixed(1) + "%)");
console.log("Avec site web:", withSite, "(" + (withSite / total * 100).toFixed(1) + "%)");
console.log("Avec fiche Google:", hasGoogle, "(" + (hasGoogle / total * 100).toFixed(1) + "%)");
console.log("Avec fiche IPI:", hasIPI, "(" + (hasIPI / total * 100).toFixed(1) + "%)");
console.log("\n--- Potentiel d'enrichissement ---");
console.log("Fiches IPI a re-scraper:", hasIPI, "(telephone + email individuels)");
console.log("Sites web a crawler:", withSite, "(contacts societe: tel standard, email general)");
console.log("Fiches Google a scraper:", hasGoogle, "(telephone societe, avis)");
