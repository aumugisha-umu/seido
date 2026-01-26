# Script pour ouvrir Claude Code depuis le terminal
# Usage: .\scripts\open-claude-code.ps1 [chemin-du-projet]
#
# Pour configurer le chemin manuellement, modifiez la variable $manualPath ci-dessous

param(
    [string]$Path = "."
)

# ============================================
# CONFIGURATION MANUELLE (si necessaire)
# ============================================
# Decommentez et modifiez cette ligne si Claude Code est installe ailleurs :
# $manualPath = "C:\Chemin\Vers\Claude Code\Claude Code.exe"

# Chemins possibles pour Claude Code sur Windows
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Claude Code\Claude Code.exe",
    "$env:ProgramFiles\Claude Code\Claude Code.exe",
    "$env:ProgramFiles(x86)\Claude Code\Claude Code.exe",
    "$env:APPDATA\Claude Code\Claude Code.exe",
    "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe"
)

# Chercher l'executable
$claudeCodePath = $null

# Verifier le chemin manuel d'abord
if ($manualPath -and (Test-Path $manualPath)) {
    $claudeCodePath = $manualPath
}

# Chercher dans les chemins standards
if (-not $claudeCodePath) {
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $claudeCodePath = $path
            break
        }
    }
}

# Si non trouve, essayer de le trouver dans le PATH
if (-not $claudeCodePath) {
    $claudeCodePath = Get-Command "claude-code" -ErrorAction SilentlyContinue
    if ($claudeCodePath) {
        $claudeCodePath = $claudeCodePath.Source
    }
}

# Si toujours non trouve, essayer avec "code" (si Claude Code a ajoute une commande)
if (-not $claudeCodePath) {
    $codeCommand = Get-Command "code" -ErrorAction SilentlyContinue
    if ($codeCommand) {
        $codePath = $codeCommand.Source
        if ($codePath -like "*Claude Code*" -or $codePath -like "*cursor*") {
            $claudeCodePath = $codePath
        }
    }
}

# Resoudre le chemin absolu du projet AVANT de chercher Cursor
$currentDir = (Get-Location).Path
if ($Path -eq "." -or $Path -eq "" -or $null -eq $Path) {
    $projectPath = $currentDir
} else {
    if ([System.IO.Path]::IsPathRooted($Path)) {
        $projectPath = $Path
    } else {
        $projectPath = Join-Path $currentDir $Path
    }
    if (-not (Test-Path $projectPath)) {
        $projectPath = $currentDir
    }
}

# Essayer de trouver Cursor (qui integre Claude Code) - PRIORITE
# On cherche d'abord la commande "cursor" dans le PATH
$cursorCommand = Get-Command "cursor" -ErrorAction SilentlyContinue
if ($cursorCommand) {
    $claudeCodePath = "cursor"
    Write-Host "Utilisation de Cursor (integre Claude Code)" -ForegroundColor Cyan
}

# Ouvrir Claude Code
if ($claudeCodePath) {
    # Afficher le chemin du projet (pas celui de Cursor)
    Write-Host "Ouverture de Claude Code dans: $projectPath" -ForegroundColor Green
    
    # Si c'est la commande "cursor", l'utiliser directement
    if ($claudeCodePath -eq "cursor") {
        & cursor $projectPath
    } else {
        Start-Process -FilePath $claudeCodePath -ArgumentList $projectPath
    }
} else {
    Write-Host "Claude Code n'a pas ete trouve aux emplacements suivants:" -ForegroundColor Yellow
    foreach ($path in $possiblePaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "  1. Modifiez le script scripts/open-claude-code.ps1" -ForegroundColor White
    Write-Host "     Decommentez et modifiez la variable manualPath avec le chemin correct" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Ajoutez Claude Code au PATH systeme" -ForegroundColor White
    Write-Host "     Puis utilisez simplement: cursor ." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Utilisez directement:" -ForegroundColor White
    Write-Host "     cursor ." -ForegroundColor Gray
    Write-Host "     ou" -ForegroundColor Gray
    Write-Host "     code ." -ForegroundColor Gray
    exit 1
}
