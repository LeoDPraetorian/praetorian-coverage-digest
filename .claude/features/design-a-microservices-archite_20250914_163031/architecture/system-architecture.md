# Chariot Microservices System Architecture

## Executive Summary

This document outlines the transformation of Chariot's serverless Lambda architecture into a containerized microservices system. The design extracts 8 core microservices from 50+ Lambda functions, implementing zero-trust security, high performance (1000 RPS, <200ms), and comprehensive observability.

## Service Decomposition Strategy

### Domain-Driven Service Boundaries

The microservices are organized around business capabilities and data ownership patterns:

#### 1. **Account Management Service**
- **Responsibility**: User accounts, authentication, authorization, RBAC
- **Lambda Functions Consolidated**: 8+ auth-related functions
- **Data Ownership**: User profiles, roles, permissions, API keys
- **Key Patterns**: CQRS for user queries, Event Sourcing for audit trail

#### 2. **Asset Discovery Service** 
- **Responsibility**: External asset discovery, enumeration, classification
- **Lambda Functions Consolidated**: 12+ discovery and scanning functions
- **Data Ownership**: Discovered assets, scan schedules, discovery rules
- **Key Patterns**: Workflow orchestration, Async processing queues

#### 3. **Risk Assessment Service**
- **Responsibility**: Vulnerability management, risk scoring, prioritization
- **Lambda Functions Consolidated**: 10+ risk calculation and assessment functions
- **Data Ownership**: Vulnerabilities, risk scores, assessment rules
- **Key Patterns**: Real-time scoring, Event-driven updates

#### 4. **Capabilities Orchestration Service**
- **Responsibility**: Security tool management, execution, workflow coordination
- **Lambda Functions Consolidated**: 8+ capability and job management functions
- **Data Ownership**: Tool definitions, execution history, workflows
- **Key Patterns**: Saga pattern for long-running workflows

#### 5. **Integration Hub Service**
- **Responsibility**: Third-party integrations, data normalization, sync
- **Lambda Functions Consolidated**: 6+ integration functions (GitHub, Okta, etc.)
- **Data Ownership**: Integration configs, sync status, external mappings
- **Key Patterns**: Adapter pattern, Circuit breaker for external calls

#### 6. **Notification Engine Service**
- **Responsibility**: Alert management, notification routing, delivery
- **Lambda Functions Consolidated**: 4+ notification functions
- **Data Ownership**: Notification templates, delivery preferences, audit logs
- **Key Patterns**: Pub/Sub messaging, Template engine

#### 7. **Reporting & Analytics Service**
- **Responsibility**: Data aggregation, report generation, analytics
- **Lambda Functions Consolidated**: 5+ reporting functions
- **Data Ownership**: Report definitions, cached aggregations, analytics
- **Key Patterns**: CQRS read models, Data denormalization

#### 8. **Configuration Management Service**
- **Responsibility**: System configuration, feature flags, settings
- **Lambda Functions Consolidated**: 3+ configuration functions
- **Data Ownership**: System settings, feature flags, environment configs
- **Key Patterns**: Configuration as Code, Hot reloading

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│                    (React UI, CLI, Mobile)                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     API Gateway Layer                           │
│              (Kong/Istio Gateway + Rate Limiting)              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Service Mesh (Istio)                        │
│              (mTLS, Traffic Management, Observability)         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ Account   │   │   Asset   │   │   Risk    │
    │ Mgmt      │   │ Discovery │   │Assessment │
    │ Service   │   │ Service   │   │ Service   │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │Capabilities│   │Integration│   │Notification│
    │Orchestrator│   │Hub Service│   │  Engine   │
    │ Service   │   │           │   │ Service   │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐
    │Reporting &│   │Configuration│
    │Analytics  │   │Management  │
    │ Service   │   │ Service    │
    └───────────┘   └────────────┘
```

## API Gateway Patterns

### 1. **Gateway Aggregation Pattern**
```yaml
# Kong Gateway Configuration
services:
  - name: chariot-bff
    url: http://api-gateway:8080
    routes:
      - name: graphql-federation
        paths: ["/graphql"]
        strip_path: false
      - name: rest-aggregation
        paths: ["/api/v1/dashboard"]
        strip_path: false
