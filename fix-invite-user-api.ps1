# Script PowerShell pour corriger /api/invite-user/route.ts
$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\app\api\invite-user\route.ts"

# Lire le contenu du fichier
$content = Get-Content -Path $filePath -Raw

# Remplacement: Ajouter address, notes et providerCategory dans la destructuration
$old = @"
    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      role = 'gestionnaire',
      teamId,
      phone,
      speciality, // ✅ AJOUT: Spécialité pour les prestataires
      shouldInviteToApp = false  // ✅ NOUVELLE LOGIQUE SIMPLE
    } = body
"@

$new = @"
    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      role = 'gestionnaire',
      teamId,
      phone,
      address, // ✅ AJOUT: Adresse du contact
      notes, // ✅ AJOUT: Notes sur le contact
      speciality, // ✅ AJOUT: Spécialité pour les prestataires
      providerCategory, // ✅ AJOUT: Catégorie de prestataire
      shouldInviteToApp = false  // ✅ NOUVELLE LOGIQUE SIMPLE
    } = body
"@

$content = $content.Replace($old, $new)

# Écrire le nouveau contenu
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "✅ Fichier /api/invite-user/route.ts corrigé avec succès!"
