const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

const AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
] as const

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const

export const ALLOWED_DOCUMENT_MIME_TYPES_EXTENDED = [
  ...ALLOWED_DOCUMENT_MIME_TYPES,
  'text/plain',
  'application/zip',
  'text/csv',
] as const

export const ALLOWED_INTERVENTION_MIME_TYPES = [
  ...ALLOWED_DOCUMENT_MIME_TYPES_EXTENDED,
  ...AUDIO_MIME_TYPES,
  'application/octet-stream',
] as const

