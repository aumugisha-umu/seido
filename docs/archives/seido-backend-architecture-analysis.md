# SEIDO Backend Architecture Analysis Report

## Executive Summary

The SEIDO application backend is built on **Next.js 15.2.4 API Routes** with **Supabase** as the primary backend service. The architecture follows a service-oriented pattern with clear separation between API routes, business logic services, and database operations. The system currently operates with **57 API endpoints** managing property interventions, user authentication, team management, and document handling.

## 1. API Endpoints Architecture

### 1.1 API Routes Overview

The application has **57 API route files** organized into the following categories:

#### Authentication & User Management (11 endpoints)
- **POST** `/api/change-email` - Update user email
- **POST** `/api/change-password` - Change user password
- **POST** `/api/reset-password` - Initiate password reset
- **POST** `/api/signup-complete` - Complete signup process
- **POST** `/api/get-user-profile` - Retrieve user profile data
- **PATCH** `/api/update-user-profile` - Update user profile
- **POST** `/api/create-provider-account` - Create service provider account
- **POST/DELETE** `/api/upload-avatar` - Manage user avatars
- **GET** `/api/magic-link/[token]` - Handle magic link authentication

#### Team & Contact Management (10 endpoints)
- **GET** `/api/team-contacts` - List team contacts
- **GET** `/api/team-invitations` - List team invitations
- **POST** `/api/invite-user` - Send user invitation
- **POST** `/api/resend-invitation` - Resend invitation email
- **POST** `/api/revoke-invitation` - Cancel invitation
- **POST** `/api/cancel-invitation` - Alternative cancel endpoint
- **POST** `/api/mark-invitation-accepted` - Mark invitation as accepted
- **GET** `/api/contact-invitation-status` - Check invitation status
- **POST** `/api/create-contact` - Create new contact
- **POST** `/api/check-active-users` - Verify active users

#### Intervention Management (25 endpoints)

##### Core Operations
- **POST** `/api/create-intervention` - Create tenant intervention
- **POST** `/api/create-manager-intervention` - Create manager intervention
- **POST** `/api/intervention-approve` - Approve intervention
- **POST** `/api/intervention-reject` - Reject intervention
- **POST** `/api/intervention-cancel` - Cancel intervention
- **POST** `/api/intervention-start` - Start intervention work
- **POST** `/api/intervention-complete` - Complete intervention
- **POST** `/api/intervention-finalize` - Finalize with payment
- **POST** `/api/intervention-validate-tenant` - Tenant validation

##### Scheduling & Availability
- **POST** `/api/intervention-schedule` - Schedule intervention
- **GET** `/api/intervention/[id]/availabilities` - Get availabilities
- **POST** `/api/intervention/[id]/tenant-availability` - Set tenant availability
- **POST** `/api/intervention/[id]/user-availability` - Set user availability
- **POST** `/api/intervention/[id]/availability-response` - Respond to availability
- **POST** `/api/intervention/[id]/match-availabilities` - Find matching slots
- **PUT** `/api/intervention/[id]/select-slot` - Select time slot

##### Quotes Management
- **POST** `/api/intervention-quote-request` - Request quote
- **POST** `/api/intervention-quote-submit` - Submit quote
- **POST** `/api/intervention-quote-validate` - Validate quote
- **GET** `/api/intervention/[id]/quotes` - List intervention quotes
- **GET** `/api/intervention/[id]/quote-requests` - Get quote requests
- **GET/PATCH/DELETE** `/api/quote-requests/[id]` - Manage quote requests
- **POST** `/api/quotes/[id]/approve` - Approve quote
- **POST** `/api/quotes/[id]/reject` - Reject quote
- **PATCH** `/api/quotes/[id]/cancel` - Cancel quote

##### Work Completion & Finalization
- **POST** `/api/intervention/[id]/work-completion` - Provider completion
- **POST** `/api/intervention/[id]/simple-work-completion` - Simple completion
- **POST** `/api/intervention/[id]/manager-finalization` - Manager finalization
- **GET** `/api/intervention/[id]/finalization-context` - Get finalization context
- **POST** `/api/intervention/[id]/tenant-validation` - Validate by tenant

