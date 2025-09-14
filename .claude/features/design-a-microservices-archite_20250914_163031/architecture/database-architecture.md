# Database Architecture for Microservices Platform

## Executive Summary

This document outlines the database architecture transformation from Chariot's current serverless single-table DynamoDB design to a microservices-based, polyglot persistence architecture. The design maintains the existing attack surface management domain model while introducing service boundaries, data isolation, and event-driven consistency patterns.

## Current State Analysis

### Existing Single-Table DynamoDB Design

The current Chariot platform uses a single-table DynamoDB design with the following characteristics:

```go
// Current unified entity structure
type Entity struct {
    Username string                    // Partition key prefix: user context
    Key      string                    // Sort key: entity identifier  
    Type     string                    // Entity type discriminator
    Data     map[string]interface{}    // Polymorphic entity data
}

// Key examples from current system:
// Assets:    "user@example.com" | "#asset#dns#example.com"
// Risks:     "user@example.com" | "#risk#example.com#CVE-2023-12345"  
// Jobs:      "user@example.com" | "#job#example.com#asset#portscan"
// Seeds:     "user@example.com" | "#seed#dns#example.com"
```

### Core Entities Analysis

Based on tabularium models, the system manages these primary entities:

- **Assets** (`BaseAsset`): External-facing resources with attack surface metadata
- **Risks** (`Risk`): Security vulnerabilities linked to assets
- **Jobs** (`Job`): Asynchronous capability execution tasks
- **Capabilities** (`Capability`): Security tools and scanning frameworks
- **Seeds** (`Seed`): Discovery starting points and scope definitions
- **Integrations** (`Integration`): Third-party service connections
- **Accounts** (`Account`): User account and organization data

### Graph Database Integration (Neo4j)

Current Neo4j usage focuses on relationship mapping:

```cypher
// Existing relationship patterns
(Asset)-[:HAS_VULNERABILITY]->(Risk)
(Asset)-[:DISCOVERED_BY]->(Capability) 
(Asset)-[:BELONGS_TO]->(Account)
(Asset)-[:SPAWNED_FROM]->(Seed)
(Job)-[:TARGETS]->(Asset)
(Risk)-[:AFFECTS]->(Asset)
```

## Microservices Database Architecture

### Service Decomposition Strategy

Based on domain boundaries and data access patterns, we decompose into 8-10 microservices:

#### 1. Account Management Service
- **Database**: Dedicated DynamoDB table + PostgreSQL for complex queries
- **Entities**: Account, User, Organization, Settings, Permissions
- **Access Patterns**: User authentication, organization management, RBAC
- **Neo4j Usage**: Organization hierarchies, user relationships

#### 2. Asset Discovery Service  
- **Database**: DynamoDB + S3 (for large scan results)
- **Entities**: Asset, Seed, Discovery Jobs, Asset Metadata
- **Access Patterns**: Asset enumeration, discovery scheduling, scope management
- **Neo4j Usage**: Asset relationships, discovery provenance

#### 3. Risk Assessment Service
- **Database**: DynamoDB + Neo4j
- **Entities**: Risk, Vulnerability, Threat, Risk Score
- **Access Patterns**: Risk calculation, vulnerability tracking, threat modeling
- **Neo4j Usage**: Attack path analysis, risk relationships

#### 4. Capability Orchestration Service
- **Database**: DynamoDB + Redis (for job queuing)
- **Entities**: Capability, Job, Execution Context, Queue Management
- **Access Patterns**: Job scheduling, capability management, result processing
- **Neo4j Usage**: Capability dependencies, execution workflows

#### 5. Integration Management Service
- **Database**: DynamoDB + Vault (for secrets)
- **Entities**: Integration, Credential, API Configuration, Sync Status
- **Access Patterns**: Third-party connections, credential management, sync operations
- **Neo4j Usage**: Integration relationships, data flow mapping

#### 6. Notification Service
- **Database**: DynamoDB + Redis (for real-time)
- **Entities**: Notification, Alert, Subscription, Delivery Status
- **Access Patterns**: Alert generation, notification delivery, subscription management
- **Neo4j Usage**: Notification routing, stakeholder relationships

