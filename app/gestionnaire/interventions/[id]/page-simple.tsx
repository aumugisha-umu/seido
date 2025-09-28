"use client"

import { use } from "react"

export default function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)

  return (
    <div>
      <h1>Test Page</h1>
      <p>ID: {resolvedParams.id}</p>
    </div>
  )
}