#### Document Management (4 endpoints)
- **POST** `/api/upload-intervention-document` - Upload documents
- **GET** `/api/download-intervention-document` - Download documents
- **GET** `/api/view-intervention-document` - View documents inline
- **POST** `/api/generate-intervention-magic-links` - Generate document links

#### Activity & Notifications (4 endpoints)
- **GET/POST** `/api/activity-logs` - Activity logging
- **GET** `/api/activity-stats` - Activity statistics
- **GET/POST/PATCH** `/api/notifications` - Notification management

#### System Endpoints (3 endpoints)
- **GET** `/api/quote-requests` - List all quote requests
- **POST** `/api/generate-intervention-magic-links` - System magic links

### 1.2 HTTP Methods Distribution
- **POST**: 42 endpoints (73.7%)
- **GET**: 13 endpoints (22.8%)
- **PATCH**: 4 endpoints (7.0%)
- **PUT**: 1 endpoint (1.8%)
- **DELETE**: 2 endpoints (3.5%)

## 2. Backend Services Architecture

### 2.1 Core Services

#### `auth-service.ts`
- **Purpose**: Authentication and authorization management
- **Key Functions**:
  - User signup with team creation
  - Login/logout flows
  - Password reset
  - Profile management
  - Role-based access control (RBAC)
- **Integration**: Supabase Auth with cookie-based sessions

#### `database-service.ts`
- **Purpose**: Centralized database operations
- **Services Exposed**:
  - `userService` - User CRUD operations
  - `teamService` - Team management
  - `buildingService` - Building operations
  - `lotService` - Lot management
  - `interventionService` - Intervention lifecycle
  - `tenantService` - Tenant-specific operations
  - `contactService` - Contact management
  - `quoteService` - Quote handling
- **Features**:
  - Retry mechanism with exponential backoff
  - Connection management
  - Error handling and logging

#### `intervention-actions-service.ts`
- **Purpose**: Complex intervention workflow management
- **Key Methods**:
  - `approveIntervention()`
  - `rejectIntervention()`
  - `startIntervention()`
  - `completeByProvider()`
  - `finalizeIntervention()`
  - `validateByTenant()`
- **Pattern**: Singleton service pattern

#### `notification-service.ts`
- **Purpose**: Real-time notification system
- **Features**:
  - Personal vs team notifications
  - Priority levels (urgent, high, normal)
  - Metadata support
  - Related entity tracking
- **Integration**: Supabase real-time subscriptions

#### `file-service.ts`
- **Purpose**: Document and file management
- **Capabilities**:
  - File upload to Supabase Storage
  - Validation (size, type)
  - Unique file naming
  - Database record creation
  - Signed URL generation
- **Storage**: Supabase Storage buckets

#### `activity-logger.ts`
- **Purpose**: Audit trail and activity tracking
- **Features**:
  - Context-aware logging
  - Entity-specific log methods
  - Metadata support
  - Error tracking
  - IP and user agent logging
- **Coverage**: All critical operations

### 2.2 Utility Services
- `availability-filtering-utils.ts` - Availability conflict detection
- `quote-state-utils.ts` - Quote state machine management
- `intervention-utils.ts` - Intervention helpers
- `id-utils.ts` - ID generation and validation
- `utils.ts` - Common utilities

## 3. Data Models & Types

### 3.1 Core Entities

#### Users
```typescript
interface User {
  id: string
  auth_user_id: string // Links to Supabase auth
  email: string
  name: string
  first_name?: string
  last_name?: string
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  provider_category?: string
  phone?: string
  avatar_url?: string
  team_id?: string
  created_at: string
  updated_at: string
}
```

