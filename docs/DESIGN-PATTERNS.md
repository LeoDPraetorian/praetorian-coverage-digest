# Chariot Development Platform - Design Patterns & Architecture Guidelines

## Code Organization Patterns

### Module Structure

```
modules/
├── {module-name}/
│   ├── backend/         # Go services
│   │   ├── pkg/        # Business logic
│   │   ├── cmd/        # Entry points
│   │   └── internal/   # Private code
│   ├── ui/             # React frontend
│   │   ├── src/
│   │   │   ├── sections/    # Feature areas
│   │   │   ├── components/  # Reusable UI
│   │   │   ├── hooks/       # React hooks
│   │   │   └── utils/       # Utilities
│   │   └── public/
│   ├── e2e/            # End-to-end tests
│   └── docs/           # Documentation
```

### Backend Handler Pattern

```go
// Consistent handler structure across all endpoints
type Handler func(context.Context, events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error)

// Handler organization by domain
handlers/
├── account/        # User account management
├── asset/          # Asset CRUD operations
├── capabilities/   # Security tool management
├── job/           # Async job handling
└── integration/   # Third-party integrations
```

### Frontend Component Pattern

```typescript
// Feature-based organization
sections/
├── assets/        # Asset management UI
├── vulnerabilities/ # Vulnerability views
├── settings/      # Configuration UI
└── shared/        # Shared components

// Consistent hook patterns
hooks/
├── useAPI/        # API integration hooks
├── useAuth/       # Authentication hooks
└── useData/       # Data management hooks
```

## Core Design Patterns

### Repository Pattern (Go)

```go
// Interface-based data access
type AssetRepository interface {
    Create(ctx context.Context, asset *model.Asset) error
    Get(ctx context.Context, id string) (*model.Asset, error)
    Update(ctx context.Context, asset *model.Asset) error
    Delete(ctx context.Context, id string) error
}
```

### Factory Pattern (Capabilities)

```go
// Dynamic capability creation
type CapabilityFactory interface {
    Create(capType string, config map[string]interface{}) Capability
}
```

### Observer Pattern (Event Handling)

```go
// Event-driven architecture
type EventHandler interface {
    Handle(ctx context.Context, event Event) error
}
```

### Page Object Model (E2E Testing)

```typescript
// Encapsulated page interactions
export class AssetPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/assets");
  }

  async searchAssets(query: string) {
    await this.page.fill('[data-testid="search"]', query);
  }
}
```

## Security Patterns

For comprehensive auth patterns (JWT, OAuth2, RBAC, session management), see **`auth-implementation-patterns`** skill.

**Chariot Security Implementation:**

| Pattern          | Location                          |
| ---------------- | --------------------------------- |
| JWT/Cognito Auth | `backend/pkg/auth/`               |
| RBAC Middleware  | `backend/pkg/handler/middleware/` |
| Input Validation | `backend/pkg/validator/`          |
| Audit Logging    | `backend/pkg/audit/`              |

**Flow:** User login → Cognito auth → JWT with claims → Middleware validation → RBAC check

## Data Management Patterns

### Single Table Design (DynamoDB)

```go
// Polymorphic entity storage
type Entity struct {
    PK   string // Partition Key: "ACCOUNT#123"
    SK   string // Sort Key: "ASSET#456"
    Type string // Entity type discriminator
    Data interface{} // Polymorphic data
}
```

### Graph Relationships (Neo4j)

```cypher
// Relationship modeling
(Asset)-[:HAS_VULNERABILITY]->(Vulnerability)
(Asset)-[:BELONGS_TO]->(Account)
(Asset)-[:DISCOVERED_BY]->(Capability)
```

### Event Sourcing

```go
// Audit trail through events
type Event struct {
    ID        string
    Type      string
    Timestamp time.Time
    Actor     string
    Data      interface{}
}
```

## API Design Patterns

### RESTful Conventions

```
GET    /api/{resource}       # List resources
GET    /api/{resource}/{id}  # Get specific resource
POST   /api/{resource}       # Create resource
PUT    /api/{resource}/{id}  # Update resource
DELETE /api/{resource}/{id}  # Delete resource
```

### Consistent Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "email",
      "reason": "Invalid format"
    }
  }
}
```

### Pagination Pattern

```json
{
    "data": [...],
    "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 100,
        "hasNext": true
    }
}
```

## Code Generation Templates

For comprehensive templates and patterns, see skills:

- **React Components**: `frontend-react-component-generator` skill
- **E2E Tests**: `frontend-e2e-testing-patterns` skill

**Chariot Template Locations:**

| Template        | Location                        | Pattern                                             |
| --------------- | ------------------------------- | --------------------------------------------------- |
| Backend Handler | `backend/pkg/handler/handlers/` | Auth → Validate → Business Logic → Audit → Response |
| React Component | `ui/src/sections/{feature}/`    | Feature-based with TanStack Query                   |
| E2E Test        | `e2e/tests/`                    | Page Object Model with fixtures                     |

**Follow existing patterns** in each directory - copy a similar file and modify.

## UI/UX Patterns

For comprehensive UX laws (Hick's, Fitts', Miller's, Gestalt, Nielsen's), see **`adhering-to-uiux-laws`** skill.

**Chariot UI Patterns:**

- **Data Tables:** Virtualized scrolling, column sorting, row selection, bulk actions
- **Real-time:** WebSocket connections, optimistic updates, retry mechanisms
- **Disclosure:** Drawers/modals for details, collapsible sections, tooltips
- **Responsive:** Mobile-first Tailwind, breakpoint-aware, dark mode support

## Attack Surface Management Patterns

### Continuous Monitoring

```go
type Monitor struct {
    Schedule   string
    Capability string
    Scope      []Asset
    Actions    []Action
}
```

### Risk Assessment

```go
type RiskCalculator interface {
    CalculateRisk(asset Asset, vulnerabilities []Vulnerability) RiskScore
    PrioritizeRisks(risks []Risk) []Risk
}
```

### Asset Discovery

```go
type DiscoveryEngine interface {
    Discover(seeds []Seed) ([]Asset, error)
    Validate(asset Asset) bool
    Enrich(asset Asset) Asset
}
```
