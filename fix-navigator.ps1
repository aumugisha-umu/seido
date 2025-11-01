$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-navigator.tsx"

# Lire le contenu
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Modification : Ligne 265 - Wrapper : className → className + flex flex-col h-full min-h-0
# Pattern : <div className={className}>
# Nouveau : <div className={`${className} flex flex-col h-full min-h-0`}>
$content = $content -replace '<div className=\{className\}>', '<div className={`${className} flex flex-col h-full min-h-0`}>'

# Écrire le résultat
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ interventions-navigator.tsx modifié (ligne 265)"
