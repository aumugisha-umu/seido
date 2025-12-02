import type { Metadata } from 'next'
import Link from 'next/link'
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
  title: 'Politique de Cookies',
  description: 'Politique d\'utilisation des cookies sur la plateforme SEIDO.',
}

/**
 * Page Politique de Cookies
 * Contenu basé sur docs/Documentation-légale.md (lignes 390-547)
 */
export default function CookiePolicyPage() {
  return (
    <LegalPageTemplate
      title="Politique de Cookies"
      lastUpdated="Septembre 2025"
    >
      {/* À propos de cette politique */}
      <LegalSection title="1. À propos de cette politique">
        <LegalText>
          Cette Politique de Cookies (« <LegalHighlight>Politique</LegalHighlight> ») explique comment
          <LegalHighlight> SEIDO</LegalHighlight> utilise les cookies et technologies similaires pour vous
          reconnaître lorsque vous visitez notre site web à l&apos;adresse <LegalHighlight>https://seido.pm</LegalHighlight> et
          notre application mobile (« <LegalHighlight>Plateforme</LegalHighlight> »). Elle explique ce que sont ces
          technologies, pourquoi nous les utilisons et vos droits pour contrôler notre utilisation de celles-ci.
        </LegalText>
      </LegalSection>

      {/* Qu'est-ce que les cookies ? */}
      <LegalSection title="2. Qu'est-ce que les cookies ?">
        <LegalSubsection title="2.1 Définition">
          <LegalText>
            Les cookies sont de petits fichiers texte qui sont placés sur votre ordinateur ou appareil mobile
            lorsque vous visitez notre Plateforme. Les cookies sont largement utilisés par les propriétaires
            de sites web afin de faire fonctionner les sites web, de les faire fonctionner plus efficacement,
            ou d&apos;assurer la transmission d&apos;informations.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="2.2 Fonctions des cookies">
          <LegalText>
            Les cookies ont de nombreuses fonctions, telles que vous permettre de naviguer efficacement entre
            les pages, se souvenir de vos préférences et généralement améliorer l&apos;expérience utilisateur.
            Les cookies peuvent également aider à s&apos;assurer que les publicités que vous voyez en ligne sont
            plus pertinentes pour vous et vos intérêts.
          </LegalText>
        </LegalSubsection>

        <LegalSubsection title="2.3 Types de cookies">
          <LegalText>
            Les cookies définis par le propriétaire du site (dans ce cas SEIDO) sont appelés
            « <LegalHighlight>cookies internes</LegalHighlight> ». Les cookies déposés par des parties autres
            que le propriétaire du site sont appelés « <LegalHighlight>cookies tiers</LegalHighlight> ».
          </LegalText>
          <LegalText>
            Les cookies tiers permettent à des applications ou fonctionnalités tierces sur ou via la Plateforme
            (par exemple, la publicité, le contenu interactif et l&apos;analyse). Les parties qui déposent ces cookies
            tiers peuvent reconnaître votre ordinateur à la fois lorsqu&apos;il visite le site web en question et
            aussi lorsqu&apos;il visite certains autres sites web.
          </LegalText>
        </LegalSubsection>
      </LegalSection>

      {/* Durée des cookies */}
      <LegalSection title="3. Combien de temps durent les cookies ?">
        <LegalText>
          Les cookies peuvent rester sur votre ordinateur ou appareil mobile pendant des périodes variables :
        </LegalText>
        <LegalList items={[
          <span key="session"><LegalHighlight>Cookies de session</LegalHighlight> : n&apos;existent que lorsque votre navigateur est ouvert et sont automatiquement supprimés lorsque vous fermez votre navigateur ou quittez l&apos;application</span>,
          <span key="persistent"><LegalHighlight>Cookies persistants</LegalHighlight> : survivent après la fermeture de votre navigateur ou application et peuvent être utilisés pour reconnaître votre ordinateur lorsque vous le rouvrez</span>
        ]} />
      </LegalSection>

      {/* Pourquoi utilisons-nous des cookies ? */}
      <LegalSection title="4. Pourquoi utilisons-nous des cookies ?">
        <LegalSubsection title="Cookies essentiels">
          <LegalList items={[
            <span key="auth"><LegalHighlight>Cookies d&apos;authentification</LegalHighlight> : pour maintenir votre connexion sécurisée</span>,
            <span key="pref"><LegalHighlight>Cookies de préférences</LegalHighlight> : pour mémoriser vos paramètres utilisateur</span>,
            <span key="sec"><LegalHighlight>Cookies de sécurité</LegalHighlight> : pour protéger contre les attaques malveillantes</span>
          ]} />
        </LegalSubsection>

        <LegalSubsection title="Cookies d'analyse">
          <LegalList items={[
            <span key="ga"><LegalHighlight>Google Analytics</LegalHighlight> : enregistre le nombre de visites de chaque visiteur, l&apos;heure de début et de fin de visite et le site web d&apos;où provient le visiteur</span>
          ]} />
        </LegalSubsection>

        <LegalSubsection title="Cookies de réseaux sociaux">
          <LegalList items={[
            <span key="linkedin"><LegalHighlight>LinkedIn</LegalHighlight> : enregistre de quel site provient le visiteur</span>,
            <span key="fb"><LegalHighlight>Facebook</LegalHighlight> : enregistre de quel site provient le visiteur</span>
          ]} />
        </LegalSubsection>

        <LegalSubsection title="Cookies fonctionnels">
          <LegalList items={[
            <span key="chat"><LegalHighlight>Cookies de chat</LegalHighlight> : pour maintenir les conversations du support client</span>,
            <span key="geo"><LegalHighlight>Cookies de géolocalisation</LegalHighlight> : pour les fonctionnalités d&apos;intervention (avec consentement)</span>
          ]} />
        </LegalSubsection>
      </LegalSection>

      {/* Technologies similaires */}
      <LegalSection title="5. Autres technologies de suivi">
        <LegalText>
          Les cookies ne sont pas le seul moyen de reconnaître ou de suivre les visiteurs d&apos;un site web.
          Nous pouvons de temps à autre utiliser d&apos;autres technologies similaires, telles que les
          <LegalHighlight> balises web</LegalHighlight> (parfois appelées « pixels invisibles » ou « gifs transparents »).
        </LegalText>
        <LegalText>
          Ce sont de petits fichiers graphiques qui contiennent un identifiant unique qui nous permet de
          reconnaître quand quelqu&apos;un a visité notre Plateforme ou ouvert un e-mail que nous lui avons envoyé.
          Dans de nombreux cas, ces technologies dépendent des cookies pour fonctionner correctement.
          Par conséquent, refuser les cookies interférera avec leur fonctionnement.
        </LegalText>
      </LegalSection>

      {/* Publicité ciblée */}
      <LegalSection title="6. Publicité ciblée">
        <LegalText>
          Des tiers peuvent placer des cookies sur votre ordinateur ou appareil mobile pour offrir de la
          publicité via notre Plateforme. Ces entreprises peuvent utiliser des informations sur vos visites
          de cette Plateforme et d&apos;autres sites web afin de fournir des publicités pertinentes sur des biens
          et services qui peuvent vous intéresser.
        </LegalText>
        <LegalText>
          Les informations collectées dans le cadre de ce processus <LegalHighlight>ne nous permettent pas
          d&apos;identifier votre nom, coordonnées ou autres informations personnellement identifiables</LegalHighlight> à
          moins que vous ne choisissiez de les fournir.
        </LegalText>
      </LegalSection>

      {/* Contrôle des cookies */}
      <LegalSection title="7. Comment puis-je contrôler les cookies ?">
        <LegalSubsection title="7.1 Gestion du consentement">
          <LegalText>
            Vous avez le droit de décider d&apos;accepter ou non les cookies. Vous pouvez exercer vos préférences :
          </LegalText>
          <LegalList items={[
            <span key="banner"><LegalHighlight>Via notre bannière de cookies</LegalHighlight> lors de votre première visite</span>,
            <span key="account"><LegalHighlight>Dans les paramètres de votre compte</LegalHighlight> sur la Plateforme</span>,
            <span key="browser"><LegalHighlight>Via les paramètres de votre navigateur</LegalHighlight></span>
          ]} />
        </LegalSubsection>

        <LegalSubsection title="7.2 Paramètres du navigateur">
          <LegalText>
            Vous pouvez configurer ou modifier les contrôles de votre navigateur web pour accepter ou refuser
            les cookies. Si vous choisissez de refuser les cookies, vous pourrez toujours utiliser notre
            Plateforme bien que votre accès à certaines fonctionnalités et zones de notre Plateforme puisse
            être limité.
          </LegalText>
        </LegalSubsection>

        <LegalCard title="Liens utiles pour la gestion des cookies">
          <LegalList items={[
            <span key="chrome"><LegalHighlight>Google Chrome</LegalHighlight> : <Link href="https://support.google.com/chrome/answer/95647?hl=fr" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">support.google.com</Link></span>,
            <span key="firefox"><LegalHighlight>Mozilla Firefox</LegalHighlight> : <Link href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">support.mozilla.org</Link></span>,
            <span key="safari"><LegalHighlight>Safari</LegalHighlight> : <Link href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">support.apple.com</Link></span>,
            <span key="edge"><LegalHighlight>Microsoft Edge</LegalHighlight> : <Link href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">support.microsoft.com</Link></span>
          ]} />
        </LegalCard>

        <LegalSubsection title="7.3 Désactivation de la publicité ciblée">
          <LegalText>
            La plupart des réseaux publicitaires vous offrent un moyen de vous désinscrire de la publicité ciblée.
            Pour plus d&apos;informations, visitez :
          </LegalText>
          <LegalList items={[
            <span key="youronline"><Link href="http://www.youronlinechoices.eu/fr/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">www.youronlinechoices.eu</Link></span>,
            <span key="google"><Link href="https://www.google.com/settings/ads/anonymous" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">www.google.com/settings/ads</Link></span>
          ]} />
        </LegalSubsection>
      </LegalSection>

      {/* Cookies envoyés dans le passé */}
      <LegalSection title="8. Cookies envoyés dans le passé">
        <LegalText>
          Si vous avez désactivé un ou plusieurs cookies, nous pouvons encore utiliser les informations
          collectées par ces cookies avant qu&apos;ils ne soient désactivés. Cependant, nous cessons de collecter
          de nouvelles informations à partir du cookie désactivé.
        </LegalText>
      </LegalSection>

      {/* Plus d'informations */}
      <LegalSection title="9. Obtenir plus d'informations sur les cookies">
        <LegalText>
          Pour plus d&apos;informations sur les cookies, y compris une explication de la façon dont les cookies
          sont placés sur votre appareil, ou comment les gérer et les supprimer, visitez :
        </LegalText>
        <LegalList items={[
          <span key="cnil"><Link href="https://www.cnil.fr/fr/cookies-les-outils-pour-les-maitriser" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">www.cnil.fr</Link> - CNIL (Commission Nationale de l&apos;Informatique et des Libertés)</span>,
          <span key="allabout"><Link href="http://www.allaboutcookies.org/fr/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">www.allaboutcookies.org</Link></span>
        ]} />
      </LegalSection>

      {/* Mise à jour */}
      <LegalSection title="10. Mise à jour de cette politique">
        <LegalText>
          Nous pouvons mettre à jour cette Politique de temps à autre en réponse à des développements légaux,
          techniques ou commerciaux. Lorsque nous mettons à jour notre Politique, nous prendrons les mesures
          appropriées pour vous informer en fonction de l&apos;importance des changements que nous apportons.
        </LegalText>
        <LegalText>
          Nous obtiendrons votre consentement à tout changement matériel de cette Politique si requis par les
          lois applicables sur la protection des données.
        </LegalText>
      </LegalSection>

      {/* Contact */}
      <LegalSection title="11. Contact">
        <LegalText>
          Si vous avez des questions concernant cette Politique de Cookies, veuillez nous contacter :
        </LegalText>
        <LegalCard title="UMUMENTUM SRL">
          <LegalText>
            Rue de Grand-Bigard 14<br />
            1082 Berchem-Sainte-Agathe<br />
            Belgique
          </LegalText>
          <LegalList items={[
            <span key="email-rgpd"><LegalHighlight>Email RGPD</LegalHighlight> : rgpd@seido.pm</span>,
            <span key="email-support"><LegalHighlight>Support</LegalHighlight> : support@seido.pm</span>
          ]} />
        </LegalCard>
      </LegalSection>

      {/* Conformité RGPD */}
      <LegalSection title="12. Conformité RGPD">
        <LegalSubsection title="12.1 Base légale">
          <LegalText>
            Le traitement de données personnelles via les cookies se base sur :
          </LegalText>
          <LegalList items={[
            <span key="consent"><LegalHighlight>Votre consentement</LegalHighlight> pour les cookies non essentiels</span>,
            <span key="interest"><LegalHighlight>L&apos;intérêt légitime</LegalHighlight> pour les cookies essentiels au fonctionnement de la Plateforme</span>,
            <span key="contract"><LegalHighlight>L&apos;exécution du contrat</LegalHighlight> pour les cookies nécessaires à la fourniture du service</span>
          ]} />
        </LegalSubsection>

        <LegalSubsection title="12.2 Droits des utilisateurs">
          <LegalText>
            Conformément au RGPD, vous disposez des droits suivants concernant vos données collectées via les cookies :
          </LegalText>
          <LegalList items={[
            <span key="acces"><LegalHighlight>Droit d&apos;accès</LegalHighlight> : connaître quelles données sont collectées</span>,
            <span key="rectif"><LegalHighlight>Droit de rectification</LegalHighlight> : corriger les données inexactes</span>,
            <span key="efface"><LegalHighlight>Droit d&apos;effacement</LegalHighlight> : supprimer vos données</span>,
            <span key="oppose"><LegalHighlight>Droit d&apos;opposition</LegalHighlight> : vous opposer au traitement</span>,
            <span key="porta"><LegalHighlight>Droit à la portabilité</LegalHighlight> : récupérer vos données dans un format structuré</span>
          ]} />
        </LegalSubsection>
      </LegalSection>
    </LegalPageTemplate>
  )
}
