/**
 * Admin Not Found Page (404)
 *
 * Displayed when an admin route doesn't exist.
 */

import Link from 'next/link'
import { FileQuestion, LayoutDashboard, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            Page admin non trouvée
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Cette route n&apos;existe pas dans le panneau d&apos;administration.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/admin/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard Admin
            </Link>
          </Button>
          <div className="flex gap-2 w-full">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Utilisateurs
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
