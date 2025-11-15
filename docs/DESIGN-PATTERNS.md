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

## React 19 Patterns

### Optimistic Updates with useOptimistic

**When to Use**: Provide immediate UI feedback for async mutations (toggles, status changes, tag additions)

**Pattern**:
```typescript
import { useOptimistic } from 'react';

// Server state (single source of truth from API)
const serverFlags = useMemo(
  () => (apiData || [])
    .map(item => item.name)
    .filter(name => ValidFlags.includes(name)),
  [apiData]
);

// Optimistic state with automatic rollback on error
const [optimisticFlags, setOptimisticFlags] = useOptimistic(
  serverFlags,
  (_currentState, optimisticValue: string[]) => optimisticValue
);

// Usage in mutation handler
const handleToggle = async (newValue: string) => {
  try {
    // 1. Optimistic update (immediate UI feedback)
    setOptimisticFlags([...optimisticFlags, newValue]);

    // 2. API call
    await mutation({ value: newValue });

    // 3. Success feedback
    toast.success('Updated successfully');
  } catch (error) {
    // 4. Automatic rollback by useOptimistic
    toast.error('Update failed');
  }
};
```

**Benefits**:
- Automatic rollback on errors (no manual state management)
- Type-safe with TypeScript
- Minimal code (2-line hook vs 40+ line manual pattern)
- React Compiler compatible
- Battle-tested React 19 API

**Use Cases in Chariot**:
- Feature flag toggles (Settings page)
- Asset tag additions (Query Builder)
- Status updates (Asset management)
- Comment updates (Vulnerability tracking)

**Implementation Examples**:
- `ui/src/sections/settings/components/ChariotModules.tsx`
- `ui/src/sections/insights/queryBuilder/hooks/useEntityActions/useAssetActions.ts`

### Suspense Boundaries for Data Loading

**When to Use**: Declarative loading states for async data fetching

**Pattern**:
```typescript
import { Suspense } from 'react';

// Static component structure (no conditional rendering)
function Settings() {
  return (
    <Tabs tabs={STATIC_TABS} />

    {selectedTab === 'subscription' && (
      <ErrorBoundary fallback={<ErrorUI />}>
        <Suspense fallback={<LoadingSkeleton />}>
          <SubscriptionTab />
        </Suspense>
      </ErrorBoundary>
    )}
  );
}
```

**Benefits**:
- Prevents layout shift (stable component structure)
- Declarative loading states
- Automatic error boundaries integration
- Code splitting support
- React 19 concurrent rendering optimization

**Use Cases in Chariot**:
- Tab content loading (Settings page)
- Heavy component lazy loading
- Data-dependent components
- Modal content loading

**Implementation Examples**:
- `ui/src/sections/settings/index.tsx` (Subscription tab)
- `ui/src/sections/settings/monitoring/index.tsx`

### Concurrent Features for Non-Urgent Updates

**When to Use**: Non-blocking updates that shouldn't interrupt user interactions

**Pattern**:
```typescript
import { useTransition } from 'react';

const [isPending, startTransition] = useTransition();

// Expensive or non-urgent update
const handleLayoutChange = (newLayout) => {
  startTransition(() => {
    setLayout(newLayout); // Non-urgent, can be deferred
  });
};

// Show subtle loading indicator
{isPending && <LoadingIndicator />}
```

**Benefits**:
- Keeps UI responsive during expensive updates
- User input remains snappy
- Automatic prioritization by React
- Better perceived performance

**Use Cases in Chariot**:
- Dashboard layout changes (Metrics)
- Filter applications (large datasets)
- Graph rendering updates
- Search debouncing

**Implementation Examples**:
- `ui/src/sections/insights/metrics/index.tsx` (Drag-and-drop layout)

### React Compiler Optimization

**Configuration**:
```typescript
// vite.config.ts
react({
  babel: {
    plugins: [['babel-plugin-react-compiler', {}]],
  },
})
```

**Philosophy**: Write simple, clean code. Let React Compiler handle optimization.

**What Compiler Optimizes**:
- Automatic component memoization
- Stable callback references
- Dependency tracking for hooks
- Prevents unnecessary re-renders

**When Manual Optimization IS Still Needed**:
1. **Expensive computations** (>100ms): Use `useMemo`
2. **Large lists** (>1000 items): Use virtualization
3. **External library integration**: Use `useMemo/useCallback` for stable refs
4. **Blocking user input**: Use `useTransition`

