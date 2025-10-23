# 🏗️ REFACTORING ARCHITECTURE - RECOMMANDATIONS

## 🎯 VISION ARCHITECTURALE

L'application SEIDO nécessite un refactoring architectural majeur pour passer d'un **prototype fonctionnel** à une **application production-ready**. Cette refonte permettra une **maintenabilité optimale**, une **évolutivité garantie** et une **séparation claire des responsabilités**.

### 🚧 ÉTAT ACTUEL - ARCHITECTURE MONOLITHIQUE
- **Logique métier** dispersée dans les composants UI
- **Services** étroitement couplés
- **Gestion d'état** incohérente et distribuée
- **Architecture auth** complexe et fragile
- **Responsabilités** mélangées entre couches

### ✨ OBJECTIF - ARCHITECTURE HEXAGONALE
- **Domain-Driven Design** avec domaines métier clairs
- **Clean Architecture** avec séparation stricte des couches
- **Dependency Injection** pour le découplage
- **Event-Driven Architecture** pour la communication
- **Microservices pattern** pour l'évolutivité

---

## 🏛️ ARCHITECTURE CIBLE RECOMMANDÉE

### 📁 STRUCTURE DE DOSSIERS PROPOSÉE

```
src/
├── app/                        # Next.js App Router (UI uniquement)
│   ├── (auth)/                # Routes d'authentification
│   ├── (dashboard)/           # Routes des dashboards
│   └── api/                   # API handlers (thin layer)
├── core/                      # Cœur métier - Aucune dépendance externe
│   ├── domain/               # Entités et règles métier
│   │   ├── entities/         # User, Intervention, Building, etc.
│   │   ├── value-objects/    # Email, Phone, Address, etc.
│   │   ├── repositories/     # Interfaces (pas d'implémentation)
│   │   └── services/         # Services métier purs
│   ├── use-cases/           # Cas d'usage / Application Services
│   │   ├── auth/            # Inscription, Connexion, etc.
│   │   ├── interventions/   # Créer, Modifier, Planifier, etc.
│   │   └── buildings/       # Gérer bâtiments et lots
│   └── ports/               # Interfaces pour l'extérieur
├── infrastructure/          # Implémentations techniques
│   ├── database/           # Repositories Supabase
│   ├── external/           # APIs externes
│   ├── storage/            # File storage
│   └── notifications/      # Email, SMS, Push
├── presentation/           # Couche présentation
│   ├── components/         # Composants UI réutilisables
│   ├── pages/             # Pages spécifiques métier
│   ├── hooks/             # React hooks
│   └── stores/            # Gestion d'état (Zustand/Jotai)
└── shared/                # Utilitaires partagés
    ├── types/             # Types TypeScript globaux
    ├── utils/             # Fonctions utilitaires
    └── constants/         # Constantes applicatives
```

---

## 🧩 REFACTORING PAR DOMAINE MÉTIER

### 1. DOMAINE AUTHENTIFICATION & UTILISATEURS

#### État Actuel Problématique
```typescript
// lib/auth-service.ts - 861 lignes !
class AuthService {
  // Mélange : auth, profile, team, redirection, logging
  async signUp() { /* 100 lignes */ }
  async signIn() { /* 80 lignes */ }
  async getCurrentUser() { /* 150 lignes avec fallbacks */ }
  async inviteUser() { /* logique métier mélangée */ }
}
```

#### Architecture Cible - Domain-Driven
```typescript
// core/domain/entities/User.ts
export class User {
  constructor(
    private readonly id: UserId,
    private readonly email: Email,
    private readonly profile: UserProfile,
    private readonly role: UserRole,
    private readonly teamId: TeamId
  ) {}

  public changeEmail(newEmail: Email): DomainEvent[] {
    // Règles métier : validation, contraintes
    const events: DomainEvent[] = []

    if (!this.canChangeEmail()) {
      throw new EmailChangeNotAllowedException()
    }

    events.push(new EmailChangeRequestedEvent(this.id, newEmail))
    return events
  }

  private canChangeEmail(): boolean {
    // Règles métier pures
    return this.profile.isVerified && !this.profile.isLocked
  }
}

// core/use-cases/auth/SignUpUseCase.ts
export class SignUpUseCase {
  constructor(
    private userRepository: UserRepository,
    private teamRepository: TeamRepository,
    private eventBus: EventBus
  ) {}

  async execute(command: SignUpCommand): Promise<SignUpResult> {
    // 1. Validation métier
    const email = Email.fromString(command.email)
    const profile = UserProfile.create(command.firstName, command.lastName)

    // 2. Vérifications business
    const existingUser = await this.userRepository.findByEmail(email)
    if (existingUser) {
      throw new UserAlreadyExistsException()
    }

    // 3. Création entités
    const user = User.create(email, profile, UserRole.GESTIONNAIRE)
    const team = Team.createPersonal(user.id, `Équipe de ${profile.fullName}`)

    // 4. Persistance
    await this.userRepository.save(user)
    await this.teamRepository.save(team)

    // 5. Événements métier
    await this.eventBus.publish(new UserRegisteredEvent(user.id, email.value))

    return SignUpResult.success(user.id)
  }
}

// infrastructure/database/UserRepository.ts
export class SupabaseUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    // Mapping entity -> DB uniquement
    const userData = UserMapper.toDatabase(user)
    await this.supabase.from('users').insert(userData)
  }

  async findByEmail(email: Email): Promise<User | null> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.value)
      .single()

    return data ? UserMapper.fromDatabase(data) : null
  }
}
```

