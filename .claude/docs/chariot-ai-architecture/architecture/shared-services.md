# Shared Services & Components

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :warning: PARTIAL (55%) | :white_check_mark: COMPLETE for Event-Driven Orchestration Support
>
> **Event-Driven Orchestration Support** :white_check_mark: COMPLETE:
>
> - GetTargetTasks(): :white_check_mark: Complete - returns all capabilities for an asset type
> - Input/Output Type Declarations: :white_check_mark: Complete - capabilities declare type compatibility
> - Type-Based Routing: :white_check_mark: Complete - enables automatic capability chaining
>
> **General Services**:
>
> - Agora (Capabilities Registry): :white_check_mark: Complete - 3-way executor integration, auto-refresh
> - Task Discovery: :warning: Mostly done - missing intent-based search (keyword search works)
> - ESS (Environment State Service): :warning: Partial - exists as "QueryTool" (different interface, same functionality)
> - AGS (Attack Graph Service): :x: Not started - planned for Q1FY26
> - Metadata Schema: :warning: Partial - missing preconditions, constraints, examples fields
>
> **Note**: GetTargetTasks() is the critical function that enables event-driven orchestration. See [orchestration-pattern.md](orchestration-pattern.md) for how this powers automatic capability chaining.

Shared Services provide platform-wide capabilities that are consumed by multiple layers of the Chariot architecture. These services enable consistent capability discovery, attack surface awareness, and strategic planning across all agents and operators.

## Table of Contents

