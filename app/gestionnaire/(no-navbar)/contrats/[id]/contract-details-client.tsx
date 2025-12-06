"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge'
import { ContractDatesDisplay } from '@/components/contracts/contract-dates-display'
import { ContractContactsPreview } from '@/components/contracts/contract-contacts-preview'
import {
  activateContract,
  terminateContract,
  deleteContract
} from '@/app/actions/contract-actions'
import {
  ArrowLeft,
  Edit,
  Trash2,
  PlayCircle,
  StopCircle,
  RefreshCw,
  Building2,
  Calendar,
  Euro,
  Users,
  FileText,
  Shield,
  MoreVertical,
  Download,
  Eye
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import type {
  ContractWithRelations,
  ContractDocument,
  ContractDetailsClientProps
} from '@/lib/types/contract.types'
import {
  GUARANTEE_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  CONTRACT_DOCUMENT_TYPE_LABELS
} from '@/lib/types/contract.types'

export default function ContractDetailsClient({
  contract,
  documents,
  teamId
}: ContractDetailsClientProps & { documents: ContractDocument[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)

  // Calculate monthly total
  const monthlyTotal = contract.rent_amount + (contract.charges_amount || 0)

  // Get location info
  const locationInfo = contract.lot ? (
    contract.lot.building ? (
      `${contract.lot.building.name} - Lot ${contract.lot.reference}`
    ) : (
      `Lot ${contract.lot.reference}`
    )
  ) : 'Lot non spécifié'

  // Handle actions
  const handleActivate = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await activateContract(contract.id)
      if (result.success) {
        toast.success('Contrat activé avec succès')
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors de l\'activation')
      }
    } catch (error) {
      logger.error('Error activating contract:', error)
      toast.error('Erreur lors de l\'activation du contrat')
    } finally {
      setIsLoading(false)
    }
  }, [contract.id, router])

  const handleTerminate = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await terminateContract(contract.id)
      if (result.success) {
        toast.success('Contrat résilié avec succès')
        setTerminateDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors de la résiliation')
      }
    } catch (error) {
      logger.error('Error terminating contract:', error)
      toast.error('Erreur lors de la résiliation du contrat')
    } finally {
      setIsLoading(false)
    }
  }, [contract.id, router])

  const handleDelete = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await deleteContract(contract.id)
      if (result.success) {
        toast.success('Contrat supprimé avec succès')
        router.push('/gestionnaire/contrats')
      } else {
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      logger.error('Error deleting contract:', error)
      toast.error('Erreur lors de la suppression du contrat')
    } finally {
      setIsLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [contract.id, router])

  const handleRenew = useCallback(() => {
    router.push(`/gestionnaire/contrats/nouveau?renew=${contract.id}`)
  }, [contract.id, router])

  return (
    <div className="contract-details min-h-screen bg-background">
      {/* Header */}
      <header className="contract-details__header bg-card border-b border-border sticky top-0 z-10">
        <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back button and title */}
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/gestionnaire/contrats')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {contract.title}
                  </h1>
                  <ContractStatusBadge status={contract.status} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">{locationInfo}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Quick actions based on status */}
              {contract.status === 'brouillon' && (
                <Button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="hidden sm:flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  Activer
                </Button>
              )}

              {contract.status === 'actif' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRenew}
                    disabled={isLoading}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Renouveler
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTerminateDialogOpen(true)}
                    disabled={isLoading}
                    className="hidden sm:flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <StopCircle className="h-4 w-4" />
                    Résilier
                  </Button>
                </>
              )}

              {/* Edit button */}
              {contract.status !== 'resilie' && contract.status !== 'expire' && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/gestionnaire/contrats/modifier/${contract.id}`)}
                  disabled={isLoading}
                  className="hidden sm:flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              )}

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Mobile actions */}
                  {contract.status === 'brouillon' && (
                    <DropdownMenuItem onClick={handleActivate} className="sm:hidden">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Activer
                    </DropdownMenuItem>
                  )}
                  {contract.status === 'actif' && (
                    <>
                      <DropdownMenuItem onClick={handleRenew} className="sm:hidden">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renouveler
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setTerminateDialogOpen(true)}
                        className="sm:hidden text-destructive"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Résilier
                      </DropdownMenuItem>
                    </>
                  )}
                  {contract.status !== 'resilie' && contract.status !== 'expire' && (
                    <DropdownMenuItem
                      onClick={() => router.push(`/gestionnaire/contrats/modifier/${contract.id}`)}
                      className="sm:hidden"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {(contract.status === 'brouillon' || contract.status === 'actif') && (
                    <DropdownMenuSeparator className="sm:hidden" />
                  )}

                  {/* Delete action */}
                  {contract.status !== 'actif' && (
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts ({contract.contacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informations du contrat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Titre</p>
                      <p className="font-medium">{contract.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <ContractStatusBadge status={contract.status} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Durée</p>
                      <p className="font-medium">{contract.duration_months} mois</p>
                    </div>
                  </div>

                  <Separator />

                  <ContractDatesDisplay
                    startDate={contract.start_date}
                    endDate={contract.end_date}
                    showRemaining
                  />

                  {contract.comments && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Commentaires</p>
                        <p className="text-sm whitespace-pre-wrap">{contract.comments}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Sidebar info */}
              <div className="space-y-6">
                {/* Location */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bien associé
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contract.lot ? (
                      <div className="space-y-2">
                        <p className="font-medium">
                          {contract.lot.building?.name || 'Lot indépendant'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Lot {contract.lot.reference}
                        </p>
                        {(contract.lot.building?.address || contract.lot.street) && (
                          <p className="text-sm text-muted-foreground">
                            {contract.lot.building?.address || contract.lot.street}
                            {contract.lot.city && `, ${contract.lot.city}`}
                          </p>
                        )}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          asChild
                        >
                          <Link href={`/gestionnaire/biens/lots/${contract.lot.id}`}>
                            Voir le lot →
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucun lot associé</p>
                    )}
                  </CardContent>
                </Card>

                {/* Financials */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Finances
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loyer</span>
                      <span className="font-medium">
                        {contract.rent_amount.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Charges</span>
                      <span className="font-medium">
                        {(contract.charges_amount || 0).toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Total mensuel</span>
                      <span className="font-bold text-primary">
                        {monthlyTotal.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fréquence: {PAYMENT_FREQUENCY_LABELS[contract.payment_frequency]}
                    </div>
                  </CardContent>
                </Card>

                {/* Guarantee */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Garantie
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">
                      {GUARANTEE_TYPE_LABELS[contract.guarantee_type]}
                    </p>
                    {contract.guarantee_amount && (
                      <p className="text-sm text-muted-foreground">
                        Montant: {contract.guarantee_amount.toLocaleString('fr-FR')} €
                      </p>
                    )}
                    {contract.guarantee_notes && (
                      <p className="text-sm text-muted-foreground">
                        {contract.guarantee_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contacts liés au contrat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contract.contacts && contract.contacts.length > 0 ? (
                  <div className="space-y-4">
                    {contract.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium text-primary">
                              {contact.user.first_name?.[0] || contact.user.name?.[0] || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {contact.user.first_name && contact.user.last_name
                                ? `${contact.user.first_name} ${contact.user.last_name}`
                                : contact.user.name || 'Contact'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {contact.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={contact.role === 'locataire' ? 'default' : 'secondary'}>
                            {contact.role === 'locataire' && 'Locataire'}
                            {contact.role === 'colocataire' && 'Colocataire'}
                            {contact.role === 'garant' && 'Garant'}
                            {contact.role === 'representant_legal' && 'Représentant'}
                            {contact.role === 'autre' && 'Autre'}
                          </Badge>
                          {contact.is_primary && (
                            <Badge variant="outline">Principal</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun contact lié à ce contrat</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => router.push(`/gestionnaire/contrats/modifier/${contract.id}`)}
                    >
                      Ajouter des contacts
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents du contrat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {doc.title || doc.original_filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {CONTRACT_DOCUMENT_TYPE_LABELS[doc.document_type]} • {(doc.file_size / 1024).toFixed(1)} Ko
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={`/api/view-contract-document?path=${encodeURIComponent(doc.storage_path)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={`/api/download-contract-document?path=${encodeURIComponent(doc.storage_path)}&filename=${encodeURIComponent(doc.original_filename)}`}
                              download
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document associé à ce contrat</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => router.push(`/gestionnaire/contrats/modifier/${contract.id}`)}
                    >
                      Ajouter des documents
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Terminate Dialog */}
      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier le contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action mettra fin au contrat immédiatement. Le contrat sera marqué comme résilié et ne pourra plus être modifié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminate}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Résiliation...' : 'Résilier'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrat et tous ses documents seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