```

### 2. **Backend for Frontend (BFF)**
- **Web BFF**: Optimized for React UI (data aggregation, caching)
- **CLI BFF**: Streaming responses, batch operations
- **Mobile BFF**: Lightweight payloads, offline support

### 3. **API Versioning Strategy**
```
/api/v1/           # Stable API with backwards compatibility
/api/v2/           # New features, breaking changes
/graphql/          # GraphQL federation layer
/internal/api/     # Service-to-service communication
```

### 4. **Rate Limiting & Quotas**
```yaml
# Per-service rate limits
account-service: 500 RPS
asset-discovery: 200 RPS (burst: 1000)
risk-assessment: 300 RPS
capabilities: 100 RPS (long-running operations)
```

## Service Discovery Mechanisms

### 1. **Service Registry Architecture**
```yaml
# Consul Service Registry
consul:
  datacenter: "chariot-platform"
  services:
    account-service:
      tags: ["auth", "user-mgmt", "v1.2.0"]
      health_check:
        http: "http://account-service:8080/health"
        interval: "10s"
        timeout: "3s"
```

### 2. **DNS-Based Discovery**
```
# Internal DNS Records
account-service.chariot.local    -> Load Balancer VIP
asset-discovery.chariot.local    -> Service Instances
risk-assessment.chariot.local    -> Auto-scaling Group
```

### 3. **Service Mesh Discovery (Istio)**
```yaml
# Istio ServiceEntry for external services
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-neo4j
spec:
  hosts:
  - neo4j.chariot.local
  ports:
  - number: 7687
    name: bolt
    protocol: TCP
```

## Inter-Service Communication Patterns

### 1. **Synchronous Communication**

#### RESTful APIs with Circuit Breakers
```go
// Resilient HTTP client pattern
type ServiceClient struct {
    client      *http.Client
    breaker     *CircuitBreaker
    retryPolicy *RetryPolicy
}

func (c *ServiceClient) CallService(ctx context.Context, req *Request) (*Response, error) {
    return c.breaker.Execute(func() (*Response, error) {
        return c.retryPolicy.Execute(func() (*Response, error) {
            return c.doRequest(ctx, req)
        })
    })
}
```

#### gRPC with Protobuf
```proto
// Inter-service contract
service AssetDiscoveryService {
  rpc DiscoverAssets(DiscoveryRequest) returns (stream Asset);
  rpc ValidateAsset(AssetValidationRequest) returns (ValidationResult);
  rpc GetAssetRelationships(AssetQuery) returns (RelationshipGraph);
}
```

### 2. **Asynchronous Communication**

#### Event-Driven Architecture
```yaml
# Event Bus Configuration (NATS/Apache Kafka)
events:
  asset.discovered:
    producers: [asset-discovery-service]
    consumers: [risk-assessment-service, notification-engine]
  
  risk.assessed:
    producers: [risk-assessment-service]
    consumers: [notification-engine, reporting-service]
  
  user.action:
    producers: [account-service]
    consumers: [audit-service, analytics-service]
```

#### Message Schema Registry
```json
{
  "asset.discovered": {
    "version": "1.2.0",
    "schema": {
      "assetId": "string",
      "accountId": "string", 
      "assetType": "enum",
      "discoveredAt": "timestamp",
      "metadata": "object"
    }
  }
}
```

### 3. **Data Consistency Patterns**

#### Saga Pattern for Distributed Transactions
```go
// Asset onboarding saga
type AssetOnboardingSaga struct {
    steps []SagaStep
}

func (s *AssetOnboardingSaga) Execute(ctx context.Context, asset *Asset) error {
    // Step 1: Create asset record
    if err := s.assetService.CreateAsset(ctx, asset); err != nil {
        return err
    }
    
    // Step 2: Perform initial risk assessment
    if err := s.riskService.AssessAsset(ctx, asset.ID); err != nil {
        s.assetService.DeleteAsset(ctx, asset.ID) // Compensate
        return err
    }
    
    // Step 3: Set up monitoring
    if err := s.monitoringService.CreateMonitor(ctx, asset.ID); err != nil {
        s.riskService.DeleteAssessment(ctx, asset.ID) // Compensate
        s.assetService.DeleteAsset(ctx, asset.ID)     // Compensate
        return err
    }
    
    return nil
}
```

#### Event Sourcing for Audit Trail
```go
// Event sourcing for critical operations
type AccountEvent struct {
    EventID     string    `json:"event_id"`
    AggregateID string    `json:"aggregate_id"`
    EventType   string    `json:"event_type"`
    EventData   json.RawMessage `json:"event_data"`
    Timestamp   time.Time `json:"timestamp"`
    Version     int       `json:"version"`
}