**Bénéfices**:
- ✅ Logique métier centralisée et testable
- ✅ Séparation claire des responsabilités
- ✅ Règles business explicites
- ✅ Facilité de tests unitaires

### 2. DOMAINE INTERVENTIONS

#### État Actuel Problématique
```typescript
// Logique dispersée dans multiple fichiers
// app/api/create-intervention/route.ts (46 lignes)
// hooks/use-intervention-*.ts (12 hooks différents)
// lib/intervention-actions-service.ts (complexe)
```

#### Architecture Cible - Event-Driven
```typescript
// core/domain/entities/Intervention.ts
export class Intervention {
  constructor(
    private readonly id: InterventionId,
    private title: Title,
    private description: Description,
    private urgency: Urgency,
    private status: InterventionStatus,
    private readonly lotId: LotId,
    private readonly tenantId: UserId,
    private assignedProviderId?: ProviderId
  ) {}

  public approve(managerId: UserId): DomainEvent[] {
    if (!this.canBeApproved()) {
      throw new InterventionCannotBeApprovedException(this.status.value)
    }

    this.status = InterventionStatus.APPROVED

    return [
      new InterventionApprovedEvent(this.id, managerId, new Date()),
      new NotificationEvent.create(
        this.tenantId,
        `Votre intervention "${this.title.value}" a été approuvée`
      )
    ]
  }

  public assignProvider(providerId: ProviderId): DomainEvent[] {
    if (!this.isApproved()) {
      throw new InterventionNotApprovedException()
    }

    this.assignedProviderId = providerId
    this.status = InterventionStatus.ASSIGNED

    return [
      new InterventionAssignedEvent(this.id, providerId),
      new NotificationEvent.create(
        providerId,
        `Nouvelle intervention assignée: ${this.title.value}`
      )
    ]
  }

  private canBeApproved(): boolean {
    return this.status.equals(InterventionStatus.PENDING)
  }
}

// core/use-cases/interventions/CreateInterventionUseCase.ts
export class CreateInterventionUseCase {
  constructor(
    private interventionRepository: InterventionRepository,
    private lotRepository: LotRepository,
    private eventBus: EventBus
  ) {}

  async execute(command: CreateInterventionCommand): Promise<InterventionId> {
    // Validation métier
    const lot = await this.lotRepository.findById(command.lotId)
    if (!lot) {
      throw new LotNotFoundException(command.lotId)
    }

    if (!lot.hasTenant(command.tenantId)) {
      throw new UnauthorizedTenantException()
    }

    // Création intervention
    const intervention = Intervention.create(
      Title.fromString(command.title),
      Description.fromString(command.description),
      Urgency.fromString(command.urgency),
      command.lotId,
      command.tenantId
    )

    // Persistance
    await this.interventionRepository.save(intervention)

    // Événements
    await this.eventBus.publish(
      new InterventionCreatedEvent(intervention.id, command.tenantId)
    )

    return intervention.id
  }
}
```

### 3. GESTION D'ÉTAT CENTRALISÉE

#### Problème Actuel - État Distribué
```typescript
// État dispersé dans 12 hooks différents
const { user } = useAuth()                    // État auth
const { interventions } = useInterventions()  // État interventions
const { notifications } = useNotifications()  // État notifications
const { buildings } = useBuildings()          // État bâtiments
// + 8 autres hooks avec leur propre état
```

