$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\app\gestionnaire\interventions\interventions-page-client.tsx"

# Lire le contenu
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Modification : Ligne 65 - Wrapper : max-w-7xl mx-auto → max-w-7xl mx-auto flex flex-col h-full min-h-0
$content = $content -replace 'className="max-w-7xl mx-auto">', 'className="max-w-7xl mx-auto flex flex-col h-full min-h-0">'

# Écrire le résultat
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ interventions-page-client.tsx modifié (ligne 65)"
