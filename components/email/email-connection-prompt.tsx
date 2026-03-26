'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { DatePicker, formatLocalDate } from '@/components/ui/date-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Shield, Lock, Users } from 'lucide-react'
import { EMAIL_PROVIDERS } from '@/lib/constants/email-providers'
import { toast } from 'sonner'
import { subDays } from 'date-fns'
import { cn } from '@/lib/utils'

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
)

const formSchema = z.object({
    provider: z.string().min(1, 'Please select a provider'),
    emailAddress: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    syncFromDate: z.date().optional(),
    imapUsername: z.string().min(1, 'IMAP username is required'),
    imapPassword: z.string().min(1, 'IMAP password is required'),
    imapHost: z.string().min(1, 'IMAP host is required'),
    imapPort: z.coerce.number().min(1).max(65535),
    imapUseSsl: z.boolean(),
    smtpUsername: z.string().min(1, 'SMTP username is required'),
    smtpPassword: z.string().min(1, 'SMTP password is required'),
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.coerce.number().min(1).max(65535),
    smtpUseTls: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface EmailConnectionPromptProps {
    onSuccess?: () => void
    onCancel?: () => void
    className?: string
    /** 'showcase' = Gmail-first layout for empty state, 'default' = tabs for settings */
    variant?: 'default' | 'showcase'
}

export function EmailConnectionPrompt({ onSuccess, onCancel, className, variant = 'default' }: EmailConnectionPromptProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isLoadingOAuth, setIsLoadingOAuth] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [connectionMethod, setConnectionMethod] = useState<'oauth' | 'password'>('oauth')
    const [visibility, setVisibility] = useState<'shared' | 'private'>('shared')
    const [showImapForm, setShowImapForm] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            provider: 'custom',
            emailAddress: '',
            password: '',
            syncFromDate: subDays(new Date(), 30),
            imapUsername: '',
            imapPassword: '',
            imapHost: EMAIL_PROVIDERS.custom.imapHost,
            imapPort: EMAIL_PROVIDERS.custom.imapPort,
            imapUseSsl: EMAIL_PROVIDERS.custom.imapUseSsl,
            smtpUsername: '',
            smtpPassword: '',
            smtpHost: EMAIL_PROVIDERS.custom.smtpHost,
            smtpPort: EMAIL_PROVIDERS.custom.smtpPort,
            smtpUseTls: EMAIL_PROVIDERS.custom.smtpUseTls,
        },
    })

    const emailAddress = form.watch('emailAddress')
    const password = form.watch('password')
    useEffect(() => {
        form.setValue('imapUsername', emailAddress, { shouldValidate: true })
        form.setValue('smtpUsername', emailAddress, { shouldValidate: true })
    }, [emailAddress, form])

    useEffect(() => {
        form.setValue('imapPassword', password, { shouldValidate: true })
        form.setValue('smtpPassword', password, { shouldValidate: true })
    }, [password, form])

    const handleTestConnection = async () => {
        const isValid = await form.trigger()
        if (!isValid) {
            toast.error('Please fix form errors before testing')
            return
        }

        setIsTesting(true)
        try {
            const values = form.getValues()
            const response = await fetch('/api/emails/connections/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Connection test failed')
            }

            toast.success('Connection test successful!')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Connection test failed'
            toast.error(message)
        } finally {
            setIsTesting(false)
        }
    }

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/emails/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, visibility }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to save connection')
            }

            const data = await response.json()
            const connectionId = data.connection?.id

            toast.success('Connexion ajoutée — synchronisation en cours...')
            onSuccess?.()

            // Trigger initial sync in background (fire-and-forget)
            if (connectionId) {
                fetch(`/api/emails/connections/${connectionId}/sync`, { method: 'POST' })
                    .then(res => res.ok ? toast.success('Emails synchronisés !') : toast.error('Erreur de synchronisation'))
                    .catch(() => toast.error('Erreur de synchronisation'))
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save connection'
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const onInvalid = (errors: Record<string, unknown>) => {
        toast.error(`Validation errors: ${Object.keys(errors).join(', ')}`)
    }

    const handleGmailOAuth = async () => {
        setIsLoadingOAuth(true)
        try {
            const response = await fetch(`/api/emails/oauth/authorize?visibility=${visibility}`)
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Échec de la génération de l\'URL OAuth')
            }

            const { authUrl } = await response.json()
            window.location.href = authUrl
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Échec de la connexion Google'
            toast.error(message)
            setIsLoadingOAuth(false)
        }
    }

    // ============================================================================
    // SHARED UI FRAGMENTS
    // ============================================================================

    const visibilityToggle = (
        <div className="p-3 border rounded-lg bg-muted/20 space-y-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {visibility === 'private' ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="visibility-toggle" className="font-medium">
                        {visibility === 'private' ? 'Email privé' : 'Email partagé'}
                    </Label>
                </div>
                <Switch
                    id="visibility-toggle"
                    checked={visibility === 'shared'}
                    onCheckedChange={(checked) => setVisibility(checked ? 'shared' : 'private')}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                {visibility === 'private'
                    ? 'Vous seul voyez cette boîte.'
                    : 'Visible par tous les gestionnaires.'
                }
            </p>
        </div>
    )

    const imapFormFields = (
        <>
            <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Adresse email</FormLabel>
                        <FormControl>
                            <Input placeholder="votre.email@exemple.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Mot de passe du compte ou d'application" {...field} />
                        </FormControl>
                        <FormDescription>
                            Mot de passe du compte ou mot de passe d&apos;application.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="syncFromDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Synchroniser depuis</FormLabel>
                        <FormControl>
                            <DatePicker
                                value={field.value ? formatLocalDate(field.value) : undefined}
                                onChange={(iso) => {
                                    const [y, m, d] = iso.split('-').map(Number)
                                    field.onChange(new Date(y, m - 1, d))
                                }}
                                maxDate={formatLocalDate(new Date())}
                                placeholder="jj/mm/aaaa"
                                className="w-full"
                            />
                        </FormControl>
                        <FormDescription>
                            Seuls les emails reçus après cette date seront synchronisés. Par défaut : 30 jours.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="flex items-center space-x-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-muted-foreground"
                >
                    {showAdvanced ? 'Masquer les paramètres avancés' : 'Paramètres avancés'}
                </Button>
            </div>

            {showAdvanced && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <h3 className="font-semibold">IMAP (Réception)</h3>
                        <p className="text-xs text-muted-foreground">Serveur de réception</p>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="imapHost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Serveur IMAP</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="imapPort"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port IMAP</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <h3 className="font-semibold">SMTP (Envoi)</h3>
                        <p className="text-xs text-muted-foreground">Serveur d&apos;envoi</p>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="smtpHost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Serveur SMTP</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="smtpPort"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port SMTP</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    )

    const imapFormActions = (
        <div className="flex gap-3">
            <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || isSubmitting}
            >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tester la connexion
            </Button>

            <Button type="submit" disabled={isSubmitting || isTesting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
            </Button>

            {onCancel && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSubmitting || isTesting}
                >
                    Annuler
                </Button>
            )}
        </div>
    )

    // ============================================================================
    // SHOWCASE VARIANT — Gmail-first, IMAP as expandable secondary
    // ============================================================================

    if (variant === 'showcase') {
        return (
            <div className={cn("space-y-4", className)}>
                {/* Visibility toggle — before CTA so user sets context first */}
                {visibilityToggle}

                {/* Dual CTA: Gmail + IMAP side by side */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        type="button"
                        size="lg"
                        onClick={handleGmailOAuth}
                        disabled={isLoadingOAuth}
                        className="w-full"
                    >
                        {isLoadingOAuth ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <GoogleIcon />
                        )}
                        <span className="ml-2">Connecter Gmail</span>
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={() => setShowImapForm(!showImapForm)}
                        className="w-full"
                    >
                        <Mail className="h-5 w-5" />
                        <span className="ml-2">Connexion IMAP</span>
                    </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                    Gmail : OAuth 2.0 sécurisé · IMAP : Outlook, Yahoo, serveurs custom
                </p>

                {/* IMAP form — expandable */}
                {showImapForm && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                                {imapFormFields}
                                {imapFormActions}
                            </form>
                        </Form>
                    </div>
                )}

                {onCancel && !showImapForm && (
                    <div className="flex justify-end">
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Annuler
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    // ============================================================================
    // DEFAULT VARIANT — Tabs layout for settings page
    // ============================================================================

    return (
        <div className={cn("space-y-6", className)}>
            <Tabs value={connectionMethod} onValueChange={(v) => setConnectionMethod(v as 'oauth' | 'password')}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="oauth" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Gmail (OAuth)
                    </TabsTrigger>
                    <TabsTrigger value="password" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Autres (IMAP)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="oauth" className="space-y-4 mt-4">
                    <div className="p-6 border rounded-lg bg-muted/30 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-3 bg-background rounded-full border">
                                <GoogleIcon />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg">Connexion Gmail sécurisée</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                Connectez votre compte Gmail en utilisant OAuth 2.0.
                                Pas besoin de mot de passe d&apos;application, connexion sécurisée et révocable à tout moment.
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 pt-2">
                            <Button
                                type="button"
                                size="lg"
                                onClick={handleGmailOAuth}
                                disabled={isLoadingOAuth}
                                className="w-full max-w-xs"
                            >
                                {isLoadingOAuth ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <GoogleIcon />
                                )}
                                <span className="ml-2">Connecter avec Google</span>
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Vous serez redirigé vers Google pour autoriser l&apos;accès
                            </p>
                        </div>
                    </div>

                    {visibilityToggle}

                    {onCancel && (
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onCancel}
                            >
                                Annuler
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="password" className="mt-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                            {imapFormFields}
                            {visibilityToggle}
                            {imapFormActions}
                        </form>
                    </Form>
                </TabsContent>
            </Tabs>
        </div>
    )
}
