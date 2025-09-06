# Chariot Development Platform - Tech Stack & Architectural Patterns Report

## Executive Summary

The Chariot Development Platform is a sophisticated, multi-module security platform ecosystem built on modern cloud-native technologies. The platform demonstrates a microservices-oriented architecture with strong emphasis on security, scalability, and developer experience. The codebase exhibits consistent patterns across Go backend services, React/TypeScript frontends, and Python tooling, with AWS as the primary cloud infrastructure provider.

### Key Architectural Characteristics
- **Modular Monorepo Structure**: 13+ specialized modules managed as git submodules
- **Security-First Design**: Authentication, authorization, and audit patterns embedded throughout
- **Cloud-Native Architecture**: AWS-centric with multi-cloud capabilities (Azure, GCP)
- **Event-Driven Processing**: SQS, Kinesis, and Lambda-based asynchronous workflows
- **Graph-Based Data Model**: Neo4j for relationship mapping with DynamoDB for operational data
- **API-First Development**: REST APIs with consistent handler patterns and OpenAPI documentation

## Technology Stack Breakdown

### Programming Languages & Versions

#### Backend Services
- **Go 1.24.6**: Primary backend language (chariot, aegiscli, janus, nebula, tabularium)
  - Strong concurrency patterns with goroutines
  - Interface-based design for extensibility
  - Comprehensive error handling with context propagation

#### Frontend Applications
- **TypeScript 5.x**: Primary frontend language
- **React 18.3.1**: UI framework for chariot and chariot-ui-components
- **Node.js 20.x**: Runtime for frontend tooling and Claude Flow

#### Scripting & Tooling
- **Python 3.10+**: CLI tools and SDK (praetorian-cli)
- **VQL (Velociraptor Query Language)**: Security capability definitions
- **Bash/Shell**: Infrastructure automation and deployment scripts
- **YAML**: Configuration and CloudFormation/SAM templates

### Core Frameworks & Libraries

#### Backend (Go)
```go
// Core AWS SDK v2 Dependencies
aws-sdk-go-v2 v1.36.6
aws-lambda-go v1.46.0
dynamodb v1.42.4
s3 v1.66.0

// Web & API
gorilla/mux v1.8.0
golang-jwt/jwt/v5 v5.2.2

// Database
neo4j-go-driver/v5 v5.28.1

// Security & Auth
aws/cognitoidentityprovider v1.46.3
okta-sdk-golang/v5 v5.0.6
google/go-github/v72 v72.0.0

// Tooling
docker/docker v28.0.1
gocolly/colly/v2 v2.1.0
klauspost/compress v1.17.9
```

#### Frontend (React/TypeScript)
```json
// Core React Ecosystem
"react": "^18.3.1"
"react-dom": "^18.3.1"
"react-router-dom": "^6.30.1"

// UI Component Libraries
"@headlessui/react": "^2.2.4"
"@heroicons/react": "^2.2.0"
"@tremor/react": "^3.18.7"
"lucide-react": "^0.525.0"
"framer-motion": "^11.18.2"

// Data Visualization
"recharts": "^2.15.3"
"@xyflow/react": "^12.8.1"
"@react-sigma/core": "^4.0.3"
"react-simple-maps": "^3.0.0"

// State & Data Management
"@tanstack/react-query": "^5.81.5"
"aws-amplify": "^6.15.1"
"axios": "^1.10.0"

// Build Tools
"vite": "^6.3.5"
"tailwindcss": "^3.x"
"typescript": "^5.x"
```

#### Python (CLI/SDK)
```python
# Core Dependencies
click >= 8.1.7
boto3 >= 1.34.0
requests >= 2.31.0
pytest >= 8.0.2
mcp >= 1.12.2
textual >= 0.47.0
rich >= 13.0.0
```

### Database & Storage Systems

#### Primary Data Stores
- **DynamoDB**: Main operational database for all entity storage
  - Single table design pattern
  - GSI for query optimization
  - Attribute-based access patterns

- **Neo4j 5.x**: Graph database for relationship mapping
  - Asset relationships
  - AD object hierarchies
  - Attack path modeling

- **S3**: Object storage for files, reports, and capabilities
  - Structured bucket organization
  - Lifecycle policies for cost optimization
  - Pre-signed URLs for secure access

#### Caching & Queuing
- **ElastiCache (Redis)**: Session management and distributed locking
- **SQS**: Job queuing with priority lanes
  - Standard queues for bulk operations
  - Priority queues for time-sensitive tasks
  - Static queues for deterministic processing
