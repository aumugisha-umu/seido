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
  title: 'Conditions Générales d\'Utilisation',
  description: 'Conditions générales d\'utilisation de la plateforme SEIDO.',
}

/**
 * Page CGU - Conditions Générales d'Utilisation
 * Contenu basé sur docs/Documentation-légale.md (lignes 1-250)
 */
export default function CGUPage() {
  return (
    <LegalPageTemplate
      title="Conditions Générales d'Utilisation"
      lastUpdated="Septembre 2025"
    >
      {/* Généralités */}
      <LegalSection title="Généralités">
        <LegalText>
          <LegalHighlight>SEIDO</LegalHighlight> est un service proposé par <LegalHighlight>UMUMENTUM SRL</LegalHighlight>,
          dont le siège est situé Rue de Grand-Bigard 14, 1082 Berchem-Sainte-Agathe (Belgique), et inscrite
          auprès de la Banque-Carrefour des Entreprises sous le numéro 0775.691.974
          (Numéro TVA : BE0775691974 - RPM Bruxelles).
        </LegalText>
        <LegalText>
          Dans les conditions générales d&apos;utilisation de UMUMENTUM SRL (les « <LegalHighlight>CGU</LegalHighlight> »),
          le terme « SEIDO » désignera le service proposé et/ou UMUMENTUM SRL elle-même.
        </LegalText>
        <LegalText>
          Les CGU ont pour but de régir et de contrôler l&apos;utilisation du site web SEIDO dont le nom de domaine
          est <LegalHighlight>seido.pm</LegalHighlight>, et l&apos;application mobile le complétant, regroupés sous le terme
          (la « <LegalHighlight>Plateforme</LegalHighlight> »). Toute inscription à SEIDO conformément aux modalités
          décrites ci-après, emporte l&apos;acceptation expresse et sans réserve des CGU qui primeront sur tout autre document.
        </LegalText>
        <LegalText>
          SEIDO se réserve le droit de mettre à jour et de modifier les CGU à tout moment. En cas de modification
          significative des CGU pour l&apos;utilisateur de SEIDO, ce dernier en sera informé par e-mail,
          <LegalHighlight> quinze (15) jours</LegalHighlight> avant l&apos;entrée en vigueur desdites modifications.
        </LegalText>
        <LegalText>
          Les CGU annulent et remplacent toute autre proposition ou accord antérieur relatif au même objet.
          Il ne pourra être dérogé aux CGU qu&apos;en cas d&apos;accord exprès et écrit de SEIDO.
        </LegalText>
      </LegalSection>

      {/* Description du produit */}
      <LegalSection title="Description du produit">
        <LegalText>
          SEIDO est un service accessible via la Plateforme, offrant aux gestionnaires de biens immobiliers
          <LegalHighlight> une plateforme centralisée combinant la gestion locative traditionnelle et un système
          pour orchestrer toutes les interventions et communications qui y sont relatives</LegalHighlight>.
        </LegalText>
        <LegalText>
          SEIDO ne se substitue aucunement à la gestion du Client. Les conseils éventuellement fournis par SEIDO
          ne concernent que l&apos;utilisation de la Plateforme, et en aucun cas l&apos;organisation ou la gestion des Clients.
        </LegalText>
        <LegalText>
          La Plateforme proposée par SEIDO est <LegalHighlight>une solution standard</LegalHighlight>. En l&apos;utilisant,
          le Client est conscient que SEIDO pourrait ne pas savoir répondre aux besoins spécifiques de sa gestion.
        </LegalText>

        <LegalSubsection title="Services supplémentaires">
          <LegalText>
            SEIDO se réserve la possibilité de proposer au Client le bénéfice de services supplémentaires
            directement gérés par des tiers et portant sur l&apos;optimalisation de l&apos;utilisation de SEIDO.
            En cas d&apos;acceptation par le Client du service supplémentaire, une mise à jour du prix de l&apos;Abonnement sera appliquée.
          </LegalText>
          <LegalText>
            L&apos;éventuelle période d&apos;essai du service supplémentaire inclut le bénéfice du service supplémentaire
            pour le Client pendant une période de <LegalHighlight>7 jours</LegalHighlight> et ce, à titre gratuit.
          </LegalText>
        </LegalSubsection>
      </LegalSection>

      {/* Utilisation de la Plateforme */}
      <LegalSection title="Utilisation de la Plateforme par les différentes parties">
        <LegalText>
          La Plateforme implique trois parties principales dans son utilisation : les propriétaires/gestionnaires,
          les locataires et les fournisseurs de service. Pour une utilisation optimale de la Plateforme, chaque
          partie doit être présente sur celle-ci et effectuer les actions attendues dans le cadre du processus
          de gestion des interventions.
        </LegalText>
        <LegalText>
          <LegalHighlight>Le Client s&apos;engage à :</LegalHighlight>
        </LegalText>
        <LegalList items={[
          "Inviter et encourager ses locataires et les fournisseurs de service à utiliser la Plateforme",
          "Fournir une communication claire aux parties concernées"
        ]} />
        <LegalText>
          Cependant, la Plateforme est conçue de manière à permettre au gestionnaire d&apos;assurer un suivi complet
          de son patrimoine, de toutes les interventions et communications, même dans les cas où les locataires
          ou fournisseurs de service n&apos;effectueraient pas toutes les actions attendues.
        </LegalText>
        <LegalText>
          SEIDO fournira tous les outils de communication et d&apos;onboarding nécessaires pour faciliter l&apos;adoption
          de la Plateforme par toutes les parties concernées, mais <LegalHighlight>ne pourra être tenue responsable
          du refus ou de la sous-utilisation de la Plateforme par une des parties</LegalHighlight>.
        </LegalText>
      </LegalSection>

      {/* Création d'un compte */}
      <LegalSection title="Création d'un compte SEIDO">
        <LegalText>
          <LegalHighlight>Conditions nécessaires à la création d&apos;un compte sur SEIDO :</LegalHighlight>
        </LegalText>
        <LegalText>
          Pour pouvoir créer un compte SEIDO, tout utilisateur (futur Client) déclare obligatoirement
          et sous sa seule responsabilité :
        </LegalText>
        <LegalList items={[
          "Être âgé d'au moins 18 ans",
          "Fournir son nom complet, une adresse e-mail valide et toute autre information requise pour compléter l'inscription",
          "Accepter expressément les présentes CGU lors de l'inscription, que ce soit pour une formule gratuite ou payante",
          "Être responsable du maintien de la sécurité et de la confidentialité de son compte"
        ]} />
        <LegalText>
          SEIDO ne pourra pas être tenue pour responsable de tout dommage ou perte qui pourrait résulter
          de l&apos;incapacité du Client à protéger ses informations de connexion telles que le nom d&apos;utilisateur
          et/ou le mot de passe.
        </LegalText>
      </LegalSection>

      {/* Formules d'utilisation */}
      <LegalSection title="Formules d'utilisation et durée">
        <LegalSubsection title="Inscription et acceptation des CGU">
          <LegalText>
            L&apos;inscription sur la Plateforme SEIDO constitue l&apos;acceptation des présentes CGU, que le Client
            choisisse une formule gratuite ou payante. Cette acceptation prend effet immédiatement lors de
            la validation de l&apos;inscription par le Client.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Formules disponibles">
          <LegalText>
            SEIDO propose différentes formules d&apos;utilisation :
          </LegalText>
          <LegalList items={[
            <span key="gratuit"><LegalHighlight>Formule gratuite</LegalHighlight> : Accès limité aux fonctionnalités de base</span>,
            <span key="payant"><LegalHighlight>Formules payantes</LegalHighlight> : Abonnements mensuels ou annuels avec accès complet aux fonctionnalités</span>
          ]} />
        </LegalSubsection>

        <LegalSubsection title="Durée pour les abonnements payants">
          <LegalText>
            Pour les Clients ayant souscrit un abonnement payant, celui-ci prend effet le jour de l&apos;inscription
            et du premier paiement. À l&apos;issue de chaque période d&apos;abonnement (mensuelle ou annuelle selon la
            formule choisie), l&apos;abonnement est <LegalHighlight>reconduit tacitement</LegalHighlight> pour la même
            durée que celle souscrite initialement par le Client.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Résiliation de l'abonnement">
          <LegalText>
            Le Client peut résilier son abonnement payant à tout moment avant la reconduction de celui-ci,
            directement depuis son espace client sur la Plateforme, ou en contactant le service client par
            e-mail à l&apos;adresse <LegalHighlight>support@seido.pm</LegalHighlight>.
          </LegalText>
          <LegalText>
            La résiliation prend effet à la fin de la période d&apos;abonnement en cours. Le Client conserve
            l&apos;accès à toutes les fonctionnalités payantes jusqu&apos;à l&apos;expiration de la période pour laquelle il a payé.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Suppression de compte">
          <LegalText>
            Les Clients peuvent supprimer leur compte à tout moment depuis leur espace client ou en contactant
            le service client.
          </LegalText>
        </LegalSubsection>
      </LegalSection>

      {/* Paiement */}
      <LegalSection title="Paiement, prix et facturation">
        <LegalText>
          Les montants dus par le Client ayant souscrit un abonnement payant seront automatiquement facturés
          à chaque début de période (selon qu&apos;il s&apos;agisse d&apos;un abonnement mensuel ou annuel). Par les présentes,
          le Client accepte de recevoir ses factures sous <LegalHighlight>format électronique uniquement</LegalHighlight>.
        </LegalText>
        <LegalText>
          Toute facture est due à dater de la réception de celle-ci par le Client. La réception est supposée
          être le jour de l&apos;envoi par e-mail de la facture.
        </LegalText>
        <LegalText>
          Les tarifs affichés sur la Plateforme sont ceux en vigueur au moment de la souscription et sont
          revus annuellement par SEIDO. Les nouveaux tarifs seront communiqués au Client au plus tard
          <LegalHighlight> 30 jours</LegalHighlight> avant leur entrée en vigueur.
        </LegalText>
        <LegalText>
          En cas de fermeture de compte par le Client en violation de ces CGU, aucun remboursement ou crédit
          ne sera octroyé pour les mois partiellement utilisés ou pour les mois inutilisés.
        </LegalText>
      </LegalSection>

      {/* Suspension */}
      <LegalSection title="Suspension et désactivation du compte">
        <LegalText>
          SEIDO se réserve le droit, (i) en cas de non-paiement par le Client de l&apos;une de ses factures,
          ou (ii) en cas de non-respect par le Client de l&apos;une des clauses des CGU, de suspendre l&apos;accès
          du Client à SEIDO, immédiatement après en avoir notifié le Client et sans préavis.
        </LegalText>
        <LegalText>
          La violation de tout ou partie des CGU peut entraîner temporairement ou définitivement, la désactivation
          du compte SEIDO du Client. Toute désactivation du compte SEIDO d&apos;un Client aura lieu moyennant
          l&apos;envoi préalable d&apos;une mise en demeure par courrier électronique avec accusé de réception.
        </LegalText>
        <LegalText>
          À défaut de remédier à la violation dans un délai de <LegalHighlight>quinze (15) jours</LegalHighlight> à
          dater de réception de celle-ci, le compte SEIDO du Client sera définitivement désactivé et clôturé.
        </LegalText>
        <LegalText>
          Si le compte du Client est inutilisé pendant une période de plus de <LegalHighlight>deux (2) mois</LegalHighlight>,
          SEIDO se réserve le droit de désactiver le compte aux frais du Client, dans les cinq (5) jours après
          en avoir informé le Client.
        </LegalText>
      </LegalSection>

      {/* Force majeure */}
      <LegalSection title="Force majeure">
        <LegalText>
          La responsabilité de SEIDO sera entièrement dégagée si l&apos;inexécution d&apos;une, ou de la totalité de
          ses obligations en vertu des CGU, résulte d&apos;un cas de force majeure.
        </LegalText>
        <LegalText>
          Pour l&apos;application des CGU, la force majeure se définit comme un événement imprévisible, inévitable
          et indépendant de la volonté de SEIDO, tel que par exemple la défaillance de l&apos;hébergeur.
        </LegalText>
        <LegalText>
          En cas d&apos;impossibilité de remédier à cet événement de force majeure dans les <LegalHighlight>30 jours</LegalHighlight> à
          dater de sa survenance, SEIDO pourra procéder à la cessation du service avec le Client, sans être
          tenue à verser une quelconque indemnité au Client.
        </LegalText>
      </LegalSection>

      {/* Propriété intellectuelle */}
      <LegalSection title="Propriété intellectuelle">
        <LegalText>
          Le nom commercial <LegalHighlight>SEIDO</LegalHighlight> est la propriété exclusive de <LegalHighlight>UMUMENTUM SRL</LegalHighlight>.
          Il en va de même pour tous les logos de SEIDO, toute utilisation de ces logos liés à SEIDO, ainsi que
          tout contenu visuel de SEIDO.
        </LegalText>
        <LegalText>
          Tous les éléments constitutifs de la plateforme, accessibles ou non au Client, sont la propriété
          exclusive de SEIDO. Il s&apos;agit notamment des éléments suivants : la plateforme, les bases de données,
          les pages du Site Web, les outils de gestion, ainsi que tout autre outil ou information mis à
          disposition du Client.
        </LegalText>
        <LegalText>
          <LegalHighlight>Il est strictement interdit au Client :</LegalHighlight>
        </LegalText>
        <LegalList items={[
          "De copier, reproduire, modifier, représenter, publier, adapter, transmettre, traduire tout ou partie de la plateforme",
          "D'utiliser la plateforme d'une autre manière ou à d'autres fins que celles décrites dans les CGU",
          "De céder, à titre onéreux ou à titre gratuit, tout ou partie des droits et obligations qu'il détient en lien avec SEIDO"
        ]} />
        <LegalText>
          L&apos;utilisation de SEIDO par le Client confère à celui-ci le droit de licence d&apos;utilisation de la plateforme,
          pendant la durée de son utilisation du service, à l&apos;exclusion de tout autre droit.
        </LegalText>
      </LegalSection>

      {/* Obligations et responsabilités */}
      <LegalSection title="Obligations et responsabilités de SEIDO">
        <LegalText>
          SEIDO s&apos;engage à tout mettre en oeuvre pour fournir à ses Clients un service de qualité.
          Malgré tous les soins apportés par SEIDO pour un service continu (24h/24, 7 jours/7), des interruptions
          de service sont possibles, et sans responsabilité de SEIDO, en cas de panne ou défaillance de
          l&apos;hébergeur, ou en cas d&apos;interventions de maintenance nécessaires ou utiles.
        </LegalText>

        <LegalCard title="Service d'assistance technique">
          <LegalText>
            Le service d&apos;assistance technique s&apos;applique à tous les services fournis par SEIDO. Les Clients
            peuvent être assistés par e-mail, téléphone, ou via le chat intégré à la plateforme, et ce tous
            les jours ouvrables de <LegalHighlight>09h00 à 18h00</LegalHighlight>.
          </LegalText>
          <LegalList items={[
            <span key="chat"><LegalHighlight>Chat</LegalHighlight> : disponible sur la plateforme</span>,
            <span key="email"><LegalHighlight>Email</LegalHighlight> : support@seido.pm</span>,
            <span key="tel"><LegalHighlight>Téléphone</LegalHighlight> : +32 474 02 88 38</span>
          ]} />
        </LegalCard>

        <LegalSubsection title="Responsabilité liée aux interventions">
          <LegalText>
            SEIDO agit comme intermédiaire technologique pour la mise en relation entre les Clients et les
            prestataires. <LegalHighlight>SEIDO ne saurait être tenue responsable de la qualité des interventions
            réalisées par les prestataires</LegalHighlight>, des dommages causés par ces derniers, ou de leurs défaillances.
            Le Client reste entièrement responsable de la sélection et de la supervision des prestataires.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Limitation de responsabilité">
          <LegalText>
            Dans tous les cas où la responsabilité de SEIDO serait mise en cause et établie, seule sa faute lourde,
            son dol, ou son manquement à l&apos;une de ses obligations essentielles pourrait lui être reproché.
            Dans ce cas, le total des indemnités à charge de SEIDO ne pourrait dépasser le montant facturé
            pour la période au cours de laquelle est survenu le dommage.
          </LegalText>
          <LegalText>
            Toute réclamation à l&apos;égard de SEIDO doit, sous peine de déchéance, être formulée par e-mail avec
            accusé de réception dans les <LegalHighlight>72 heures</LegalHighlight> suivant le fait générateur.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="Limites d'Internet">
          <LegalText>
            Le Client déclare avoir pris connaissance des caractéristiques et des limites du réseau internet et
            des applications mobiles. Le Client accepte qu&apos;Internet et les applications mobiles ont des limites :
          </LegalText>
          <LegalList items={[
            "Les transmissions de données ne bénéficient que d'une fiabilité technique relative",
            "Les données circulant sur Internet ne sont pas protégées contre des détournements éventuels",
            "Il appartient au Client de protéger ses propres données et/ou logiciels de la contamination par des virus"
          ]} />
        </LegalSubsection>
      </LegalSection>

      {/* Divisibilité */}
      <LegalSection title="Divisibilité">
        <LegalText>
          Le fait qu&apos;une ou plusieurs dispositions des CGU seraient non valables, nulles ou non exécutables,
          n&apos;entrave en rien la validité des autres dispositions. En pareil cas, SEIDO et le Client se concerteront
          afin de remplacer la ou les dispositions non valables par une nouvelle disposition qui se rapprochera
          le plus possible du but visé par l&apos;ancienne disposition.
        </LegalText>
      </LegalSection>

      {/* Loi applicable */}
      <LegalSection title="Loi applicable et règlement des litiges">
        <LegalText>
          Les CGU sont soumises au <LegalHighlight>droit belge</LegalHighlight>. L&apos;utilisation de SEIDO et ses services
          sont régis par le droit belge. La langue de référence des CGU est le français.
        </LegalText>
        <LegalText>
          Tout CGU rédigées dans une autre langue ne sera considéré que comme une traduction à des fins commerciales
          et d&apos;information. En cas de divergence entre le texte en français et le texte traduit, le texte français prévaudra.
        </LegalText>
        <LegalText>
          A défaut d&apos;accord amiable entre le Client et SEIDO, tout différend ou litige relevant de l&apos;exécution ou
          de l&apos;interprétation des CGU sera de la compétence exclusive des <LegalHighlight>tribunaux de l&apos;arrondissement
          de Bruxelles (Belgique)</LegalHighlight>.
        </LegalText>
      </LegalSection>
    </LegalPageTemplate>
  )
}
