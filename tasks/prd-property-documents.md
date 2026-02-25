# PRD: Documents Lots & Immeubles — Gestion documentaire immobilière belge

## Contexte
SEIDO dispose déjà d'un système de documents pour les baux (contrats) avec upload par catégorie, checklist, et progression. Il faut étendre ce système aux lots et immeubles avec les documents belges obligatoires/optionnels, dates d'expiration, et alertes visuelles.

## Objectifs
1. **Composants génériques** : Rendre DocumentSlot et DocumentChecklist indépendants du type d'entité (bail/lot/immeuble)
2. **Documents belges** : Configurer les types de documents pour lots (PEB, conformité électrique, gaz, détecteurs fumée, entretien chaudière) et immeubles (ascenseur, citerne mazout, règlement copropriété, amiante, audit énergétique)
3. **Expiration** : Input date d'expiration avec alertes visuelles (orange = bientôt expiré, rouge = expiré)
4. **Intégration wizard** : Step "Documents" dans les formulaires de création/modification des lots et immeubles
5. **Section page détails** : Section documents dans les pages détails existantes

## Architecture existante réutilisée
- Table `property_documents` (polymorphique building_id/lot_id, avec expiry_date)
- API `/api/property-documents/upload`
- Service `PropertyDocumentService`
- Storage bucket `property-documents` (100MB, RLS configuré)

## Documents par entité

### Lot (unité locative)
| Type | Label | Obligatoire | Validité | Icon |
|------|-------|-------------|----------|------|
| certificat_peb | Certificat PEB/EPC | Oui | 10 ans | Zap |
| conformite_electrique | Conformité électrique | Oui | 25 ans | Plug |
| conformite_gaz | Conformité gaz | Conditionnel | Installation | Flame |
| detecteurs_fumee | Détecteurs de fumée | Oui | N/A | Bell |
| entretien_chaudiere | Entretien chaudière | Oui | 1-3 ans | Thermometer |
| autre | Autres documents | Non | N/A | File |

### Immeuble
| Type | Label | Obligatoire | Validité | Icon |
|------|-------|-------------|----------|------|
| certificat_peb | Certificat PEB/EPC | Oui | 10 ans | Zap |
| controle_ascenseur | Contrôle ascenseur | Conditionnel | Périodique | ArrowUpDown |
| citerne_mazout | Certificat citerne mazout | Conditionnel | 5 ans | Droplets |
| reglement_copropriete | Règlement copropriété | Conditionnel | Permanent | BookOpen |
| inventaire_amiante | Inventaire amiante | Optionnel | N/A | AlertTriangle |
| audit_energetique | Audit énergétique | Optionnel | N/A | BarChart3 |
| autre | Autres documents | Non | N/A | File |

## Hors scope
- Notifications email/push pour expiration (phase ultérieure)
- Documents pour les interventions (déjà géré)
- Migration des documents existants
