/**
 * 🔄 Loading skeleton pour la page Biens (Patrimoine)
 * Affiche un feedback visuel pendant le chargement des données
 */
export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        <div className="h-10 bg-muted rounded w-40"></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <div className="h-10 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>

      {/* Search bar */}
      <div className="h-12 bg-muted rounded mb-6"></div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-muted rounded-lg"></div>
        ))}
      </div>
    </div>
  )
}
