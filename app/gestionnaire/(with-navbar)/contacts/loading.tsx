/**
 * 🔄 Loading skeleton pour la page Contacts
 * Affiche un feedback visuel pendant le chargement des données
 */
export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-8 bg-muted rounded w-36 mb-2"></div>
          <div className="h-4 bg-muted rounded w-56"></div>
        </div>
        <div className="h-10 bg-muted rounded w-40"></div>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4 mb-6">
        <div className="h-12 bg-muted rounded flex-1"></div>
        <div className="h-12 bg-muted rounded w-32"></div>
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="h-12 bg-muted/50 border-b"></div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-16 bg-muted/20 border-b last:border-b-0"></div>
        ))}
      </div>
    </div>
  )
}