#### 7. Reporting Service
- **Database**: PostgreSQL (for complex analytics) + S3 (for reports)
- **Entities**: Report, Dashboard, Analytics, Export
- **Access Patterns**: Report generation, dashboard queries, data export
- **Neo4j Usage**: Relationship analytics, graph-based insights

#### 8. Configuration Service
- **Database**: DynamoDB + Redis (for caching)
- **Entities**: Configuration, Feature Flags, System Settings, Preferences
- **Access Patterns**: Configuration retrieval, feature flag management
- **Neo4j Usage**: Configuration dependencies, impact analysis

## Database Per Service Patterns

### Pattern 1: DynamoDB Single-Table per Service

Each service maintains its own single-table design optimized for its access patterns:

```go
// Asset Discovery Service Table Structure
type AssetServiceEntity struct {
    PK   string // "ACCOUNT#{accountId}" or "SEED#{seedId}" 
    SK   string // "ASSET#{assetKey}" or "METADATA#{type}"
    Type string // "Asset", "Seed", "Discovery", "Metadata"
    Data interface{} // Service-specific entity data
    GSI1PK string // "ASSET_TYPE#{type}" for cross-cutting queries
    GSI1SK string // "CREATED#{timestamp}" for time-based access
    GSI2PK string // "STATUS#{status}" for status-based queries  
    GSI2SK string // "PRIORITY#{score}" for priority ordering
}

// Risk Assessment Service Table Structure  
type RiskServiceEntity struct {
    PK   string // "ACCOUNT#{accountId}" or "ASSET#{assetId}"
    SK   string // "RISK#{riskId}" or "VULN#{vulnId}"
    Type string // "Risk", "Vulnerability", "Threat", "Score"
    Data interface{} // Risk-specific entity data
    GSI1PK string // "SEVERITY#{level}" for severity grouping
    GSI1SK string // "UPDATED#{timestamp}" for temporal queries
    GSI2PK string // "STATUS#{status}" for workflow management
    GSI2SK string // "PRIORITY#{score}" for risk prioritization
}
```

### Pattern 2: Polyglot Persistence

Services use optimal database technologies for their specific requirements:

```yaml
# Service Database Mapping
Account Management: 
  Primary: PostgreSQL (ACID transactions, complex queries)
  Cache: Redis (session management, permissions)
  
Asset Discovery:
  Primary: DynamoDB (scale, performance)
  Storage: S3 (large scan results, artifacts)
  Cache: Redis (active discovery state)

Risk Assessment:
  Primary: DynamoDB (operational data)
  Analytics: Neo4j (relationship analysis)
  Cache: Redis (risk scores, calculations)

Capability Orchestration:
  Primary: DynamoDB (job state)  
  Queue: Redis/SQS (job execution)
  Storage: S3 (execution artifacts)

Integration Management:
  Primary: DynamoDB (integration config)
  Secrets: AWS Secrets Manager/Vault
  Cache: Redis (API rate limits, tokens)

Notification:
  Primary: DynamoDB (notification log)
  Real-time: Redis (active subscriptions)
  Queue: SQS (delivery retry)

Reporting:
  Primary: PostgreSQL (complex analytics)
  Storage: S3 (generated reports)
  Cache: Redis (dashboard data)

Configuration:
  Primary: DynamoDB (configuration data)
  Cache: Redis (active configurations)
```

### Pattern 3: Data Isolation and Ownership

Each service owns its data and provides controlled access through APIs:

```go
// Service Data Ownership Matrix
type ServiceDataOwnership struct {
    AccountService: []string{
        "accounts", "users", "organizations", 
        "permissions", "settings", "billing"
    },
    AssetService: []string{
        "assets", "seeds", "discovery_jobs",
        "asset_metadata", "discovery_results"  
    },
    RiskService: []string{
        "risks", "vulnerabilities", "threats",
        "risk_scores", "remediation", "compliance"
    },
    CapabilityService: []string{
        "capabilities", "jobs", "executions",
        "queues", "results", "artifacts"
    },
    IntegrationService: []string{
        "integrations", "credentials", "configs",
        "sync_status", "api_limits", "webhooks"
    }
}
```

## Data Model Decomposition Strategy

### Phase 1: Vertical Partitioning by Domain

Decompose the current unified model by domain boundaries:

