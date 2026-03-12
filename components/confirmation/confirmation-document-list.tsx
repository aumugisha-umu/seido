import { CheckCircle2, AlertTriangle, Paperclip, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DocumentFile {
  name: string
  url?: string
}

interface DocumentSlotSummary {
  label: string
  fileCount: number
  /** File names (strings) or file objects with optional preview URL */
  fileNames?: (string | DocumentFile)[]
  recommended: boolean
}

interface ConfirmationDocumentListProps {
  slots: DocumentSlotSummary[]
  className?: string
}

function normalizeFile(file: string | DocumentFile): DocumentFile {
  return typeof file === "string" ? { name: file } : file
}

export function ConfirmationDocumentList({ slots, className }: ConfirmationDocumentListProps) {
  const uploaded = slots.filter((s) => s.fileCount > 0)
  const missing = slots.filter((s) => s.recommended && s.fileCount === 0)
  const totalFiles = uploaded.reduce((acc, s) => acc + s.fileCount, 0)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium">
          {totalFiles === 0 ? "Aucun fichier joint" : `${totalFiles} fichier${totalFiles > 1 ? "s" : ""}`}
        </span>
        {missing.length > 0 && (
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 gap-0.5">
            <AlertTriangle className="h-3 w-3" />
            {missing.length} manquant{missing.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {uploaded.map((slot, i) => (
        <div key={i} className="flex items-start gap-2 pl-5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">{slot.label}</span>
            <span className="text-xs text-muted-foreground ml-1">
              ({slot.fileCount} fichier{slot.fileCount > 1 ? "s" : ""})
            </span>
            {slot.fileNames?.map((raw, j) => {
              const file = normalizeFile(raw)
              return (
                <div key={j} className="flex items-center gap-1.5 group">
                  <p className="text-xs text-muted-foreground truncate flex-1">{file.name}</p>
                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                      title={`Apercu : ${file.name}`}
                    >
                      <Eye className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {missing.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-medium">Documents recommandes manquants : </span>
              {missing.map((s) => s.label).join(", ")}
            </p>
          </div>
        </div>
      )}

      {totalFiles === 0 && missing.length === 0 && (
        <p className="text-sm text-muted-foreground/60 italic pl-5">Aucun document requis</p>
      )}
    </div>
  )
}