- [Overview](#overview)
- [Agora (Capabilities Registry)](#agora-capabilities-registry)
  - [GetTargetTasks() for Event-Driven Orchestration](#gettargettasks-for-event-driven-orchestration)
- [Environment State Service (ESS)](#environment-state-service-ess)
- [Attack Graph Service (AGS)](#attack-graph-service-ags)

---

## Overview

Shared Services are foundational components that enable the platform's intelligent orchestration by providing consistent, queryable context to all layers.

```

                   Shared Services



                       Agora
              (Capabilities Registry)

    - Task Discovery API
    - Schema Definitions
    - Executor Mapping



                       ESS
            (Environment State Service)

    - Attack Surface Query API
    - Asset Relationships
    - Agent Context Provider



                       AGS
             (Attack Graph Service)

    - Attack Path Modeling
    - Strategy Reasoning
    - Goal Planning Support



```

---

## Agora (Capabilities Registry)

Agora serves as the platform-wide schema registry, maintaining metadata for task discovery, orchestration, and the authoritative definitions of input/output types consumed across the platform.

### Core Functions

| Function               | Description                                      |
| ---------------------- | ------------------------------------------------ |
| **Task Discovery**     | Enable agents to discover available capabilities |
| **Schema Registry**    | Authoritative definitions of input/output types  |
| **Executor Mapping**   | Route capabilities to correct execution service  |
| **Version Management** | Schema evolution and compatibility tracking      |

### Capability Metadata Structure

For each registered task, the registry stores comprehensive metadata:

```yaml
capability:
  name: nuclei-scan
  description: "Run Nuclei vulnerability scanner against target"
  category: vulnerability-scanning

  input_schema:
    required:
      - target: string # URL or domain to scan
    optional:
      - templates: string[] # Specific templates to run
      - rate_limit: integer # Requests per second
      - timeout: integer # Scan timeout in seconds

  output_schema:
    findings:
      type: array
      items:
        - severity: string
        - template_id: string
        - matched_at: string
        - evidence: string

  preconditions:
    - target_in_scope: true
    - rate_limit_available: true

  constraints:
    max_duration: 3600 # 1 hour max
    max_rate: 100 # 100 req/sec max

  examples:
    - name: "Basic scan"
      params:
        target: "https://example.com"
      expected_output:
        findings: [...]

  executor_mapping:
    service: janus
    handler: NucleiCapability

  vulnerability_mappings:
    - CWE-79 # XSS
    - CWE-89 # SQLi
    - CWE-94 # Code Injection
```

### Metadata Fields

| Field                      | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| **Basic Information**      | Name, description, purpose, and category                    |
| **Input Schema**           | Required and optional parameters with types and constraints |
| **Output Schema**          | Structure and content of expected results                   |
| **Preconditions**          | Conditions that must be met before execution                |
| **Constraints**            | Limitations on execution (scope, rate, duration)            |
| **Examples**               | Sample invocations with parameters and expected results     |
| **Executor Mapping**       | Which service(s) can perform this capability                |
| **Vulnerability Mappings** | Links to relevant CWE/CVE identifiers                       |

### Task Discovery API

```typescript
interface TaskDiscoveryAPI {
  // List all available capabilities
  listCapabilities(filters?: CapabilityFilters): Capability[];

  // Get detailed metadata for a capability
  getCapability(name: string): CapabilityMetadata;

  // Search capabilities by intent
  searchByIntent(query: string): Capability[];

  // Validate parameters against schema
  validateParams(name: string, params: object): ValidationResult;

  // Get capabilities for a specific goal
  getCapabilitiesForGoal(goal: SecurityGoal): Capability[];
}
```

### GetTargetTasks() for Event-Driven Orchestration

> :white_check_mark: **Production Ready** - This function is the core enabler of Chariot's event-driven orchestration.

`GetTargetTasks()` is the registry function that enables automatic capability chaining. It returns all capabilities that can process a given asset type, which is then used by `spawnAll()` to queue jobs for each matching capability.

#### Function Signature

```go
// GetTargetTasks returns all capabilities that declare the given asset type as an input
func (r *Registry) GetTargetTasks(assetType string) []Capability {
    var applicable []Capability

    for _, cap := range r.capabilities {
        // Check if capability declares this asset type as an input
        for _, inputType := range cap.InputTypes {
            if inputType == assetType || inputType == "*" {
                applicable = append(applicable, cap)
                break
            }
        }
    }

    return applicable
}
```

#### How It Enables Automatic Chaining

```

                     Event-Driven Orchestration


      Asset Discovered                GetTargetTasks()
      (e.g., "port")                  Query Registry

            v                              v

 LocalProcessor      Agora Registry
 receives asset
             Returns:
                                 - Fingerprint
                                 - ServiceEnum
                                 - BannerGrab


                                         v

                                spawnAll()
                                queues jobs for
                                each capability

```

#### Capability Type Declarations

Each capability registers its input and output types:

```yaml
# Port scanning capability
capability:
  name: port-scan
  input_types: ["ipv4", "cidr"]
  output_types: ["port", "service"]

# Fingerprinting capability
capability:
  name: fingerprint
  input_types: ["port", "service"]
  output_types: ["technology", "version", "cpe"]

# Vulnerability scanning capability
capability:
  name: nuclei-scan
  input_types: ["url", "domain", "ipv4"]
  output_types: ["vulnerability", "finding"]

# CVE matching capability
capability:
  name: cve-match
  input_types: ["technology", "cpe"]
  output_types: ["cve", "risk"]
```

#### Usage by LocalProcessor

```go
// LocalProcessor.spawnAll() uses GetTargetTasks() for automatic chaining
func (p *LocalProcessor) spawnAll(ctx context.Context, asset *Asset) error {
    // Query registry for all capabilities that can process this asset type
    capabilities := p.registry.GetTargetTasks(asset.Class)

    for _, cap := range capabilities {
        // Create job for each applicable capability
        job := &Job{
            Capability: cap.Name,
            Target:     asset,
        }
        p.queue.Enqueue(ctx, job)
    }
    return nil
}
```

#### Example: Type-Based Routing Flow

```
User adds seed: "example.com" (type: domain)

 GetTargetTasks("domain") returns:
   [DomainDiscovery, DNSEnum, Whois, Nuclei]

   Jobs queued for each...

 DomainDiscovery emits: 192.168.1.1 (type: ipv4)

    GetTargetTasks("ipv4") returns:
       [PortScan, CloudRecon, IPReputation, Nuclei]

       Jobs queued for each...

 PortScan emits: 192.168.1.1:80 (type: port)

    GetTargetTasks("port") returns:
       [Fingerprint, ServiceEnum, BannerGrab]

       Jobs queued for each...

 ... continues recursively
```

This pattern enables **zero-configuration workflow chaining** - add a new capability with appropriate type declarations and it automatically integrates into the scanning workflow.

For complete documentation, see [orchestration-pattern.md](orchestration-pattern.md).

---

## Environment State Service (ESS)

> **[Implementation Differs]**: ESS exists as "QueryTool" with a different interface but equivalent functionality. Not formalized as a named service.

Provides a read-only API exposing the platform's current understanding of the attack surface, including assets, vulnerabilities, credentials, and relationships.

### Purpose

| Function                    | Description                                  |
| --------------------------- | -------------------------------------------- |
| **Attack Surface Query**    | Structured access to discovered assets       |
| **Context Provider**        | Rich context for agent planning              |
| **Relationship Navigation** | Explore asset interconnections               |
| **State Consistency**       | Single source of truth for environment state |

### Data Sources

```

                Environment State Service



                     Neo4j Graph
                     Database


                           v

                ESS Query Layer

    - Asset queries
    - Finding queries
    - Relationship traversal
    - Aggregations



              v                         v

           Agents                Operators
        (Read-only)             (Awareness)



```

### Query API

```typescript
interface EnvironmentStateAPI {
  // Get assets by criteria
  getAssets(filters: AssetFilters): Asset[];

  // Get findings for an asset
  getFindings(assetId: string): Finding[];

  // Get related assets
  getRelatedAssets(assetId: string, relationship: string): Asset[];

  // Get attack surface summary
  getAttackSurfaceSummary(scopeId: string): SurfaceSummary;

  // Get credentials associated with assets
  getCredentials(assetId: string): Credential[];

  // Navigate relationships
  traverseRelationship(startAsset: string, relationshipPath: string[]): Asset[];
}
```

### Access Control

| Consumer      | Access Level          | Method                  |
| ------------- | --------------------- | ----------------------- |
| **Agents**    | Read-only via ESS API | Structured queries only |
| **Operators** | Full Neo4j access     | Query Builder UI        |
| **Workflows** | Read-only via ESS API | Context enrichment      |

**Important**: Direct Neo4j access by agents is disallowed to prevent unbounded queries and ensure consistent access patterns.

---

## Attack Graph Service (AGS)

> **[Not Implemented]**: AGS is not started. Planned for Q1FY26. This is critical for strategic attack path planning and the Planner Agent's effectiveness.

Based on research (Singer et al., 2025), the Attack Graph Service provides reasoning about potential attack paths and possible future states.

### Core Capabilities

| Capability               | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| **Path Modeling**        | Dynamically model potential attack paths                     |
| **State Reasoning**      | Reason about possible future states through action sequences |
| **Goal Identification**  | Identify most promising paths to specific goals              |
| **Relationship Mapping** | Understand relationships between attack actions              |

### Architecture

```

                  Attack Graph Service



                Attack Path Engine

    - Path enumeration
    - State transition modeling
    - Probability estimation


                           v

                Strategy Advisor

    - Goal achievement analysis
    - Alternative path identification
    - Risk-based prioritization



```

### Consumer Hierarchy

#### Primary Caller: Planner Agent

The Planner Agent in Prometheus is the primary consumer of AGS.

**Use Cases:**

- Developing initial attack strategy after receiving a security goal
- Identifying promising paths to valuable targets
- Deciding which specialized sub-agent to deploy next
- Recovering and replanning when a specific attack path fails

#### Secondary Callers: Task-Specific Agents

Specialized agents (Recon, SQLi, XSS, Zero-Day) also consume AGS.

**Use Cases:**

- Understanding context of specific tasks within broader strategy
- Identifying alternative approaches if primary method fails
- Deciding which specific capabilities to request from Janus

#### Tertiary Callers: Execution Services

While primarily focused on execution, Janus may occasionally consult AGS.

**Use Cases:**

- Refining execution strategy for complex multi-step tasks
- Validating that requested actions align with potential attack paths
- Providing additional context for task execution

### Query Interface

```typescript
interface AttackGraphAPI {
  // Get possible attack paths to a goal
  getPathsToGoal(currentState: EnvironmentState, goal: SecurityGoal): AttackPath[];

  // Evaluate a specific path
  evaluatePath(path: AttackPath): PathEvaluation;

  // Get next best actions from current state
  getNextActions(currentState: EnvironmentState): ScoredAction[];

  // Reason about state after action sequence
  projectState(currentState: EnvironmentState, actions: Action[]): ProjectedState;

  // Find alternative paths when blocked
  findAlternatives(
    currentState: EnvironmentState,
    failedPath: AttackPath,
    goal: SecurityGoal
  ): AttackPath[];
}
```

### Key Distinction

The Attack Graph Service is fundamentally about **attack planning and reasoning** rather than just state representation. It helps agents understand:

- What **could be possible** given the current state
- How different attack actions relate to each other
- The most promising paths to reach specific goals
- How to recover when specific attack paths fail