```go
// Before: Unified BaseAsset with everything
type BaseAsset struct {
    // Core asset data
    Key, Username, Status, Created, Visited string
    // Discovery metadata  
    Origin, Source, TTL int64
    // Security metadata
    Metadata Metadata
    // ML and history data
    MLProperties, History
}

// After: Decomposed by service responsibility

// Asset Discovery Service
type DiscoveredAsset struct {
    Key, Username, Identifier, Group, Class string
    Status, Created, Visited, Origin, Source string
    TTL int64
    DiscoveryMetadata AssetDiscoveryMeta
}

// Risk Assessment Service  
type AssetRiskProfile struct {
    AssetKey, Username string
    Vulnerabilities []Vulnerability
    ThreatLevel, RiskScore int
    SecurityMetadata AssetSecurityMeta
}

// Configuration Service
type AssetConfiguration struct {
    AssetKey, Username string
    MonitoringConfig, ScanningConfig interface{}
    Preferences, Settings interface{}
}
```

### Phase 2: Horizontal Partitioning by Tenant

Partition data by account/organization for isolation:

```go
// Tenant-based partitioning strategy
type TenantPartitioning struct {
    PartitionKey string // "TENANT#{accountId}" 
    ShardKey     string // Hash(entityId) for even distribution
    Region       string // Geographic data residency
    Environment  string // dev/staging/prod isolation
}

// Each service implements tenant isolation
type AssetService struct {
    GetAssetsByAccount(accountId string) []Asset
    GetAssetsByOrganization(orgId string) []Asset  
    GetAssetsByRegion(region string) []Asset
}
```

### Phase 3: Relationship Extraction

Extract relationships from embedded data to explicit graph structures:

```go
// Before: Embedded relationships in metadata
type AssetMetadata struct {
    Capability     []string // Embedded capability list
    AttackSurface  []string // Embedded surface types
    Dependencies   []string // Embedded dependency list
}

// After: Explicit relationship entities
type AssetCapabilityRelationship struct {
    AssetKey      string
    CapabilityKey string
    Relationship  string // "discovered_by", "monitored_by"
    Created       time.Time
    Properties    map[string]interface{}
}

type AssetDependencyRelationship struct {
    ParentAssetKey string
    ChildAssetKey  string
    DependencyType string // "dns_points_to", "subdomain_of"
    Strength       float64
    Verified       bool
}
```

## Neo4j Graph Database Integration

### Graph Schema Design

Design Neo4j schema to complement operational databases:

```cypher
// Node Labels by Service Domain
CREATE CONSTRAINT account_key FOR (n:Account) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT asset_key FOR (n:Asset) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT risk_key FOR (n:Risk) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT capability_key FOR (n:Capability) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT job_key FOR (n:Job) REQUIRE n.key IS UNIQUE;

// Relationship Types by Domain  
(:Account)-[:OWNS]->(:Asset)
(:Account)-[:HAS_PERMISSION]->(:Resource)
(:Asset)-[:HAS_VULNERABILITY]->(:Risk)
(:Asset)-[:DISCOVERED_BY]->(:Capability)
(:Asset)-[:DEPENDS_ON]->(:Asset)
(:Asset)-[:EXPOSES]->(:Service) 
(:Risk)-[:EXPLOITS]->(:Asset)
(:Risk)-[:MITIGATED_BY]->(:Control)
(:Job)-[:TARGETS]->(:Asset)
(:Job)-[:USES]->(:Capability)
(:Capability)-[:PRODUCES]->(:Result)
```

### Graph Data Synchronization

Implement event-driven synchronization between operational databases and Neo4j:

```go
// Event-driven graph synchronization
type GraphSyncEvent struct {
    EventType   string // "CREATED", "UPDATED", "DELETED", "RELATIONSHIP_CHANGED"
    ServiceName string // Source service
    EntityType  string // "Asset", "Risk", "Job", etc.
    EntityKey   string // Unique entity identifier
    Changes     map[string]interface{} // Changed properties
    Timestamp   time.Time
}

// Graph synchronization service
type GraphSyncService struct {
    neo4jDriver   neo4j.Driver
    eventBus      EventBus
    transformers  map[string]GraphTransformer
}

func (s *GraphSyncService) HandleEntityEvent(event GraphSyncEvent) error {
    transformer := s.transformers[event.ServiceName]
    
    switch event.EventType {
    case "CREATED":
        return s.createNodeWithRelationships(transformer.Transform(event))
    case "UPDATED":
        return s.updateNodeProperties(event.EntityKey, event.Changes)
    case "DELETED":
        return s.deleteNodeAndRelationships(event.EntityKey)
    case "RELATIONSHIP_CHANGED":
        return s.updateRelationships(event.EntityKey, event.Changes)
    }
    return nil
}
```

