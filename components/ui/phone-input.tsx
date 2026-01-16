"use client"

import * as React from "react"
import { Check, X, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

// Type pour les informations de pays
interface CountryInfo {
  code: string
  country: string
  iso: string
  mobileFormat: string
  fixedFormat: string
  mobilePrefix: string // Préfixe pour identifier un mobile (ex: "4" pour BE, "6" pour FR)
}

/**
 * Composant Flag utilisant flag-icons (fichiers locaux dans public/flags/4x3/)
 */
const CountryFlag = React.memo(({ iso, className }: { iso: string; className?: string }) => {
  const [hasError, setHasError] = React.useState(false)
  
  // URL du drapeau depuis les fichiers locaux (public/flags/4x3/)
  const flagUrl = `/flags/4x3/${iso.toLowerCase()}.svg`
  
  const handleError = () => {
    setHasError(true)
  }
  
  // Fallback avec code ISO stylisé si l'image ne charge pas
  if (hasError) {
    return (
      <span 
        className={cn(
          "inline-flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-800 text-[9px] font-bold text-blue-700 dark:text-slate-300 rounded border border-blue-200 dark:border-slate-600 shadow-sm",
          className
        )}
        style={{ width: 24, height: 18, letterSpacing: '-0.5px' }}
      >
        {iso}
      </span>
    )
  }
  
  return (
    <img
      src={flagUrl}
      alt={`Drapeau ${iso}`}
      className={cn("rounded shadow-sm object-cover", className)}
      style={{ width: 24, height: 18 }}
      onError={handleError}
    />
  )
})

// Liste complète des préfixes téléphoniques par pays avec formats
const COUNTRY_PREFIXES: CountryInfo[] = [
  // Europe
  { code: "+32", country: "Belgique", iso: "BE", mobileFormat: "4XX XX XX XX", fixedFormat: "X XXX XX XX", mobilePrefix: "4" },
  { code: "+33", country: "France", iso: "FR", mobileFormat: "6 XX XX XX XX", fixedFormat: "X XX XX XX XX", mobilePrefix: "6" },
  { code: "+352", country: "Luxembourg", iso: "LU", mobileFormat: "6XX XXX XXX", fixedFormat: "XX XX XX", mobilePrefix: "6" },
  { code: "+31", country: "Pays-Bas", iso: "NL", mobileFormat: "6 XXXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "6" },
  { code: "+49", country: "Allemagne", iso: "DE", mobileFormat: "1XX XXXXXXX", fixedFormat: "XXX XXXXXXX", mobilePrefix: "1" },
  { code: "+41", country: "Suisse", iso: "CH", mobileFormat: "7X XXX XX XX", fixedFormat: "XX XXX XX XX", mobilePrefix: "7" },
  { code: "+44", country: "Royaume-Uni", iso: "GB", mobileFormat: "7XXX XXXXXX", fixedFormat: "XXXX XXXXXX", mobilePrefix: "7" },
  { code: "+39", country: "Italie", iso: "IT", mobileFormat: "3XX XXX XXXX", fixedFormat: "XX XXXX XXXX", mobilePrefix: "3" },
  { code: "+34", country: "Espagne", iso: "ES", mobileFormat: "6XX XXX XXX", fixedFormat: "9XX XXX XXX", mobilePrefix: "6" },
  { code: "+351", country: "Portugal", iso: "PT", mobileFormat: "9XX XXX XXX", fixedFormat: "2XX XXX XXX", mobilePrefix: "9" },
  { code: "+43", country: "Autriche", iso: "AT", mobileFormat: "6XX XXXXXXX", fixedFormat: "X XXXXXXXX", mobilePrefix: "6" },
  { code: "+45", country: "Danemark", iso: "DK", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "" },
  { code: "+46", country: "Suède", iso: "SE", mobileFormat: "7X XXX XX XX", fixedFormat: "XX XXX XX XX", mobilePrefix: "7" },
  { code: "+47", country: "Norvège", iso: "NO", mobileFormat: "XXX XX XXX", fixedFormat: "XX XX XX XX", mobilePrefix: "4" },
  { code: "+358", country: "Finlande", iso: "FI", mobileFormat: "XX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "4" },
  { code: "+353", country: "Irlande", iso: "IE", mobileFormat: "8X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "8" },
  { code: "+48", country: "Pologne", iso: "PL", mobileFormat: "XXX XXX XXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "5" },
  { code: "+420", country: "République tchèque", iso: "CZ", mobileFormat: "XXX XXX XXX", fixedFormat: "XXX XXX XXX", mobilePrefix: "6" },
  { code: "+421", country: "Slovaquie", iso: "SK", mobileFormat: "9XX XXX XXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+36", country: "Hongrie", iso: "HU", mobileFormat: "XX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "2" },
  { code: "+40", country: "Roumanie", iso: "RO", mobileFormat: "7XX XXX XXX", fixedFormat: "XXX XXX XXX", mobilePrefix: "7" },
  { code: "+359", country: "Bulgarie", iso: "BG", mobileFormat: "8X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "8" },
  { code: "+30", country: "Grèce", iso: "GR", mobileFormat: "6XX XXX XXXX", fixedFormat: "XXX XXX XXXX", mobilePrefix: "6" },
  { code: "+385", country: "Croatie", iso: "HR", mobileFormat: "9X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+386", country: "Slovénie", iso: "SI", mobileFormat: "XX XXX XXX", fixedFormat: "X XXX XX XX", mobilePrefix: "3" },
  { code: "+381", country: "Serbie", iso: "RS", mobileFormat: "6X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "6" },
  { code: "+382", country: "Monténégro", iso: "ME", mobileFormat: "6X XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "6" },
  { code: "+387", country: "Bosnie-Herzégovine", iso: "BA", mobileFormat: "6X XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "6" },
  { code: "+389", country: "Macédoine du Nord", iso: "MK", mobileFormat: "7X XXX XXX", fixedFormat: "X XXX XXX", mobilePrefix: "7" },
  { code: "+355", country: "Albanie", iso: "AL", mobileFormat: "6X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "6" },
  { code: "+383", country: "Kosovo", iso: "XK", mobileFormat: "4X XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "4" },
  { code: "+370", country: "Lituanie", iso: "LT", mobileFormat: "6XX XXXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "6" },
  { code: "+371", country: "Lettonie", iso: "LV", mobileFormat: "2X XXX XXX", fixedFormat: "6X XXX XXX", mobilePrefix: "2" },
  { code: "+372", country: "Estonie", iso: "EE", mobileFormat: "5XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "5" },
  { code: "+375", country: "Biélorussie", iso: "BY", mobileFormat: "XX XXX XX XX", fixedFormat: "XX XXX XX XX", mobilePrefix: "2" },
  { code: "+380", country: "Ukraine", iso: "UA", mobileFormat: "XX XXX XX XX", fixedFormat: "XX XXX XX XX", mobilePrefix: "5" },
  { code: "+373", country: "Moldavie", iso: "MD", mobileFormat: "XXX XX XXX", fixedFormat: "XX XX XX XX", mobilePrefix: "6" },
  { code: "+354", country: "Islande", iso: "IS", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "6" },
  { code: "+356", country: "Malte", iso: "MT", mobileFormat: "9XXX XXXX", fixedFormat: "2XXX XXXX", mobilePrefix: "9" },
  { code: "+357", country: "Chypre", iso: "CY", mobileFormat: "9X XXXXXX", fixedFormat: "2X XXXXXX", mobilePrefix: "9" },
  { code: "+377", country: "Monaco", iso: "MC", mobileFormat: "X XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "6" },
  { code: "+376", country: "Andorre", iso: "AD", mobileFormat: "X XX XX XX", fixedFormat: "X XX XX XX", mobilePrefix: "3" },
  { code: "+378", country: "Saint-Marin", iso: "SM", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "6" },
  { code: "+423", country: "Liechtenstein", iso: "LI", mobileFormat: "XXX XX XX", fixedFormat: "XXX XX XX", mobilePrefix: "6" },
  { code: "+7", country: "Russie", iso: "RU", mobileFormat: "9XX XXX XX XX", fixedFormat: "XXX XXX XX XX", mobilePrefix: "9" },
  
  // Amérique du Nord
  { code: "+1", country: "États-Unis", iso: "US", mobileFormat: "XXX XXX XXXX", fixedFormat: "XXX XXX XXXX", mobilePrefix: "" },
  { code: "+1", country: "Canada", iso: "CA", mobileFormat: "XXX XXX XXXX", fixedFormat: "XXX XXX XXXX", mobilePrefix: "" },
  { code: "+52", country: "Mexique", iso: "MX", mobileFormat: "XX XXXX XXXX", fixedFormat: "XX XXXX XXXX", mobilePrefix: "" },
  
  // Amérique Centrale & Caraïbes
  { code: "+501", country: "Belize", iso: "BZ", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "6" },
  { code: "+502", country: "Guatemala", iso: "GT", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "5" },
  { code: "+503", country: "El Salvador", iso: "SV", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "7" },
  { code: "+504", country: "Honduras", iso: "HN", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "9" },
  { code: "+505", country: "Nicaragua", iso: "NI", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "8" },
  { code: "+506", country: "Costa Rica", iso: "CR", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "8" },
  { code: "+507", country: "Panama", iso: "PA", mobileFormat: "XXXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "6" },
  { code: "+53", country: "Cuba", iso: "CU", mobileFormat: "X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "5" },
  { code: "+509", country: "Haïti", iso: "HT", mobileFormat: "XX XX XXXX", fixedFormat: "XX XX XXXX", mobilePrefix: "3" },
  { code: "+1809", country: "République dominicaine", iso: "DO", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "" },
  { code: "+1876", country: "Jamaïque", iso: "JM", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "" },
  { code: "+1868", country: "Trinité-et-Tobago", iso: "TT", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "" },
  { code: "+1246", country: "Barbade", iso: "BB", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "" },
  { code: "+1242", country: "Bahamas", iso: "BS", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "" },
  { code: "+590", country: "Guadeloupe", iso: "GP", mobileFormat: "6XX XX XX XX", fixedFormat: "5XX XX XX XX", mobilePrefix: "6" },
  { code: "+596", country: "Martinique", iso: "MQ", mobileFormat: "6XX XX XX XX", fixedFormat: "5XX XX XX XX", mobilePrefix: "6" },
  
  // Amérique du Sud
  { code: "+54", country: "Argentine", iso: "AR", mobileFormat: "XX XXXX XXXX", fixedFormat: "XX XXXX XXXX", mobilePrefix: "" },
  { code: "+55", country: "Brésil", iso: "BR", mobileFormat: "XX 9XXXX XXXX", fixedFormat: "XX XXXX XXXX", mobilePrefix: "9" },
  { code: "+56", country: "Chili", iso: "CL", mobileFormat: "9 XXXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+57", country: "Colombie", iso: "CO", mobileFormat: "3XX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "3" },
  { code: "+58", country: "Venezuela", iso: "VE", mobileFormat: "4XX XXX XXXX", fixedFormat: "XXX XXX XXXX", mobilePrefix: "4" },
  { code: "+51", country: "Pérou", iso: "PE", mobileFormat: "9XX XXX XXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+593", country: "Équateur", iso: "EC", mobileFormat: "9X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+591", country: "Bolivie", iso: "BO", mobileFormat: "X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "7" },
  { code: "+595", country: "Paraguay", iso: "PY", mobileFormat: "9XX XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "9" },
  { code: "+598", country: "Uruguay", iso: "UY", mobileFormat: "9X XXX XXX", fixedFormat: "XXXX XXXX", mobilePrefix: "9" },
  { code: "+594", country: "Guyane française", iso: "GF", mobileFormat: "6XX XX XX XX", fixedFormat: "5XX XX XX XX", mobilePrefix: "6" },
  { code: "+592", country: "Guyana", iso: "GY", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "6" },
  { code: "+597", country: "Suriname", iso: "SR", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXX", mobilePrefix: "8" },
  
  // Asie
  { code: "+86", country: "Chine", iso: "CN", mobileFormat: "XXX XXXX XXXX", fixedFormat: "XXX XXXX XXXX", mobilePrefix: "1" },
  { code: "+81", country: "Japon", iso: "JP", mobileFormat: "XX XXXX XXXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "9" },
  { code: "+82", country: "Corée du Sud", iso: "KR", mobileFormat: "XX XXXX XXXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "1" },
  { code: "+850", country: "Corée du Nord", iso: "KP", mobileFormat: "XXX XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "1" },
  { code: "+91", country: "Inde", iso: "IN", mobileFormat: "XXXXX XXXXX", fixedFormat: "XXX XXXXXXX", mobilePrefix: "9" },
  { code: "+92", country: "Pakistan", iso: "PK", mobileFormat: "3XX XXX XXXX", fixedFormat: "XX XXXXXXX", mobilePrefix: "3" },
  { code: "+880", country: "Bangladesh", iso: "BD", mobileFormat: "1XXX XXXXXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "1" },
  { code: "+94", country: "Sri Lanka", iso: "LK", mobileFormat: "7X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "7" },
  { code: "+95", country: "Myanmar", iso: "MM", mobileFormat: "9 XXX XXXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+66", country: "Thaïlande", iso: "TH", mobileFormat: "X XXXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "8" },
  { code: "+84", country: "Vietnam", iso: "VN", mobileFormat: "XX XXX XX XX", fixedFormat: "XX XXXX XXX", mobilePrefix: "9" },
  { code: "+60", country: "Malaisie", iso: "MY", mobileFormat: "1X XXX XXXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "1" },
  { code: "+65", country: "Singapour", iso: "SG", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "8" },
  { code: "+62", country: "Indonésie", iso: "ID", mobileFormat: "8XX XXXX XXXX", fixedFormat: "XX XXXX XXXX", mobilePrefix: "8" },
  { code: "+63", country: "Philippines", iso: "PH", mobileFormat: "9XX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+852", country: "Hong Kong", iso: "HK", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "5" },
  { code: "+853", country: "Macao", iso: "MO", mobileFormat: "6XXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "6" },
  { code: "+886", country: "Taïwan", iso: "TW", mobileFormat: "9XX XXX XXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "9" },
  { code: "+976", country: "Mongolie", iso: "MN", mobileFormat: "XX XX XXXX", fixedFormat: "XX XX XXXX", mobilePrefix: "8" },
  { code: "+855", country: "Cambodge", iso: "KH", mobileFormat: "XX XXX XXXX", fixedFormat: "XX XXX XXX", mobilePrefix: "1" },
  { code: "+856", country: "Laos", iso: "LA", mobileFormat: "20 XX XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "2" },
  { code: "+977", country: "Népal", iso: "NP", mobileFormat: "98X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+975", country: "Bhoutan", iso: "BT", mobileFormat: "17 XX XX XX", fixedFormat: "X XXX XXX", mobilePrefix: "1" },
  { code: "+960", country: "Maldives", iso: "MV", mobileFormat: "7XX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "7" },
  { code: "+93", country: "Afghanistan", iso: "AF", mobileFormat: "7X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "7" },
  { code: "+992", country: "Tadjikistan", iso: "TJ", mobileFormat: "XX XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+996", country: "Kirghizistan", iso: "KG", mobileFormat: "XXX XX XX XX", fixedFormat: "XXX XX XX XX", mobilePrefix: "7" },
  { code: "+998", country: "Ouzbékistan", iso: "UZ", mobileFormat: "XX XXX XX XX", fixedFormat: "XX XXX XX XX", mobilePrefix: "9" },
  { code: "+993", country: "Turkménistan", iso: "TM", mobileFormat: "6X XXXXXX", fixedFormat: "XX XXXXXX", mobilePrefix: "6" },
  { code: "+7", country: "Kazakhstan", iso: "KZ", mobileFormat: "7XX XXX XX XX", fixedFormat: "7XX XXX XX XX", mobilePrefix: "7" },
  { code: "+994", country: "Azerbaïdjan", iso: "AZ", mobileFormat: "XX XXX XX XX", fixedFormat: "XX XXX XX XX", mobilePrefix: "5" },
  { code: "+995", country: "Géorgie", iso: "GE", mobileFormat: "5XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "5" },
  { code: "+374", country: "Arménie", iso: "AM", mobileFormat: "XX XXXXXX", fixedFormat: "XX XXXXXX", mobilePrefix: "9" },
  
  // Moyen-Orient
  { code: "+90", country: "Turquie", iso: "TR", mobileFormat: "5XX XXX XXXX", fixedFormat: "XXX XXX XXXX", mobilePrefix: "5" },
  { code: "+972", country: "Israël", iso: "IL", mobileFormat: "5X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "5" },
  { code: "+970", country: "Palestine", iso: "PS", mobileFormat: "5X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "5" },
  { code: "+961", country: "Liban", iso: "LB", mobileFormat: "XX XXX XXX", fixedFormat: "X XXX XXX", mobilePrefix: "7" },
  { code: "+963", country: "Syrie", iso: "SY", mobileFormat: "9XX XXX XXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+962", country: "Jordanie", iso: "JO", mobileFormat: "7X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "7" },
  { code: "+964", country: "Irak", iso: "IQ", mobileFormat: "7XX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "7" },
  { code: "+98", country: "Iran", iso: "IR", mobileFormat: "9XX XXX XXXX", fixedFormat: "XX XXXX XXXX", mobilePrefix: "9" },
  { code: "+966", country: "Arabie saoudite", iso: "SA", mobileFormat: "5X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "5" },
  { code: "+971", country: "Émirats arabes unis", iso: "AE", mobileFormat: "5X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "5" },
  { code: "+974", country: "Qatar", iso: "QA", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "5" },
  { code: "+973", country: "Bahreïn", iso: "BH", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "3" },
  { code: "+965", country: "Koweït", iso: "KW", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "5" },
  { code: "+968", country: "Oman", iso: "OM", mobileFormat: "9XXX XXXX", fixedFormat: "XX XXX XXX", mobilePrefix: "9" },
  { code: "+967", country: "Yémen", iso: "YE", mobileFormat: "7XX XXX XXX", fixedFormat: "X XXX XXX", mobilePrefix: "7" },
  
  // Afrique
  { code: "+212", country: "Maroc", iso: "MA", mobileFormat: "6XX XX XX XX", fixedFormat: "5XX XX XX XX", mobilePrefix: "6" },
  { code: "+213", country: "Algérie", iso: "DZ", mobileFormat: "5XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "5" },
  { code: "+216", country: "Tunisie", iso: "TN", mobileFormat: "XX XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "2" },
  { code: "+218", country: "Libye", iso: "LY", mobileFormat: "9X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+20", country: "Égypte", iso: "EG", mobileFormat: "1X XXXX XXXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "1" },
  { code: "+249", country: "Soudan", iso: "SD", mobileFormat: "9X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+211", country: "Soudan du Sud", iso: "SS", mobileFormat: "9X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+251", country: "Éthiopie", iso: "ET", mobileFormat: "9X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+254", country: "Kenya", iso: "KE", mobileFormat: "7XX XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "7" },
  { code: "+255", country: "Tanzanie", iso: "TZ", mobileFormat: "7XX XXX XXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "7" },
  { code: "+256", country: "Ouganda", iso: "UG", mobileFormat: "7XX XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "7" },
  { code: "+250", country: "Rwanda", iso: "RW", mobileFormat: "7XX XXX XXX", fixedFormat: "XXX XXX XXX", mobilePrefix: "7" },
  { code: "+257", country: "Burundi", iso: "BI", mobileFormat: "7X XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "7" },
  { code: "+243", country: "RD Congo", iso: "CD", mobileFormat: "9XX XXX XXX", fixedFormat: "X XXX XXXX", mobilePrefix: "9" },
  { code: "+242", country: "Congo", iso: "CG", mobileFormat: "XX XXX XXXX", fixedFormat: "XXX XX XX", mobilePrefix: "0" },
  { code: "+241", country: "Gabon", iso: "GA", mobileFormat: "X XX XX XX", fixedFormat: "X XX XX XX", mobilePrefix: "6" },
  { code: "+240", country: "Guinée équatoriale", iso: "GQ", mobileFormat: "XXX XXX XXX", fixedFormat: "XXX XXX XXX", mobilePrefix: "2" },
  { code: "+237", country: "Cameroun", iso: "CM", mobileFormat: "6 XX XX XX XX", fixedFormat: "2 XX XX XX XX", mobilePrefix: "6" },
  { code: "+234", country: "Nigeria", iso: "NG", mobileFormat: "XXX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "8" },
  { code: "+233", country: "Ghana", iso: "GH", mobileFormat: "XX XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "2" },
  { code: "+225", country: "Côte d'Ivoire", iso: "CI", mobileFormat: "XX XX XX XX XX", fixedFormat: "XX XX XX XX XX", mobilePrefix: "0" },
  { code: "+221", country: "Sénégal", iso: "SN", mobileFormat: "7X XXX XX XX", fixedFormat: "3X XXX XX XX", mobilePrefix: "7" },
  { code: "+223", country: "Mali", iso: "ML", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "7" },
  { code: "+226", country: "Burkina Faso", iso: "BF", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "7" },
  { code: "+227", country: "Niger", iso: "NE", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "9" },
  { code: "+228", country: "Togo", iso: "TG", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "9" },
  { code: "+229", country: "Bénin", iso: "BJ", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "9" },
  { code: "+222", country: "Mauritanie", iso: "MR", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "2" },
  { code: "+224", country: "Guinée", iso: "GN", mobileFormat: "XXX XX XX XX", fixedFormat: "XXX XX XX XX", mobilePrefix: "6" },
  { code: "+232", country: "Sierra Leone", iso: "SL", mobileFormat: "XX XXX XXX", fixedFormat: "XX XXX XXX", mobilePrefix: "7" },
  { code: "+231", country: "Liberia", iso: "LR", mobileFormat: "XX XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "7" },
  { code: "+220", country: "Gambie", iso: "GM", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "3" },
  { code: "+245", country: "Guinée-Bissau", iso: "GW", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "9" },
  { code: "+238", country: "Cap-Vert", iso: "CV", mobileFormat: "XXX XX XX", fixedFormat: "XXX XX XX", mobilePrefix: "9" },
  { code: "+27", country: "Afrique du Sud", iso: "ZA", mobileFormat: "XX XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "8" },
  { code: "+264", country: "Namibie", iso: "NA", mobileFormat: "XX XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "8" },
  { code: "+267", country: "Botswana", iso: "BW", mobileFormat: "7X XXX XXX", fixedFormat: "X XXX XXX", mobilePrefix: "7" },
  { code: "+263", country: "Zimbabwe", iso: "ZW", mobileFormat: "7X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "7" },
  { code: "+260", country: "Zambie", iso: "ZM", mobileFormat: "9X XXX XXXX", fixedFormat: "XX XXX XXXX", mobilePrefix: "9" },
  { code: "+265", country: "Malawi", iso: "MW", mobileFormat: "9XX XX XX XX", fixedFormat: "X XXX XXX", mobilePrefix: "9" },
  { code: "+258", country: "Mozambique", iso: "MZ", mobileFormat: "8X XXX XXXX", fixedFormat: "XX XXX XXX", mobilePrefix: "8" },
  { code: "+261", country: "Madagascar", iso: "MG", mobileFormat: "3X XX XXX XX", fixedFormat: "2X XX XXX XX", mobilePrefix: "3" },
  { code: "+230", country: "Maurice", iso: "MU", mobileFormat: "5XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "5" },
  { code: "+262", country: "Réunion", iso: "RE", mobileFormat: "6XX XX XX XX", fixedFormat: "2XX XX XX XX", mobilePrefix: "6" },
  { code: "+269", country: "Comores", iso: "KM", mobileFormat: "3XX XX XX", fixedFormat: "7XX XX XX", mobilePrefix: "3" },
  { code: "+248", country: "Seychelles", iso: "SC", mobileFormat: "X XX XX XX", fixedFormat: "X XX XX XX", mobilePrefix: "2" },
  { code: "+252", country: "Somalie", iso: "SO", mobileFormat: "XX XXX XXX", fixedFormat: "X XXX XXX", mobilePrefix: "6" },
  { code: "+253", country: "Djibouti", iso: "DJ", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "7" },
  { code: "+291", country: "Érythrée", iso: "ER", mobileFormat: "X XXX XXX", fixedFormat: "X XXX XXX", mobilePrefix: "7" },
  { code: "+235", country: "Tchad", iso: "TD", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "6" },
  { code: "+236", country: "Centrafrique", iso: "CF", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "7" },
  { code: "+244", country: "Angola", iso: "AO", mobileFormat: "9XX XXX XXX", fixedFormat: "XXX XXX XXX", mobilePrefix: "9" },
  { code: "+266", country: "Lesotho", iso: "LS", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "5" },
  { code: "+268", country: "Eswatini", iso: "SZ", mobileFormat: "XX XX XXXX", fixedFormat: "XX XX XXXX", mobilePrefix: "7" },
  
  // Océanie
  { code: "+61", country: "Australie", iso: "AU", mobileFormat: "4XX XXX XXX", fixedFormat: "X XXXX XXXX", mobilePrefix: "4" },
  { code: "+64", country: "Nouvelle-Zélande", iso: "NZ", mobileFormat: "2X XXX XXXX", fixedFormat: "X XXX XXXX", mobilePrefix: "2" },
  { code: "+675", country: "Papouasie-Nouvelle-Guinée", iso: "PG", mobileFormat: "7XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "7" },
  { code: "+679", country: "Fidji", iso: "FJ", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "7" },
  { code: "+685", country: "Samoa", iso: "WS", mobileFormat: "XX XXXX", fixedFormat: "XX XXX", mobilePrefix: "7" },
  { code: "+676", country: "Tonga", iso: "TO", mobileFormat: "XXX XXXX", fixedFormat: "XX XXX", mobilePrefix: "7" },
  { code: "+678", country: "Vanuatu", iso: "VU", mobileFormat: "XXX XXXX", fixedFormat: "XX XXX", mobilePrefix: "5" },
  { code: "+677", country: "Îles Salomon", iso: "SB", mobileFormat: "XXX XXXX", fixedFormat: "XX XXX", mobilePrefix: "7" },
  { code: "+687", country: "Nouvelle-Calédonie", iso: "NC", mobileFormat: "XX XX XX", fixedFormat: "XX XX XX", mobilePrefix: "7" },
  { code: "+689", country: "Polynésie française", iso: "PF", mobileFormat: "XX XX XX XX", fixedFormat: "XX XX XX XX", mobilePrefix: "8" },
  { code: "+686", country: "Kiribati", iso: "KI", mobileFormat: "XXXX XXXX", fixedFormat: "XXXX XXXX", mobilePrefix: "7" },
  { code: "+674", country: "Nauru", iso: "NR", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "5" },
  { code: "+688", country: "Tuvalu", iso: "TV", mobileFormat: "XX XXXX", fixedFormat: "XX XXX", mobilePrefix: "9" },
  { code: "+691", country: "Micronésie", iso: "FM", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "3" },
  { code: "+680", country: "Palaos", iso: "PW", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "7" },
  { code: "+692", country: "Îles Marshall", iso: "MH", mobileFormat: "XXX XXXX", fixedFormat: "XXX XXXX", mobilePrefix: "2" },
]

interface PhoneInputProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Parse une valeur téléphone complète en préfixe et numéro
 */
const parsePhoneValue = (value: string | undefined): { prefix: string; number: string } => {
  if (!value) return { prefix: "+32", number: "" }
  
  const sortedPrefixes = [...COUNTRY_PREFIXES].sort((a, b) => b.code.length - a.code.length)
  
  for (const country of sortedPrefixes) {
    if (value.startsWith(country.code)) {
      return {
        prefix: country.code,
        number: value.slice(country.code.length).replace(/\D/g, "")
      }
    }
  }
  
  if (value.startsWith("+")) {
    const match = value.match(/^\+(\d{1,4})/)
    if (match) {
      const detectedPrefix = "+" + match[1]
      const knownPrefix = sortedPrefixes.find(c => c.code === detectedPrefix)
      if (knownPrefix) {
        return {
          prefix: detectedPrefix,
          number: value.slice(detectedPrefix.length).replace(/\D/g, "")
        }
      }
    }
  }
  
  return { prefix: "+32", number: value.replace(/\D/g, "") }
}

/**
 * Détermine si le numéro est un mobile basé sur le préfixe du pays
 */
const isMobileNumber = (digits: string, country: CountryInfo): boolean => {
  if (!digits || !country.mobilePrefix) return true // Par défaut considéré comme mobile
  return digits.startsWith(country.mobilePrefix)
}

/**
 * Formater le numéro selon le format du pays (mobile ou fixe)
 * Insère des espaces aux positions correspondantes dans le format
 */
const formatPhoneNumber = (digits: string, country: CountryInfo): string => {
  if (!digits) return ""
  
  const isMobile = isMobileNumber(digits, country)
  const format = isMobile ? country.mobileFormat : country.fixedFormat
  
  // Extraire les positions des espaces dans le format
  const spacePositions: number[] = []
  let digitCount = 0
  
  for (const char of format) {
    if (char === " ") {
      spacePositions.push(digitCount)
    } else {
      digitCount++
    }
  }
  
  // Construire le résultat avec les espaces aux bonnes positions
  let result = ""
  for (let i = 0; i < digits.length; i++) {
    if (spacePositions.includes(i)) {
      result += " "
    }
    result += digits[i]
  }
  
  return result.trim()
}

/**
 * Normaliser une chaîne pour la recherche
 */
const normalizeForSearch = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/**
 * Composant PhoneInput avec sélecteur de préfixe pays et validation visuelle
 */
export function PhoneInput({
  value,
  onChange,
  disabled = false,
  className
}: PhoneInputProps) {
  const { prefix, number } = parsePhoneValue(value)
  const [localPrefix, setLocalPrefix] = React.useState(prefix)
  const [localNumber, setLocalNumber] = React.useState(number)
  const [displayValue, setDisplayValue] = React.useState(number)
  const [isFocused, setIsFocused] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Ref pour avoir accès immédiat à la valeur courante (évite les problèmes de batching)
  const currentDigitsRef = React.useRef(number)
  const currentPrefixRef = React.useRef(prefix)

  // Sync depuis la prop value (seulement quand value change, PAS sur focus change)
  React.useEffect(() => {
    const parsed = parsePhoneValue(value)
    setLocalPrefix(parsed.prefix)
    setLocalNumber(parsed.number)
    currentDigitsRef.current = parsed.number
    currentPrefixRef.current = parsed.prefix

    // Formater seulement si pas en focus
    if (!isFocused) {
      const country = COUNTRY_PREFIXES.find(c => c.code === parsed.prefix) || COUNTRY_PREFIXES[0]
      setDisplayValue(formatPhoneNumber(parsed.number, country))
    } else {
      setDisplayValue(parsed.number)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]) // Volontairement exclure isFocused pour éviter reset au focus

  // Gérer le formatage au blur (séparé de la sync)
  React.useEffect(() => {
    if (!isFocused && currentDigitsRef.current) {
      const country = COUNTRY_PREFIXES.find(c => c.code === currentPrefixRef.current) || COUNTRY_PREFIXES[0]
      setDisplayValue(formatPhoneNumber(currentDigitsRef.current, country))
    }
  }, [isFocused])
  
  const digitCount = localNumber.length
  const isValid = digitCount >= 8
  const hasContent = digitCount > 0
  
  // Trouver le pays sélectionné
  const selectedCountry = COUNTRY_PREFIXES.find(c => c.code === localPrefix) || COUNTRY_PREFIXES[0]
  
  // Placeholder générique montrant le format (sans privilégier mobile ou fixe)
  const placeholder = `${selectedCountry.mobileFormat} ou ${selectedCountry.fixedFormat}`
  
  // Filtrer les pays selon la recherche
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery.trim()) return COUNTRY_PREFIXES
    
    const normalizedQuery = normalizeForSearch(searchQuery.trim())
    const queryDigits = searchQuery.replace(/\D/g, "")
    
    return COUNTRY_PREFIXES.filter(country => {
      const normalizedCountry = normalizeForSearch(country.country)
      const codeWithoutPlus = country.code.replace("+", "")
      
      if (normalizedCountry.includes(normalizedQuery)) return true
      if (country.iso.toLowerCase().includes(normalizedQuery)) return true
      if (queryDigits && codeWithoutPlus.startsWith(queryDigits)) return true
      if (country.code.includes(searchQuery)) return true
      
      return false
    })
  }, [searchQuery])
  
  const handlePrefixSelect = (newPrefix: string, iso: string) => {
    const newCountry = COUNTRY_PREFIXES.find(c => c.code === newPrefix && c.iso === iso) || COUNTRY_PREFIXES[0]
    setLocalPrefix(newPrefix)
    currentPrefixRef.current = newPrefix
    setOpen(false)
    setSearchQuery("")
    
    // Reformater le numéro avec le nouveau pays
    const digits = currentDigitsRef.current
    if (!isFocused && digits) {
      setDisplayValue(formatPhoneNumber(digits, newCountry))
    }
    
    const combinedValue = digits ? `${newPrefix}${digits}` : ""
    onChange(combinedValue)
  }
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const digitsOnly = inputValue.replace(/\D/g, "")
    const limitedDigits = digitsOnly.slice(0, 15)
    
    // Mettre à jour le ref immédiatement
    currentDigitsRef.current = limitedDigits
    
    setLocalNumber(limitedDigits)
    setDisplayValue(limitedDigits) // Pas de formatage pendant la saisie
    
    const combinedValue = limitedDigits ? `${currentPrefixRef.current}${limitedDigits}` : ""
    onChange(combinedValue)
  }
  
  const handleFocus = () => {
    setIsFocused(true)
    // Afficher les chiffres sans formatage
    setDisplayValue(currentDigitsRef.current)
  }
  
  const handleBlur = () => {
    setIsFocused(false)
    // Formater au blur avec la valeur actuelle du ref
    const digits = currentDigitsRef.current
    if (digits) {
      const country = COUNTRY_PREFIXES.find(c => c.code === currentPrefixRef.current) || COUNTRY_PREFIXES[0]
      setDisplayValue(formatPhoneNumber(digits, country))
    }
  }
  
  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Container des inputs */}
      <div className="flex">
        {/* Sélecteur de préfixe pays avec recherche */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Sélectionner le préfixe pays"
              disabled={disabled}
              className="w-[130px] justify-between rounded-r-none border-r-0 px-3 font-normal h-10"
            >
              <span className="flex items-center gap-2 truncate">
                <CountryFlag iso={selectedCountry.iso} className="w-5 h-4" />
                <span className="font-mono text-sm">{selectedCountry.code}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            {/* Champ de recherche */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Rechercher un pays ou code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-8 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            
            {/* Liste des pays */}
            <ScrollArea className="h-[300px]">
              {filteredCountries.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Aucun pays trouvé
                </div>
              ) : (
                <div className="p-1">
                  {filteredCountries.map((country, index) => (
                    <button
                      key={`${country.code}-${country.iso}-${index}`}
                      onClick={() => handlePrefixSelect(country.code, country.iso)}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        localPrefix === country.code && country.iso === selectedCountry.iso && "bg-accent"
                      )}
                    >
                      {/* Drapeau */}
                      <span className="mr-2.5 w-6 flex items-center justify-center" title={country.country}>
                        <CountryFlag iso={country.iso} className="w-5 h-4" />
                      </span>
                      {/* Code téléphonique */}
                      <span className="font-mono text-muted-foreground w-14 text-xs">{country.code}</span>
                      {/* Nom du pays */}
                      <span className="truncate flex-1">{country.country}</span>
                      {localPrefix === country.code && country.iso === selectedCountry.iso && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        {/* Input du numéro - taille minimum 16px pour accessibilité */}
        <Input
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleNumberChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "rounded-l-none flex-1 text-base h-10", // text-base = 16px minimum pour accessibilité
            hasContent && !isValid && "border-red-300 focus-visible:ring-red-500",
            hasContent && isValid && "border-green-300 focus-visible:ring-green-500"
          )}
          aria-describedby="phone-validation"
        />
      </div>
      
      {/* Indicateur de validation */}
      <div id="phone-validation" className="flex items-center gap-1.5 min-h-[20px]">
        {hasContent && (
          <>
            {isValid ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600">
                  Format valide ({digitCount} chiffres)
                </span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-500">
                  {digitCount} chiffre{digitCount > 1 ? "s" : ""} — minimum 8 requis
                </span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
