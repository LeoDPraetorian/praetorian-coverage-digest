# Panorama Integration Architecture

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

This document describes the architectural components of Palo Alto Panorama and integration patterns for connecting Chariot attack surface management with centralized firewall management.

## Panorama Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         PANORAMA                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Management     │  │  Configuration  │  │  Log            │ │
│  │  Plane          │  │  Database       │  │  Collectors     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│  ┌────────┴────────────────────┴────────────────────┴────────┐ │
│  │                    API Layer                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ REST API │  │ XML API  │  │ Web UI   │  │ CLI      │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Management Connection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MANAGED FIREWALLS                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ FW-01    │  │ FW-02    │  │ FW-03    │  │ FW-N     │        │
│  │ PA-5220  │  │ PA-3220  │  │ VM-300   │  │ ...      │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Management Hierarchy

```
Panorama
├── Shared (Global Objects)
│   ├── Address Objects
│   ├── Service Objects
│   ├── Application Groups
│   └── Security Profiles
│
├── Device Groups (Policy Management)
│   ├── Parent-DG
│   │   ├── Pre-rulebase (enforced first)
│   │   ├── Post-rulebase (enforced last)
│   │   ├── Objects (inherited by children)
│   │   └── Child-DG
│   │       ├── Pre-rulebase
│   │       ├── Post-rulebase
│   │       └── Objects
│   └── Standalone-DG
│
└── Template Stacks (Network Configuration)
    ├── Production-Stack
    │   ├── Base-Network-TPL (lower priority)
    │   └── Site-Specific-TPL (higher priority)
    └── Lab-Stack
```

### Policy Evaluation Order

```
1. Device Group Pre-rules (Panorama)
   └── Parent DG Pre-rules
       └── Child DG Pre-rules

2. Local Firewall Rules (Device)

3. Device Group Post-rules (Panorama)
   └── Child DG Post-rules
       └── Parent DG Post-rules

4. Intrazone Default (allow)
5. Interzone Default (deny)
```

## Integration Architecture

### Chariot ↔ Panorama Integration Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHARIOT                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Asset        │  │ Risk         │  │ Attribute    │          │
│  │ Discovery    │  │ Management   │  │ Enrichment   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────┴───────┐                             │
│                    │ Panorama     │                             │
│                    │ Integration  │                             │
│                    │ Service      │                             │
│                    └──────┬───────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTPS (REST/XML API)
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                       PANORAMA                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Address     │  │ Security    │  │ Device      │           │
│  │ Objects     │  │ Policies    │  │ Inventory   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

#### Pattern 1: Asset Discovery Enrichment

```
Chariot discovers asset
        │
        ▼
Query Panorama for matching address objects
        │
        ├── Found: Enrich asset with firewall policy info
        │           - Which rules reference this asset?
        │           - What security profiles apply?
        │           - Which device groups contain it?
        │
        └── Not Found: Flag as "unprotected" or "unmanaged"
```

#### Pattern 2: Bi-directional Sync

```
┌─────────────┐                              ┌─────────────┐
│   CHARIOT   │                              │  PANORAMA   │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. New asset discovered                   │
       ├───────────────────────────────────────────►│
       │     Create address object                  │
       │                                            │
       │  2. Policy change notification             │
       │◄───────────────────────────────────────────┤
       │     Update asset attributes                │
       │                                            │
       │  3. Risk identified                        │
       ├───────────────────────────────────────────►│
       │     Create blocking rule                   │
       │                                            │
       │  4. Commit and push                        │
       │◄───────────────────────────────────────────┤
       │     Confirm deployment                     │
       │                                            │
```

#### Pattern 3: Policy Validation

```
Chariot identifies vulnerability on asset
        │
        ▼
Query Panorama security policies
        │
        ▼
Analyze if policies mitigate the vulnerability
        │
        ├── Protected: Document existing controls
        │
        └── Vulnerable: Generate remediation recommendations
                │
                ├── Recommended rule changes
                ├── Security profile updates
                └── IPS signature enablement
```

