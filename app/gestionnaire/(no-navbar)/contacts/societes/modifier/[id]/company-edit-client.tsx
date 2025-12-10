"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Building2,
    Save,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

// Validation schema
const companySchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    legal_name: z.string().optional(),
    vat_number: z.string().optional(),
    email: z.string().email('Email invalide').optional().or(z.literal('')),
    phone: z.string().optional(),
    street: z.string().optional(),
    street_number: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    website: z.string().url('URL invalide').optional().or(z.literal('')),
    notes: z.string().optional(),
    is_active: z.boolean().default(true),
})

type CompanyFormData = z.infer<typeof companySchema>

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
}

interface CompanyEditClientProps {
    company: Company
    teamId: string
}

export function CompanyEditClient({ company, teamId }: CompanyEditClientProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)

    const form = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            name: company.name,
            legal_name: company.legal_name || '',
            vat_number: company.vat_number || '',
            email: company.email || '',
            phone: company.phone || '',
            street: company.street || '',
            street_number: company.street_number || '',
            postal_code: company.postal_code || '',
            city: company.city || '',
            country: company.country || 'BE',
            website: company.website || '',
            notes: company.notes || '',
            is_active: company.is_active,
        },
    })

    const onSubmit = async (data: CompanyFormData) => {
        setIsSaving(true)
        try {
            const response = await fetch(`/api/companies/${company.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    // Clean up empty strings to null
                    legal_name: data.legal_name || null,
                    vat_number: data.vat_number || null,
                    email: data.email || null,
                    phone: data.phone || null,
                    street: data.street || null,
                    street_number: data.street_number || null,
                    postal_code: data.postal_code || null,
                    city: data.city || null,
                    website: data.website || null,
                    notes: data.notes || null,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Erreur lors de la mise à jour')
            }

            toast.success('Société mise à jour avec succès')
            router.push(`/gestionnaire/contacts/societes/${company.id}`)
        } catch (error) {
            console.error('Error updating company:', error)
            toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour')
        } finally {
            setIsSaving(false)
        }
    }

    const countries = [
        { value: 'BE', label: 'Belgique' },
        { value: 'FR', label: 'France' },
        { value: 'DE', label: 'Allemagne' },
        { value: 'NL', label: 'Pays-Bas' },
        { value: 'LU', label: 'Luxembourg' },
        { value: 'CH', label: 'Suisse' },
    ]

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="container max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                onClick={() => router.push(`/gestionnaire/contacts/societes/${company.id}`)}
                                aria-label="Annuler"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">
                                    Modifier la société
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {company.name}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="container max-w-2xl mx-auto px-4 py-6 pb-32">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Informations générales */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5" />
                                    Informations générales
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nom de la société" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="legal_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom légal</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nom légal complet" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="vat_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Numéro TVA</FormLabel>
                                            <FormControl>
                                                <Input placeholder="BE0123456789" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Site web</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://www.exemple.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Contact */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Contact</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="contact@exemple.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Téléphone</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="+32 2 123 45 67" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Adresse */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Adresse</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="street"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Rue</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Rue de la Loi" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="street_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>N°</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="16" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="postal_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Code postal</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="1000" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Ville</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Bruxelles" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pays</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sélectionner un pays" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {countries.map((country) => (
                                                        <SelectItem key={country.value} value={country.value}>
                                                            {country.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Notes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Notes internes sur cette société..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </form>
                </Form>
            </main>

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
                <div className="container max-w-2xl mx-auto flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => router.push(`/gestionnaire/contacts/societes/${company.id}`)}
                        disabled={isSaving}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 h-12"
                        disabled={isSaving}
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Enregistrer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
