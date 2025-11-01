$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-calendar-view.tsx"

# Lire le contenu
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Modification 1 : Ligne 515 - Racine calendrier : h-full → flex-1 min-h-0
$content = $content -replace 'flex gap-4 h-full', 'flex gap-4 flex-1 min-h-0'

# Modification 2 : Ligne 517 - Panel gauche : ajouter min-h-0
$content = $content -replace 'flex flex-col overflow-hidden">', 'flex flex-col min-h-0 overflow-hidden">'

# Modification 3 : Ligne 676 - Container semaine : h-full → flex-1 min-h-0
$content = $content -replace 'flex flex-col h-full space-y-2', 'flex flex-col flex-1 min-h-0 space-y-2'

# Modification 4 : Ligne 709 - Grille : ajouter min-h-0 + border-l-2
$content = $content -replace 'grid grid-cols-8 flex-1 overflow-hidden border-l border-t border-slate-200', 'grid grid-cols-8 flex-1 min-h-0 overflow-hidden border-l-2 border-t border-slate-200'

# Modification 5 : Ligne 713 - Colonne heures : border-r → border-r-2 + slate-300
$content = $content -replace 'className="border-r border-slate-200 overflow-y-auto bg-slate-50"', 'className="border-r-2 border-slate-300 overflow-y-auto bg-slate-50"'

# Modification 6 : Ligne 735 - Colonnes jours : border-r → border-r-2 + slate-300
$content = $content -replace 'className="border-r border-slate-200 last:border-r-0 overflow-y-auto relative"', 'className="border-r-2 border-slate-300 last:border-r-0 overflow-y-auto relative"'

# Écrire le résultat
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ interventions-calendar-view.tsx modifié (6 changements)"
Write-Host "  - Ligne 515: h-full → flex-1 min-h-0"
Write-Host "  - Ligne 517: ajout min-h-0"
Write-Host "  - Ligne 676: h-full → flex-1 min-h-0"
Write-Host "  - Ligne 709: ajout min-h-0 + border-l-2"
Write-Host "  - Ligne 713: border-r-2 + slate-300"
Write-Host "  - Ligne 735: border-r-2 + slate-300"