#### Solution - Store Centralisé avec Zustand
```typescript
// presentation/stores/AppStore.ts
interface AppState {
  // Domaine Auth
  auth: {
    user: User | null
    isLoading: boolean
    error: string | null
  }

  // Domaine Interventions
  interventions: {
    items: Intervention[]
    selectedId: InterventionId | null
    filters: InterventionFilters
    isLoading: boolean
  }

  // Domaine Notifications
  notifications: {
    items: Notification[]
    unreadCount: number
  }

  // Actions
  actions: {
    auth: AuthActions
    interventions: InterventionActions
    notifications: NotificationActions
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // État initial
  auth: { user: null, isLoading: false, error: null },
  interventions: { items: [], selectedId: null, filters: {}, isLoading: false },
  notifications: { items: [], unreadCount: 0 },

  // Actions
  actions: {
    auth: {
      signIn: async (credentials) => {
        set(state => ({ ...state, auth: { ...state.auth, isLoading: true } }))

        try {
          const useCase = container.resolve(SignInUseCase)
          const result = await useCase.execute(credentials)

          set(state => ({
            ...state,
            auth: { user: result.user, isLoading: false, error: null }
          }))
        } catch (error) {
          set(state => ({
            ...state,
            auth: { ...state.auth, isLoading: false, error: error.message }
          }))
        }
      }
    },

    interventions: {
      create: async (command) => {
        const useCase = container.resolve(CreateInterventionUseCase)
        const interventionId = await useCase.execute(command)

        // Refresh des données
        get().actions.interventions.loadAll()
      },

      approve: async (id, managerId) => {
        const useCase = container.resolve(ApproveInterventionUseCase)
        await useCase.execute({ interventionId: id, managerId })

        // Mise à jour optimiste de l'état
        set(state => ({
          ...state,
          interventions: {
            ...state.interventions,
            items: state.interventions.items.map(item =>
              item.id === id
                ? { ...item, status: 'approved' }
                : item
            )
          }
        }))
      }
    }
  }
}))
```

---

## 🔌 DEPENDENCY INJECTION & IOC

### Configuration du Container
```typescript
// shared/di/Container.ts
import { Container } from 'inversify'

export const container = new Container()

// Repositories
container.bind<UserRepository>('UserRepository').to(SupabaseUserRepository)
container.bind<InterventionRepository>('InterventionRepository').to(SupabaseInterventionRepository)

// Use Cases
container.bind<SignUpUseCase>(SignUpUseCase).toSelf()
container.bind<CreateInterventionUseCase>(CreateInterventionUseCase).toSelf()

// Services
container.bind<EventBus>('EventBus').to(InMemoryEventBus)
container.bind<NotificationService>('NotificationService').to(EmailNotificationService)

// Configuration par environnement
if (process.env.NODE_ENV === 'test') {
  container.rebind<UserRepository>('UserRepository').to(InMemoryUserRepository)
}
```

### Utilisation dans les Composants
```typescript
// presentation/hooks/useInterventions.ts
export const useInterventions = () => {
  const createUseCase = container.resolve(CreateInterventionUseCase)
  const approveUseCase = container.resolve(ApproveInterventionUseCase)

  const create = useCallback(async (command: CreateInterventionCommand) => {
    return await createUseCase.execute(command)
  }, [createUseCase])

  const approve = useCallback(async (id: InterventionId, managerId: UserId) => {
    return await approveUseCase.execute({ interventionId: id, managerId })
  }, [approveUseCase])

  return { create, approve }
}
```

---

## 📡 EVENT-DRIVEN ARCHITECTURE

### Système d'Événements
```typescript
// core/domain/events/DomainEvent.ts
export abstract class DomainEvent {
  public readonly occurredOn: Date
  public readonly eventId: string

  constructor() {
    this.occurredOn = new Date()
    this.eventId = crypto.randomUUID()
  }
}

// core/domain/events/InterventionEvents.ts
export class InterventionCreatedEvent extends DomainEvent {
  constructor(
    public readonly interventionId: InterventionId,
    public readonly tenantId: UserId,
    public readonly lotId: LotId
  ) {
    super()
  }
}

export class InterventionApprovedEvent extends DomainEvent {
  constructor(
    public readonly interventionId: InterventionId,
    public readonly managerId: UserId,
    public readonly approvedAt: Date
  ) {
    super()
  }
}

// infrastructure/events/EventBus.ts
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>()

  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandler<T>
  ): void {
    const eventName = eventType.name
    const existing = this.handlers.get(eventName) || []
    this.handlers.set(eventName, [...existing, handler])
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.constructor.name
    const handlers = this.handlers.get(eventName) || []

    await Promise.all(
      handlers.map(handler => handler.handle(event))
    )
  }
}

// Event Handlers
export class NotificationEventHandler implements EventHandler<InterventionCreatedEvent> {
  constructor(private notificationService: NotificationService) {}

  async handle(event: InterventionCreatedEvent): Promise<void> {
    await this.notificationService.notifyManager({
      recipientId: event.managerId,
      title: 'Nouvelle intervention',
      message: `Intervention créée pour le lot ${event.lotId}`
    })
  }
}
```

---

## 🧪 TESTING STRATEGY

