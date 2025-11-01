$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-calendar-view.tsx"
$lines = Get-Content -Path $filePath -Encoding UTF8

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "ÉTAPE|Grille heures") {
        Write-Host "Ligne $($i+1): $($lines[$i])"
    }
}
