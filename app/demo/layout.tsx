/**
 * Layout global du mode démo
 * Le DemoProvider gère l'initialisation et le chargement des données
 */

'use client'

import { type ReactNode } from 'react'
import { DemoProvider } from '@/lib/demo/demo-context'

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      {children}
    </DemoProvider>
  )
}
