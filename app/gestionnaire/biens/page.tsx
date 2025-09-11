"use client"

import PropertySelector from "@/components/property-selector"

export default function BiensPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header - Responsive */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl mb-2">
            Mon Patrimoine
          </h1>
        </div>

        <PropertySelector mode="view" title="Portfolio Immobilier" showActions={true} />
      </main>
    </div>
  )
}
