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
        await this.page.goto('/assets');
    }
    
    async searchAssets(query: string) {
        await this.page.fill('[data-testid="search"]', query);
    }
}
```

## Security Patterns

### Authentication Flow
```go
// JWT-based authentication with Cognito
1. User login → Cognito authentication
2. JWT token generation with claims
3. Token validation middleware on all requests
4. Automatic token refresh handling
```

### Authorization Pattern
```go
// Role-based access control (RBAC)
func RequireRole(roles ...string) Middleware {
    return func(next Handler) Handler {
        return func(ctx context.Context, req Request) Response {
            user := GetUser(ctx)
            if !user.HasRole(roles...) {
                return Forbidden()
            }
            return next(ctx, req)
        }
    }
}
```

### Input Validation
```go
// Comprehensive validation at API boundaries
type Validator interface {
    Validate(input interface{}) error
}

// Sanitization for all user inputs
func SanitizeInput(input string) string {
    // XSS prevention
    // SQL injection prevention
    // Command injection prevention
}
```

### Audit Logging
```go
// Security event tracking
type AuditLogger interface {
    LogAccess(ctx context.Context, resource, action string)
    LogModification(ctx context.Context, before, after interface{})
    LogSecurityEvent(ctx context.Context, event SecurityEvent)
}
```

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

### Backend Handler Template
```go
func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // 1. Authentication check
    user, err := auth.ValidateToken(req.Headers["Authorization"])
    if err != nil {
        return response.Unauthorized(), nil
    }
    
    // 2. Input validation
    var input InputModel
    if err := json.Unmarshal([]byte(req.Body), &input); err != nil {
        return response.BadRequest("Invalid input"), nil
    }
    
    if err := validator.Validate(input); err != nil {
        return response.BadRequest(err.Error()), nil
    }
    
    // 3. Business logic
    result, err := service.ProcessRequest(ctx, input)
    if err != nil {
        log.Error("Handler failed", "error", err)
        return response.InternalError(), nil
    }
    
    // 4. Audit logging
    audit.LogAccess(ctx, "resource", "action")
    
    // 5. Response formatting
    return response.OK(result), nil
}
```

### React Component Template
```typescript
export const Component: React.FC<Props> = ({ data }) => {
    const { data: apiData, isLoading, error } = useQuery({
        queryKey: ['resource', data.id],
        queryFn: () => api.getResource(data.id),
    });
    
    if (isLoading) return <Loader />;
    if (error) return <ErrorMessage error={error} />;
    
    return (
        <div className="flex flex-col space-y-4">
            {/* Component content */}
        </div>
    );
};
```

### E2E Test Template
```typescript
import { expect } from '@playwright/test';
import { user_tests } from 'src/fixtures';
import { PageObject } from 'src/pages/page-object.page';
import { waitForAllLoader } from 'src/helpers/loader';

user_tests.TEST_USER_1.describe('Feature Tests', () => {
    user_tests.TEST_USER_1('should perform action', async ({ page }) => {
        const pageObject = new PageObject(page);
        
        // Navigation
        await pageObject.goto();
        await waitForAllLoader(page);
        
        // Test implementation
        await pageObject.performAction();
        
        // Verification
        await expect(page.locator('[data-testid="result"]')).toBeVisible();
    });
});
```

## UI/UX Patterns

### Data Tables
- **Virtualized scrolling** for large datasets
- **Consistent column sorting** and filtering
- **Row selection** with bulk actions
- **Responsive design** with mobile-first approach

### Real-time Updates
- **WebSocket connections** for live data
- **Optimistic updates** for better UX
- **Error handling** with retry mechanisms
- **Connection status** indicators

### Progressive Disclosure
- **Drawers and modals** for details
- **Collapsible sections** for complex forms
- **Steppers** for multi-step processes
- **Tooltips** for contextual help

### Responsive Design
- **Mobile-first** with Tailwind CSS
- **Breakpoint-aware** components
- **Touch-friendly** interfaces
- **Dark mode** support with system preference detection

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

## AI Agent Guidelines

### When Working with Backend Code
1. **Always use the established handler pattern** from `pkg/handler/handlers/`
2. **Follow the repository pattern** for data access
3. **Use context for request-scoped values** and cancellation
4. **Implement proper error handling** with wrapped errors
5. **Add comprehensive logging** using structured logging

### When Working with Frontend Code
1. **Use existing UI components** from `chariot-ui-components`
2. **Follow the section-based organization** for new features
3. **Implement proper loading states** and error handling
4. **Use TanStack Query** for data fetching
5. **Apply Tailwind CSS classes** consistently

### When Creating Tests
1. **Use page object model** for E2E tests
2. **Follow the established fixture patterns**
3. **Include both positive and negative test cases**
4. **Test user workflows** end-to-end
5. **Ensure proper test data cleanup**

### When Implementing Security Features
1. **Use Cognito for authentication** consistently
2. **Implement RBAC** using established patterns
3. **Validate and sanitize** all inputs
4. **Add security event logging**
5. **Follow OWASP best practices**

## Performance Optimization Patterns

### Backend Optimization
- **Connection pooling** for databases
- **Caching strategies** with Redis
- **Asynchronous processing** with SQS/Kinesis
- **Request debouncing** and throttling
- **Database query optimization** with proper indexing

### Frontend Optimization
- **Lazy loading** for components and routes
- **Virtual scrolling** for large lists
- **Memoization** for expensive calculations
- **Bundle optimization** with code splitting
- **Image optimization** with proper formats

### Testing Optimization
- **Parallel test execution** for faster feedback
- **Test data management** with fixtures
- **Mock optimization** to reduce external dependencies
- **Coverage-based testing** focusing on critical paths

## Documentation Standards

### Code Documentation
- **JSDoc/GoDoc comments** for all public APIs
- **Usage examples** in comments
- **Parameter validation** documentation
- **Error handling** documentation

### API Documentation
- **OpenAPI specifications** for all REST endpoints
- **Request/response examples** with real data
- **Authentication requirements** clearly stated
- **Rate limiting** information included

### Testing Documentation
- **Test case descriptions** explaining purpose
- **Setup and teardown** requirements
- **Data dependencies** documented
- **Environment requirements** specified