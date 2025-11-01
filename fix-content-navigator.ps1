$filePath = "C:\Users\arthu\Desktop\Coding\Seido-app\components\content-navigator.tsx"

# Lire le contenu
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Modification : Lignes 440-447 - Appliquer flex à tous les cas (pas juste isCompact)
# AVANT :
# <div className={`${isCompact ? 'mt-3 flex-1 flex flex-col min-h-0 overflow-hidden' : 'mt-2'}`}>
#   {isCompact ? (
#     <div className="flex-1 overflow-y-auto min-h-0">
#       {activeTabData?.content}
#     </div>
#   ) : (
#     activeTabData?.content
#   )}
# </div>

# APRÈS :
# <div className="mt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
#   {activeTabData?.content}
# </div>

$oldPattern = @'
        {/\* Tab Content \*/}
        <div className=\{\`\$\{isCompact \? 'mt-3 flex-1 flex flex-col min-h-0 overflow-hidden' : 'mt-2'\}\`\}>
          \{isCompact \? \(
            <div className="flex-1 overflow-y-auto min-h-0">
              \{activeTabData\?\.content\}
            </div>
          \) : \(
            activeTabData\?\.content
          \)\}
        </div>
'@

$newCode = @'
        {/* Tab Content */}
        <div className="mt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTabData?.content}
        </div>
'@

# Remplacer
$content = $content -replace [regex]::Escape($oldPattern), $newCode

# Écrire le résultat
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ content-navigator.tsx modifié (lignes 439-448)"
