# Script PowerShell pour ajouter address et notes dans userService.create
$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\app\api\invite-user\route.ts"

# Lire le contenu du fichier
$content = Get-Content -Path $filePath -Raw

# Remplacement: Ajouter address et notes dans la création du contact
$old = @"
          const createUserResult = await userService.create({
            auth_user_id: null, // Pas d'auth pour simple contact
            email: email,
            name: `${''firstName} ${''lastName}`,
            first_name: firstName,
            last_name: lastName,
            role: validUserRole,
            provider_category: providerCategory,
            speciality: speciality || null,
            phone: phone || null,
            team_id: teamId,
            is_active: true,
            password_set: false // Contact sans auth = pas de password
          })
"@

$new = @"
          const createUserResult = await userService.create({
            auth_user_id: null, // Pas d'auth pour simple contact
            email: email,
            name: `${''firstName} ${''lastName}`,
            first_name: firstName,
            last_name: lastName,
            role: validUserRole,
            provider_category: providerCategory,
            speciality: speciality || null,
            phone: phone || null,
            address: address || null, // ✅ AJOUT: Adresse
            notes: notes || null, // ✅ AJOUT: Notes
            team_id: teamId,
            is_active: true,
            password_set: false // Contact sans auth = pas de password
          })
"@

$content = $content.Replace($old, $new)

# Écrire le nouveau contenu
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "✅ Fichier /api/invite-user/route.ts - address et notes ajoutés!"