## Component Architecture

### Integration Service Design

```go
// PanoramaIntegration orchestrates Chariot-Panorama sync
type PanoramaIntegration struct {
    // Clients
    panoramaClient *panorama.Client
    chariotClient  *chariot.Client

    // Configuration
    config         IntegrationConfig

    // State
    syncState      *SyncState
    cache          *ResponseCache

    // Coordination
    rateLimiter    *RateLimiter
    circuitBreaker *CircuitBreaker

    // Observability
    metrics        *Metrics
    logger         *slog.Logger
}

type IntegrationConfig struct {
    // Panorama connection
    PanoramaURL    string
    APIKey         string

    // Mapping configuration
    DefaultDeviceGroup string
    TenantMapping      map[string]string // Chariot account -> device group

    // Sync behavior
    SyncInterval       time.Duration
    EnableAutoRemediation bool

    // Limits
    MaxObjectsPerBatch int
    CommitDebounce     time.Duration
}
```

### State Management

```go
// SyncState tracks synchronization progress
type SyncState struct {
    mu sync.RWMutex

    // Last sync timestamps
    LastAssetSync    time.Time
    LastPolicySync   time.Time
    LastDeviceSync   time.Time

    // Pending changes (debounce commits)
    PendingCreates   []AddressObject
    PendingDeletes   []string
    PendingRules     []SecurityRule

    // Tracking
    SyncedAssets     map[string]string // Chariot key -> Panorama name
    SyncedRisks      map[string]string // Risk key -> Rule name
}

// NeedsCommit returns true if there are pending changes
func (s *SyncState) NeedsCommit() bool {
    s.mu.RLock()
    defer s.mu.RUnlock()

    return len(s.PendingCreates) > 0 ||
           len(s.PendingDeletes) > 0 ||
           len(s.PendingRules) > 0
}
```

### Event-Driven Architecture

```go
// EventHandler processes integration events
type EventHandler struct {
    integration *PanoramaIntegration
    eventChan   chan Event
}

type Event struct {
    Type      EventType
    Timestamp time.Time
    Payload   interface{}
}

type EventType string

const (
    EventAssetCreated     EventType = "asset.created"
    EventAssetUpdated     EventType = "asset.updated"
    EventAssetDeleted     EventType = "asset.deleted"
    EventRiskCreated      EventType = "risk.created"
    EventRiskResolved     EventType = "risk.resolved"
    EventPolicyChanged    EventType = "policy.changed"
    EventCommitRequired   EventType = "commit.required"
)

func (h *EventHandler) ProcessEvents(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        case event := <-h.eventChan:
            switch event.Type {
            case EventAssetCreated:
                h.handleAssetCreated(ctx, event.Payload.(*chariot.Asset))
            case EventRiskCreated:
                h.handleRiskCreated(ctx, event.Payload.(*chariot.Risk))
            case EventCommitRequired:
                h.handleCommitRequired(ctx)
            }
        }
    }
}
```

## Deployment Architecture

### AWS Lambda Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS ACCOUNT                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    VPC                                    │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │ Lambda:     │  │ Lambda:     │  │ Lambda:     │      │  │
│  │  │ Asset Sync  │  │ Risk Sync   │  │ Commit      │      │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │  │
│  │         │                │                │              │  │
│  │         └────────────────┼────────────────┘              │  │
│  │                          │                               │  │
│  │                   ┌──────┴──────┐                        │  │
│  │                   │ NAT Gateway │                        │  │
│  │                   └──────┬──────┘                        │  │
│  │                          │                               │  │
│  └──────────────────────────┼───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┼───────────────────────────────┐  │
│  │ Secrets Manager          │   DynamoDB (State)            │  │
│  │ - panorama-api-key       │   - sync-state                │  │
│  │ - chariot-api-key        │   - object-mapping            │  │
│  └──────────────────────────┴───────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
                        ┌───────────┐
                        │ PANORAMA  │
                        └───────────┘
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: panorama-integration
spec:
  replicas: 1 # Single instance to avoid conflicts
  selector:
    matchLabels:
      app: panorama-integration
  template:
    metadata:
      labels:
        app: panorama-integration
    spec:
      containers:
        - name: integration
          image: chariot/panorama-integration:latest
          env:
            - name: PANORAMA_URL
              valueFrom:
                secretKeyRef:
                  name: panorama-creds
                  key: url
            - name: PANORAMA_API_KEY
              valueFrom:
                secretKeyRef:
                  name: panorama-creds
                  key: api-key
            - name: CHARIOT_API_KEY
              valueFrom:
                secretKeyRef:
                  name: chariot-creds
                  key: api-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## High Availability Considerations

