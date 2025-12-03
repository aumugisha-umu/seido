import Link from "next/link"
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
    <div className="w-full space-y-6">
      {/* Logo et titre */}
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />

        {/* Icône de succès */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Compte créé avec succès ! 🎉
          </h1>
          <p className="text-white/60">
            Vérifiez votre email pour activer votre compte
          </p>
        </div>
      </div>

      {/* Message d'instructions */}
      <div className="space-y-4">
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <Mail className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            <strong>Prochaine étape :</strong> Un email de confirmation a été envoyé à{" "}
            <span className="font-semibold">{email || "votre adresse email"}</span>.
            <br />
            Cliquez sur le lien dans l'email pour activer votre compte.
          </AlertDescription>
        </Alert>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <p className="text-sm text-white/80">
            <strong>Important :</strong> Vérifiez également votre dossier spam ou courrier indésirable.
          </p>
          <p className="text-sm text-white/60">
            L'email peut prendre quelques minutes à arriver. Si vous ne le recevez pas,
            vous pourrez demander un nouvel envoi depuis la page de connexion.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
          >
            <Link href="/auth/login">
              Aller à la page de connexion
            </Link>
          </Button>

          <div className="text-center">
            <Link
              href="/auth/signup"
              className="text-sm text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline transition-colors"
            >
              Utiliser une autre adresse email
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
