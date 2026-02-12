-- ============================================================================
-- Migration: Add voice note support for intervention documents
-- Created: 2026-02-12
-- Description: Adds 'note_vocale' enum value and audio MIME types to storage
-- ============================================================================

-- 1. Add 'note_vocale' to intervention_document_type enum
ALTER TYPE intervention_document_type ADD VALUE IF NOT EXISTS 'note_vocale';

-- 2. Update storage bucket to allow audio MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    -- Images (existing)
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    -- Documents (existing)
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    -- Audio (NEW - for voice notes)
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/mpeg'
]
WHERE id = 'intervention-documents';