### Cross-Service Graph Queries

Implement graph queries that span multiple services:

```cypher
-- Attack Path Analysis (spans Asset + Risk + Capability services)
MATCH path = (attacker:ExternalActor)-[:CAN_EXPLOIT]->(vuln:Risk)
             -[:AFFECTS]->(asset:Asset)
             -[:CONNECTS_TO*]->(critical:Asset {criticality: "HIGH"})
WHERE vuln.exploitability > 7.0 
  AND asset.exposureLevel = "PUBLIC"
RETURN path, length(path) as attack_steps
ORDER BY attack_steps ASC
LIMIT 10;

-- Capability Impact Analysis (spans Asset + Capability + Job services)  
MATCH (cap:Capability {name: "portscan"})
      -[:DISCOVERED*]->(asset:Asset)
      -[:HAS_VULNERABILITY]->(risk:Risk)
WHERE risk.severity >= 8.0
RETURN cap.name, 
       count(DISTINCT asset) as assets_discovered,
       count(DISTINCT risk) as high_risks_found,
       avg(risk.severity) as avg_risk_severity;

-- Organizational Asset Mapping (spans Account + Asset + Integration services)
MATCH (org:Account {type: "organization"})
      -[:OWNS]->(asset:Asset)
      -[:MONITORED_BY]->(integration:Integration)
RETURN org.name, 
       collect(DISTINCT asset.class) as asset_types,
       collect(DISTINCT integration.provider) as integrations
ORDER BY org.name;
```

## Event Sourcing and CQRS Patterns

### Event Store Design

Implement event sourcing for audit trails and data synchronization:

```go
// Event store schema
type Event struct {
    EventID       string    `json:"event_id"`
    AggregateID   string    `json:"aggregate_id"`
    AggregateType string    `json:"aggregate_type"`
    EventType     string    `json:"event_type"`
    EventVersion  int       `json:"event_version"`
    EventData     []byte    `json:"event_data"`
    Metadata      []byte    `json:"metadata"`
    Timestamp     time.Time `json:"timestamp"`
    ServiceName   string    `json:"service_name"`
}

// Service-specific event types
type AssetEvents struct {
    AssetDiscovered   AssetDiscoveredEvent
    AssetUpdated      AssetUpdatedEvent
    AssetDeleted      AssetDeletedEvent
    AssetScanned      AssetScannedEvent
    AssetReclassified AssetReclassifiedEvent
}

type RiskEvents struct {
    RiskCreated     RiskCreatedEvent
    RiskAssessed    RiskAssessedEvent
    RiskMitigated   RiskMitigatedEvent
    RiskEscalated   RiskEscalatedEvent
    RiskResolved    RiskResolvedEvent
}

type JobEvents struct {
    JobScheduled    JobScheduledEvent
    JobStarted      JobStartedEvent
    JobCompleted    JobCompletedEvent
    JobFailed       JobFailedEvent
    JobRetried      JobRetriedEvent
}
```

### CQRS Implementation

Separate read and write models for optimal performance:

```go
// Command side - write operations
type AssetCommandService struct {
    eventStore    EventStore
    commandBus    CommandBus
    validators    []CommandValidator
}

type DiscoverAssetCommand struct {
    AssetKey    string
    SeedKey     string
    Capability  string
    Metadata    AssetMetadata
    RequestedBy string
}

func (s *AssetCommandService) DiscoverAsset(cmd DiscoverAssetCommand) error {
    // Validate command
    if err := s.validateCommand(cmd); err != nil {
        return err
    }
    
    // Create events
    events := []Event{
        AssetDiscoveredEvent{
            AssetKey: cmd.AssetKey,
            SeedKey:  cmd.SeedKey,
            // ... other fields
        },
        AssetRelationshipCreatedEvent{
            FromKey: cmd.SeedKey,
            ToKey:   cmd.AssetKey,
            Type:    "DISCOVERED_FROM",
        },
    }
    
    // Persist events
    return s.eventStore.SaveEvents(cmd.AssetKey, events)
}

// Query side - read models
type AssetQueryService struct {
    readDatabase  Database
    projections   []EventProjection
}

type AssetListProjection struct {
    AccountID    string
    Assets       []AssetSummary
    LastUpdated  time.Time
    Version      int
}

func (s *AssetQueryService) GetAssetsByAccount(accountId string) ([]AssetSummary, error) {
    projection := s.getProjection("asset_list", accountId)
    return projection.Assets, nil
}

// Event handlers update projections
func (h *AssetProjectionHandler) HandleAssetDiscovered(event AssetDiscoveredEvent) error {
    projection := h.getAssetListProjection(event.AccountID)
    projection.Assets = append(projection.Assets, AssetSummary{
        Key:     event.AssetKey,
        Type:    event.AssetType,
        Status:  event.Status,
        Created: event.Timestamp,
    })
    return h.saveProjection(projection)
}
```

### Event-Driven Architecture

Implement pub/sub for cross-service coordination:

```go
// Event bus implementation
type EventBus struct {
    publishers  map[string]EventPublisher
    subscribers map[string][]EventSubscriber
    middleware  []EventMiddleware
}

// Cross-service event coordination
type CrossServiceEvents struct {
    // Asset service publishes, Risk service subscribes
    AssetDiscovered: EventTopic{
        Publishers:  []string{"asset-service"},
        Subscribers: []string{"risk-service", "notification-service"},
    },
    
    // Risk service publishes, Notification service subscribes  
    HighRiskDetected: EventTopic{
        Publishers:  []string{"risk-service"},
        Subscribers: []string{"notification-service", "integration-service"},
    },
    
    // Job service publishes, Asset/Risk services subscribe
    JobCompleted: EventTopic{
        Publishers:  []string{"capability-service"},
        Subscribers: []string{"asset-service", "risk-service", "reporting-service"},
    },
}
```

## Data Consistency Patterns

### Eventual Consistency Model

Implement eventual consistency with compensation patterns:

```go
// Saga pattern for distributed transactions
type AssetDiscoverySaga struct {
    sagaID      string
    state       SagaState
    steps       []SagaStep
    compensations []CompensationStep
}

type AssetDiscoverySagaSteps struct {
    CreateAsset: SagaStep{
        Service: "asset-service",
        Command: "CreateAsset",
        Compensation: "DeleteAsset",
    },
    CreateGraphNode: SagaStep{
        Service: "graph-service", 
        Command: "CreateNode",
        Compensation: "DeleteNode",
    },
    ScheduleRiskAssessment: SagaStep{
        Service: "risk-service",
        Command: "ScheduleAssessment", 
        Compensation: "CancelAssessment",
    },
    SendNotification: SagaStep{
        Service: "notification-service",
        Command: "SendNotification",
        Compensation: "None", // No compensation needed
    },
}

// Distributed transaction coordinator
type SagaOrchestrator struct {
    eventStore  EventStore
    commandBus  CommandBus
    retryPolicy RetryPolicy
}

func (o *SagaOrchestrator) ExecuteSaga(saga *AssetDiscoverySaga) error {
    for _, step := range saga.steps {
        err := o.executeStep(step)
        if err != nil {
            return o.compensatePreviousSteps(saga, step)
        }
    }
    return nil
}
```

### Transaction Boundaries

Define clear transaction boundaries per service:

```go
// Service transaction boundaries
type ServiceTransactionBoundaries struct {
    AssetService: TransactionBoundary{
        Scope: "Single asset and its immediate relationships",
        Operations: []string{
            "CreateAsset", "UpdateAsset", "DeleteAsset",
            "CreateAssetRelationship", "UpdateAssetStatus",
        },
        Guarantees: "Strong consistency within asset aggregate",
    },
    
    RiskService: TransactionBoundary{
        Scope: "Risk assessment and scoring for single asset",
        Operations: []string{
            "CreateRisk", "UpdateRiskScore", "AssignRisk", 
            "MitigateRisk", "EscalateRisk",
        },
        Guarantees: "Strong consistency within risk aggregate",
    },
    
    CapabilityService: TransactionBoundary{
        Scope: "Job execution lifecycle", 
        Operations: []string{
            "ScheduleJob", "StartJob", "UpdateJobStatus",
            "CompleteJob", "FailJob", "RetryJob",
        },
        Guarantees: "Strong consistency within job aggregate",
    },
}
```