**What to AVOID with React Compiler**:
- ❌ Unnecessary `React.memo` wrapping
- ❌ `useMemo` for simple operations
- ❌ `useCallback` for every function
- ❌ Over-optimization without profiling

**References**:
- `.claude/skills/react-performance-optimization/SKILL.md`
- `.claude/skills/react-modernization/SKILL.md`

### Testing Optimization
- **Parallel test execution** for faster feedback
- **Test data management** with fixtures
- **Mock optimization** to reduce external dependencies
- **Coverage-based testing** focusing on critical paths

## Frontend UI Patterns

### Linear-Inspired Settings Pattern

**When to Use**: Settings pages, configuration interfaces, preference screens

**Pattern**: Unified cards with dividers showing current state + edit actions

```typescript
// Consolidated card with automatic dividers
<SettingContentCard className="divide-y divide-chariot-stroke">
  <SettingRow>
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Setting Name</h3>
        <p className="text-sm text-chariot-text-secondary">Description</p>
      </div>
      <Button onClick={openEditModal} label="Edit" />
    </div>
  </SettingRow>

  {/* Automatic divider between rows */}
  <SettingRow>
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">Another Setting</h3>
      <Button onClick={openEditModal} label="Edit" />
    </div>
  </SettingRow>
</SettingContentCard>
```

**Benefits**:
- Visual consistency across all settings
- Scannable single-card layout
- Automatic dividers with Tailwind divide-y
- Display + Edit modal pattern matches Linear/modern SaaS
- Reduced visual fragmentation vs multiple cards

**Key Components**:
- `SettingRow`: Wrapper with py-6 padding, first:pt-0
- `SettingContentCard`: Card container with optional divide-y
- `SettingSectionHeader`: Section title (text-lg font-bold)

**Use Cases in Chariot**:
- Settings tabs (Scan Settings, Notifications, User Settings)
- Configuration pages
- Preference screens

**Implementation Example**:
- `ui/src/sections/settings/tabs/ScanSettingsTab.tsx`
- `ui/src/sections/settings/components/SettingRow.tsx`
- `ui/src/sections/settings/components/ScanSettingCard.tsx`

### Copy Functionality with Visual Feedback

**When to Use**: Displaying copyable values (API keys, webhook URLs, identifiers)

**Pattern**: Clickable value with green flash feedback on copy

```typescript
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch (error) {
    toast.error('Failed to copy');
  }
};

<button
  onClick={handleCopy}
  className={cn(
    'rounded-md px-3 py-1.5 transition-colors',
    copied
      ? 'bg-green-500/10 text-green-600 ring-1 ring-green-500/20'
      : 'bg-chariot-background-secondary text-chariot-text-primary hover:bg-chariot-background-tertiary'
  )}
>
  {value}
</button>
```

**Visual States**:
- Default: Gray background
- Hover: Lighter background (shows interactivity)
- Copied: Green flash (1.5 seconds)
- Error: Red toast notification

**Benefits**:
- Immediate visual feedback (no waiting for toast)
- Consistent copy UX across application
- Accessible (proper button with aria-label)
- Error handling for clipboard failures

**Use Cases in Chariot**:
- Webhook URLs (notification integrations)
- API keys
- Scan headers (MD5 identifiers)
- Asset identifiers

**Implementation Examples**:
- `ui/src/sections/settings/components/ScanSettingsCards.tsx` (scan header copy)
- `ui/src/sections/settings/tabs/NotificationsTab.tsx` (webhook URL copy)

### Component Extraction from Monolithic Files

**When to Use**: Single file exceeds 300 lines, multiple logical sections, tab-based UI

**Pattern**: Progressive extraction maintaining functionality

**Step 1: Identify Extraction Candidates**
```typescript
// Criteria for extraction:
// - File > 300 lines
// - Clear logical sections (tabs, features)
// - Self-contained functionality
// - Reusable across contexts
```

**Step 2: Extract to Dedicated Files**
```typescript
// Before: 791-line settings/index.tsx with all tabs inline

// After: Modular structure
settings/
├── index.tsx (250 lines - orchestration only)
├── tabs/
│   ├── ScanSettingsTab.tsx (60 lines)
│   ├── NotificationsTab.tsx (320 lines)
│   ├── UserSettingsTab.tsx (121 lines)
│   └── OrganizationTab.tsx (122 lines)
```

**Step 3: Maintain Shared State**
```typescript
// Keep shared state in parent (index.tsx)
const [selectedTab, setSelectedTab] = useState('scanSettings');

// Pass via props or context to extracted tabs
{selectedTab === 'scanSettings' && <ScanSettingsTab />}
```

