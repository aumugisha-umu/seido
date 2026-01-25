"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Plus, Pencil, RefreshCw, Building2, FileSignature, Users } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/services'
import { toast } from 'sonner'
import { InterventionTypeIcon } from '@/components/interventions/intervention-type-icon'

interface Category {
  id: string
  code: string
  label_fr: string
  description_fr: string | null
  sort_order: number
  is_active: boolean
}

interface InterventionType {
  id: string
  code: string
  category_id: string
  category_code: string
  category_label: string
  label_fr: string
  description_fr: string | null
  icon_name: string | null
  color_class: string | null
  sort_order: number
  is_active: boolean
}

interface Props {
  initialCategories: Category[]
  initialTypes: InterventionType[]
}

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  bien: Building2,
  bail: FileSignature,
  locataire: Users,
}

const CATEGORY_COLORS: Record<string, string> = {
  bien: 'bg-blue-100 text-blue-800 border-blue-200',
  bail: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  locataire: 'bg-orange-100 text-orange-800 border-orange-200',
}

export function InterventionTypesManagement({ initialCategories, initialTypes }: Props) {
  const [categories] = useState<Category[]>(initialCategories)
  const [types, setTypes] = useState<InterventionType[]>(initialTypes)
  const [isLoading, setIsLoading] = useState(false)
  const [editingType, setEditingType] = useState<InterventionType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state for new/edit type
  const [formData, setFormData] = useState({
    code: '',
    label_fr: '',
    description_fr: '',
    category_id: '',
    icon_name: '',
    color_class: '',
    sort_order: 0,
    is_active: true,
  })

  const supabase = createBrowserSupabaseClient()

  const refreshTypes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('intervention_types')
        .select(`
          *,
          category:intervention_type_categories(code, label_fr)
        `)
        .order('sort_order')

      if (error) throw error

      setTypes(data?.map(t => ({
        ...t,
        category_code: t.category?.code || '',
        category_label: t.category?.label_fr || '',
      })) || [])

      toast.success('Types rechargés')
    } catch {
      toast.error('Erreur lors du rechargement')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTypeActive = async (type: InterventionType) => {
    try {
      const { error } = await supabase
        .from('intervention_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id)

      if (error) throw error

      setTypes(prev => prev.map(t =>
        t.id === type.id ? { ...t, is_active: !t.is_active } : t
      ))

      toast.success(type.is_active ? 'Type désactivé' : 'Type activé')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const openEditDialog = (type: InterventionType) => {
    setEditingType(type)
    setFormData({
      code: type.code,
      label_fr: type.label_fr,
      description_fr: type.description_fr || '',
      category_id: type.category_id,
      icon_name: type.icon_name || '',
      color_class: type.color_class || '',
      sort_order: type.sort_order,
      is_active: type.is_active,
    })
    setIsCreating(false)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingType(null)
    setFormData({
      code: '',
      label_fr: '',
      description_fr: '',
      category_id: categories[0]?.id || '',
      icon_name: 'Wrench',
      color_class: 'bg-gray-500',
      sort_order: 50,
      is_active: true,
    })
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const saveType = async () => {
    setIsLoading(true)
    try {
      if (isCreating) {
        // Create new type
        const { data, error } = await supabase
          .from('intervention_types')
          .insert({
            code: formData.code,
            label_fr: formData.label_fr,
            description_fr: formData.description_fr || null,
            category_id: formData.category_id,
            icon_name: formData.icon_name || null,
            color_class: formData.color_class || null,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          })
          .select(`
            *,
            category:intervention_type_categories(code, label_fr)
          `)
          .single()

        if (error) throw error

        setTypes(prev => [...prev, {
          ...data,
          category_code: data.category?.code || '',
          category_label: data.category?.label_fr || '',
        }].sort((a, b) => a.sort_order - b.sort_order))

        toast.success('Type créé avec succès')
      } else if (editingType) {
        // Update existing type
        const { error } = await supabase
          .from('intervention_types')
          .update({
            label_fr: formData.label_fr,
            description_fr: formData.description_fr || null,
            category_id: formData.category_id,
            icon_name: formData.icon_name || null,
            color_class: formData.color_class || null,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          })
          .eq('id', editingType.id)

        if (error) throw error

        const category = categories.find(c => c.id === formData.category_id)
        setTypes(prev => prev.map(t =>
          t.id === editingType.id
            ? {
              ...t,
              ...formData,
              description_fr: formData.description_fr || null,
              icon_name: formData.icon_name || null,
              color_class: formData.color_class || null,
              category_id: formData.category_id,
              category_code: category?.code || '',
              category_label: category?.label_fr || '',
            }
            : t
        ).sort((a, b) => a.sort_order - b.sort_order))

        toast.success('Type mis à jour')
      }

      setIsDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

  // Group types by category
  const typesByCategory = categories.map(category => ({
    category,
    types: types.filter(t => t.category_id === category.id),
  }))

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{types.length} types</Badge>
          <Badge variant="outline">{categories.length} catégories</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTypes}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Recharger
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {isCreating ? 'Créer un type' : 'Modifier le type'}
                </DialogTitle>
                <DialogDescription>
                  {isCreating
                    ? 'Ajoutez un nouveau type d\'intervention'
                    : `Modification de "${editingType?.label_fr}"`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="plomberie"
                      disabled={!isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Libellé</Label>
                    <Input
                      id="label"
                      value={formData.label_fr}
                      onChange={(e) => setFormData({ ...formData, label_fr: e.target.value })}
                      placeholder="Plomberie"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description_fr}
                    onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                    placeholder="Fuites, canalisations, robinetterie"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label_fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Ordre</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icône (Lucide)</Label>
                    <Input
                      id="icon"
                      value={formData.icon_name}
                      onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                      placeholder="Droplets"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Couleur (Tailwind)</Label>
                    <Input
                      id="color"
                      value={formData.color_class}
                      onChange={(e) => setFormData({ ...formData, color_class: e.target.value })}
                      placeholder="bg-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Actif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={saveType} disabled={isLoading || !formData.code || !formData.label_fr}>
                  {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Types by category */}
      <Accordion type="multiple" defaultValue={categories.map(c => c.code)} className="space-y-4">
        {typesByCategory.map(({ category, types: categoryTypes }) => {
          const CategoryIcon = CATEGORY_ICONS[category.code] || Building2
          const activeCount = categoryTypes.filter(t => t.is_active).length

          return (
            <AccordionItem
              key={category.id}
              value={category.code}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category.code] || 'bg-gray-100'}`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{category.label_fr}</div>
                    <div className="text-sm text-gray-500">
                      {activeCount} actif{activeCount > 1 ? 's' : ''} / {categoryTypes.length} total
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-2 mt-2">
                  {categoryTypes.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      Aucun type dans cette catégorie
                    </p>
                  ) : (
                    categoryTypes.map((type) => (
                      <Card
                        key={type.id}
                        className={`transition-opacity ${!type.is_active ? 'opacity-50' : ''}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <InterventionTypeIcon
                                type={type.code}
                                size="sm"
                                showTooltip={false}
                              />
                              <div>
                                <div className="font-medium text-sm">{type.label_fr}</div>
                                <div className="text-xs text-gray-500">
                                  {type.code}
                                  {type.description_fr && ` • ${type.description_fr}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={type.is_active}
                                onCheckedChange={() => toggleTypeActive(type)}
                                aria-label={`Toggle ${type.label_fr}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(type)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-800">Note</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-blue-700">
            Les modifications des types d&apos;intervention sont effectives immédiatement.
            Les interventions existantes conservent leur type même si celui-ci est désactivé.
            Pour ajouter une icône, utilisez le nom exact d&apos;une icône Lucide (ex: Droplets, Zap, Flame).
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
