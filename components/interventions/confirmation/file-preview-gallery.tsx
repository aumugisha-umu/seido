'use client'

/**
 * File Preview Gallery Component
 *
 * Displays uploaded files with visual previews for images
 * and compact list for other file types.
 * Now includes category badges and full-width grid layout.
 *
 * @see docs/design/persona-locataire.md - Emma wants to verify her uploads visually
 */

import { FileText, Eye, ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface PreviewFile {
  id: string
  name: string
  size: string
  type?: string
  previewUrl?: string // Base64 or blob URL for image preview
  category?: string // Document category (e.g., "Photo avant travaux")
}

interface FilePreviewGalleryProps {
  files: PreviewFile[]
  className?: string
}

export function FilePreviewGallery({
  files,
  className
}: FilePreviewGalleryProps) {
  // Separate image files from other files
  const imageFiles = files.filter(f =>
    f.type?.startsWith('image/') ||
    f.previewUrl?.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
  )
  const otherFiles = files.filter(f =>
    !f.type?.startsWith('image/') &&
    !f.previewUrl?.startsWith('data:image/') &&
    !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
  )

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Image Previews - Larger Grid (full width) */}
        {imageFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {imageFiles.map(file => (
              <Dialog key={file.id}>
                <DialogTrigger asChild>
                  <button
                    className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-slate-200 hover:border-primary transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label={`Voir ${file.name} en grand`}
                  >
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                      </div>
                    )}

                    {/* Category badge - top left */}
                    {file.category && (
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 backdrop-blur-sm text-[10px] px-1.5 py-0.5 shadow-sm border border-slate-200/50"
                        >
                          {file.category}
                        </Badge>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>

                    {/* File name on hover - bottom gradient */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white truncate block font-medium">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-white/80">{file.size}</span>
                    </div>
                  </button>
                </DialogTrigger>

                <DialogContent className="max-w-4xl p-2">
                  {file.previewUrl ? (
                    <img
                      src={file.previewUrl}
                      alt={file.name}
                      className="w-full rounded-lg max-h-[80vh] object-contain"
                    />
                  ) : (
                    <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-slate-400" />
                    </div>
                  )}
                  <DialogDescription className="text-center text-sm mt-2">
                    {file.category && (
                      <Badge variant="outline" className="mr-2 text-xs">
                        {file.category}
                      </Badge>
                    )}
                    {file.name} • {file.size}
                  </DialogDescription>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}

        {/* Other Files - Enhanced List with Tooltips */}
        {otherFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {otherFiles.map(file => (
              <Tooltip key={file.id}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-default"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-slate-700 font-medium text-xs">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {file.category && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {file.category}
                          </Badge>
                        )}
                        <span className="text-slate-400 text-[10px]">{file.size}</span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{file.name}</p>
                  {file.category && (
                    <p className="text-xs text-muted-foreground">{file.category}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Empty state */}
        {files.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
            Aucun fichier joint
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
