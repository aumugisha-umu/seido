import { CheckCircle2, Circle, Paperclip, Eye } from "lucide-react"
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
      {/* Header line */}
      <div className="flex items-center gap-2 text-sm">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium">
          {totalFiles === 0 ? "Aucun fichier joint" : `${totalFiles} fichier${totalFiles > 1 ? "s" : ""}`}
        </span>
        {missing.length > 0 && (
          <span className="text-xs text-muted-foreground">
            · {missing.length} manquant{missing.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Chips wrap layout */}
      {(uploaded.length > 0 || missing.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pl-5">
          {uploaded.map((slot, i) => {
            const files = slot.fileNames?.map(normalizeFile) ?? []
            const firstUrl = files.find((f) => f.url)?.url

            return (
              <div
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-emerald-50 border-emerald-200 text-emerald-700 group"
                title={files.length > 0 ? files.map((f) => f.name).join(", ") : undefined}
              >
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate max-w-[180px]">{slot.label}</span>
                <span className="text-emerald-500">({slot.fileCount})</span>
                {firstUrl && (
                  <a
                    href={firstUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-emerald-900"
                    title={`Apercu : ${slot.label}`}
                  >
                    <Eye className="h-3 w-3" />
                  </a>
                )}
              </div>
            )
          })}

          {missing.map((slot, i) => (
            <div
              key={`missing-${i}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/30 text-muted-foreground"
            >
              <Circle className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[180px]">{slot.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {totalFiles === 0 && missing.length === 0 && (
        <p className="text-sm text-muted-foreground/60 italic pl-5">Aucun document requis</p>
      )}
    </div>
  )
}