// Account aggregate
func (a *Account) Apply(event AccountEvent) error {
    switch event.EventType {
    case "account.created":
        return a.applyAccountCreated(event.EventData)
    case "role.assigned":
        return a.applyRoleAssigned(event.EventData)
    default:
        return fmt.Errorf("unknown event type: %s", event.EventType)
    }
}
```

## Transaction Management Approach

### 1. **Database-per-Service Pattern**
```yaml
# Data ownership boundaries
services:
  account-service:
    database: dynamodb-accounts
    tables: [users, roles, permissions, api_keys]
    
  asset-discovery-service:
    database: dynamodb-assets
    tables: [assets, discovery_jobs, scan_results]
    
  risk-assessment-service:
    database: dynamodb-risks
    tables: [vulnerabilities, risk_scores, assessments]
    
  # Shared graph database for relationships
  shared:
    neo4j: relationships, asset_graph, attack_paths
```

### 2. **Distributed Transaction Coordination**

#### Two-Phase Commit for Critical Operations
```go
// Distributed transaction coordinator
type TransactionCoordinator struct {
    participants []TransactionParticipant
    logger       Logger
}

func (tc *TransactionCoordinator) ExecuteTransaction(ctx context.Context, txn *DistributedTransaction) error {
    // Phase 1: Prepare
    for _, participant := range tc.participants {
        if err := participant.Prepare(ctx, txn); err != nil {
            tc.abortTransaction(ctx, txn)
            return err
        }
    }
    
    // Phase 2: Commit
    for _, participant := range tc.participants {
        if err := participant.Commit(ctx, txn); err != nil {
            tc.logger.Error("Failed to commit transaction", "error", err)
            // Handle partial commit scenario
        }
    }
    
    return nil
}
```

### 3. **Eventual Consistency with Compensation**
```go
// Compensation pattern for eventual consistency
type CompensationHandler struct {
    compensations map[string]CompensationAction
}

func (ch *CompensationHandler) RegisterCompensation(stepID string, action CompensationAction) {
    ch.compensations[stepID] = action
}

func (ch *CompensationHandler) Compensate(ctx context.Context, failedStep string) error {
    // Execute compensations in reverse order
    for stepID := failedStep; stepID != ""; stepID = ch.getPreviousStep(stepID) {
        if action, exists := ch.compensations[stepID]; exists {
            if err := action.Execute(ctx); err != nil {
                return fmt.Errorf("compensation failed for step %s: %w", stepID, err)
            }
        }
    }
    return nil
}
```

## Service Communication Architecture

### 1. **Service Mesh (Istio) Configuration**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: chariot-platform
spec:
  mtls:
    mode: STRICT

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: "*.chariot.local"
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
        consecutiveGatewayErrors: 5
        interval: 10s
        baseEjectionTime: 30s
```

### 2. **Load Balancing Strategies**
```yaml
# Service-specific load balancing
services:
  account-service:
    strategy: "round_robin"
    health_check: "/health"
    
  asset-discovery-service:
    strategy: "least_connections"  # For long-running scans
    health_check: "/health"
    
  risk-assessment-service:
    strategy: "weighted_response_time"  # CPU-intensive operations
    health_check: "/health"
```

### 3. **Retry and Timeout Policies**
```go
// Service-specific retry policies
var ServiceRetryPolicies = map[string]RetryPolicy{
    "account-service": {
        MaxRetries:    3,
        BaseDelay:     100 * time.Millisecond,
        MaxDelay:      2 * time.Second,
        BackoffFactor: 2.0,
        Jitter:        true,
    },
    "asset-discovery-service": {
        MaxRetries:    5,
        BaseDelay:     500 * time.Millisecond,
        MaxDelay:      30 * time.Second,
        BackoffFactor: 1.5,
        Jitter:        true,
    },
}
```

## Security Architecture

### 1. **Zero-Trust Network Model**
```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chariot-zero-trust
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: chariot-platform
    - podSelector:
        matchLabels:
          app: istio-proxy
```

