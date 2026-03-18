import { notFound } from 'next/navigation'
import TestPropertyPreviewClient from './test-property-preview-client'

export const dynamic = 'force-dynamic'

export default function TestPropertyPreviewPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <TestPropertyPreviewClient />
}