### Panorama HA

```
┌─────────────────┐         ┌─────────────────┐
│ Panorama        │◄───────►│ Panorama        │
│ Primary         │  HA     │ Secondary       │
│ (Active)        │  Sync   │ (Passive)       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │      Virtual IP           │
         └───────────┬───────────────┘
                     │
                     ▼
              ┌──────────────┐
              │ Integration  │
              │ Service      │
              └──────────────┘
```

### Integration HA Pattern

```go
// HAClient handles Panorama HA failover
type HAClient struct {
    primary   *Client
    secondary *Client
    active    *Client
    mu        sync.RWMutex
}

func (h *HAClient) makeRequest(ctx context.Context, params url.Values) ([]byte, error) {
    h.mu.RLock()
    active := h.active
    h.mu.RUnlock()

    resp, err := active.makeRequest(ctx, params)
    if err != nil {
        // Try failover
        if h.shouldFailover(err) {
            h.failover()
            return h.active.makeRequest(ctx, params)
        }
        return nil, err
    }

    return resp, nil
}

func (h *HAClient) failover() {
    h.mu.Lock()
    defer h.mu.Unlock()

    if h.active == h.primary {
        h.active = h.secondary
    } else {
        h.active = h.primary
    }
}
```

## Security Architecture

### Network Security

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION SERVICE                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Outbound Only:                                            │  │
│  │ - Panorama API (443/tcp)                                  │  │
│  │ - Chariot API (443/tcp)                                   │  │
│  │ - AWS Services (443/tcp)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ No Inbound Connections Required                           │  │
│  │ (Poll-based architecture)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Credential Management

```
┌─────────────────────────────────────────────────────────────────┐
│                  SECRETS MANAGEMENT                              │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ AWS Secrets     │    │ HashiCorp       │                    │
│  │ Manager         │ OR │ Vault           │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      │                                          │
│           ┌──────────┴──────────┐                               │
│           │ Integration Service │                               │
│           │                     │                               │
│           │ - Never logs creds  │                               │
│           │ - Rotates on schedule │                             │
│           │ - Uses least privilege │                            │
│           └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Monitoring Architecture

### Observability Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ CloudWatch   │  │ Prometheus   │  │ Datadog      │          │
│  │ Metrics      │  │ Metrics      │  │ APM          │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────┴───────┐                             │
│                    │ Integration  │                             │
│                    │ Service      │                             │
│                    └──────────────┘                             │
│                                                                  │
│  Key Metrics:                                                   │
│  - panorama_api_requests_total                                  │
│  - panorama_api_latency_seconds                                 │
│  - panorama_sync_objects_total                                  │
│  - panorama_commit_duration_seconds                             │
│  - panorama_rate_limit_hits_total                               │
└─────────────────────────────────────────────────────────────────┘
```

## Related References

- [API Reference](api-reference.md) - REST/XML API details
- [Device Management](device-management.md) - Device group hierarchy
- [Security Policies](security-policies.md) - Policy management
- [Commit Operations](commit-operations.md) - Configuration deployment
- [Security Best Practices](security.md) - Credential management