### 2. **Service-to-Service Authentication**
```go
// JWT-based service authentication
type ServiceAuthenticator struct {
    publicKey  *rsa.PublicKey
    issuer     string
    audience   string
}

func (sa *ServiceAuthenticator) ValidateServiceToken(token string) (*ServiceClaims, error) {
    parsedToken, err := jwt.ParseWithClaims(token, &ServiceClaims{}, func(token *jwt.Token) (interface{}, error) {
        return sa.publicKey, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    claims := parsedToken.Claims.(*ServiceClaims)
    if !sa.validateClaims(claims) {
        return nil, errors.New("invalid service claims")
    }
    
    return claims, nil
}
```

### 3. **API Security Layers**
```yaml
# Kong security plugins
plugins:
  - name: jwt
    config:
      uri_param_names: ["access_token"]
      header_names: ["Authorization"]
      
  - name: rate-limiting
    config:
      minute: 1000
      policy: cluster
      
  - name: request-size-limiting
    config:
      allowed_payload_size: 1048576  # 1MB
      
  - name: cors
    config:
      origins: ["https://app.chariot.com"]
      methods: ["GET", "POST", "PUT", "DELETE"]
```

## Data Architecture

### 1. **Database Partitioning Strategy**
```go
// Account-based data partitioning
func (db *DatabasePartitioner) GetPartition(accountID string) string {
    hash := sha256.Sum256([]byte(accountID))
    partitionNum := binary.BigEndian.Uint32(hash[:4]) % db.numPartitions
    return fmt.Sprintf("partition_%d", partitionNum)
}

// Service-specific data isolation
type DataAccessLayer struct {
    accountService  *AccountDatabase
    assetService    *AssetDatabase
    riskService     *RiskDatabase
    sharedGraphDB   *Neo4jDatabase
}
```

### 2. **Data Consistency Patterns**
```go
// Read-through cache pattern
type CacheableRepository struct {
    primary    Repository
    cache      Cache
    ttl        time.Duration
}

func (cr *CacheableRepository) Get(ctx context.Context, id string) (*Entity, error) {
    // Check cache first
    if entity, err := cr.cache.Get(ctx, id); err == nil {
        return entity, nil
    }
    
    // Fallback to primary database
    entity, err := cr.primary.Get(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Update cache
    cr.cache.Set(ctx, id, entity, cr.ttl)
    return entity, nil
}
```

### 3. **Cross-Service Data Synchronization**
```go
// Event-driven data synchronization
type DataSynchronizer struct {
    eventBus    EventBus
    projections map[string]ProjectionHandler
}

func (ds *DataSynchronizer) HandleEvent(ctx context.Context, event Event) error {
    for projectionName, handler := range ds.projections {
        if handler.CanHandle(event.Type) {
            if err := handler.Project(ctx, event); err != nil {
                log.Errorf("Failed to project event %s to %s: %v", 
                    event.Type, projectionName, err)
            }
        }
    }
    return nil
}
```

## Observability and Monitoring

### 1. **Distributed Tracing**
```go
// OpenTelemetry tracing
func (s *Service) ProcessRequest(ctx context.Context, req *Request) (*Response, error) {
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("service.name", "account-service"),
        attribute.String("request.id", req.ID),
        attribute.String("account.id", req.AccountID),
    )
    
    defer span.End()
    
    // Create child span for database operation
    dbCtx, dbSpan := tracer.Start(ctx, "database.query")
    defer dbSpan.End()
    
    result, err := s.repository.Get(dbCtx, req.ID)
    if err != nil {
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    
    return &Response{Data: result}, nil
}
```

### 2. **Metrics Collection**
```go
// Prometheus metrics
var (
    requestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
            Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
        },
        []string{"service", "method", "endpoint", "status_code"},
    )
    
    activeConnections = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "active_connections_total",
            Help: "Number of active connections per service",
        },
        []string{"service", "connection_type"},
    )
)
```

### 3. **Structured Logging**
```go
// Structured logging with correlation IDs
type Logger struct {
    logger *slog.Logger
}

func (l *Logger) InfoWithContext(ctx context.Context, msg string, args ...interface{}) {
    correlationID := GetCorrelationID(ctx)
    traceID := GetTraceID(ctx)
    
    l.logger.InfoContext(ctx, msg,
        slog.String("correlation_id", correlationID),
        slog.String("trace_id", traceID),
        slog.Any("args", args),
    )
}
```