#### Interventions
```typescript
interface Intervention {
  id: string
  reference: string // Format: INT-YYMMDD-XXXX
  title: string
  description: string
  type: InterventionType
  urgency: 'basse' | 'normale' | 'haute' | 'urgente'
  status: InterventionStatus
  lot_id: string
  tenant_id: string
  team_id?: string
  manager_comment?: string
  has_attachments: boolean
  created_at: string
  updated_at: string
}
```

#### Intervention Status Flow
```
demande → approuvee → devis_demande → devis_soumis → devis_approuve
→ planifiee → en_cours → terminee → validee → finalisee
```

#### Notifications
```typescript
interface Notification {
  id: string
  user_id: string
  team_id: string
  created_by?: string
  type: NotificationType
  priority: 'urgent' | 'high' | 'normal'
  title: string
  message: string
  is_personal: boolean
  is_read: boolean
  metadata?: Record<string, any>
  related_entity_type?: string
  related_entity_id?: string
  created_at: string
}
```

### 3.2 Database Enums

#### User Roles
- `admin` - System administrator
- `gestionnaire` - Property manager
- `prestataire` - Service provider
- `locataire` - Tenant

#### Intervention Types
- `plomberie`, `electricite`, `chauffage`, `serrurerie`
- `peinture`, `menage`, `jardinage`, `autre`

#### Activity Types
- `create`, `update`, `delete`, `view`
- `invite`, `accept_invite`, `approve`, `reject`
- `start`, `complete`, `finalize`, `validate`

## 4. Database Operations & Patterns

### 4.1 Common Patterns

#### Authentication Check Pattern
```typescript
// Standard auth check in API routes
const cookieStore = await cookies()
const supabase = createServerClient(...)
const { data: { user: authUser } } = await supabase.auth.getUser()
if (!authUser) {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
}
```

#### User Resolution Pattern
```typescript
// Resolve auth user to database user
const user = await userService.findByAuthUserId(authUser.id)
if (!user) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 })
}
```

