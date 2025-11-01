$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\.claude\CLAUDE.md"

# Lire toutes les lignes
$lines = Get-Content -Path $filePath -Encoding UTF8

# Nouveau bloc à insérer après ligne 372
$newBlock = @'

### 🔧 Troubleshooting Protocol

**When you encounter a non-trivial error that you can't resolve after 2-3 attempts, ALWAYS:**

1. **Consult the Troubleshooting Checklist**:
   - 📖 **Read** [docs/troubleshooting-checklist.md](../docs/troubleshooting-checklist.md)
   - 🔍 **Find** the relevant section (DB, Auth, RLS, Build, etc.)
   - ✅ **Follow** the diagnostic checklist step by step
   - 📝 **Apply** the documented solution

2. **Non-trivial errors include**:
   - ✅ File editing failures (VSCode auto-save conflicts)
   - ✅ Database schema mismatches (column not found, enum invalid)
   - ✅ Authentication loops or missing permissions
   - ✅ RLS policies blocking legitimate access
   - ✅ Build errors with TypeScript types
   - ✅ Hydration mismatches in React
   - ✅ Performance issues (>3s load time)
   - ✅ Flaky E2E tests
   - ❌ NOT for: Basic typos, syntax errors, missing imports

3. **When to UPDATE the checklist**:
   - ✅ You discover a NEW bug pattern (not already documented)
   - ✅ Same bug occurred 2+ times in different contexts
   - ✅ Solution required >10 minutes to find
   - ✅ Root cause was non-obvious (architectural, config, etc.)
   - ❌ NOT for: One-off bugs, user-specific issues

4. **How to UPDATE the checklist**:
   ```markdown
   ## [Next Number]️⃣ [Category Name]

   ### Symptôme
   [Exact error message or behavior]

   ### Checklist de Diagnostic
   - [ ] **[Diagnostic question]** ?
     → [Action to take]

   ### Solutions par Cas
   #### Cas 1: [Specific case]
   **Cause**: [Root cause]
   **Solution**: [Code or steps]
   ```

5. **Quick Reference - Common Issues**:
   - **File editing fails** → Section 1 (PowerShell workaround)
   - **Column not found** → Section 2 (DB schema)
   - **User not authenticated** → Section 3 (Server auth)
   - **Permission denied** → Section 4 (RLS policies)
   - **Build errors** → Section 5 (TypeScript/cache)
   - **Route 404** → Section 6 (Routing)
   - **Page slow** → Section 7 (Performance)
   - **Test timeout** → Section 8 (E2E tests)

**Workflow Example**:
```
1. Error: "File has been unexpectedly modified"
2. Consult checklist Section 1 (File Editing)
3. Follow diagnostic: File >700 lines? ✅
4. Apply solution: PowerShell by line numbers
5. Success → Continue work
6. If NEW pattern → Update checklist Section 1
```
'@

# Insérer après ligne 372 (index 372)
$before = $lines[0..372]
$after = $lines[373..($lines.Count-1)]
$newLines = $before + ($newBlock -split "`n") + $after

# Écrire le résultat
$newLines | Set-Content -Path $filePath -Encoding UTF8

Write-Host "✅ Section Troubleshooting ajoutée après ligne 372"
