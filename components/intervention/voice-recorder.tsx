"use client"

import { useCallback, useEffect } from "react"
import { Mic, Square, Trash2, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useAudioRecorder, audioBlobToFile } from "@/hooks/use-audio-recorder"

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void
  onRecordingRemoved: () => void
  disabled?: boolean
  maxDurationSeconds?: number
  fileName?: string
  className?: string
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingRemoved,
  disabled = false,
  maxDurationSeconds = 300,
  fileName,
  className,
}: VoiceRecorderProps) {
  const {
    status,
    elapsedSeconds,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder({ maxDurationSeconds })

  // Notify parent when recording is complete
  useEffect(() => {
    if (status === 'recorded' && audioBlob) {
      onRecordingComplete(audioBlobToFile(audioBlob, fileName))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, audioBlob])

  const handleRemove = useCallback(() => {
    resetRecording()
    onRecordingRemoved()
  }, [resetRecording, onRecordingRemoved])

  const handleReRecord = useCallback(async () => {
    resetRecording()
    onRecordingRemoved()
    // Small delay to ensure cleanup is complete before starting new recording
    await new Promise(resolve => setTimeout(resolve, 100))
    await startRecording()
  }, [resetRecording, onRecordingRemoved, startRecording])

  const remainingSeconds = maxDurationSeconds - elapsedSeconds

  // Error state
  if (status === 'error' && error) {
    return (
      <div className={cn("space-y-2", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetRecording}
        >
          Réessayer
        </Button>
      </div>
    )
  }

  // Recording state
  if (status === 'recording' || status === 'paused' || status === 'requesting_permission') {
    return (
      <div className={cn("flex items-center gap-3 px-3 py-3 border border-red-200 bg-red-50 rounded-lg", className)}>
        {/* Pulsing red dot */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-3 h-3 rounded-full bg-red-500",
            status === 'recording' && "animate-pulse"
          )} />
        </div>

        {/* Timer */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-mono font-semibold text-red-700">
            {formatTime(elapsedSeconds)}
          </span>
          {remainingSeconds <= 60 && remainingSeconds > 0 && (
            <span className="text-xs text-red-500 ml-2">
              {remainingSeconds}s restantes
            </span>
          )}
          {status === 'requesting_permission' && (
            <span className="text-xs text-red-500 ml-2">
              Autorisation du microphone...
            </span>
          )}
        </div>

        {/* Stop button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-11 w-11 rounded-full flex-shrink-0"
          onClick={stopRecording}
          disabled={status === 'requesting_permission'}
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>

        {/* Cancel button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
          onClick={handleRemove}
        >
          Annuler
        </Button>
      </div>
    )
  }

  // Recorded state
  if (status === 'recorded' && audioUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-lg">
          <Mic className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm text-emerald-700 font-medium flex-shrink-0">
            {formatTime(elapsedSeconds)}
          </span>

          {/* Native audio player — best cross-browser compatibility */}
          <audio
            controls
            src={audioUrl}
            className="flex-1 h-8 min-w-0"
            preload="metadata"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReRecord}
            disabled={disabled}
            className="h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Re-enregistrer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Supprimer
          </Button>
        </div>
      </div>
    )
  }

  // Idle state (default)
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2.5 text-sm",
        "border border-dashed rounded-lg cursor-pointer",
        "text-gray-600 hover:bg-gray-50 hover:border-gray-400",
        "transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <Mic className="h-4 w-4" />
      <span>Enregistrer une note vocale</span>
    </button>
  )
}