- **Kinesis**: Real-time event streaming for results

### Infrastructure & Deployment

#### AWS Services Architecture
```yaml
Core Services:
  - Lambda: Serverless compute (Go runtime)
  - API Gateway: REST API management
  - Cognito: User authentication & API keys
  - CloudFormation/SAM: Infrastructure as Code
  - VPC: Network isolation with private subnets
  - EC2: Aegis agent deployment targets
  - SSM: Secure parameter management
  - CloudWatch: Logging and monitoring

Multi-Cloud Support:
  - Azure SDK integration for resource scanning
  - GCP API support for cloud asset discovery
  - DigitalOcean API for infrastructure management
```

#### Containerization & Orchestration
- **Docker**: Service containerization
- **Docker Compose**: Local development environment
- **AWS Fargate**: Serverless container execution
- **Custom orchestration** via Janus framework

### Testing Frameworks

#### Frontend Testing
- **Playwright**: E2E testing with page object model
- **Jest**: Unit testing
- **Storybook**: Component documentation and testing
- **Coverage Tools**: Built-in coverage reporting

#### Backend Testing
- **Go testing package**: Standard unit tests
- **testify**: Assertions and mocking
- **Integration tests**: AWS service mocking
- **E2E tests**: Full stack testing with real services

## Architectural Patterns

### Code Organization Patterns

#### Module Structure
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

#### Backend Handler Pattern
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

#### Frontend Component Pattern
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

### Design Patterns

#### Repository Pattern (Go)
```go
// Interface-based data access
type AssetRepository interface {
    Create(ctx context.Context, asset *model.Asset) error
    Get(ctx context.Context, id string) (*model.Asset, error)
    Update(ctx context.Context, asset *model.Asset) error
    Delete(ctx context.Context, id string) error
}
```

#### Factory Pattern (Capabilities)
```go
// Dynamic capability creation
type CapabilityFactory interface {
    Create(capType string, config map[string]interface{}) Capability
}
```

#### Observer Pattern (Event Handling)
```go
// Event-driven architecture
type EventHandler interface {
    Handle(ctx context.Context, event Event) error
}
```

#### Page Object Model (E2E Testing)
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

### Security Patterns

#### Authentication Flow
```go
// JWT-based authentication with Cognito
1. User login → Cognito authentication
2. JWT token generation with claims
3. Token validation middleware on all requests
4. Automatic token refresh handling
```

#### Authorization Pattern
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

#### Input Validation
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

#### Audit Logging
```go
// Security event tracking
type AuditLogger interface {
    LogAccess(ctx context.Context, resource, action string)
    LogModification(ctx context.Context, before, after interface{})
    LogSecurityEvent(ctx context.Context, event SecurityEvent)
}
```

### Data Management Patterns

#### Single Table Design (DynamoDB)
```go
// Polymorphic entity storage
type Entity struct {
    PK   string // Partition Key: "ACCOUNT#123"
    SK   string // Sort Key: "ASSET#456"
    Type string // Entity type discriminator
    Data interface{} // Polymorphic data
}
```

#### Graph Relationships (Neo4j)
```cypher
// Relationship modeling
(Asset)-[:HAS_VULNERABILITY]->(Vulnerability)
(Asset)-[:BELONGS_TO]->(Account)
(Asset)-[:DISCOVERED_BY]->(Capability)
```

#### Event Sourcing
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

### API Design Patterns

#### RESTful Conventions
```
GET    /api/{resource}       # List resources
GET    /api/{resource}/{id}  # Get specific resource
POST   /api/{resource}       # Create resource
PUT    /api/{resource}/{id}  # Update resource
DELETE /api/{resource}/{id}  # Delete resource
```

#### Consistent Error Responses
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

#### Pagination Pattern
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

## Development Conventions

### File Naming Standards
- **Go files**: `snake_case.go` with `_test.go` for tests
- **TypeScript/React**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Python**: `snake_case.py` following PEP 8
- **Configuration**: `kebab-case.yml` or `.env.{environment}`

### Code Style Guidelines
- **Go**: Standard Go formatting with `gofmt`
- **TypeScript**: Prettier with ESLint configuration
- **Python**: Black formatter with type hints
- **Documentation**: Comprehensive JSDoc/GoDoc comments

### Git Workflow
- **Branch naming**: `feature/`, `fix/`, `chore/` prefixes
- **Commit messages**: Conventional commits format
- **PR templates**: Standardized review checklists
- **Submodule management**: Independent versioning with coordinated releases