**Benefits**:
- Smaller files easier to review and maintain
- Isolated testing of individual tabs
- Reduced merge conflicts
- Clear ownership of code
- Better code splitting opportunities

**Migration Strategy**:
1. Extract one tab at a time (prove pattern)
2. Validate functionality preserved
3. Apply to remaining tabs
4. Reduce main file to orchestration only

**Target**: Main orchestration file < 300 lines

**Implementation Example**:
- Settings section reduced from 791 → 250 lines through tab extraction

### TanStack Query Caching Strategy

**When to Use**: Data fetching with TanStack Query, impersonation support, settings data

**Pattern**: Standard cache configuration with impersonation safety

```typescript
// Standard cache configuration
const { data } = useQuery({
  queryKey: ['resource', userId], // Include userId for isolation
  queryFn: fetchData,
  staleTime: 30000,  // 30 seconds - appropriate for settings/config data
  gcTime: 300000,    // 5 minutes - keep during navigation
});
```

**Cache Configuration Guidelines**:

| Data Type | staleTime | gcTime | Rationale |
|-----------|-----------|--------|-----------|
| User settings | 30s | 5min | Changes infrequently, 30s acceptable |
| Real-time data | 5s | 1min | Needs freshness, short cache |
| Static config | 5min | 30min | Rarely changes, long cache OK |
| Search results | 1min | 5min | Balance freshness and performance |

**Impersonation Safety**:
```typescript
// Include email in query key for cache isolation
const { data } = useMy(
  { resource: 'setting' },
  {
    email: impersonatedUserEmail,  // Differentiates cache entries
    staleTime: 30000,
    gcTime: 300000,
  }
);

// Query key becomes: ['my', 'setting', 'user@example.com']
// Different users get different cache entries
```

**When to Disable Cache** (rare):
- Never use `staleTime: 0, gcTime: 0` for performance
- If fresh data required, use `refetchOnMount` or manual refetch
- Global cache clearing on impersonation (`queryClient.clear()`) handles user switching

**Anti-Pattern**:
```typescript
// ❌ WRONG: Aggressive cache disabling
{
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always',
}

// ✅ CORRECT: Standard caching
{
  staleTime: 30000,
  gcTime: 300000,
}
```

**Benefits**:
- 80-90% reduction in API calls
- Faster perceived performance
- Better user experience (instant navigation)
- Lower backend load

**Implementation Examples**:
- `ui/src/sections/settings/components/ScanSettingsCards.tsx`
- `ui/src/hooks/useSubscription.ts`

### Settings Section Component Composition

**When to Use**: Building settings interfaces, configuration pages

**Pattern**: Hierarchical composition with semantic components

```typescript
// Section structure
<SettingSection
  title="Section Title"          // text-lg heading
  description="Section description"
  action={<Button />}             // Optional action button
>
  <SettingContentCard>
    {/* Card content */}
  </SettingContentCard>
</SettingSection>
```

**Component Hierarchy**:
```
SettingSection (provides h2 heading, description, optional action)
└── SettingContentCard (provides background, border, padding)
    └── SettingRow (provides vertical spacing, divider support)
        └── Content (settings display, forms, etc.)
```

**Typography Scale**:
- Section title: `text-lg font-bold` (h2)
- Subsection title: `text-base font-semibold` (h3)
- Description: `text-sm text-chariot-text-secondary`
- Helper text: `text-xs text-chariot-text-tertiary`

**Spacing Scale**:
- Between sections: `gap-14` (56px)
- Section to card: `gap-6` (24px) - handled by SettingSection
- Between rows: `py-6` (24px) - handled by SettingRow
- Within content: `gap-4` (16px) or `gap-2` (8px)

**Divider Pattern**:
```typescript
// Automatic dividers between rows
<SettingContentCard className="divide-y divide-chariot-stroke">
  <SettingRow>Row 1</SettingRow>
  <SettingRow>Row 2</SettingRow>
  <SettingRow>Row 3</SettingRow>
</SettingContentCard>
```

**Benefits**:
- Consistent visual hierarchy
- Semantic HTML structure
- Predictable spacing
- Automatic divider management
- Accessibility (proper heading levels)

**Use Cases**:
- All settings tabs
- Configuration pages
- User preferences
- Admin panels

**Implementation Examples**:
- `ui/src/sections/settings/components/SettingSection.tsx`
- `ui/src/sections/settings/components/SettingRow.tsx`
- All settings tabs use this composition pattern

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