### Conflict Resolution

Implement conflict resolution for concurrent updates:

```go
// Optimistic concurrency control
type OptimisticUpdate struct {
    EntityKey     string
    ExpectedVersion int
    Updates       map[string]interface{}
    UpdatedBy     string
    Timestamp     time.Time
}

func (s *AssetService) UpdateAsset(update OptimisticUpdate) error {
    current, err := s.getAsset(update.EntityKey)
    if err != nil {
        return err
    }
    
    if current.Version != update.ExpectedVersion {
        return ConflictError{
            Message: "Version mismatch - entity was updated by another process",
            CurrentVersion: current.Version,
            ExpectedVersion: update.ExpectedVersion,
        }
    }
    
    return s.applyUpdate(update)
}

// Vector clocks for distributed consistency
type VectorClock map[string]int

type DistributedEntity struct {
    EntityKey    string
    Data         interface{}
    VectorClock  VectorClock
    LastModified map[string]time.Time
}

func (e *DistributedEntity) IsConcurrentWith(other *DistributedEntity) bool {
    return !e.VectorClock.IsBefore(other.VectorClock) && 
           !other.VectorClock.IsBefore(e.VectorClock)
}
```

## Data Migration Approach

### Migration Strategy

Implement strangler fig pattern for gradual migration:

```go
// Phase 1: Data replication setup
type DataMigrationPhases struct {
    Phase1_Replication: MigrationPhase{
        Description: "Set up dual-write to existing and new databases",
        Duration: "2-3 weeks",
        RiskLevel: "Low",
        Rollback: "Stop dual-write, continue with existing system",
        Services: []string{"asset-service", "risk-service"},
    },
    
    Phase2_ReadValidation: MigrationPhase{
        Description: "Validate data consistency between old and new systems",
        Duration: "2-3 weeks", 
        RiskLevel: "Low",
        Rollback: "Continue dual-write validation",
        Services: []string{"asset-service", "risk-service", "capability-service"},
    },
    
    Phase3_GradualCutover: MigrationPhase{
        Description: "Gradually route read traffic to new services",
        Duration: "4-6 weeks",
        RiskLevel: "Medium", 
        Rollback: "Route traffic back to legacy system",
        Services: []string{"All services"},
    },
    
    Phase4_LegacyDecommission: MigrationPhase{
        Description: "Remove legacy database and cleanup",
        Duration: "2 weeks",
        RiskLevel: "Low",
        Rollback: "Not applicable",
        Services: []string{"Infrastructure"},
    },
}
```

### Migration Tools

Implement migration tooling for data transformation:

```go
// Data migration service
type DataMigrationService struct {
    sourceDB      Database
    targetDBs     map[string]Database
    transformer   DataTransformer
    validator     DataValidator
    monitor       MigrationMonitor
}

type MigrationJob struct {
    JobID         string
    EntityType    string
    BatchSize     int
    SourceFilter  string
    TargetService string
    Status        string
    Progress      MigrationProgress
}

func (s *DataMigrationService) MigrateEntityBatch(job MigrationJob) error {
    // Extract data from source
    entities, err := s.extractEntities(job.SourceFilter, job.BatchSize)
    if err != nil {
        return err
    }
    
    // Transform for target service
    transformed := s.transformer.Transform(entities, job.TargetService)
    
    // Validate transformation
    if err := s.validator.Validate(transformed); err != nil {
        return err
    }
    
    // Load to target database
    targetDB := s.targetDBs[job.TargetService]
    return targetDB.BulkInsert(transformed)
}

// Migration monitoring and rollback
type MigrationMonitor struct {
    metrics       MetricsCollector
    alerting      AlertingService
    rollbackPlan  RollbackPlan
}

func (m *MigrationMonitor) ValidateDataIntegrity() error {
    checks := []IntegrityCheck{
        m.validateEntityCounts(),
        m.validateRelationshipIntegrity(), 
        m.validateDataConsistency(),
        m.validatePerformanceMetrics(),
    }
    
    for _, check := range checks {
        if err := check.Execute(); err != nil {
            m.alerting.SendAlert(IntegrityAlertLevel.HIGH, err)
            return err
        }
    }
    return nil
}
```

