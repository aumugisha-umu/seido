'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  RefreshCw,
  LogIn,
} from 'lucide-react'
import type { User, UserInsert, UserUpdate } from '@/lib/services/core/service-types'
import {
  getAllUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  changeUserRoleAction,
  toggleUserStatusAction,
} from '@/app/actions/user-admin-actions'
import { startImpersonationAction } from '@/app/actions/impersonation-actions'

interface UsersManagementClientProps {
  initialUsers: User[]
  currentUserId: string
}

type UserRole = User['role']

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-800' },
  { value: 'gestionnaire', label: 'Gestionnaire', color: 'bg-blue-100 text-blue-800' },
  { value: 'prestataire', label: 'Prestataire', color: 'bg-orange-100 text-orange-800' },
  { value: 'locataire', label: 'Locataire', color: 'bg-green-100 text-green-800' },
]

export function UsersManagementClient({
  initialUsers,
  currentUserId,
}: UsersManagementClientProps) {
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<UserInsert>>({
    name: '',
    email: '',
    phone: '',
    role: 'gestionnaire',
    company: '',
  })
  const [newRole, setNewRole] = useState<UserRole>('gestionnaire')

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  // Refresh users
  const refreshUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getAllUsersAction()
      if (result.success && result.data) {
        setUsers(result.data)
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de rafraichir la liste',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Create user
  const handleCreate = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: 'Erreur',
        description: 'Le nom et l\'email sont requis',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createUserAction(formData as UserInsert)
      if (result.success && result.data) {
        setUsers(prev => [result.data!, ...prev])
        setIsCreateDialogOpen(false)
        resetForm()
        toast({
          title: 'Utilisateur cree',
          description: `${result.data.name} a ete ajoute avec succes`,
        })
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de creer l\'utilisateur',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update user
  const handleUpdate = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const updates: UserUpdate = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
      }

      const result = await updateUserAction(selectedUser.id, updates)
      if (result.success && result.data) {
        setUsers(prev =>
          prev.map(u => (u.id === selectedUser.id ? result.data! : u))
        )
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        resetForm()
        toast({
          title: 'Utilisateur modifie',
          description: `${result.data.name} a ete mis a jour`,
        })
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de modifier l\'utilisateur',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete user
  const handleDelete = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const result = await deleteUserAction(selectedUser.id)
      if (result.success) {
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
        setIsDeleteDialogOpen(false)
        setSelectedUser(null)
        toast({
          title: 'Utilisateur supprime',
          description: 'L\'utilisateur a ete supprime avec succes',
        })
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de supprimer l\'utilisateur',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Change role
  const handleChangeRole = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const result = await changeUserRoleAction(selectedUser.id, newRole)
      if (result.success && result.data) {
        setUsers(prev =>
          prev.map(u => (u.id === selectedUser.id ? result.data! : u))
        )
        setIsRoleDialogOpen(false)
        setSelectedUser(null)
        toast({
          title: 'Role modifie',
          description: `Le role de ${result.data.name} a ete change`,
        })
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de changer le role',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle status
  const handleToggleStatus = async (user: User) => {
    try {
      const result = await toggleUserStatusAction(user.id)
      if (result.success && result.data) {
        setUsers(prev => prev.map(u => (u.id === user.id ? result.data! : u)))
        toast({
          title: result.data.is_active ? 'Utilisateur active' : 'Utilisateur desactive',
          description: `${result.data.name} a ete ${result.data.is_active ? 'active' : 'desactive'}`,
        })
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de changer le statut',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      })
    }
  }

  // Impersonate user
  const handleImpersonate = async (user: User) => {
    if (!user.email) {
      toast({
        title: 'Erreur',
        description: 'Cet utilisateur n\'a pas d\'email configure',
        variant: 'destructive',
      })
      return
    }

    setImpersonatingUserId(user.id)
    try {
      const result = await startImpersonationAction(user.id)
      if (result.success && result.redirectUrl) {
        toast({
          title: 'Connexion en cours...',
          description: `Connexion en tant que ${user.name}`,
        })
        router.push(result.redirectUrl)
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de se connecter en tant que cet utilisateur',
          variant: 'destructive',
        })
        setImpersonatingUserId(null)
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      })
      setImpersonatingUserId(null)
    }
  }

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'gestionnaire',
      company: '',
    })
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      company: user.company || '',
    })
    setIsEditDialogOpen(true)
  }

  const openRoleDialog = (user: User) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setIsRoleDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = ROLES.find(r => r.value === role)
    return (
      <Badge className={roleConfig?.color || 'bg-gray-100 text-gray-800'}>
        {roleConfig?.label || role}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou telephone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tous les roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les roles</SelectItem>
            {ROLES.map(role => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''} trouve{filteredUsers.length !== 1 ? 's' : ''}
      </div>

      {/* Users Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telephone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Cree le</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouve
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.name}
                      {user.id === currentUserId && (
                        <Badge variant="outline" className="text-xs">
                          Vous
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.is_active ? 'default' : 'secondary'}
                      className={
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }
                    >
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Changer le role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleImpersonate(user)}
                          disabled={user.id === currentUserId || !user.email || !user.is_active || impersonatingUserId === user.id}
                        >
                          {impersonatingUserId === user.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Connexion...
                            </>
                          ) : (
                            <>
                              <LogIn className="h-4 w-4 mr-2" />
                              Se connecter en tant que
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.id === currentUserId}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Desactiver
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activer
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(user)}
                          disabled={user.id === currentUserId}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Creez un nouveau compte utilisateur sur la plateforme.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Jean Dupont"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jean@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={value => setFormData(prev => ({ ...prev, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                value={formData.company || ''}
                onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="ACME Corp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom</Label>
              <Input
                id="edit-name"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Telephone</Label>
              <Input
                id="edit-phone"
                value={formData.phone || ''}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company">Entreprise</Label>
              <Input
                id="edit-company"
                value={formData.company || ''}
                onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Changer le role</DialogTitle>
            <DialogDescription>
              Selectionnez le nouveau role pour {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={value => setNewRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionnez un role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeRole} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer <strong>{selectedUser?.name}</strong> ?
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
