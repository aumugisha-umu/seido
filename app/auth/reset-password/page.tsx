"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, ArrowLeft, Mail } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!email) {
      setError("Veuillez saisir votre adresse email")
      setIsLoading(false)
      return
    }

    try {
      console.log("🔄 [RESET-PASSWORD] Sending password reset email to:", email)
      console.log("🔧 [RESET-PASSWORD] Client debug info:", {
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        timestamp: new Date().toISOString()
      })
      
      const { error: resetError } = await resetPassword(email)
      
      if (resetError) {
        console.error("❌ [RESET-PASSWORD] Error sending reset email:", {
          message: resetError.message,
          name: resetError.name,
          status: resetError.status
        })
        
        // Essayer d'extraire les infos de debug de l'erreur
        try {
          const errorDetails = typeof resetError.message === 'string' && resetError.message.includes('{') 
            ? JSON.parse(resetError.message.substring(resetError.message.indexOf('{'))) 
            : null
          if (errorDetails) {
            setDebugInfo(errorDetails)
          }
        } catch (parseError) {
          console.log("🔧 [RESET-PASSWORD] Could not parse error details:", parseError)
        }
        
        if (resetError.message.includes("User not found")) {
          setError("Aucun compte n'est associé à cette adresse email")
        } else if (resetError.message.includes("Email rate limit")) {
          setError("Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.")
        } else if (resetError.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          setError("Configuration serveur incomplète. Contactez l'administrateur.")
        } else {
          setError("Erreur lors de l'envoi de l'email : " + resetError.message)
        }
      } else {
        console.log("✅ [RESET-PASSWORD] Password reset email sent successfully")
        setIsEmailSent(true)
        setError("")
        setDebugInfo(null)
      }
    } catch (error) {
      console.error("❌ [RESET-PASSWORD] Unexpected error:", {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Email envoyé !</CardTitle>
                <CardDescription className="text-muted-foreground">Vérifiez votre boîte de réception</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Nous avons envoyé un lien de réinitialisation à{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Si vous ne recevez pas l'email dans les prochaines minutes, vérifiez votre dossier spam ou réessayez.
              </p>
              <div className="space-y-2">
                <Button onClick={() => setIsEmailSent(false)} variant="outline" className="w-full">
                  Renvoyer l'email
                </Button>
                <Link href="/auth/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Mot de passe oublié ?</CardTitle>
              <CardDescription className="text-muted-foreground">
                Saisissez votre email pour recevoir un lien de réinitialisation
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
             <form onSubmit={handleSubmit} className="space-y-4">
               {error && (
                 <Alert variant="destructive">
                   <AlertDescription>{error}</AlertDescription>
                 </Alert>
               )}

               {/* Affichage des informations de debug */}
               {debugInfo && process.env.NODE_ENV === 'development' && (
                 <Alert>
                   <AlertDescription>
                     <details className="text-xs">
                       <summary className="cursor-pointer font-medium">🔍 Debug Info</summary>
                       <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap bg-gray-100 p-2 rounded">
                         {JSON.stringify(debugInfo, null, 2)}
                       </pre>
                     </details>
                   </AlertDescription>
                 </Alert>
               )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-secondary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-sm text-primary hover:text-secondary underline-offset-4 hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour à la connexion
              </Link>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:text-secondary underline-offset-4 hover:underline font-medium"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