## Implementation Considerations

### Performance Optimization

Optimize database performance for microservices:

```go
// Service-specific optimization strategies
type ServiceOptimizations struct {
    AssetService: OptimizationStrategy{
        Caching: CachingStrategy{
            Type: "Redis",
            TTL:  "1 hour",
            Keys: []string{"active_assets", "asset_metadata", "discovery_status"},
        },
        Indexing: IndexingStrategy{
            DynamoDB: []string{"GSI1: asset_type+created", "GSI2: status+priority"},
            Redis:    []string{"asset:account:*", "asset:status:*", "asset:type:*"},
        },
        Partitioning: "By account_id with hash-based distribution",
    },
    
    RiskService: OptimizationStrategy{
        Caching: CachingStrategy{
            Type: "Redis", 
            TTL:  "30 minutes",
            Keys: []string{"risk_scores", "vulnerability_data", "threat_intelligence"},
        },
        Indexing: IndexingStrategy{
            DynamoDB: []string{"GSI1: severity+updated", "GSI2: asset_key+status"},
            Neo4j:    []string{"(:Risk).severity", "(:Asset).risk_score"},
        },
        Partitioning: "By risk_level with severity-based distribution",
    },
}
```

### Security Considerations

Implement security measures for data protection:

```go
// Data security patterns
type DataSecurityPatterns struct {
    Encryption: EncryptionPattern{
        AtRest: "AES-256 for all databases",
        InTransit: "TLS 1.3 for all inter-service communication",
        Keys: "AWS KMS with service-specific keys",
    },
    
    Access: AccessPattern{
        Authentication: "Service-to-service mTLS certificates", 
        Authorization: "RBAC with fine-grained permissions",
        Auditing: "All data access logged to CloudTrail",
    },
    
    Privacy: PrivacyPattern{
        DataMasking: "PII masking in non-production environments",
        DataRetention: "Configurable retention policies per entity type",
        DataDeletion: "Cascading deletion with relationship cleanup",
    },
}
```

### Monitoring and Observability

Implement comprehensive monitoring:

```go
// Database monitoring strategy
type DatabaseMonitoring struct {
    Metrics: MetricsCollection{
        DynamoDB: []string{
            "read_capacity_utilization", "write_capacity_utilization",
            "throttled_requests", "query_latency", "item_count",
        },
        Neo4j: []string{
            "query_execution_time", "active_connections", 
            "memory_usage", "disk_usage", "relationship_count",
        },
        Redis: []string{
            "memory_usage", "key_count", "evictions",
            "hit_rate", "connection_count",
        },
    },
    
    Alerts: AlertingRules{
        Performance: []AlertRule{
            {Metric: "query_latency", Threshold: "> 200ms", Severity: "WARNING"},
            {Metric: "error_rate", Threshold: "> 1%", Severity: "CRITICAL"},
            {Metric: "capacity_utilization", Threshold: "> 80%", Severity: "WARNING"},
        },
        Consistency: []AlertRule{
            {Metric: "replication_lag", Threshold: "> 5s", Severity: "WARNING"},
            {Metric: "event_processing_delay", Threshold: "> 30s", Severity: "CRITICAL"},
        },
    },
}
```

## Conclusion

This database architecture provides a scalable, maintainable foundation for the microservices transformation while preserving the security-focused domain model of the Chariot platform. The phased migration approach minimizes risk while enabling gradual adoption of the new architecture.

Key benefits include:
- **Service Independence**: Each service owns its data and can evolve independently
- **Optimal Performance**: Database technologies matched to service requirements  
- **Data Consistency**: Event-driven eventual consistency with strong guarantees within service boundaries
- **Scalability**: Horizontal scaling capabilities across all data stores
- **Security**: Enhanced data isolation and security boundaries
- **Observability**: Comprehensive monitoring and alerting across all data stores

The architecture supports the platform's 1000 RPS per service requirement while maintaining sub-200ms response times through appropriate caching, indexing, and data access pattern optimization.