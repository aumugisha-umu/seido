$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-calendar-view.tsx"

# Lire le contenu
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Pattern de l'ancien code (simplifié pour éviter les problèmes de matching)
$oldPattern = [regex]::Escape("            {/* ÉTAPE 3: Grille heures statique 8h-17h */}") + 
              "[\s\S]*?" + 
              [regex]::Escape("              </p>") + "\r?\n" +
              [regex]::Escape("            </div>")

# Nouveau code
$newCode = @'
            {/* Vue semaine : Grille scrollable 00h-23h avec lignes continues (agenda style) */}
            <div className="grid grid-cols-8 flex-1 overflow-hidden border-l border-t border-slate-200">
              {/* Colonne heures (00h - 23h) - scrollable */}
              <div
                ref={weekTimelineRef}
                className="border-r border-slate-200 overflow-y-auto bg-slate-50"
                style={{ scrollbarWidth: 'thin' }}
              >
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div
                    key={hour}
                    className="h-12 border-b border-slate-100 flex items-start justify-end pr-2 pt-1 flex-shrink-0"
                  >
                    <span className="text-xs text-slate-500 font-medium">
                      {hour.toString().padStart(2, '0')}h
                    </span>
                  </div>
                ))}
              </div>

              {/* 7 colonnes jours - scrollables avec lignes continues */}
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  ref={(el) => {
                    if (el) dayColumnRefs.current[dayIndex] = el
                  }}
                  className="border-r border-slate-200 last:border-r-0 overflow-y-auto relative"
                  style={{ scrollbarWidth: 'thin' }}
                  onScroll={handleColumnScroll}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <div
                      key={hour}
                      className="h-12 border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer flex-shrink-0 transition-colors"
                      onClick={() => handleDayClick(day)}
                    />
                  ))}
                </div>
              ))}
            </div>
'@

# Remplacement
$newContent = $content -replace $oldPattern, $newCode

if ($newContent -ne $content) {
    Set-Content -Path $filePath -Value $newContent -Encoding UTF8 -NoNewline
    Write-Host "✅ Grille remplacée avec succès"
} else {
    Write-Host "❌ Pattern non trouvé, tentative avec approche alternative..."
    
    # Approche alternative : découper par lignes
    $lines = $content -split "`r?`n"
    $startIdx = -1
    $endIdx = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "ÉTAPE 3: Grille heures statique") {
            $startIdx = $i
        }
        if ($startIdx -ge 0 -and $lines[$i] -match "Auto-scroll vers 8h activé") {
            # Trouver le </div> de fermeture après cette ligne
            for ($j = $i; $j -lt $lines.Count; $j++) {
                if ($lines[$j].Trim() -eq "</div>") {
                    $endIdx = $j
                    break
                }
            }
            break
        }
    }
    
    if ($startIdx -ge 0 -and $endIdx -ge 0) {
        $before = $lines[0..($startIdx-1)]
        $after = $lines[($endIdx+1)..($lines.Count-1)]
        $newLines = $before + ($newCode -split "`n") + $after
        $finalContent = $newLines -join "`r`n"
        Set-Content -Path $filePath -Value $finalContent -Encoding UTF8 -NoNewline
        Write-Host "✅ Grille remplacée (méthode alternative)"
    } else {
        Write-Host "❌ Impossible de localiser le bloc à remplacer"
        Write-Host "StartIdx: $startIdx, EndIdx: $endIdx"
    }
}
