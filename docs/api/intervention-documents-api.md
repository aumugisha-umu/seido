# SEIDO Intervention Documents API Documentation

## Overview

The SEIDO intervention documents system provides a comprehensive API for managing documents associated with property management interventions. This includes uploading, retrieving, updating, and deleting documents with proper security and team-based access control.

## Authentication

All endpoints require authentication via Supabase Auth. The system uses a dual-layer authentication:
1. **Auth User**: Supabase authentication user
2. **Database User**: Application user profile linked to auth user

## Security

- **Team-based Access Control**: Only team members assigned to an intervention can access its documents
- **Role-based Permissions**: Different operations require different roles (e.g., deletion requires manager role or document ownership)
- **Row Level Security (RLS)**: Database-level security policies ensure data isolation

## API Endpoints

### 1. Upload Document

**Endpoint:** `POST /api/upload-intervention-document`

**Purpose:** Upload a new document for an intervention

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`

**Form Data Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| interventionId | string | Yes | UUID of the intervention |
| file | File | Yes | The file to upload (max 10MB) |
| description | string | No | Optional description of the document |

**Supported File Types:**
- Images: `jpeg`, `png`, `gif`, `webp`
- Documents: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `txt`, `zip`

**Response (Success - 200):**
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "filename": "original-name.pdf",
    "size": 2048576,
    "type": "application/pdf",
    "uploadedAt": "2025-01-15T10:30:00Z",
    "documentType": "rapport",
    "storagePath": "interventions/intervention-id/filename.pdf",
    "signedUrl": "https://...signed-url...",
    "uploadedBy": {
      "name": "Jean Dupont",
      "email": "jean@example.com"
    }
  },
  "message": "Document uploadé avec succès",
  "processingTime": 523
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not member of intervention team
- `400 Bad Request`: Invalid file or parameters
- `413 Payload Too Large`: File exceeds 10MB limit
- `500 Internal Server Error`: Server error

**Security Notes:**
- Validates user is member of intervention team
- Generates unique filenames to prevent conflicts
- Creates signed URLs for immediate secure access
- Cleans up storage if metadata storage fails

---

### 2. Retrieve Documents

**Endpoint:** `GET /api/intervention/[id]/documents`

**Purpose:** Retrieve all documents for a specific intervention with pagination and filtering

**Request:**
- Method: `GET`
- URL Parameters:
  - `id`: Intervention UUID (required)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | - | Filter by category: `photos`, `reports`, `quotes`, `invoices`, `plans`, `warranties`, `other` |
| page | number | 1 | Page number for pagination |
| pageSize | number | 10 | Items per page (max: 50) |
| sortBy | string | uploaded_at | Sort field: `uploaded_at`, `filename`, `size` |
| sortOrder | string | desc | Sort order: `asc` or `desc` |

**Response (Success - 200):**
```json
{
  "success": true,
  "documents": [
    {
      "id": "doc-uuid",
      "filename": "rapport-intervention.pdf",
      "size": 2048576,
      "type": "application/pdf",
      "documentType": "rapport",
      "uploadedAt": "2025-01-15T10:30:00Z",
      "uploadedBy": {
        "id": "user-uuid",
        "name": "Jean Dupont",
        "email": "jean@example.com",
        "role": "prestataire"
      },
      "description": "Rapport d'intervention complet",
      "signedUrl": "https://...signed-url...",
      "thumbnailUrl": null,
      "isValidated": true,
      "validatedAt": "2025-01-15T14:00:00Z",
      "validatedBy": {
        "id": "manager-uuid",
        "name": "Marie Martin",
        "email": "marie@example.com",
        "role": "gestionnaire"
      }
    }
  ],
  "groupedDocuments": {
    "photos": [...],
    "reports": [...],
    "quotes": [...]
  },
  "intervention": {
    "id": "intervention-uuid",
    "title": "Réparation plomberie",
    "status": "en_cours"
  },
  "pagination": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  },
  "processingTime": 145
}
```

**Features:**
- Automatic signed URL generation (1 hour validity)
- Thumbnail generation for images
- Documents grouped by category for easier frontend consumption
- Pagination support for large document sets

---

### 3. Get Document Details

**Endpoint:** `GET /api/intervention-document/[id]`

**Purpose:** Get detailed information about a specific document

**Request:**
- Method: `GET`
- URL Parameters:
  - `id`: Document UUID (required)

**Response (Success - 200):**
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "interventionId": "intervention-uuid",
    "filename": "photo-avant.jpg",
    "size": 1048576,
    "type": "image/jpeg",
    "documentType": "photo_avant",
    "uploadedAt": "2025-01-15T10:30:00Z",
    "uploadedBy": {
      "id": "user-uuid",
      "name": "Jean Dupont",
      "email": "jean@example.com",
      "role": "prestataire"
    },
    "description": "Photo avant intervention",
    "signedUrl": "https://...signed-url...",
    "thumbnailUrl": "https://...thumbnail-url...",
    "isValidated": false,
    "validatedAt": null,
    "validatedBy": null
  },
  "intervention": {
    "id": "intervention-uuid",
    "title": "Réparation plomberie",
    "status": "en_cours"
  }
}
```

---

### 4. Delete Document

**Endpoint:** `DELETE /api/intervention-document/[id]`

**Purpose:** Delete a document from an intervention

