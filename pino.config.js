/**
 * Configuration Pino pour SEIDO
 * Custom formatter pour compatibilité Windows sans UTF-8
 *
 * Usage: npm run dev:no-emoji (utilise automatiquement cette config)
 */

module.exports = {
  /**
   * Custom prettifiers pour remplacer les emojis par du texte
   * Compatible avec tous les encodages (CP850, CP1252, UTF-8)
   */
  customPrettifiers: {
    // Remplace les emojis dans les messages par du texte lisible
    msg: (msg) => {
      if (!msg || typeof msg !== 'string') return msg

      return msg
        // Status indicators
        .replace(/✅/g, '[OK]')
        .replace(/❌/g, '[ERROR]')
        .replace(/⚠️/g, '[WARN]')

        // Action types
        .replace(/👤/g, '[USER]')
        .replace(/🌐/g, '[API]')
        .replace(/🔐/g, '[AUTH]')
        .replace(/🚀/g, '[START]')
        .replace(/📦/g, '[DATA]')

        // Locations & Links
        .replace(/📍/g, '[LOCATION]')
        .replace(/🔗/g, '[LINK]')
        .replace(/🏠/g, '[BUILDING]')
        .replace(/🏢/g, '[PROPERTY]')

        // Operations
        .replace(/🔍/g, '[SEARCH]')
        .replace(/💾/g, '[SAVE]')
        .replace(/🗑️/g, '[DELETE]')
        .replace(/✏️/g, '[EDIT]')
        .replace(/➕/g, '[ADD]')

        // Technical
        .replace(/🎫/g, '[INVITE]')
        .replace(/📧/g, '[EMAIL]')
        .replace(/🔔/g, '[NOTIF]')
        .replace(/⏱️/g, '[TIME]')
        .replace(/🎯/g, '[TARGET]')

        // Database
        .replace(/🔄/g, '[SYNC]')
        .replace(/💡/g, '[INFO]')
        .replace(/🧪/g, '[TEST]')
        .replace(/🔧/g, '[CONFIG]')

        // More emojis (extend as needed)
        .replace(/🎉/g, '[SUCCESS]')
        .replace(/💥/g, '[BOOM]')
        .replace(/⚡/g, '[FAST]')
        .replace(/🐛/g, '[BUG]')
    }
  },

  /**
   * Options de formatage supplémentaires
   */
  formatters: {
    // Formatter pour le niveau de log
    level: (label) => {
      return { level: label.toUpperCase() }
    }
  }
}
