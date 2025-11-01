$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-calendar-view.tsx"

# Lire toutes les lignes
$lines = Get-Content -Path $filePath -Encoding UTF8

# Nouveau code à insérer (lignes 708-745)
$newBlock = @'
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

# Remplacer lignes 708-745 (indices 707-744)
$before = $lines[0..706]
$after = $lines[745..($lines.Count-1)]
$newLines = $before + ($newBlock -split "`n") + $after

# Écrire le résultat
$newLines | Set-Content -Path $filePath -Encoding UTF8

Write-Host "OK Remplacement effectue (lignes 708-745)"
