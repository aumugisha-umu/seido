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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Loader2, AlertCircle, CheckCircle2, CalendarIcon } from 'lucide-react'
import { EMAIL_PROVIDERS, PROVIDER_OPTIONS } from '@/lib/constants/email-providers'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

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

interface EmailConnectionFormProps {
    onSuccess?: () => void
    onCancel?: () => void
}

export function EmailConnectionForm({ onSuccess, onCancel }: EmailConnectionFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            provider: 'gmail',
            emailAddress: '',
            password: '',
            syncFromDate: subDays(new Date(), 30),
            imapUsername: '',
            imapPassword: '',
            imapHost: EMAIL_PROVIDERS.gmail.imapHost,
            imapPort: EMAIL_PROVIDERS.gmail.imapPort,
            imapUseSsl: EMAIL_PROVIDERS.gmail.imapUseSsl,
            smtpUsername: '',
            smtpPassword: '',
            smtpHost: EMAIL_PROVIDERS.gmail.smtpHost,
            smtpPort: EMAIL_PROVIDERS.gmail.smtpPort,
            smtpUseTls: EMAIL_PROVIDERS.gmail.smtpUseTls,
        },
    })

    // Sync email and password to IMAP/SMTP fields when not in advanced mode
    const emailAddress = form.watch('emailAddress')
    const password = form.watch('password')

    // Effect to sync credentials
    // We use a custom hook or just inline logic in the render or useEffect?
    // Since we're using react-hook-form, we can use useEffect to watch values
    // But we need to be careful about infinite loops or overwriting user changes in advanced mode
    // Simple approach: If !showAdvanced, always overwrite.

    // Note: We can't easily use useEffect here because we'd need to import useEffect
    // But wait, useEffect is already imported at the top of the file!
    // Let's add the sync logic.

    // However, I can't add useEffect inside this replacement chunk easily if I don't see the imports.
    // I see line 3 imports useState. I should check if useEffect is imported.
    // Yes, line 3: import { useState } from 'react' -> I need to add useEffect there if it's missing.
    // It IS missing in the original file (line 3 only has useState).
    // I will add useEffect in a separate chunk.

    const selectedProvider = form.watch('provider')
    const providerConfig = EMAIL_PROVIDERS[selectedProvider]

    // Auto-fill settings when provider changes
    const handleProviderChange = (providerId: string) => {
        const provider = EMAIL_PROVIDERS[providerId]
        form.setValue('provider', providerId)
        form.setValue('imapHost', provider.imapHost)
        form.setValue('imapPort', provider.imapPort)
        form.setValue('imapUseSsl', provider.imapUseSsl)
        form.setValue('smtpHost', provider.smtpHost)
        form.setValue('smtpPort', provider.smtpPort)
        form.setValue('smtpUseTls', provider.smtpUseTls)
    }

    // Sync credentials
    useEffect(() => {
        if (!showAdvanced) {
            form.setValue('imapUsername', emailAddress, { shouldValidate: true })
            form.setValue('smtpUsername', emailAddress, { shouldValidate: true })
        }
    }, [emailAddress, showAdvanced, form])

    useEffect(() => {
        if (!showAdvanced) {
            form.setValue('imapPassword', password, { shouldValidate: true })
            form.setValue('smtpPassword', password, { shouldValidate: true })
        }
    }, [password, showAdvanced, form])

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
        } catch (error: any) {
            toast.error(error.message || 'Connection test failed')
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
                body: JSON.stringify(values),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to save connection')
            }

            toast.success('Email connection added successfully')
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to save connection')
        } finally {
            setIsSubmitting(false)
        }
    }

    const onInvalid = (errors: any) => {
        console.error('Form validation errors:', errors)
        toast.error(`Validation errors: ${Object.keys(errors).join(', ')}`)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                {/* Provider Selection */}
                <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Provider</FormLabel>
                            <Select
                                onValueChange={handleProviderChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {PROVIDER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Setup Instructions */}
                {providerConfig?.setupInstructions && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{providerConfig.setupInstructions}</AlertDescription>
                    </Alert>
                )}

                {/* Email Address */}
                <FormField
                    control={form.control}
                    name="emailAddress"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="your.email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Password */}
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="App password or account password" {...field} />
                            </FormControl>
                            <FormDescription>
                                For Gmail/Yahoo, use an App Password.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Sync From Date */}
                <FormField
                    control={form.control}
                    name="syncFromDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Sync Emails From</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                            date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                Only emails received after this date will be synced. Default is 30 days ago.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Advanced Settings Toggle */}
                <div className="flex items-center space-x-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-muted-foreground"
                    >
                        {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                    </Button>
                </div>

                {/* Advanced Settings Section */}
                {showAdvanced && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* IMAP Settings */}
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <h3 className="font-semibold flex items-center gap-2">
                                IMAP Settings (Incoming)
                                <span className="text-xs font-normal text-muted-foreground">(Auto-filled)</span>
                            </h3>

                            <FormField
                                control={form.control}
                                name="imapUsername"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IMAP Username</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Usually your email address" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="imapPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IMAP Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="App password or account password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="imapHost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IMAP Host</FormLabel>
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
                                            <FormLabel>IMAP Port</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* SMTP Settings */}
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <h3 className="font-semibold flex items-center gap-2">
                                SMTP Settings (Outgoing)
                                <span className="text-xs font-normal text-muted-foreground">(Auto-filled)</span>
                            </h3>

                            <FormField
                                control={form.control}
                                name="smtpUsername"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Username</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Usually your email address" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="smtpPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="App password or account password" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Can be the same as IMAP password
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="smtpHost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SMTP Host</FormLabel>
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
                                            <FormLabel>SMTP Port</FormLabel>
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

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting || isSubmitting}
                    >
                        {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Test Connection
                    </Button>

                    <Button type="submit" disabled={isSubmitting || isTesting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Connection
                    </Button>

                    {onCancel && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isSubmitting || isTesting}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </form>
        </Form>
    )
}
