import { getServerAuthContext } from '@/lib/server-context'
import { InterventionTypesManagement } from './intervention-types-management'

export const metadata = {
  title: 'Types d\'intervention | Admin SEIDO',
  description: 'Gestion des types d\'intervention et catégories',
}

export default async function InterventionTypesPage() {
  const { supabase } = await getServerAuthContext('admin')

  // Fetch categories and types
  const [categoriesResult, typesResult] = await Promise.all([
    supabase
      .from('intervention_type_categories')
      .select('*')
      .order('sort_order'),
    supabase
      .from('intervention_types')
      .select(`
        *,
        category:intervention_type_categories(code, label_fr)
      `)
      .order('sort_order')
  ])

  const categories = categoriesResult.data || []
  const types = typesResult.data?.map(t => ({
    ...t,
    category_code: t.category?.code || '',
    category_label: t.category?.label_fr || '',
  })) || []

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Types d&apos;intervention</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les types d&apos;intervention disponibles dans l&apos;application
          </p>
        </div>

        <InterventionTypesManagement
          initialCategories={categories}
          initialTypes={types}
        />
      </div>
    </main>
  )
}