### Testing Standards
- **Unit test coverage**: Minimum 80% for business logic
- **Integration tests**: Critical path coverage
- **E2E tests**: User journey validation
- **Performance tests**: Load testing for APIs

## Integration Architecture

### Module Communication
```yaml
Internal Communication:
  - Shared data models via Tabularium
  - Direct API calls between services
  - Event-driven via SQS/Kinesis
  - Shared authentication via Cognito

External Integrations:
  - GitHub API for code repository scanning
  - Okta for enterprise SSO
  - PlexTrac for reporting
  - Various security tool APIs
```

### Data Exchange Formats
- **REST APIs**: JSON with OpenAPI schemas
- **Inter-service**: Protocol Buffers for performance-critical paths
- **File formats**: CSV, JSON, YAML for data export/import
- **Streaming**: JSON Lines for real-time data

### Authentication Patterns
```go
// Multiple authentication methods
1. Cognito JWT tokens (primary)
2. API keys for programmatic access
3. GitHub OAuth for integration
4. Service-to-service authentication
```

## Platform-Specific Patterns

### Chariot Domain Models
```go
// Core entities
Asset       // External-facing resources
Risk        // Security vulnerabilities
Attribute   // Asset properties
Seed        // Discovery starting points
Job         // Async operations
Capability  // Security scanning tools
```

### Security Scanning Workflow
```
1. Seed Creation → Define scope
2. Job Scheduling → Queue processing
3. Capability Execution → Tool running
4. Result Processing → Data normalization
5. Risk Creation → Vulnerability tracking
6. Notification → Alert relevant parties
```

### Attack Surface Management
```go
// Continuous monitoring pattern
type Monitor struct {
    Schedule   string
    Capability string
    Scope      []Asset
    Actions    []Action
}
```

### UI/UX Patterns
- **Data Tables**: Virtualized scrolling for large datasets
- **Real-time Updates**: WebSocket connections for live data
- **Progressive Disclosure**: Drawers and modals for details
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Dark Mode**: System preference detection

## Recommendations for AI Agent Enhancement

### 1. Code Generation Templates
Agents should use these established patterns:
```go
// Backend handler template
func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // 1. Authentication check
    // 2. Input validation
    // 3. Business logic
    // 4. Audit logging
    // 5. Response formatting
}
```

```typescript
// React component template
export const Component: React.FC<Props> = ({ data }) => {
    const { data: apiData, isLoading } = useQuery({...});
    
    if (isLoading) return <Loader />;
    
    return (
        <div className="flex flex-col space-y-4">
            {/* Component content */}
        </div>
    );
};
```

### 2. Testing Patterns to Follow
```typescript
// E2E test template
user_tests.TEST_USER_1.describe('Feature Tests', () => {
    user_tests.TEST_USER_1('should perform action', async ({ page }) => {
        const pageObject = new PageObject(page);
        await pageObject.goto();
        await waitForAllLoader(page);
        // Test implementation
    });
});
```

### 3. Security Considerations
- Always validate input at API boundaries
- Use parameterized queries for database operations
- Implement proper error handling without exposing internals
- Add audit logging for security-relevant operations
- Use established authentication/authorization patterns

### 4. Performance Optimizations
- Implement pagination for large datasets
- Use caching strategies (Redis, in-memory)
- Optimize database queries with proper indexing
- Implement request debouncing/throttling
- Use lazy loading for UI components

### 5. Documentation Standards
- Include JSDoc/GoDoc comments for all public APIs
- Provide usage examples in comments
- Document environment variables and configuration
- Maintain updated OpenAPI specifications
- Include architecture decision records (ADRs)

## Platform-Centric Agent Guidelines

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

## Conclusion

The Chariot Development Platform demonstrates a mature, well-architected security platform with consistent patterns across all modules. The technology stack is modern and cloud-native, with strong emphasis on security, scalability, and developer experience. AI agents working with this codebase should adhere to these established patterns to ensure consistency, maintainability, and security across the platform.

Key strengths:
- **Consistent architecture** across all modules
- **Security-first design** with comprehensive patterns
- **Modern technology stack** with best-in-class tools
- **Comprehensive testing** at all levels
- **Clear separation of concerns** with modular design

Areas for agent focus:
- **Pattern adherence** when generating code
- **Security considerations** in all implementations
- **Test coverage** for new features
- **Documentation** maintenance
- **Performance optimization** opportunities

This analysis provides the foundation for creating more effective, platform-aware AI agents that can seamlessly integrate with and enhance the Chariot Development Platform ecosystem.