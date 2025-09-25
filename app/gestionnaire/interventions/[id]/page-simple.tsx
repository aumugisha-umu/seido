"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  return (
    <div>
      <h1>Test Page</h1>
      <p>ID: {resolvedParams.id}</p>
    </div>
  )
}
