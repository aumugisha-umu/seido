"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    Building2,
    Mail,
    Phone,
    MapPin,
    Globe,
    FileText,
    Edit,
    Trash2,
    Users,
    ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'

interface Company {
    id: string
    name: string
    legal_name?: string | null
    vat_number?: string | null
    email?: string | null
    phone?: string | null
    street?: string | null
    street_number?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
    website?: string | null
    notes?: string | null
    is_active: boolean
    created_at: string
}

interface AssociatedContact {
    id: string
    name: string
    email: string
    phone?: string | null
    role?: string | null
}

interface CompanyDetailsClientProps {
    company: Company
    associatedContacts: AssociatedContact[]
    currentUserId: string
}

export function CompanyDetailsClient({
    company,
    associatedContacts,
    currentUserId
}: CompanyDetailsClientProps) {
    const router = useRouter()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Format address
    const formatAddress = () => {
        const parts = []
        if (company.street) {
            parts.push(`${company.street}${company.street_number ? ` ${company.street_number}` : ''}`)
        }
        if (company.postal_code || company.city) {
            parts.push(`${company.postal_code || ''} ${company.city || ''}`.trim())
        }
        if (company.country) {
            parts.push(company.country)
        }
        return parts.join(', ') || null
    }

    const address = formatAddress()

    // Get role label
    const getRoleLabel = (role: string | null | undefined) => {
        const roles: Record<string, string> = {
            'tenant': 'Locataire',
            'owner': 'Propriétaire',
            'provider': 'Prestataire',
            'manager': 'Gestionnaire',
            'other': 'Autre',
            'locataire': 'Locataire',
            'proprietaire': 'Propriétaire',
            'prestataire': 'Prestataire',
            'gestionnaire': 'Gestionnaire',
            'autre': 'Autre'
        }
        return roles[role || ''] || role || 'Non défini'
    }

    // Handle delete
    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/companies/${company.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression')
            }

            toast.success('Société supprimée avec succès')
            router.push('/gestionnaire/contacts?tab=societes')
        } catch (error) {
            console.error('Error deleting company:', error)
            toast.error('Erreur lors de la suppression de la société')
        } finally {
            setIsDeleting(false)
            setIsDeleteDialogOpen(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="container max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                onClick={() => router.push('/gestionnaire/contacts?tab=societes')}
                                aria-label="Retour aux contacts"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">
                                    {company.name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {company.vat_number || 'Société'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-11 gap-2"
                                onClick={() => router.push(`/gestionnaire/contacts/societes/modifier/${company.id}`)}
                            >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Modifier</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-11 text-destructive hover:text-destructive"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Company Info Card */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <Building2 className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{company.name}</CardTitle>
                                {company.legal_name && company.legal_name !== company.name && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {company.legal_name}
                                    </p>
                                )}
                                <Badge
                                    variant={company.is_active ? "default" : "secondary"}
                                    className={cn(
                                        "mt-2",
                                        company.is_active
                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-gray-100 text-gray-800"
                                    )}
                                >
                                    {company.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* VAT Number */}
                        {company.vat_number && (
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Numéro TVA</p>
                                    <p className="font-medium">{company.vat_number}</p>
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        {company.email && (
                            <div className="flex items-start gap-3">
                                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <a
                                        href={`mailto:${company.email}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {company.email}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Phone */}
                        {company.phone && (
                            <div className="flex items-start gap-3">
                                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Téléphone</p>
                                    <a
                                        href={`tel:${company.phone}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {company.phone}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Address */}
                        {address && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Adresse</p>
                                    <p className="font-medium">{address}</p>
                                </div>
                            </div>
                        )}

                        {/* Website */}
                        {company.website && (
                            <div className="flex items-start gap-3">
                                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Site web</p>
                                    <a
                                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {company.website}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {company.notes && (
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Associated Contacts */}
                {associatedContacts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5" />
                                Contacts associés
                                <Badge variant="secondary" className="ml-auto">
                                    {associatedContacts.length}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y">
                                {associatedContacts.map((contact) => (
                                    <div
                                        key={contact.id}
                                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-accent/50 -mx-4 px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                                        onClick={() => router.push(`/gestionnaire/contacts/details/${contact.id}`)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                router.push(`/gestionnaire/contacts/details/${contact.id}`)
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{contact.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {contact.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {getRoleLabel(contact.role)}
                                            </Badge>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty state for contacts */}
                {associatedContacts.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-medium mb-2">Aucun contact associé</h3>
                            <p className="text-sm text-muted-foreground">
                                Les contacts de cette société apparaîtront ici
                            </p>
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* Mobile Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden">
                <Button
                    className="w-full h-12"
                    onClick={() => router.push(`/gestionnaire/contacts/societes/modifier/${company.id}`)}
                >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier la société
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette société ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La société "{company.name}" sera définitivement supprimée.
                            {associatedContacts.length > 0 && (
                                <span className="block mt-2 text-orange-600">
                                    Attention : {associatedContacts.length} contact(s) sont associés à cette société.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
