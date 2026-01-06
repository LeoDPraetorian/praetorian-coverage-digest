# Event-Driven Orchestration Pattern

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :white_check_mark: COMPLETE (Production)
>
> - Match() pattern: :white_check_mark: Complete - pre-execution gate on all capabilities
> - Job.Send() streaming: :white_check_mark: Complete - Kinesis-based result streaming
> - Registry-based discovery: :white_check_mark: Complete - GetTargetTasks() in Agora
> - Automatic chaining via spawnAll(): :white_check_mark: Complete - reactive job spawning
> - LocalProcessor: :white_check_mark: Complete - event-driven result processing
>
> **Key Insight**: Chariot does NOT lack workflow orchestration - it implements a different paradigm. Rather than explicit workflow definitions, Chariot uses an event-driven, registry-based orchestration system where workflows emerge from capability type declarations.

This document describes Chariot's **event-driven registry-based orchestration** pattern - a sophisticated approach to capability chaining that differs fundamentally from traditional workflow engines.

## Table of Contents

- [Overview](#overview)
- [The Complete Execution Flow](#the-complete-execution-flow)
- [Core Components](#core-components)
  - [Match() Function Pattern](#match-function-pattern)
  - [Job.Send() Result Streaming](#jobsend-result-streaming)
  - [Registry-Based Capability Discovery](#registry-based-capability-discovery)
  - [Automatic Chaining via spawnAll()](#automatic-chaining-via-spawnall)
- [Comparison to Other Orchestration Patterns](#comparison-to-other-orchestration-patterns)
- [Benefits of Event-Driven Orchestration](#benefits-of-event-driven-orchestration)
- [Code References](#code-references)

---

## Overview

Chariot implements an **event-driven, registry-based orchestration** system rather than explicit workflow definitions. This is a deliberate architectural choice that provides:

- **Emergent Workflows**: Workflows emerge automatically from capability type declarations
- **Unbounded Parallelism**: Queue-based execution without fixed agent counts
- **Type-Based Routing**: Automatic matching of asset types to applicable capabilities
- **Decoupled Execution**: Capabilities emit results asynchronously; system handles chaining

### Paradigm Comparison

| Traditional Workflow Engine | Chariot Event-Driven                |
| --------------------------- | ----------------------------------- |
| Explicit DAG definitions    | Emergent from type matching         |
| Fixed workflow steps        | Dynamic capability discovery        |
| Orchestrator controls flow  | Capabilities declare inputs/outputs |
| Centralized state machine   | Distributed event processing        |
| Requires workflow authoring | Self-organizing via registry        |

---

## The Complete Execution Flow

The following diagram shows the complete lifecycle from job creation through result processing and automatic chaining:

```
                                CHARIOT EVENT-DRIVEN ORCHESTRATION FLOW
                                ========================================

User/Schedule/API
       |
       v
+------------------+
|   Job Created    |  <-- Initial trigger (manual, scheduled, or API)
+--------+---------+
         |
         v
+------------------+
|   SQS Queue      |  <-- Decoupled job distribution
+--------+---------+
         |
         v
+------------------+
| Compute Executor |  <-- Lambda/ECS picks up job
+--------+---------+
         |
         v
+------------------+
| Capability.Match()|  <-- PRE-EXECUTION GATE: Can this capability run on this asset?
+--------+---------+
         |
    +----+----+
    |         |
  nil       error
  (run)    (skip)
    |
    v
+------------------+
|Capability.Invoke()|  <-- Execute the security capability
+--------+---------+
         |
         v
+------------------+
|  Job.Send(assets)|  <-- STREAM discovered assets to Kinesis
+--------+---------+
         |
         v
+------------------+
|  Kinesis Stream  |  <-- Asynchronous, decoupled result delivery
+--------+---------+
         |
         v
+------------------+
|  Results Lambda  |  <-- Triggered by Kinesis events
+--------+---------+
         |
         v
+-------------------+
|LocalProcessor     |
|  .Process()       |  <-- Parse and persist results
+--------+----------+
         |
    +----+----+
    |         |
    v         v
+-------+  +------------+
| Neo4j |  | spawnAll() |  <-- AUTOMATIC CHAINING
+-------+  +-----+------+
                 |
                 v
        +------------------+
        | GetTargetTasks() |  <-- Query registry for applicable capabilities
        +--------+---------+
                 |
                 v
        +------------------+
        | Queue New Jobs   |  <-- For each matching capability
        +--------+---------+
                 |
                 v
              [LOOP]  <-- Recursive expansion continues
```

### Key Observations

1. **No Central Workflow Definition**: There is no workflow file or DAG definition. The "workflow" emerges from:
   - What capabilities are registered in Agora
   - What asset types each capability declares it can process
   - What asset types each capability discovers/emits

2. **Self-Organizing System**: When PortScan discovers services, those services automatically trigger Fingerprint, which discovers technologies, which trigger vulnerability scans, etc.

3. **Unbounded Parallelism**: The queue-based architecture supports arbitrary parallelism. There's no "agent count" limit - jobs are distributed across Lambda/ECS workers.

---

## Core Components

### Match() Function Pattern

Every capability implements a `Match()` function that acts as a **pre-execution gate**:

```go
// Match validates if this capability can run against the target asset
// Returns nil if the capability is applicable, error if it should be skipped
func (c *PortScanCapability) Match(asset *Asset) error {
    // PortScan only works on IP addresses and CIDR ranges
    if asset.Class != "ipv4" && asset.Class != "cidr" {
        return fmt.Errorf("PortScan requires ipv4 or cidr asset, got %s", asset.Class)
    }
    return nil // Can proceed with execution
}

func (c *FingerprintCapability) Match(asset *Asset) error {
    // Fingerprint only works on discovered ports/services
    if asset.Class != "port" && asset.Class != "service" {
        return fmt.Errorf("Fingerprint requires port or service asset, got %s", asset.Class)
    }
    return nil
}

func (c *NucleiCapability) Match(asset *Asset) error {
    // Nuclei works on URLs, domains, and IPs
    validClasses := map[string]bool{"url": true, "domain": true, "ipv4": true}
    if !validClasses[asset.Class] {
        return fmt.Errorf("Nuclei requires url/domain/ipv4 asset, got %s", asset.Class)
    }
    return nil
}
```

#### Why Match() Matters

| Purpose                  | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| **Pre-execution Filter** | Prevents wasted compute on incompatible asset types             |
| **Type Safety**          | Ensures capabilities receive appropriate inputs                 |
| **Self-Documentation**   | Each capability declares its applicability                      |
| **Routing Logic**        | Combined with registry, enables automatic workflow construction |

### Job.Send() Result Streaming

Capabilities emit discovered assets via `Job.Send()`, which streams results to Kinesis:

```go
func (c *PortScanCapability) Invoke(ctx context.Context, job *Job, asset *Asset) error {
    // Perform port scanning
    openPorts, err := c.scanner.Scan(asset.Value)
    if err != nil {
        return err
    }

    // Stream each discovered port as a new asset
    for _, port := range openPorts {
        newAsset := &Asset{
            Class:  "port",
            Value:  fmt.Sprintf("%s:%d", asset.Value, port.Number),
            Parent: asset.Key,
            Metadata: map[string]string{
                "protocol": port.Protocol,
                "state":    port.State,
            },
        }

        // Non-blocking send to Kinesis stream
        if err := job.Send(ctx, newAsset); err != nil {
            log.Warn("failed to send asset", "error", err)
            // Continue processing - don't fail entire job
        }
    }

    return nil
}
```

#### Streaming Characteristics

| Characteristic      | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| **Asynchronous**    | Results stream immediately, don't wait for capability completion |
| **Decoupled**       | Producer (capability) and consumer (processor) are independent   |
| **Fault Tolerant**  | Send failures don't terminate the capability execution           |
| **High Throughput** | Kinesis handles massive parallel result streams                  |

### Registry-Based Capability Discovery

The Agora registry provides `GetTargetTasks()` for discovering applicable capabilities:

```go
// GetTargetTasks returns all capabilities that can process the given asset type
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

#### Registry Metadata Structure

Each capability registration includes type information:

```yaml
capability:
  name: fingerprint
  input_types: ["port", "service"]
  output_types: ["technology", "version", "cpe"]
  executor: janus

capability:
  name: nuclei-scan
  input_types: ["url", "domain", "ipv4"]
  output_types: ["vulnerability", "finding"]
  executor: janus

capability:
  name: port-scan
  input_types: ["ipv4", "cidr"]
  output_types: ["port", "service"]
  executor: janus
```

### Automatic Chaining via spawnAll()

The `LocalProcessor.spawnAll()` function implements automatic capability chaining:

```go
// Process handles incoming assets from Kinesis
func (p *LocalProcessor) Process(ctx context.Context, asset *Asset) error {
    // 1. Persist the asset to Neo4j
    if err := p.store.Save(ctx, asset); err != nil {
        return fmt.Errorf("failed to save asset: %w", err)
    }

    // 2. Spawn jobs for all applicable capabilities
    return p.spawnAll(ctx, asset)
}

// spawnAll finds all capabilities applicable to this asset and queues jobs
func (p *LocalProcessor) spawnAll(ctx context.Context, asset *Asset) error {
    // Query registry for capabilities that handle this asset type
    capabilities := p.registry.GetTargetTasks(asset.Class)

    for _, cap := range capabilities {
        // Create a new job for each applicable capability
        job := &Job{
            Capability: cap.Name,
            Target:     asset,
            Priority:   calculatePriority(asset, cap),
        }

        // Queue the job (non-blocking)
        if err := p.queue.Enqueue(ctx, job); err != nil {
            log.Warn("failed to queue job",
                "capability", cap.Name,
                "asset", asset.Key,
                "error", err)
            // Continue - don't fail entire chain
        }
    }

    return nil
}
```

#### Chaining Flow Example

```
Initial: User adds seed domain "example.com"

1. Domain Discovery capability runs on "example.com"
   -> Emits: ipv4 assets (192.168.1.1, 192.168.1.2, ...)

2. spawnAll() sees ipv4 assets
   -> Queries: GetTargetTasks("ipv4")
   -> Finds: [PortScan, Nuclei, CloudRecon]
   -> Queues: Jobs for each combination

3. PortScan runs on 192.168.1.1
   -> Emits: port assets (192.168.1.1:22, 192.168.1.1:80, ...)

4. spawnAll() sees port assets
   -> Queries: GetTargetTasks("port")
   -> Finds: [Fingerprint, ServiceEnum]
   -> Queues: Jobs for each combination

5. Fingerprint runs on 192.168.1.1:80
   -> Emits: technology assets (nginx/1.19, php/7.4, ...)

6. spawnAll() sees technology assets
   -> Queries: GetTargetTasks("technology")
   -> Finds: [VersionVulnCheck, CVEMatch]
   -> Queues: Jobs for each combination

... and so on, recursively expanding the attack surface
```

---

## Comparison to Other Orchestration Patterns

| Pattern             | Example Systems                | Chariot Equivalent                       |
| ------------------- | ------------------------------ | ---------------------------------------- |
| **Supervisor Loop** | ARTEMIS, AutoGPT               | LocalProcessor + spawnAll()              |
| **Phase Sequence**  | SHANNON, traditional pipelines | Emergent from asset type flow            |
| **Explicit DAG**    | Temporal.io, Airflow           | Registry + type matching                 |
| **Agent Hierarchy** | CrewAI, hierarchical agents    | Flat capabilities + event-driven routing |

### Why Not Traditional Workflows?

| Concern              | Traditional Approach      | Chariot's Solution              |
| -------------------- | ------------------------- | ------------------------------- |
| **Flexibility**      | Fixed workflow steps      | Dynamic capability discovery    |
| **Scalability**      | Orchestrator bottleneck   | Distributed queue processing    |
| **Extensibility**    | Requires workflow updates | Add capability, auto-integrates |
| **Failure Handling** | Workflow-level retry      | Per-capability, isolated        |
| **Parallelism**      | Defined in workflow       | Unbounded, automatic            |

---

## Benefits of Event-Driven Orchestration

### 1. Zero-Configuration Chaining

When a new capability is added to the registry with appropriate type declarations, it automatically integrates into the scanning workflow without modifying any workflow definitions.

### 2. Unbounded Parallelism

There's no fixed "agent count" or "worker pool size" limiting throughput. The system scales horizontally with:

- SQS providing unlimited queue depth
- Lambda/ECS auto-scaling based on queue length
- Kinesis sharding for result throughput

### 3. Fault Isolation

A failing capability doesn't crash a "workflow" - it simply fails its specific job. Other capabilities continue processing, and the system maintains consistency through idempotent operations.

### 4. Natural Prioritization

Job priority can be calculated based on asset characteristics, capability importance, and business rules - all without modifying workflow definitions.

### 5. Observable State

Every asset and job is persisted to Neo4j, providing complete visibility into:

- What was discovered
- What capabilities ran
- What jobs are pending
- What failed and why

---

## Code References

| Component             | Location                                              | Description                           |
| --------------------- | ----------------------------------------------------- | ------------------------------------- |
| **Match() Interface** | `modules/chariot/backend/pkg/capability/interface.go` | Capability contract including Match() |
| **Job.Send()**        | `modules/chariot/backend/pkg/job/job.go`              | Result streaming to Kinesis           |
| **LocalProcessor**    | `modules/chariot/backend/pkg/processor/local.go`      | Result processing and spawnAll()      |
| **GetTargetTasks()**  | `modules/chariot/backend/pkg/agora/registry.go`       | Registry capability lookup            |
| **Kinesis Handler**   | `modules/chariot/backend/lambda/results/main.go`      | Kinesis event processing              |
| **SQS Consumer**      | `modules/chariot/backend/lambda/executor/main.go`     | Job queue processing                  |

---

## Key Takeaways

1. **Chariot HAS orchestration** - it's just event-driven rather than workflow-defined
2. **Match() is the routing logic** - capabilities declare what they can process
3. **Job.Send() decouples execution** - results stream asynchronously
4. **spawnAll() creates emergent workflows** - no explicit chaining required
5. **The registry is the workflow definition** - type mappings define the flow

This pattern enables Chariot to scale to massive attack surfaces while remaining flexible and extensible. New capabilities automatically integrate, failures are isolated, and the system self-organizes based on what is discovered.
