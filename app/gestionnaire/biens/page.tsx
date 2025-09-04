"use client"

import PropertySelector from "@/components/property-selector"

export default function BiensPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Patrimoine</h1>
          <p className="text-gray-600">Gestion et vue d'ensemble de votre patrimoine immobilier</p>
        </div>

        <PropertySelector mode="view" title="Portfolio Immobilier" showActions={true} />
      </main>
    </div>
  )
}
