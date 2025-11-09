# Detection Patterns - Pattern Catalog

Comprehensive guide to recognizing skill-worthy patterns during session analysis.

## Pattern Categories

### Category 1: API Development Patterns

#### Pattern: REST API Endpoint Creation

**Indicators:**
- Created 3+ endpoints with similar structure
- Repeated handler → service → repository pattern
- Similar authentication/validation logic
- Common response formatting

**Example Session:**
```
Task 1: POST /api/users - Create user endpoint
Task 2: POST /api/products - Create product endpoint
Task 3: POST /api/orders - Create order endpoint

Common elements:
- Input validation with Pydantic/Zod
- Service layer business logic
- Database operations
- Error handling patterns
- Response formatting
```

**Potential Skill:** "rest-api-patterns" or "crud-api-generator"

---

#### Pattern: GraphQL Resolver Implementation

**Indicators:**
- Created 3+ resolvers with similar patterns
- Repeated authentication checks
- Similar data loading patterns
- Common error handling

**Example Session:**
```
Task 1: User resolver (queries + mutations)
Task 2: Post resolver (queries + mutations)
Task 3: Comment resolver (queries + mutations)

Common elements:
- Field resolvers with context
- DataLoader patterns for N+1 prevention
- Authorization checks
- Error formatting
```

**Potential Skill:** "graphql-resolver-patterns"

---

#### Pattern: Third-Party API Integration

**Indicators:**
- Integrated 3+ external services
- Similar authentication flows
- Common error handling patterns
- Repeated retry logic

**Example Session:**
```
Task 1: Stripe payment integration
Task 2: SendGrid email integration
Task 3: Twilio SMS integration

Common elements:
- API client initialization
- Credential management
- Request/response handling
- Rate limiting
- Error recovery
```

**Potential Skill:** "third-party-api-integration-patterns"

---

### Category 2: Infrastructure & DevOps Patterns

#### Pattern: Multi-Cloud Deployment

**Indicators:**
- Deployed to 3+ cloud providers
- Similar infrastructure as code
- Common configuration patterns
- Repeated deployment workflows

**Example Session:**
```
Task 1: Deploy to AWS (Lambda + DynamoDB)
Task 2: Deploy to Azure (Functions + CosmosDB)
Task 3: Deploy to GCP (Cloud Functions + Firestore)

Common elements:
- Serverless function configuration
- Database setup
- Environment variables
- IAM/permissions
- Monitoring setup
```

**Potential Skill:** "multi-cloud-deployment-patterns"

---

#### Pattern: Container Orchestration

**Indicators:**
- Created 3+ similar Dockerfile/docker-compose files
- Repeated Kubernetes manifests
- Common deployment configurations
- Similar networking setups

**Example Session:**
```
Task 1: Containerize API service
Task 2: Containerize worker service
Task 3: Containerize cron service

Common elements:
- Multi-stage Docker builds
- Health check configuration
- Resource limits
- Volume mounts
- Networking setup
```

**Potential Skill:** "service-containerization-patterns"

---

### Category 3: Testing Patterns

#### Pattern: Integration Test Suite

**Indicators:**
- Wrote 3+ integration test files
- Similar test setup/teardown
- Common mocking patterns
- Repeated assertion patterns

**Example Session:**
```
Task 1: User service integration tests
Task 2: Product service integration tests
Task 3: Order service integration tests

Common elements:
- Test database setup
- Factory patterns for test data
- API client mocking
- Cleanup procedures
```

**Potential Skill:** "integration-test-patterns"

---

#### Pattern: E2E Test Workflow

**Indicators:**
- Created 3+ E2E test scenarios
- Similar page object patterns
- Common user flow testing
- Repeated test data setup

**Example Session:**
```
Task 1: User registration E2E test
Task 2: Product purchase E2E test
Task 3: Admin dashboard E2E test

Common elements:
- Page object model
- Test data factories
- Authentication flows
- Assertion helpers
```

**Potential Skill:** "e2e-test-workflow-patterns"

---

### Category 4: Data Processing Patterns

#### Pattern: ETL Pipeline

**Indicators:**
- Built 3+ data transformation pipelines
- Similar extract/transform/load patterns
- Common error handling
- Repeated validation logic

**Example Session:**
```
Task 1: Customer data ETL from CSV
Task 2: Product data ETL from API
Task 3: Order data ETL from database

Common elements:
- Data extraction utilities
- Transformation functions
- Validation schemas
- Error recovery
- Batch processing
```

**Potential Skill:** "etl-pipeline-patterns"

---

#### Pattern: Data Validation

**Indicators:**
- Implemented 3+ validation schemas
- Similar validation rules
- Common error messaging
- Repeated sanitization logic

**Example Session:**
```
Task 1: User input validation
Task 2: API payload validation
Task 3: File upload validation

Common elements:
- Schema definitions (Pydantic/Zod)
- Custom validators
- Error formatting
- Sanitization functions
```

**Potential Skill:** "data-validation-patterns"

---

### Category 5: Authentication & Authorization

#### Pattern: OAuth Provider Integration

**Indicators:**
- Integrated 3+ OAuth providers
- Similar callback handling
- Common token management
- Repeated user mapping

**Example Session:**
```
Task 1: GitHub OAuth integration
Task 2: Google OAuth integration
Task 3: Microsoft OAuth integration

Common elements:
- Provider registration
- Authorization URL generation
- Callback handler
- Token exchange
- User profile mapping
```

**Potential Skill:** "oauth-provider-integration"

---

#### Pattern: RBAC Implementation

**Indicators:**
- Implemented 3+ role-based access patterns
- Similar permission checking
- Common middleware patterns
- Repeated authorization logic

