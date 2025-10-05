# Script PowerShell pour corriger contact-invitation.service.ts
$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\lib\services\domain\contact-invitation.service.ts"

# Lire le contenu du fichier
$content = Get-Content -Path $filePath -Raw

# Remplacement 1: Ajouter address et notes dans le cas avec invitation
$old1 = @"
            phone: contactData.phone,
            speciality: contactData.speciality,
            shouldInviteToApp: contactData.inviteToApp
"@

$new1 = @"
            phone: contactData.phone,
            address: contactData.address, // ✅ Preserve address
            notes: contactData.notes, // ✅ Preserve notes
            speciality: contactData.speciality,
            shouldInviteToApp: contactData.inviteToApp
"@

$content = $content.Replace($old1, $new1)

# Remplacement 2: Remplacer le bloc else qui utilise contactService.create
$old2 = @"
      } else {
        // Create contact only without user invitation
        const contactResult = await this.contactService.create({
          email: contactData.email,
          first_name: contactData.firstName,
          last_name: contactData.lastName,
          phone: contactData.phone,
          role: this.mapFrontendTypeToUserRole(contactData.type).role,
          team_id: contactData.teamId,
          created_by: 'system', // Would be replaced with actual user ID
          invitation_status: 'not_invited',
          is_active: true
        })

        if (!contactResult.success) {
          throw new Error(contactResult.error || 'Failed to create contact')
        }

        console.log('✅ [CONTACT-INVITATION-SERVICE] Contact created without invitation:', contactResult.data)
        return { success: true, data: contactResult.data }
      }
"@

$new2 = @"
      } else {
        // Create contact/user WITHOUT app invitation
        // Use the same invite-user API but with skipInvitation flag
        const response = await fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            role: this.mapFrontendTypeToUserRole(contactData.type).role,
            providerCategory: this.mapFrontendTypeToUserRole(contactData.type).provider_category,
            teamId: contactData.teamId,
            phone: contactData.phone,
            address: contactData.address, // ✅ Now preserving address
            notes: contactData.notes, // ✅ Now preserving notes
            speciality: contactData.speciality,
            shouldInviteToApp: false // ✅ Skip the Supabase auth invitation
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || `API returned $($response.status)`)
        }

        console.log('✅ [CONTACT-INVITATION-SERVICE] Contact created without invitation:', result)
        return { success: true, data: result }
      }
"@

$content = $content.Replace($old2, $new2)

# Écrire le nouveau contenu
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "✅ Fichier contact-invitation.service.ts corrigé avec succès!"
