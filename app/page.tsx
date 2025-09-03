import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Wrench, Home } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">SEIDO</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/auth/login">
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-primary hover:bg-secondary">Créer un compte</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground text-balance">
            Gestion immobilière simplifiée
          </h1>
          <p className="text-xl text-muted-foreground text-pretty">
            SEIDO centralise la gestion de vos propriétés, interventions et relations locatives dans une plateforme
            unique et intuitive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-primary hover:bg-secondary text-primary-foreground">
                Commencer gratuitement
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Une solution pour chaque rôle</h2>
          <p className="text-lg text-muted-foreground">
            SEIDO s'adapte à vos besoins, que vous soyez gestionnaire, locataire ou prestataire
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-foreground">👑 Admin</CardTitle>
              <CardDescription>Administration système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Gestion des utilisateurs</li>
                <li>• Supervision globale</li>
                <li>• Rapports et analytics</li>
                <li>• Support technique</li>
              </ul>
              <Link href="/dashboard/admin">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Voir la démo
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-foreground">🏠 Gestionnaire</CardTitle>
              <CardDescription>Gestion de patrimoine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Portfolio immobilier</li>
                <li>• Suivi des interventions</li>
                <li>• Gestion des locataires</li>
                <li>• Rapports financiers</li>
              </ul>
              <Link href="/dashboard/gestionnaire">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Voir la démo
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-foreground">🔧 Prestataire</CardTitle>
              <CardDescription>Services et maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Gestion des interventions</li>
                <li>• Devis et facturation</li>
                <li>• Planning optimisé</li>
                <li>• Suivi des travaux</li>
              </ul>
              <Link href="/dashboard/prestataire">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Voir la démo
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Home className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-foreground">🏃 Locataire</CardTitle>
              <CardDescription>Vie quotidienne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Demandes d'intervention</li>
                <li>• Suivi des réparations</li>
                <li>• Communication directe</li>
                <li>• Historique des actions</li>
              </ul>
              <Link href="/dashboard/locataire">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Voir la démo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">SEIDO</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 SEIDO. Plateforme de gestion immobilière moderne.</p>
        </div>
      </footer>
    </div>
  )
}