## Deployment Strategy

### 1. **Container Orchestration (Kubernetes)**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: account-service
  labels:
    app: account-service
    version: v1.2.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: account-service
  template:
    metadata:
      labels:
        app: account-service
        version: v1.2.0
    spec:
      containers:
      - name: account-service
        image: chariot/account-service:v1.2.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. **Auto-scaling Configuration**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: account-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: account-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: active_connections
      target:
        type: AverageValue
        averageValue: "100"
```

## Migration Strategy

### 1. **Strangler Fig Pattern**
```
Phase 1: Extract Account Management Service
- Migrate authentication/authorization functions
- Implement service contracts
- Deploy alongside Lambda functions

Phase 2: Extract Asset Discovery Service  
- Migrate scanning and discovery functions
- Implement event-driven communication
- Maintain dual writes to old/new systems

Phase 3: Extract Risk Assessment Service
- Migrate vulnerability management
- Implement saga patterns for consistency
- Cut over read traffic gradually

Phase 4-8: Continue extraction pattern
- One service at a time
- Maintain backwards compatibility
- Monitor performance and reliability
```

### 2. **Data Migration Approach**
```go
// Dual-write pattern during migration
type MigrationRepository struct {
    legacyRepo Repository
    newRepo    Repository
    migrationPercent int
}

func (mr *MigrationRepository) Create(ctx context.Context, entity *Entity) error {
    // Always write to legacy system
    if err := mr.legacyRepo.Create(ctx, entity); err != nil {
        return err
    }
    
    // Gradually write to new system
    if mr.shouldMigrate() {
        if err := mr.newRepo.Create(ctx, entity); err != nil {
            log.Warnf("Failed to write to new system: %v", err)
            // Don't fail the request for migration issues
        }
    }
    
    return nil
}
```

## Performance Considerations

### 1. **Service Performance Targets**
```yaml
performance_sla:
  account-service:
    target_rps: 1000
    p95_latency: 100ms
    availability: 99.9%
    
  asset-discovery-service:
    target_rps: 200
    p95_latency: 500ms  # Longer for complex scans
    availability: 99.5%
    
  risk-assessment-service:
    target_rps: 300
    p95_latency: 200ms
    availability: 99.9%
```

### 2. **Caching Strategy**
```go
// Multi-level caching
type CachingService struct {
    l1Cache     *sync.Map        // In-memory cache
    l2Cache     *RedisCache      // Distributed cache
    database    Repository       // Source of truth
}

func (cs *CachingService) Get(ctx context.Context, key string) (*Entity, error) {
    // L1 cache (in-memory)
    if value, ok := cs.l1Cache.Load(key); ok {
        return value.(*Entity), nil
    }
    
    // L2 cache (Redis)
    if entity, err := cs.l2Cache.Get(ctx, key); err == nil {
        cs.l1Cache.Store(key, entity)
        return entity, nil
    }
    
    // Database fallback
    entity, err := cs.database.Get(ctx, key)
    if err != nil {
        return nil, err
    }
    
    // Populate caches
    cs.l2Cache.Set(ctx, key, entity, 5*time.Minute)
    cs.l1Cache.Store(key, entity)
    
    return entity, nil
}
```

## Conclusion

This microservices architecture transforms Chariot's serverless Lambda functions into a resilient, scalable, and secure distributed system. The design prioritizes:

1. **Clear service boundaries** based on business capabilities and data ownership
2. **Zero-trust security** with mTLS and comprehensive authentication
3. **High performance** through caching, connection pooling, and auto-scaling
4. **Operational excellence** with observability, monitoring, and fault tolerance
5. **Gradual migration** using proven patterns like Strangler Fig

The architecture supports the demanding requirements of 1000 RPS per service with sub-200ms response times while maintaining the security and reliability standards expected of a cybersecurity platform.

Key success metrics will be monitored throughout implementation:
- Service response times and throughput
- Inter-service communication latency
- Data consistency and transaction success rates
- System availability and fault recovery
- Security compliance and audit requirements

This design provides a solid foundation for Chariot's evolution into a modern, microservices-based security platform.