**Request:**
- Method: `DELETE`
- URL Parameters:
  - `id`: Document UUID (required)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Document supprimé avec succès",
  "processingTime": 234
}
```

**Permissions:**
Document can be deleted by:
- The user who uploaded it
- Team managers or admins
- Users with `admin` or `gestionnaire` role

**Restrictions:**
- Cannot delete documents from interventions with status: `termine`, `annule`, `paye`
- Deletion removes both storage file and database metadata
- Updates `has_attachments` flag on intervention if last document

---

### 5. Update Document Metadata

**Endpoint:** `PATCH /api/intervention-document/[id]`

**Purpose:** Update document description or validation status

**Request:**
- Method: `PATCH`
- URL Parameters:
  - `id`: Document UUID (required)
- Content-Type: `application/json`

**Body Parameters:**
```json
{
  "description": "Updated description",
  "isValidated": true
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "filename": "rapport.pdf",
    "description": "Updated description",
    "isValidated": true,
    "validatedAt": "2025-01-15T14:00:00Z",
    "validatedBy": {
      "name": "Marie Martin",
      "email": "marie@example.com"
    }
  },
  "message": "Document mis à jour avec succès"
}
```

**Permissions:**
- All team members can update description
- Only managers/admins can change validation status

---

## Document Types

The system automatically categorizes documents based on file type and name:

| Category | Document Types | Detection |
|----------|---------------|-----------|
| `photos` | `photo_avant`, `photo_apres`, `photo_pendant` | Image files with keywords in filename |
| `reports` | `rapport`, `certificat` | PDFs with relevant keywords |
| `quotes` | `devis` | PDFs/Excel with "devis" in name |
| `invoices` | `facture` | PDFs/Excel with "facture" in name |
| `plans` | `plan` | PDFs with "plan" in name |
| `warranties` | `garantie` | PDFs with "garantie" in name |
| `other` | `autre` | Default for unmatched files |

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details (development only)",
  "field": "field-name (for validation errors)",
  "processingTime": 123
}
```

Common error codes:
- `401`: Authentication required
- `403`: Access denied
- `404`: Resource not found
- `400`: Invalid request
- `413`: File too large
- `500`: Server error

## Performance Considerations

1. **File Size Limits**: 10MB maximum per file
2. **Signed URLs**: Generated on-demand with 1-hour expiry
3. **Thumbnails**: Auto-generated for images (200x200px)
4. **Pagination**: Default 10 items, max 50 per page
5. **Caching**: Consider implementing CDN for frequently accessed documents

## Testing Recommendations

### Unit Tests
```typescript
// Test file: __tests__/api/intervention-documents.test.ts

describe('Intervention Documents API', () => {
  it('should upload document with valid authentication', async () => {
    // Test upload with team member
  })

  it('should reject upload from non-team member', async () => {
    // Test access control
  })

  it('should retrieve documents with pagination', async () => {
    // Test pagination and filtering
  })

  it('should delete own documents', async () => {
    // Test deletion permissions
  })

  it('should validate document as manager', async () => {
    // Test validation permissions
  })
})
```

### Integration Tests
1. **Upload Flow**: Test complete upload -> retrieve -> delete cycle
2. **Permission Matrix**: Test all role combinations
3. **File Types**: Test all supported file types
4. **Edge Cases**: Large files, special characters, concurrent uploads
5. **Error Scenarios**: Network failures, storage errors, invalid files

### Performance Tests
1. **Load Testing**: Multiple concurrent uploads
2. **Large Files**: Test with 10MB files
3. **Pagination**: Test with 100+ documents
4. **Signed URL Generation**: Measure URL generation time

## Frontend Integration Example

```typescript
// hooks/use-intervention-documents.ts
import { useState } from 'react'

export function useInterventionDocuments(interventionId: string) {
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState([])

  const uploadDocument = async (file: File, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('interventionId', interventionId)
    if (description) formData.append('description', description)

    const response = await fetch('/api/upload-intervention-document', {
      method: 'POST',
      body: formData
    })

    return response.json()
  }

  const fetchDocuments = async (options = {}) => {
    const params = new URLSearchParams(options)
    const response = await fetch(
      `/api/intervention/${interventionId}/documents?${params}`
    )

    return response.json()
  }

  const deleteDocument = async (documentId: string) => {
    const response = await fetch(
      `/api/intervention-document/${documentId}`,
      { method: 'DELETE' }
    )

    return response.json()
  }

  return {
    documents,
    loading,
    uploadDocument,
    fetchDocuments,
    deleteDocument
  }
}
```

## Security Best Practices

1. **Always verify team membership** before granting access
2. **Use signed URLs** with short expiry times
3. **Validate file types** on both client and server
4. **Sanitize filenames** to prevent path traversal
5. **Log all operations** for audit trail
6. **Implement rate limiting** to prevent abuse
7. **Consider virus scanning** for uploaded files
8. **Use HTTPS** for all API calls
9. **Validate file content** matches MIME type
10. **Implement CSRF protection** for mutations

## Future Enhancements

1. **Batch Operations**
   - Multiple file upload
   - Bulk delete
   - Zip download

2. **Advanced Features**
   - OCR for document text extraction
   - Image optimization and compression
   - Video support for intervention recordings
   - Document versioning

3. **Performance**
   - CDN integration for static documents
   - Progressive image loading
   - Chunked uploads for large files

4. **Security**
   - Virus scanning integration
   - Watermarking for sensitive documents
   - Encryption at rest

5. **User Experience**
   - Real-time upload progress
   - Drag-and-drop zones
   - Document preview without download
   - Mobile app integration