"use client"

import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderStatus = 'idle' | 'requesting_permission' | 'recording' | 'paused' | 'recorded' | 'error'

interface UseAudioRecorderOptions {
  maxDurationSeconds?: number
}

interface UseAudioRecorderReturn {
  status: RecorderStatus
  elapsedSeconds: number
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
}

/**
 * Detect the best supported audio MIME type for MediaRecorder.
 * WebM/Opus is preferred (Chrome, Firefox, Android).
 * Safari iOS only supports audio/mp4.
 */
const getSupportedMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return ''

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }

  return ''
}

/**
 * Get file extension from MIME type for naming the output file.
 */
const getExtensionFromMime = (mimeType: string): string => {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

/**
 * Custom hook for audio recording using the MediaRecorder API.
 * Cross-browser compatible (Chrome, Firefox, Safari iOS 14.3+).
 *
 * @param options.maxDurationSeconds - Auto-stop after this duration (default: 300 = 5 min)
 */
export const useAudioRecorder = (
  options: UseAudioRecorderOptions = {}
): UseAudioRecorderReturn => {
  const { maxDurationSeconds = 300 } = options

  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)
  const mimeTypeRef = useRef('')

  // Cleanup timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Cleanup all resources
  const cleanup = useCallback(() => {
    clearTimer()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    chunksRef.current = []
  }, [clearTimer])

  // Revoke previous objectURL when creating a new one or unmounting
  const revokeAudioUrl = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
  }, [audioUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      // We can't call revokeAudioUrl here because it captures stale audioUrl
      // Instead, revoke directly from the ref concept — but since we use state,
      // we handle it via the blob change below
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revoke old URL when blob changes
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = useCallback(async () => {
    // Check browser support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError("Votre navigateur ne supporte pas l'enregistrement audio.")
      setStatus('error')
      return
    }

    if (typeof MediaRecorder === 'undefined') {
      setError("Votre navigateur ne supporte pas l'enregistrement audio.")
      setStatus('error')
      return
    }

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError("Aucun format audio compatible trouvé sur votre navigateur.")
      setStatus('error')
      return
    }

    mimeTypeRef.current = mimeType
    setError(null)
    setStatus('requesting_permission')
    revokeAudioUrl()
    setAudioBlob(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setStatus('recorded')

        // Stop all tracks after recording completes
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      recorder.onerror = () => {
        setError("Une erreur est survenue pendant l'enregistrement.")
        setStatus('error')
        cleanup()
      }

      // Start recording — collect data every 1 second for smoother chunks
      recorder.start(1000)
      setStatus('recording')
      elapsedRef.current = 0
      setElapsedSeconds(0)

      // Start timer
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsedSeconds(elapsedRef.current)

        // Auto-stop at max duration
        if (elapsedRef.current >= maxDurationSeconds) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          clearTimer()
        }
      }, 1000)

    } catch (err) {
      cleanup()

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.")
        } else if (err.name === 'NotFoundError') {
          setError("Aucun microphone détecté sur votre appareil.")
        } else {
          setError(`Erreur microphone : ${err.message}`)
        }
      } else {
        setError("Impossible d'accéder au microphone.")
      }
      setStatus('error')
    }
  }, [maxDurationSeconds, cleanup, clearTimer, revokeAudioUrl])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    clearTimer()
  }, [clearTimer])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setStatus('paused')
      clearTimer()
    }
  }, [clearTimer])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setStatus('recording')

      // Resume timer
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsedSeconds(elapsedRef.current)

        if (elapsedRef.current >= maxDurationSeconds) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          clearTimer()
        }
      }, 1000)
    }
  }, [maxDurationSeconds, clearTimer])

  const resetRecording = useCallback(() => {
    cleanup()
    revokeAudioUrl()
    setAudioBlob(null)
    setElapsedSeconds(0)
    setError(null)
    setStatus('idle')
  }, [cleanup, revokeAudioUrl])

  return {
    status,
    elapsedSeconds,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  }
}

/**
 * Convert an audio blob from the recorder to a File object suitable for upload.
 */
export const audioBlobToFile = (blob: Blob, fileName?: string): File => {
  const ext = getExtensionFromMime(blob.type)
  const name = fileName ? `${fileName}.${ext}` : `note-vocale.${ext}`
  return new File([blob], name, { type: blob.type })
}