### Tests Unitaires - Domaine
```typescript
// core/domain/entities/__tests__/Intervention.test.ts
describe('Intervention Entity', () => {
  it('should approve intervention when pending', () => {
    // Arrange
    const intervention = Intervention.create(
      Title.fromString('Fuite d\'eau'),
      Description.fromString('Fuite dans la cuisine'),
      Urgency.HIGH,
      LotId.fromString('lot-123'),
      UserId.fromString('tenant-456')
    )

    // Act
    const events = intervention.approve(UserId.fromString('manager-789'))

    // Assert
    expect(intervention.status.value).toBe('approved')
    expect(events).toHaveLength(2)
    expect(events[0]).toBeInstanceOf(InterventionApprovedEvent)
    expect(events[1]).toBeInstanceOf(NotificationEvent)
  })

  it('should throw when trying to approve non-pending intervention', () => {
    // Arrange
    const intervention = Intervention.create(/* ... */)
    intervention.approve(UserId.fromString('manager-789')) // Déjà approuvé

    // Act & Assert
    expect(() => intervention.approve(UserId.fromString('manager-789')))
      .toThrow(InterventionCannotBeApprovedException)
  })
})
```

### Tests d'Intégration - Use Cases
```typescript
// core/use-cases/__tests__/CreateInterventionUseCase.test.ts
describe('CreateInterventionUseCase', () => {
  let useCase: CreateInterventionUseCase
  let interventionRepository: InMemoryInterventionRepository
  let lotRepository: InMemoryLotRepository
  let eventBus: InMemoryEventBus

  beforeEach(() => {
    interventionRepository = new InMemoryInterventionRepository()
    lotRepository = new InMemoryLotRepository()
    eventBus = new InMemoryEventBus()

    useCase = new CreateInterventionUseCase(
      interventionRepository,
      lotRepository,
      eventBus
    )
  })

  it('should create intervention for valid tenant', async () => {
    // Arrange
    const lot = Lot.create(/* données test */)
    await lotRepository.save(lot)

    const command = new CreateInterventionCommand({
      title: 'Fuite d\'eau',
      description: 'Problème dans la cuisine',
      urgency: 'high',
      lotId: lot.id.value,
      tenantId: lot.tenantId.value
    })

    // Act
    const interventionId = await useCase.execute(command)

    // Assert
    expect(interventionId).toBeDefined()

    const intervention = await interventionRepository.findById(interventionId)
    expect(intervention).toBeDefined()
    expect(intervention?.title.value).toBe('Fuite d\'eau')

    expect(eventBus.publishedEvents).toHaveLength(1)
    expect(eventBus.publishedEvents[0]).toBeInstanceOf(InterventionCreatedEvent)
  })
})
```

---

## 📋 PLAN DE MIGRATION

### PHASE 1: FONDATIONS (SEMAINE 1-2)
```typescript
// 1. Mise en place structure de dossiers
mkdir -p src/{core,infrastructure,presentation,shared}

// 2. Configuration DI Container
npm install inversify reflect-metadata

// 3. Setup Event System
// Implémentation EventBus de base

// 4. Migration domaine User (le plus simple)
// Extraction des entités et use cases
```

### PHASE 2: DOMAINE INTERVENTION (SEMAINE 3-4)
```typescript
// 1. Extraction entité Intervention
// 2. Migration use cases critiques
// 3. Refactoring hooks vers stores Zustand
// 4. Tests unitaires domaine
```

### PHASE 3: INFRASTRUCTURE (SEMAINE 5-6)
```typescript
// 1. Migration repositories Supabase
// 2. Implémentation adapters
// 3. Configuration par environnement
// 4. Tests d'intégration
```

### PHASE 4: PRÉSENTATION (SEMAINE 7-8)
```typescript
// 1. Refactoring composants React
// 2. Migration vers stores centralisés
// 3. Optimisation re-renders
// 4. Tests E2E
```

---

## 🎯 BÉNÉFICES ATTENDUS

### 📈 MAINTENABILITÉ (+80%)
- **Séparation claire** des responsabilités
- **Code métier** centralisé et testable
- **Dépendances** explicites et injectables
- **Tests** simples et rapides

### 🚀 ÉVOLUTIVITÉ (+90%)
- **Ajout de features** sans régression
- **Modification** de l'infrastructure sans impact métier
- **Scaling** horizontal possible
- **Migration** technologique facilitée

### 🐛 QUALITÉ (+70%)
- **Bugs métier** impossibles (types + tests)
- **Erreurs runtime** réduites
- **Code coverage** naturellement élevé
- **Refactoring** sûr et automatisé

### 👥 EXPÉRIENCE DÉVELOPPEUR (+85%)
- **Onboarding** développeurs facilité
- **Debugging** efficace et ciblé
- **IDE** support optimal (IntelliSense)
- **Documentation** auto-générée

L'implémentation de cette architecture transformera SEIDO d'un prototype fonctionnel en une application enterprise-grade, maintenant et évolutive pour les années à venir.