#### Role-Based Access Control
```typescript
// Check user role permissions
if (user.role !== 'gestionnaire') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

#### Team Isolation Pattern
```typescript
// Ensure user belongs to correct team
if (intervention.team_id !== user.team_id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 4.2 Transaction Patterns

#### Auto-Assignment Pattern
```typescript
// Automatic user assignment to interventions
const assignments = await interventionService.autoAssignIntervention(
  intervention.id,
  lot_id,
  building_id,
  team_id
)
```

#### Notification Pattern
```typescript
// Personal vs team notifications
await notificationService.createNotification({
  userId: assignment.user_id,
  teamId: effectiveTeamId,
  type: 'intervention',
  priority: urgencyToPriority(intervention.urgency),
  title: `Nouvelle intervention - ${intervention.title}`,
  isPersonal: true, // Direct assignment
  metadata: { intervention_id: intervention.id }
})
```

## 5. Authentication & Authorization

### 5.1 Authentication Flow

1. **Supabase Auth Integration**
   - Cookie-based session management
   - PKCE flow for enhanced security
   - Auto-refresh tokens
   - Magic link support

2. **Middleware Protection**
   - Simple cookie detection (`sb-*` prefix)
   - Protected route prefixes: `/admin`, `/gestionnaire`, `/locataire`, `/prestataire`
   - Public routes: `/auth/*`, `/`

3. **Session Management**
   - Server-side session validation
   - Cookie synchronization utilities
   - Retry mechanisms for auth sync

### 5.2 Authorization Patterns

#### Multi-Level Authorization
1. **Authentication**: User must be logged in
2. **Role Verification**: User role must match requirements
3. **Team Membership**: User must belong to correct team
4. **Entity Ownership**: User must own or be assigned to entity

#### Role Permissions Matrix
| Role | Can Create | Can Approve | Can Execute | Can Validate |
|------|------------|-------------|-------------|--------------|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Gestionnaire | ✓ | ✓ | - | ✓ |
| Prestataire | - | - | ✓ | - |
| Locataire | ✓ | - | - | ✓ |

## 6. Error Handling & Logging

### 6.1 Error Response Pattern
```typescript
// Consistent error response structure
return NextResponse.json({
  success: false,
  error: 'Error message',
  details?: any // Optional debug info
}, { status: 400/401/403/404/500 })
```

### 6.2 Activity Logging Coverage
- All CRUD operations
- Authentication events
- Intervention state changes
- Quote submissions/approvals
- Document uploads
- Team operations
- Error occurrences

### 6.3 Console Logging Pattern
- `✅` Success operations
- `❌` Error conditions
- `⚠️` Warnings
- `📝` Data operations
- `🔧` Configuration
- `📬` Notifications
- `🔍` Debug information

## 7. Async Operations & Performance

### 7.1 Async Patterns

#### Parallel Processing
```typescript
// Batch notifications example
const [personalResults, teamResults] = await Promise.all([
  Promise.all(personalNotificationPromises),
  Promise.all(teamNotificationPromises)
])
```

#### Retry Mechanism
- Exponential backoff with jitter
- Environment-aware retry counts
- Session cleanup detection
- Maximum 3-5 retry attempts

### 7.2 Performance Optimizations
- Connection pooling via Supabase
- Fetch timeout configuration (30s default)
- Cache control headers
- Real-time rate limiting (5-10 events/sec)
- Query result limits

## 8. Testing Requirements

### 8.1 Critical Test Coverage Areas

#### Unit Tests Required
1. **Service Layer Tests**
   - Authentication service methods
   - Database service CRUD operations
   - Intervention workflow state machine
   - Notification creation logic
   - File validation and upload
   - Activity logging

2. **Utility Function Tests**
   - ID generation
   - Availability matching algorithms
   - Quote state transitions
   - Retry mechanisms
   - Date/time utilities

#### Integration Tests Required
1. **API Endpoint Tests**
   - Authentication flows (login, signup, logout)
   - Intervention lifecycle (create → finalize)
   - Quote workflow (request → approval)
   - Document upload/download
   - Team operations
   - Notification delivery

2. **Database Integration Tests**
   - Transaction rollback scenarios
   - Concurrent access patterns
   - Team isolation verification
   - RLS policy enforcement
   - Foreign key constraints

#### End-to-End Tests Required
1. **Complete Workflows**
   - Tenant creates intervention → Manager approves → Provider executes → Completion
   - Quote request → Multiple submissions → Selection → Approval
   - User invitation → Acceptance → Team assignment
   - Document upload → View → Download

### 8.2 Test Data Requirements

#### Mock Data Needs
- Multiple users per role (3-5 each)
- Team hierarchies with cross-assignments
- Interventions in all status states
- Quote variations (approved, rejected, pending)
- File samples for upload testing
- Notification scenarios

#### Database Seeding
```typescript
// Required test data structure
{
  teams: [/* 3 teams */],
  users: [/* 4 roles × 3 users */],
  buildings: [/* 5 buildings */],
  lots: [/* 20 lots */],
  interventions: [/* 30 interventions in various states */],
  quotes: [/* 15 quotes */],
  notifications: [/* 50 notifications */],
  documents: [/* 10 sample documents */]
}
```

### 8.3 Testing Challenges

#### Authentication Testing
- Cookie-based session mocking
- Supabase auth simulation
- Magic link token generation
- Session expiry scenarios

#### Real-time Features
- WebSocket connection mocking
- Notification delivery verification
- Concurrent update handling
- Race condition prevention

#### File Operations
- Large file handling (>10MB)
- Invalid file type rejection
- Storage quota simulation
- Signed URL expiry

#### Multi-tenancy
- Team isolation verification
- Cross-team access prevention
- Data leakage prevention
- RLS policy testing

### 8.4 Recommended Testing Tools

1. **Unit Testing**: Vitest 2.0.0
   - Fast execution
   - TypeScript support
   - Mock capabilities
   - Coverage reporting

2. **Integration Testing**: Playwright 1.45.0
   - API testing support
   - Database state verification
   - Authentication flow testing
   - File upload simulation

3. **Database Testing**: Supabase Test Helpers
   - Transaction testing
   - RLS policy verification
   - Migration testing
   - Seed data management

4. **Performance Testing**: Lighthouse 12.0.0
   - API response times
   - Database query performance
   - File upload speeds
   - Concurrent user simulation

## 9. Security Considerations

### 9.1 Current Security Measures
- Supabase RLS (when enabled)
- Cookie-based sessions
- PKCE authentication flow
- Input sanitization
- File type/size validation
- Team-based data isolation

### 9.2 Security Gaps Requiring Testing
- [ ] No input validation library (Zod recommended)
- [ ] Missing rate limiting on critical endpoints
- [ ] No CSRF protection implementation
- [ ] Limited SQL injection prevention (relies on Supabase)
- [ ] No API key rotation mechanism
- [ ] Missing security headers configuration

### 9.3 Security Test Requirements
1. **Authentication Security**
   - Session hijacking prevention
   - Cookie security flags
   - Token expiry handling
   - Brute force protection

2. **Authorization Security**
   - Privilege escalation prevention
   - Role bypass attempts
   - Team boundary violations
   - Direct object reference attacks

3. **Data Security**
   - SQL injection attempts
   - XSS prevention
   - File upload vulnerabilities
   - Information disclosure

## 10. Monitoring & Observability

### 10.1 Current Logging
- Console logging throughout
- Activity logs in database
- Error tracking in responses
- Basic performance timing

### 10.2 Missing Observability
- [ ] Structured logging format
- [ ] Correlation IDs for request tracing
- [ ] Performance metrics collection
- [ ] Error aggregation service
- [ ] Health check endpoints
- [ ] Database query monitoring

### 10.3 Recommended Monitoring Tests
1. **Health Checks**
   - Database connectivity
   - Supabase service status
   - Storage availability
   - Queue processing

2. **Performance Monitoring**
   - API response times
   - Database query duration
   - File upload speeds
   - Memory usage patterns

## 11. Development & Deployment

### 11.1 Environment Configuration
- Development: Local Supabase
- Production: Supabase Cloud
- Environment variables via `.env.local`
- No staging environment defined

### 11.2 Build & Deployment
- Next.js build process
- No CI/CD pipeline visible
- Manual deployment likely
- No rollback procedures

### 11.3 Database Management
- Supabase migrations
- No version control for schema
- Manual RLS policy management
- No automated backups visible

## 12. Recommendations for Testing Strategy

### 12.1 Priority 1: Core Functionality
1. Authentication flows
2. Intervention CRUD operations
3. Role-based access control
4. Team isolation

### 12.2 Priority 2: Business Logic
1. Intervention state machine
2. Quote workflow
3. Notification delivery
4. Document management

### 12.3 Priority 3: Edge Cases
1. Concurrent updates
2. Large file uploads
3. Session expiry handling
4. Network failures

### 12.4 Testing Environment Setup
```bash
# Recommended test configuration
npm install --save-dev vitest @vitest/ui playwright @playwright/test
npm install --save-dev @supabase/supabase-js @testing-library/react
npm install --save-dev msw faker-js @types/jest

# Test structure
__tests__/
├── unit/
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/
│   ├── api/
│   ├── database/
│   └── workflows/
└── e2e/
    ├── interventions/
    ├── quotes/
    └── auth/
```

## Conclusion

The SEIDO backend architecture is well-structured with clear separation of concerns and comprehensive service coverage. The main areas requiring attention for testing are:

1. **Input validation** - No schema validation library currently used
2. **Test coverage** - No existing test suite
3. **Security hardening** - Several security measures need implementation
4. **Performance monitoring** - Limited observability infrastructure
5. **Documentation** - API documentation needs formalization

The architecture supports comprehensive testing but requires initial setup of testing infrastructure and mock data generation systems. Priority should be given to testing authentication flows, intervention workflows, and team isolation mechanisms as these are critical to the application's security and functionality.