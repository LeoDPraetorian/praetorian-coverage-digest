# Chariot Development Platform - Technology Stack Reference

## Programming Languages & Versions

### Backend Services

- **Go 1.24.6**: Primary backend language (chariot, aegiscli, janus, nebula, tabularium)
  - Strong concurrency patterns with goroutines
  - Interface-based design for extensibility
  - Comprehensive error handling with context propagation

### Frontend Applications

- **TypeScript 5.x**: Primary frontend language
- **React 19.1.1**: UI framework for chariot and chariot-ui-components
- **Node.js 20.x**: Runtime for frontend tooling and Claude Flow

### Scripting & Tooling

- **Python 3.10+**: CLI tools and SDK (praetorian-cli)
- **VQL (Velociraptor Query Language)**: Security capability definitions
- **Bash/Shell**: Infrastructure automation and deployment scripts
- **YAML**: Configuration and CloudFormation/SAM templates

## Core Frameworks & Libraries

### Backend (Go)

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

### Frontend (React/TypeScript)

```json
// Core React Ecosystem
"react": "^19.1.1"
"react-dom": "^19.1.1"
"react-router": "^7.8.2"

// UI Component Libraries
"@headlessui/react": "^2.2.7"
"@heroicons/react": "^2.2.0"
"lucide-react": "^0.543.0"
"framer-motion": "^12.23.12"
"clsx": "^2.1.1"
"tailwind-merge": "^3.3.1"

// Data Visualization
"recharts": "^3.2.0"
"@xyflow/react": "^12.8.4"
"@react-sigma/core": "^5.0.4"
"react-simple-maps": "^3.0.0"
"@nivo/line": "^0.99.0"

// State & Data Management
"@tanstack/react-query": "^5.87.1"
"@tanstack/react-virtual": "^3.13.12"
"aws-amplify": "^6.15.5"
"axios": "^1.11.0"
"use-debounce": "^10.0.6"

// Build Tools
"vite": "^7.1.5"
"tailwindcss": "^4.1.13"
"@tailwindcss/postcss": "^4.1.13"
"typescript": "^5.9.2"

// Additional UI Libraries
"sonner": "^2.0.7"
"react-resizable-panels": "^3.0.5"
"react-dropzone": "^14.3.8"
"react-grid-layout": "^1.5.2"
```

### Python (CLI/SDK)

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

## Database & Storage Systems

### Primary Data Stores

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

### Caching & Queuing

- **ElastiCache (Redis)**: Session management and distributed locking
- **SQS**: Job queuing with priority lanes
  - Standard queues for bulk operations
  - Priority queues for time-sensitive tasks
  - Static queues for deterministic processing
- **Kinesis**: Real-time event streaming for results

## Infrastructure & Deployment

### AWS Services Architecture

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

### Containerization & Orchestration

- **Docker**: Service containerization
- **Docker Compose**: Local development environment
- **AWS Fargate**: Serverless container execution
- **Custom orchestration** via Janus framework

## Testing Frameworks

### Frontend Testing

- **Playwright 1.49**: E2E testing with page object model and AI test generation
- **Jest**: Unit testing with React Testing Library
- **Storybook 9.1.5**: Component documentation and testing
- **OpenAI 4.96**: AI-powered test generation and enhancement
- **Coverage Tools**: Built-in coverage reporting

### Backend Testing

- **Go testing package**: Standard unit tests
- **testify**: Assertions and mocking
- **Integration tests**: AWS service mocking
- **E2E tests**: Full stack testing with real services
- **AI Test Generation**: Automated E2E test creation for UI changes
- **AWS Integration Testing**: CloudFormation and Lambda testing with real services

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

## Platform-Specific Domain Models

### Chariot Core Entities

```go
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

## Development Standards

### File Naming Conventions

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
