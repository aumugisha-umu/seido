$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-view-container.tsx"

# Lire le contenu
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Modification : Ligne 203 - min-h-[400px] → flex-1 min-h-0 overflow-hidden
$content = $content -replace 'className="min-h-\[400px\]">', 'className="flex-1 min-h-0 overflow-hidden">'

# Écrire le résultat
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ interventions-view-container.tsx modifié (ligne 203)"
