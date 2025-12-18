import type { Metadata } from 'next'
import {
  LegalPageTemplate,
  LegalSection,
  LegalSubsection,
  LegalText,
  LegalList,
  LegalHighlight,
  LegalCard
} from '@/components/landing/legal-page-template'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description: 'Politique de protection des données personnelles et de confidentialité de SEIDO.',
}

/**
 * Page Politique de Confidentialité
 * Contenu basé sur docs/Documentation-légale.md (lignes 253-388)
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPageTemplate
      title="Protection des données personnelles et politique de confidentialité"
      lastUpdated="Septembre 2025"
    >
      {/* Préambule */}
      <LegalSection title="Préambule">
        <LegalText>
          À titre préliminaire, les termes « <LegalHighlight>données personnelles</LegalHighlight> »
          et « <LegalHighlight>données à caractère personnel</LegalHighlight> » doivent être entendus
          au sens qui leur est donné à l'article 4 du Règlement 2016/679 (le « <LegalHighlight>RGPD</LegalHighlight> »).
        </LegalText>
      </LegalSection>

      {/* Traitement des données du Client gestionnaire */}
      <LegalSection title="Traitement des données du Client gestionnaire">
        <LegalText>
          En s'inscrivant sur <LegalHighlight>SEIDO</LegalHighlight>, le Client accepte que
          SEIDO puisse stocker, traiter et utiliser les données personnelles et à caractère personnel
          collectées lors de l'inscription, et celles relatives au devoir de facturation de SEIDO
          envers le Client. Cela inclut la possibilité de citer le nom du Client dans les références
          client de SEIDO.
        </LegalText>
        <LegalText>
          En s'inscrivant sur SEIDO, le Client consent à ce que SEIDO, en qualité de
          <LegalHighlight> responsable de traitement</LegalHighlight>, conserve et traite ses données
          pour la réalisation des services, en ce compris pour la commercialisation de services
          supplémentaires gérés par des tiers et proposés par SEIDO.
        </LegalText>
        <LegalText>
          Ces données personnelles et à caractère personnel du Client seront conservées pendant toute
          la durée d'utilisation du service et pendant une période de <LegalHighlight>cinq (5) ans</LegalHighlight> après
          la terminaison de celui-ci.
        </LegalText>
        <LegalText>
          Le Client accepte que la communication de ses informations personnelles intervienne dès la
          période d'essai gratuite lorsqu'une telle période a été sollicitée par le Client.
        </LegalText>
      </LegalSection>

      {/* Traitement des données des utilisateurs de la Plateforme */}
      <LegalSection title="Traitement des données des utilisateurs de la Plateforme">
        <LegalSubsection title="Locataires">
          <LegalText>
            Le Client reconnaît que l'utilisation de la Plateforme par ses locataires implique la
            collecte et le traitement de données personnelles de ces derniers par SEIDO.
          </LegalText>
          <LegalText>
            <LegalHighlight>Le Client s'engage à :</LegalHighlight>
          </LegalText>
          <LegalList items={[
            "Informer préalablement ses locataires de cette collecte et du traitement de leurs données personnelles conformément au RGPD",
            "Obtenir leur consentement lorsque nécessaire",
            "Garantir disposer des autorisations nécessaires pour le traitement de leurs données via la Plateforme"
          ]} />
        </LegalSubsection>

        <LegalSubsection title="Fournisseurs de service">
          <LegalText>
            SEIDO informe directement les fournisseurs de service lors de leur inscription sur la
            Plateforme du traitement de leurs données personnelles et obtient leur consentement
            conformément au RGPD.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Propriétaires et gestionnaires">
          <LegalText>
            Les propriétaires additionnels invités sur la Plateforme par le Client sont informés par
            SEIDO lors de leur inscription du traitement de leurs données personnelles et donnent
            leur consentement conformément au RGPD.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Types de données collectées">
          <LegalText>
            SEIDO traite les données de tous les utilisateurs de la Plateforme (gestionnaires,
            propriétaires, locataires et fournisseurs de service) uniquement dans le cadre de la
            fourniture de ses services, en qualité de responsable de traitement ou de sous-traitant
            selon les cas.
          </LegalText>
          <LegalText>
            <LegalHighlight>Les données personnelles collectées incluent notamment mais ne se limitent pas aux :</LegalHighlight>
          </LegalText>
          <LegalList items={[
            <span key="id"><LegalHighlight>Données d'identification</LegalHighlight> : nom, prénom, adresse, téléphone, email</span>,
            <span key="com"><LegalHighlight>Données de communication</LegalHighlight> : messages, photos, documents échangés via la Plateforme</span>,
            <span key="int"><LegalHighlight>Données d'intervention</LegalHighlight> : rapports, évaluations, historique des actions</span>,
            <span key="geo"><LegalHighlight>Données de géolocalisation</LegalHighlight> : uniquement lorsque nécessaires pour les interventions</span>
          ]} />
        </LegalSubsection>
      </LegalSection>

      {/* Partage des données */}
      <LegalSection title="Partage des données">
        <LegalText>
          Les données confiées par le Client à SEIDO sont initialement traitées par SEIDO en sa qualité
          de responsable de traitement. Cependant, en fonction des produits ou services choisis, dans
          certains cas particuliers, SEIDO peut être amenée à partager les données personnelles du
          Client requises avec :
        </LegalText>
        <LegalList items={[
          <span key="interlocuteurs"><LegalHighlight>Les interlocuteurs au sein de SEIDO</LegalHighlight> afin de traiter les éventuels problèmes techniques du Client par le système d'assistance technique</span>,
          <span key="partenaires"><LegalHighlight>Les partenaires de SEIDO</LegalHighlight> pour qu'ils puissent fournir au Client leurs produits et services commercialisés par SEIDO et que le Client a acceptés lors d'une période d'essai gratuite et/ou dans le cadre de l'Abonnement via la Plateforme</span>,
          <span key="autorites"><LegalHighlight>Les autorités gouvernementales et publiques compétentes</LegalHighlight>, pour se conformer aux obligations ou demandes légales ou réglementaires</span>,
          <span key="tiers"><LegalHighlight>Les éventuels autres tiers jugés nécessaires ou appropriés</LegalHighlight> : (a) en vertu de la loi applicable ; (b) pour se conformer à la procédure judiciaire ; (c) pour faire respecter les CGU ; (d) pour protéger les droits de SEIDO, les intérêts de SEIDO, sa sécurité ou ses biens, celle du Client ou celle d'autres</span>
        ]} />
        <LegalText>
          En dehors des situations précitées, SEIDO demande l'autorisation du Client, si nécessaire,
          afin de pouvoir utiliser et/ou partager ses données avec des tiers.
        </LegalText>
      </LegalSection>

      {/* Droits des personnes concernées */}
      <LegalSection title="Droits des personnes concernées">
        <LegalText>
          Le Client dispose d'un droit d'accès, de modification, de rectification et de suppression
          des données qui le concernent. Ces informations ne seront aucunement communiquées à des tiers.
        </LegalText>

        <LegalCard title="Pour exercer ces droits, contacter :">
          <LegalList items={[
            <span key="email"><LegalHighlight>Email</LegalHighlight> : rgpd@seido-app.com</span>,
            <span key="adresse"><LegalHighlight>Adresse postale</LegalHighlight> : UMUMENTUM SRL, Rue de Grand-Bigard 14, 1082 Berchem-Sainte-Agathe (Belgique)</span>
          ]} />
        </LegalCard>

        <LegalCard title="Recours auprès de l'autorité de contrôle :">
          <LegalText>
            Le Client peut également contacter l'Autorité de la Protection des Données pour toute
            question relative à ses droits et/ou déposer plainte auprès de l'Autorité de la Protection
            des Données quant au traitement de ses données à caractère personnel par SEIDO :
          </LegalText>
          <LegalList items={[
            <span key="email-apd"><LegalHighlight>Email</LegalHighlight> : dpo@apd-gba.be</span>,
            <span key="adresse-apd"><LegalHighlight>Adresse</LegalHighlight> : Rue de la Presse, 35 à 1000 Bruxelles</span>
          ]} />
        </LegalCard>
      </LegalSection>

      {/* Propriété et confidentialité des données */}
      <LegalSection title="Propriété et confidentialité des données">
        <LegalText>
          Les données appartenant au Client et hébergées sur SEIDO (informations propriétaires,
          locataires, fournisseurs de service, contrats, informations financières, communications,
          tickets d'intervention, etc.) sont et demeurent la <LegalHighlight>propriété du Client</LegalHighlight>.
        </LegalText>
        <LegalText>
          <LegalHighlight>SEIDO s'engage à :</LegalHighlight>
        </LegalText>
        <LegalList items={[
          "Garder ces données strictement confidentielles",
          "N'effectuer, en dehors des nécessités techniques, aucune copie des données",
          "N'en faire aucune utilisation autre que celle prévue pour l'exécution des services"
        ]} />
      </LegalSection>

      {/* Responsabilités du Client */}
      <LegalSection title="Responsabilités du Client">
        <LegalText>
          Le Client est le seul responsable des données qu'il transmet à SEIDO aux fins d'hébergement
          ou d'utilisation de la Plateforme.
        </LegalText>
        <LegalText>
          <LegalHighlight>Le Client garantit :</LegalHighlight>
        </LegalText>
        <LegalList items={[
          "Que ces données lui appartiennent ou qu'il dispose du droit de les utiliser et les transférer à SEIDO",
          "La légalité et la justesse des données communiquées à SEIDO",
          "Disposer des autorisations nécessaires de la part des autres parties (locataires, fournisseurs, propriétaires) pour le traitement de leurs données via la Plateforme",
          "S'être acquitté de toutes les obligations éventuelles lui incombant à l'égard des informations/biens/données qu'il partage avec SEIDO et dont il est titulaire"
        ]} />
      </LegalSection>

      {/* Sécurité des données */}
      <LegalSection title="Sécurité des données">
        <LegalText>
          SEIDO met en œuvre des mesures techniques et organisationnelles appropriées pour assurer
          la sécurité des données personnelles :
        </LegalText>
        <LegalList items={[
          <span key="ssl"><LegalHighlight>Chiffrement SSL</LegalHighlight> pour toutes les communications</span>,
          <span key="env"><LegalHighlight>Environnement sécurisé</LegalHighlight> pour le stockage des données</span>,
          <span key="formation"><LegalHighlight>Formation du personnel</LegalHighlight> sur la confidentialité</span>,
          <span key="backup"><LegalHighlight>Sauvegardes chiffrées</LegalHighlight> quotidiennes sur serveur externe</span>,
          <span key="firewall"><LegalHighlight>Pare-feu logiciel</LegalHighlight> sur tous les serveurs</span>
        ]} />
        <LegalText>
          Toutefois, aucun mécanisme n'offrant une sécurité maximale, une part de risque est toujours
          présente lors de la transmission de données via Internet. SEIDO ne pourra être tenue
          responsable de la perte des données du Client, même en cas de défaillance de la Plateforme
          ou des serveurs.
        </LegalText>
      </LegalSection>

      {/* Durée de conservation */}
      <LegalSection title="Durée de conservation">
        <LegalText>
          Les données personnelles sont conservées pendant :
        </LegalText>
        <LegalList items={[
          <span key="duree-util"><LegalHighlight>Durée d'utilisation du service</LegalHighlight> pour les données nécessaires au fonctionnement de la Plateforme</span>,
          <span key="5ans"><LegalHighlight>Cinq (5) ans après la terminaison</LegalHighlight> du service pour les données de facturation et contractuelles</span>,
          <span key="legales"><LegalHighlight>Durées légales applicables</LegalHighlight> pour les données soumises à des obligations de conservation spécifiques</span>
        ]} />
      </LegalSection>

      {/* Transferts internationaux */}
      <LegalSection title="Transferts internationaux">
        <LegalText>
          SEIDO s'engage à ce que tous les transferts de données personnelles en dehors de l'Union
          européenne soient effectués conformément au RGPD et aux décisions d'adéquation ou aux
          garanties appropriées prévues par la réglementation.
        </LegalText>
      </LegalSection>

      {/* Modifications de la politique */}
      <LegalSection title="Modifications de la politique">
        <LegalText>
          Cette politique de confidentialité peut être modifiée à tout moment. En cas de modification
          significative, les utilisateurs en seront informés par email <LegalHighlight>quinze (15) jours</LegalHighlight> avant
          l'entrée en vigueur des modifications.
        </LegalText>
      </LegalSection>
    </LegalPageTemplate>
  )
}