**Example Session:**
```
Task 1: Admin role permissions
Task 2: Editor role permissions
Task 3: Viewer role permissions

Common elements:
- Permission definitions
- Role hierarchies
- Authorization middleware
- Permission checking utilities
```

**Potential Skill:** "rbac-implementation-patterns"

---

### Category 6: Database Patterns

#### Pattern: Repository Pattern

**Indicators:**
- Created 3+ repository classes
- Similar CRUD operations
- Common query patterns
- Repeated transaction handling

**Example Session:**
```
Task 1: UserRepository with CRUD
Task 2: ProductRepository with CRUD
Task 3: OrderRepository with CRUD

Common elements:
- Base repository interface
- CRUD method implementations
- Transaction management
- Query builders
```

**Potential Skill:** "repository-pattern-implementation"

---

#### Pattern: Migration Management

**Indicators:**
- Created 3+ database migrations
- Similar migration structure
- Common rollback patterns
- Repeated data seeding

**Example Session:**
```
Task 1: User table migration
Task 2: Product table migration
Task 3: Order table migration

Common elements:
- Schema changes (up/down)
- Index creation
- Foreign key setup
- Data seeding
```

**Potential Skill:** "database-migration-patterns"

---

### Category 7: Frontend Component Patterns

#### Pattern: Form Component

**Indicators:**
- Created 3+ form components
- Similar validation handling
- Common state management
- Repeated submission logic

**Example Session:**
```
Task 1: User registration form
Task 2: Product creation form
Task 3: Order checkout form

Common elements:
- Form state management
- Validation with schemas
- Error display
- Submit handlers
- Loading states
```

**Potential Skill:** "react-form-patterns"

---

#### Pattern: Data Table Component

**Indicators:**
- Built 3+ data tables
- Similar sorting/filtering
- Common pagination
- Repeated action handlers

**Example Session:**
```
Task 1: Users table with CRUD
Task 2: Products table with CRUD
Task 3: Orders table with CRUD

Common elements:
- Column definitions
- Sorting/filtering logic
- Pagination controls
- Row actions
- Loading states
```

**Potential Skill:** "react-data-table-patterns"

---

## Detection Workflow

### Step 1: Scan Conversation

Review session transcript for repeated keywords:

**Keywords to watch:**
- "Create [X] for [Y]" × 3+
- "Implement [pattern]" × 3+
- "Add [feature] to [service]" × 3+
- "Build [type]" × 3+

### Step 2: Extract Common Elements

For detected repetitions, identify:

**Structure:**
- File organization patterns
- Code structure similarities
- Configuration patterns

**Logic:**
- Repeated algorithms
- Similar business rules
- Common validations

**Integration:**
- Same external services
- Similar API patterns
- Common data flows

### Step 3: Assess Generality

Ask:
- Would this apply to other codebases?
- Is the pattern industry-standard?
- Could others benefit?

If all yes → Good skill candidate

## False Positives to Avoid

### Similar But Not Identical

**Example:**
```
Task 1: REST API with JWT auth
Task 2: GraphQL API with session auth
Task 3: WebSocket server with API key auth

Similarity: All are APIs
Reality: Different enough to not warrant single skill
```

**Action:** Consider separate skills or more general "api-authentication" skill

---

### Codebase-Specific

**Example:**
```
Task 1: Update Chariot-specific Neo4j schema
Task 2: Modify Chariot-specific DynamoDB tables
Task 3: Change Chariot-specific Lambda config

Similarity: All database updates
Reality: Too specific to Chariot codebase
```

**Action:** Document in project wiki, not a skill

---

### Already Covered

**Example:**
```
Task 1: Write React component tests
Task 2: Write React hook tests
Task 3: Write React integration tests

Similarity: All React testing
Reality: Already covered by existing "react-testing" skill
```

**Action:** Review existing skill, propose updates if gaps found

---

## Pattern Confidence Levels

### High Confidence (Create Immediately)

- ✅ 5+ occurrences
- ✅ Identical structure with variable names only
- ✅ Clear industry pattern (OAuth, CRUD, etc.)
- ✅ Obvious reusability

**Example:** OAuth integration for 5 different providers

---

### Medium Confidence (Evaluate Carefully)

- ⚠️ 3-4 occurrences
- ⚠️ Similar but some variations
- ⚠️ Domain-specific but generalizable
- ⚠️ Potential overlap with existing skills

**Example:** Custom data validation patterns that could be part of broader validation skill

---

### Low Confidence (Document, Don't Create)

- ⚠️ Only 2 occurrences
- ⚠️ Significant variations between instances
- ⚠️ Highly codebase-specific
- ⚠️ Unclear broader applicability

**Example:** Two different approaches to same problem (still exploring best practice)

---

## Cross-Pattern Considerations

### Combining Multiple Patterns

Sometimes multiple smaller patterns should become one skill:

**Example:**
```
Pattern A: API authentication (3 occurrences)
Pattern B: API error handling (3 occurrences)
Pattern C: API rate limiting (3 occurrences)

Combined Skill: "api-best-practices"
```

### Splitting Large Patterns

Sometimes one pattern is too broad:

**Example:**
```
Pattern: Database operations (15 occurrences covering migrations, queries, optimization)

Split into:
- "database-migration-patterns"
- "database-query-optimization"
- "database-transaction-patterns"
```

---

## Pattern Maturity Stages

### Stage 1: Emerging Pattern (2 occurrences)
**Action:** Note pattern, watch for third occurrence

### Stage 2: Confirmed Pattern (3 occurrences)
**Action:** Evaluate for skill creation

### Stage 3: Established Pattern (5+ occurrences)
**Action:** Strong candidate, likely create

### Stage 4: Critical Pattern (10+ occurrences)
**Action:** Essential skill, prioritize creation
