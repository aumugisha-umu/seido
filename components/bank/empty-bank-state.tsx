import Link from 'next/link'
import { Landmark, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EmptyBankState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-6 py-12 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Landmark className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Aucun compte bancaire connecte
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Connectez votre compte bancaire pour commencer a rapprocher vos transactions automatiquement.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/api/bank/oauth/authorize">
              <Plus className="mr-2 h-4 w-4" />
              Connecter un compte bancaire
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
