// Composants de gestion des devis
export { IntegratedQuotesCard } from './integrated-quotes-card'

// Réexporter les composants existants d'intervention pour faciliter l'import
export { QuotesComparison } from '../intervention/quotes-comparison'
export { QuoteSubmissionForm } from '../intervention/quote-submission-form'
export { QuoteRequestModal } from '../intervention/modals/quote-request-modal'
export { MultiQuoteRequestModal } from '../intervention/modals/multi-quote-request-modal'
export { ExternalQuoteRequestModal } from '../intervention/modals/external-quote-request-modal'
export { QuoteRequestSuccessModal } from '../intervention/modals/quote-request-success-modal'

// Hook de gestion
export { useInterventionQuoting } from '../../hooks/use-intervention-quoting'