# Retrospective: IPI Brussels Agents Scraping & Enrichment

**Date:** 2026-03-28
**Duration:** ~4 hours (across 2 sessions)
**Branch:** preview (uncommitted scripts + data)

## What Went Well
- **Multi-axis architecture**: 4 independent enrichment scripts (websites, Google, Immoweb, BCE) that each produce a JSON, then a single merge script combines them. Each axis is re-runnable without affecting others.
- **Resume capability**: Website enrichment script saved intermediate results every 20 entries. When restarted, it skipped already-processed agents.
- **Batch concurrency**: 5 parallel requests + 1.5s delay = 830 sites in ~4 minutes, zero IP bans.
- **5-pass audit script**: Caught real bugs (HTML entities, invalid phones, MD/CSV mismatch) and iterated to Grade A.
- **10% verification sample**: Random sampling of 196 agents against live IPI pages confirmed 0% hallucination rate.
- **Scoring model**: 5-criteria scoring (statut, size, pain points, digital maturity, contactability) produced actionable tiers aligned with SEIDO's ICP.

## What Could Be Improved
- **Premature cleanup**: Deleted intermediate enrichment JSONs before audit passed. Had to rebuild everything from scratch (~30 min lost).
- **Sub-agent quality control**: The regeneration agent parsed the wrong column (statut instead of site_web), producing 980 garbage entries. Should have verified sample output before letting it run.
- **Audit false positives**: Regex patterns for hallucination detection were too aggressive for Belgian real estate naming conventions. Wasted investigation time on 16 legitimate companies.
- **Google/Immoweb/BCE coverage**: Only 50 companies enriched from each source (limited by web search API constraints). Future: use direct API access or batch more aggressively.

## New Learnings Added to AGENTS.md
- Learning #207: Never delete intermediate files before final audit passes
- Learning #208: Verify column alignment with sample output before full scrape
- Learning #209: HTML entity decoding is mandatory post-scrape
- Learning #210: Belgian phone number cleaning pipeline
- Learning #211: Fuzzy company name matching needs multiple normalization passes
- Learning #212: Software detection false positives from HTML attributes
- Learning #213: Hallucination detection patterns must account for domain conventions
- Learning #214: Resume capability is essential for long-running scrapes
- Learning #215: Batch fetch with concurrency control prevents IP bans
- Learning #216: Multi-axis enrichment architecture — independent axes + merge
- Learning #217: 1-row-per-contact CSV beats grouped CSV for CRM import

## Patterns Discovered
- **Scrape → Enrich → Merge → Audit → Fix → Re-audit** pipeline is robust and should be reused
- **Multi-key fuzzy lookup map** (normalized, raw lowercase, by ID) catches most company name variants
- **`cleanPhone()` multi-step pipeline** handles all Belgian phone formats encountered
- **1-row-per-agent CSV with repeated company enrichment** is the right CRM format for cold calling

## Anti-Patterns Avoided (or Encountered)
- **Premature optimization**: Tried to delete intermediate files to "clean up" before validation
- **Trust but don't verify**: Dispatched sub-agent without checking its output samples
- **Over-strict validation**: Hallucination regex flagged real companies, breaking audit score
- **SAP false positive**: Searching HTML for "sap" matches HTML attributes, not software usage

## Recommendations for Similar Future Work
1. **Always keep intermediate files** until final audit passes Grade A
2. **Sample-first**: After any parsing step, log 5 samples and verify before continuing
3. **Multi-axis enrichment**: Design each source as independent script → JSON → merge
4. **Resume capability**: Save every N items, load existing on startup, filter already-done
5. **Batch concurrency**: 5 parallel + 1.5s delay is the sweet spot for respectful scraping
6. **CRM format**: 1 row per person (not per company) with shared enrichment data repeated
7. **Audit in passes**: Data integrity → Encoding → Scoring → Cross-consistency → Content quality

## Scripts Created
| Script | Purpose | Reusable? |
|---|---|---|
| `scripts/scrape-ipi-listing.mjs` | Two-phase Playwright+fetch IPI scraper | IPI-specific |
| `scripts/enrich-websites.mjs` | HTTP fetch website analyzer with resume | Highly reusable |
| `scripts/merge-final.mjs` | Multi-source merge + scoring + MD/CSV/JSON output | Template reusable |
| `scripts/audit-prospects.mjs` | 5-pass 21-check quality audit | Template reusable |
| `scripts/fix-prospects.mjs` | Superseded by merge-final.mjs | Deprecated |

## Output Files
| File | Size | Content |
|---|---|---|
| `AGENTS_IMMOBILIERS_BRUXELLES_CONSOLIDE.md` | 520KB | 1960 agents — source of truth |
| `PROSPECTS_QUALIFIES_BRUXELLES.md` | ~800KB | 1243 companies scored, enriched, with SPIN angles |
| `PROSPECTS_QUALIFIES_BRUXELLES.csv` | ~500KB | 1749 rows (1 per agent), 40 columns, CRM-ready |
| `_prospects_scored.json` | ~2MB | Full JSON with all enrichment data |
| `_enrichment_websites.json` | ~1.5MB | 830 website analyses |
| `_enrichment_google.json` | ~15KB | 50 Google review analyses |
| `_enrichment_immoweb.json` | ~8KB | 50 Immoweb presence analyses |
| `_enrichment_bce.json` | ~10KB | 50 BCE/KBO registry analyses |
