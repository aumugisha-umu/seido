/**
 * Layout Admin - Mode Démo
 * ✅ Utilise le DashboardHeader production avec données demo
 */

'use client'

import { ReactNode } from 'react'
import { DemoRoleSwitcher } from '@/components/demo/demo-role-switcher'
import { DemoDashboardHeader } from '@/components/demo/demo-dashboard-header'

export default function AdminDemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Barre demo sticky en tout en haut */}
      <DemoRoleSwitcher />

      {/* Layout principal avec header de navigation demo */}
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden pt-[52px]">
        <DemoDashboardHeader role="admin" />

        <main className="flex-1 flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </>
  )
}
