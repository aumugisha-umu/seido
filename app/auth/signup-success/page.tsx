import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle } from "lucide-react"
import AuthLogo from "@/components/ui/auth-logo"
import { logger, logError } from '@/lib/logger'
/**
 * 📧 PAGE SIGNUP SUCCESS - SERVER COMPONENT
 * Page de confirmation d'inscription avec instructions email
 */

interface SignupSuccessPageProps {
  searchParams: Promise<{
    email?: string
  }>
}

export default async function SignupSuccessPage({ searchParams }: SignupSuccessPageProps) {
  const params = await searchParams
  const email = params.email

  logger.info('📧 [SIGNUP-SUCCESS-SERVER] Page rendered for email:', email)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AuthLogo />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Compte créé avec succès ! 🎉
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Vérifiez votre email pour activer votre compte
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Prochaine étape :</strong> Un email de confirmation a été envoyé à{" "}
                <span className="font-semibold">{email || "votre adresse email"}</span>.
                <br />
                Cliquez sur le lien dans l'email pour activer votre compte.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Important :</strong> Vérifiez également votre dossier spam ou courrier indésirable.
                </p>
                <p>
                  L'email peut prendre quelques minutes à arriver. Si vous ne le recevez pas,
                  vous pourrez demander un nouvel envoi depuis la page de connexion.
                </p>
              </div>

              <Button asChild className="w-full">
                <Link href="/auth/login">
                  Aller à la page de connexion
                </Link>
              </Button>

              <div className="text-center">
                <Link
                  href="/auth/signup"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Utiliser une autre adresse email
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
