"use client"

import { Euro, Calculator, Building2, Users } from "lucide-react"
import type { ContractStats } from "@/lib/types/contract.types"
import { StatsCard } from "./stats-card"

// ============================================================================
// TYPES
// ============================================================================

interface ContractStatsCardsProps {
    stats: ContractStats
    className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ContractStatsCards - Stats cards for the Contracts page
 *
 * Displays 4 KPIs specific to contracts:
 * - Loyers mensuels (total monthly rent)
 * - Loyer moyen (average rent)
 * - Lots concernés (lots with active contracts)
 * - Locataires (tenants on active contracts)
 *
 * @example
 * ```tsx
 * <ContractStatsCards stats={contractStats} />
 * ```
 */
export function ContractStatsCards({ stats, className }: ContractStatsCardsProps) {
    return (
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
            {/* Loyers mensuels */}
            <StatsCard
                id="monthly-rent"
                label="Loyers mensuels"
                value={`${stats.totalRentMonthly.toLocaleString('fr-FR')} €`}
                icon={Euro}
                iconColor="text-blue-600"
                variant="default"
                href="/gestionnaire/contrats"
            />

            {/* Loyer moyen */}
            <StatsCard
                id="average-rent"
                label="Loyer moyen"
                value={`${stats.averageRent.toLocaleString('fr-FR')} €`}
                icon={Calculator}
                iconColor="text-gray-600"
                variant="default"
                href="/gestionnaire/contrats"
            />

            {/* Lots concernés */}
            <StatsCard
                id="lots-count"
                label="Lots loués"
                value={stats.totalLots}
                icon={Building2}
                iconColor="text-indigo-600"
                variant="default"
                href="/gestionnaire/biens"
            />

            {/* Locataires */}
            <StatsCard
                id="tenants-count"
                label="Locataires"
                value={stats.totalTenants}
                icon={Users}
                iconColor="text-emerald-600"
                variant="default"
                href="/gestionnaire/contacts?role=locataire"
            />
        </div>
    )
}
