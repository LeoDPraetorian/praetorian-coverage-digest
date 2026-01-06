# Workflow Engine

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :white_check_mark: EVENT-DRIVEN ORCHESTRATION COMPLETE
>
> **Important Clarification**: Chariot does NOT lack workflow orchestration - it implements a **different paradigm**. Rather than explicit workflow definitions (Temporal, DAGs), Chariot uses an **event-driven registry-based orchestration** system where workflows emerge from capability type declarations.
>
> **What IS Implemented** (Production):
>
> - :white_check_mark: Match() pattern - pre-execution gate on all capabilities
> - :white_check_mark: Job.Send() streaming - Kinesis-based result streaming
> - :white_check_mark: Registry-based discovery - GetTargetTasks() in Agora
> - :white_check_mark: Automatic chaining via spawnAll() - reactive job spawning
> - :white_check_mark: LocalProcessor - event-driven result processing
>
> **What is NOT Implemented** (Future Enhancements):
>
> - :x: Temporal.io integration - explicit workflow definitions
> - :x: UI Builder - visual workflow construction (React Flow)
> - :x: Operator-defined workflows - custom attack chain definitions
> - :x: Advanced logic constructs - conditionals, loops, parallel branches
>
> **See Also**: [orchestration-pattern.md](orchestration-pattern.md) for detailed documentation of the event-driven pattern.

The Chariot Workflow Engine consists of two complementary approaches:

1. **Event-Driven Orchestration** (IMPLEMENTED) - Automatic capability chaining based on asset type declarations
2. **Explicit Workflow Definitions** (FUTURE) - Operator-defined attack chains using Temporal.io

This document covers both the existing event-driven system and the planned explicit workflow capabilities.

## Table of Contents

- [Purpose and Overview](#purpose-and-overview)
- [Event-Driven Orchestration (IMPLEMENTED)](#event-driven-orchestration-implemented)
- [Explicit Workflow Definitions (FUTURE)](#explicit-workflow-definitions-future)
  - [Phase 0: Proof of Concept](#phase-0-proof-of-concept)
  - [Phase 2: Programmatic Workflows](#phase-2-programmatic-workflows)
  - [Phase 3: Operator-Defined Workflows](#phase-3-operator-defined-workflows)
  - [Phase 4: Advanced Logic-Driven Orchestration](#phase-4-advanced-logic-driven-orchestration)
- [Workflow State Management](#workflow-state-management)
- [Workflow Transform Engine](#workflow-transform-engine)

---

## Purpose and Overview

The Workflow Engine enables the composition of individual capabilities into a system capable of strategic, mission-oriented reasoning. It acts as the connective tissue of the platform, transforming a library of discrete tools into coordinated attack chains.

### Key Objectives

| Objective         | Description                                           |
| ----------------- | ----------------------------------------------------- |
| **Leverage**      | Automate complex, multi-step procedures               |
| **Composability** | Chain any two capabilities seamlessly                 |
| **Flexibility**   | Support both AI-driven and operator-defined workflows |
| **Reliability**   | Handle state management and failure recovery          |
| **Visibility**    | Track execution progress and outcomes                 |

### Architecture

```

                     Workflow Engine



   Workflow           Workflow
   Definition       Executor
   Storage



   Transform
   Engine

                                v

                        Capability
                        Invocation
                        (Janus/Aegis)



```

### Development Strategy

The platform leverages best-in-class open-source technologies for both backend execution and frontend UI. The explicit workflow engine (Temporal.io) is planned for future phases, while the event-driven system is production-ready.

---

## Event-Driven Orchestration (IMPLEMENTED)

> :white_check_mark: **Production Ready** - This system is fully implemented and handles all current Chariot workflow needs.

Chariot implements an **event-driven, registry-based orchestration** pattern that differs fundamentally from traditional workflow engines. Rather than defining explicit workflow DAGs, Chariot capabilities declare their input/output types and the system automatically chains them together.

### How It Works

```
                       EVENT-DRIVEN ORCHESTRATION FLOW


  User/Schedule  Job Created  SQS Queue  Compute Executor

                                                      v

                                             Capability.Match()
                                             (Pre-execution
                                              gate: Can this
                                              capability run?)


                                              nil       error
                                             (run)     (skip)

                                                     v

                                            Capability.Invoke()
                                             (Execute scan)


                                                     v

                                             Job.Send(assets)
                                             (Stream results)


                                                     v

                      Kinesis Stream


                                                     v

                                             Results Lambda


                                                     v

                                            LocalProcessor
                                             .Process()



                                        v                        v

                                    Neo4j               spawnAll()
                                    Insert               (Chain)


                                                               v

                                                       GetTargetTasks
                                                        (Registry)


                                                              v
                                                       Queue New Jobs



                                                            [LOOP]


```

### Core Components

| Component            | Purpose                                                 | Implementation                       |
| -------------------- | ------------------------------------------------------- | ------------------------------------ |
| **Match()**          | Pre-execution gate - validates capability applicability | Interface method on all capabilities |
| **Job.Send()**       | Stream discovered assets to Kinesis                     | Non-blocking, async result delivery  |
| **GetTargetTasks()** | Query registry for applicable capabilities              | Agora registry lookup by asset type  |
| **spawnAll()**       | Queue jobs for all matching capabilities                | LocalProcessor method                |
| **LocalProcessor**   | Process results and trigger chaining                    | Event-driven result handler          |

### Example: Emergent Reconnaissance Workflow

No workflow definition required - this emerges automatically from capability type declarations:

```
1. User adds seed: "example.com" (domain)

2. DomainDiscovery runs (input: domain)
    Emits: ipv4 assets (192.168.1.1, 192.168.1.2, ...)

3. spawnAll() queries GetTargetTasks("ipv4")
    Finds: [PortScan, CloudRecon, IPReputation]
    Queues: Jobs for each capability  each IP

4. PortScan runs (input: ipv4)
    Emits: port assets (192.168.1.1:22, 192.168.1.1:80, ...)

5. spawnAll() queries GetTargetTasks("port")
    Finds: [Fingerprint, ServiceEnum]
    Queues: Jobs for each capability  each port

6. Fingerprint runs (input: port)
    Emits: technology assets (nginx/1.19, php/7.4, ...)

7. spawnAll() queries GetTargetTasks("technology")
    Finds: [CVEMatch, VersionVulnCheck]
    Queues: Jobs for each...

   ... continues recursively
```

### Benefits of Event-Driven Approach

| Benefit                   | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| **Zero Configuration**    | Add a capability it auto-integrates via type matching |
| **Unbounded Parallelism** | Queue-based, no fixed agent count limits              |
| **Fault Isolation**       | One capability failure doesn't crash the "workflow"   |
| **Self-Organizing**       | System adapts to what is discovered                   |
| **Naturally Extensible**  | New capabilities plug in without workflow changes     |

### Comparison to Explicit Workflows

| Aspect               | Event-Driven (Current)        | Explicit (Planned)         |
| -------------------- | ----------------------------- | -------------------------- |
| **Definition**       | Implicit in type declarations | Explicit DAG/YAML          |
| **Flexibility**      | High - adapts to discoveries  | Fixed - follows definition |
| **Use Case**         | Reconnaissance, discovery     | Attack chains, CTFs        |
| **Operator Control** | Low - system decides          | High - operator defines    |
| **Complexity**       | Simple to add capabilities    | Complex workflow logic     |

For detailed technical documentation, see [orchestration-pattern.md](orchestration-pattern.md).

---

## Explicit Workflow Definitions (FUTURE)

The following sections describe the **planned** explicit workflow system based on Temporal.io. This is complementary to the event-driven system and will enable operator-defined attack chains.

---

## Phase 0: Proof of Concept

The initial proof-of-concept phase establishes fundamental viability by implementing basic, programmatic sequences of capabilities defined directly in backend code.

### Characteristics

| Aspect             | Description                       |
| ------------------ | --------------------------------- |
| **Definition**     | Programmatic sequences in code    |
| **Authors**        | Chariot developers only           |
| **Complexity**     | Simple linear chains              |
| **Infrastructure** | Lightweight scripting in Go       |
| **Purpose**        | Validate core execution mechanics |

### Implementation Focus

- **Rapid Prototyping**: Quick validation of capability chaining
- **Manual Chaining**: Direct capability invocation for fast iteration
- **Basic Error Handling**: Simple success/failure tracking
- **Prototype Registration**: Initial workflows registered in Agora

### Example PoC Workflow

```go
// Simplified PoC workflow definition
workflow := NewWorkflow("login-discovery")
workflow.AddStep("katana-crawl", KatanaCapability{
    Target: input.Domain,
    Depth:  3,
})
workflow.AddStep("screenshot-logins", ScreenshotCapability{
    URLs: "${katana-crawl.outputs.login_urls}",
})
workflow.Execute()
```

### Deliverables

- Minimal viable execution loop prototype
- Proof of capability integration
- Foundation for subsequent phases
- Early feedback on core logic

---

## Phase 2: Programmatic Workflows

The first production iteration supports programmatic, linear sequences of capabilities defined in code by Chariot developers with robust backend infrastructure.

### Characteristics

| Aspect             | Description                             |
| ------------------ | --------------------------------------- |
| **Definition**     | Backend-defined workflow specifications |
| **Authors**        | Chariot developers                      |
| **Complexity**     | Linear with state management            |
| **Infrastructure** | Temporal workflow engine                |
| **Purpose**        | Reliable automated attack chains        |

### Key Features

1. **Robust Backend Integration**
   - Proven open-source workflow engine (Temporal)
   - Reliable state management
   - Fault-tolerant task execution

2. **Agent-in-the-Loop Pattern**
   - Agent as a step within workflow
   - Analyzes output of one tool
   - Intelligently tunes parameters for next step
   - Enables adaptive automation without complex UI

3. **Agora Registration**
   - Workflows registered as high-level capabilities
   - Executed as single, unified tasks
   - Discoverable via Task Discovery API

### Example Phase 2 Workflow

```yaml
name: credential-attack-chain
description: Automated credential discovery and attack
steps:
  - id: discover-logins
    capability: katana-crawl
    params:
      target: ${input.domain}
      focus: login-forms

  - id: analyze-logins
    capability: agent-analyze
    params:
      context: ${discover-logins.outputs}
      prompt: "Identify most promising login targets"

  - id: screenshot
    capability: screenshot-urls
    params:
      urls: ${analyze-logins.outputs.selected_urls}

  - id: try-defaults
    capability: try-default-credentials
    params:
      targets: ${screenshot.outputs.login_forms}
```

### Deliverables

- Core sequential execution engine
- Workflow Transform Engine
- Temporal integration
- Agent-in-the-loop capability

---

## Phase 3: Operator-Defined Workflows

The second phase democratizes workflow creation by delivering the Workflow UI Builder, enabling operators to visually construct custom workflows without writing code.

### Characteristics

| Aspect             | Description                    |
| ------------------ | ------------------------------ |
| **Definition**     | Visual drag-and-drop interface |
| **Authors**        | Operators (non-developers)     |
| **Complexity**     | Visual sequential workflows    |
| **Infrastructure** | React Flow frontend            |
| **Purpose**        | Democratize workflow creation  |

### UI Builder Features

The implementation leverages modern open-source frontend libraries (React Flow) to create an **n8n-style** node-based interface.

```

                   Workflow UI Builder



   Recon   > Analyze > Attack
   Node         Node         Node


       v              v              v

           Capability Palette
    [Katana] [Nuclei] [SQLMap] [Agent]



```

### Operator Capabilities

| Feature                     | Description                               |
| --------------------------- | ----------------------------------------- |
| **Drag-and-Drop**           | Visual node placement and connection      |
| **Capability Palette**      | Browse and select registered capabilities |
| **Parameter Configuration** | Set inputs for each workflow step         |
| **Template Sharing**        | Save and share workflow templates         |
| **Execution Monitoring**    | Real-time workflow progress tracking      |

### Deliverables

- React Flow-based UI component
- Workflow serialization/deserialization
- Template management system
- Sharing and collaboration features

---

## Phase 4: Advanced Logic-Driven Orchestration

The final phase evolves the engine into a true orchestration platform capable of dynamic, logic-driven execution.

### Characteristics

| Aspect             | Description                          |
| ------------------ | ------------------------------------ |
| **Definition**     | Logic-driven workflow specifications |
| **Authors**        | Operators and agents                 |
| **Complexity**     | Conditional, parallel, looping       |
| **Infrastructure** | Advanced workflow patterns           |
| **Purpose**        | Full orchestration capabilities      |

### Advanced Features

1. **Conditional Logic**
   - If/then/else branching
   - Decision nodes based on outputs
   - Error handling branches

2. **Looping Constructs**
   - Iterate over collections
   - Retry with backoff
   - Until-condition loops

3. **Concurrency**
   - Parallel execution paths
   - Fan-out/fan-in patterns
   - Concurrent capability execution

4. **Dynamic Routing**
   - Route steps to correct backend (Janus or Aegis)
   - Context-aware executor selection
   - Adaptive path selection

### Example Advanced Workflow

```yaml
name: adaptive-assessment
description: Dynamic assessment with conditional logic
steps:
  - id: recon
    capability: full-recon
    params:
      target: ${input.domain}

  - id: analyze
    capability: agent-analyze
    params:
      findings: ${recon.outputs}

  - id: route-attacks
    type: conditional
    conditions:
      - if: ${analyze.outputs.has_logins}
        goto: credential-attacks
      - if: ${analyze.outputs.has_apis}
        goto: api-attacks
      - else:
        goto: general-scan

  - id: credential-attacks
    type: parallel
    steps:
      - capability: try-default-credentials
      - capability: brute-force-common
      - capability: check-registration

  - id: api-attacks
    type: loop
    over: ${analyze.outputs.api_endpoints}
    step:
      capability: api-security-scan
      params:
        endpoint: ${item}
```

### Deliverables

- Advanced Operator-Defined Workflow Engine
- Conditional, loop, and parallel constructs
- Dynamic routing logic
- Full ADK pattern integration (Sequential, Loop, Parallel agents)

---

## Workflow State Management

Tracking workflow execution state is critical for reliability, debugging, and analysis.

### State Models

```

                    ExecutionTrace
  - trace_id: unique identifier
  - workflow_id: reference to workflow definition
  - status: PENDING | RUNNING | SUCCESS | FAILED
  - started_at: timestamp
  - completed_at: timestamp
  - inputs: workflow input parameters


                           1:N
                          v

                     TaskRecord
  - record_id: unique identifier
  - trace_id: parent execution trace
  - step_id: workflow step identifier
  - capability: executed capability name
  - status: PENDING | RUNNING | SUCCESS | FAILED
  - started_at: timestamp
  - completed_at: timestamp
  - inputs: step input parameters
  - outputs: step output data
  - error: error details if failed

```

### State Persistence

- **Neo4j**: Structured state models for querying and visualization
- **S3 Data Lake**: Detailed JSON logs for analysis and training

---

## Workflow Transform Engine

The Transform Engine automatically maps data between workflow steps, enabling any two capabilities to be chained together seamlessly.

### Transform Process

```
Step A Output          Transform Engine           Step B Input

     v                       v                        v

 Schema A     >     Mapping         >     Schema B
 Output              Rules                  Input

```

### Capabilities

| Feature                 | Description                               |
| ----------------------- | ----------------------------------------- |
| **Schema Mapping**      | Map fields between different schemas      |
| **Type Conversion**     | Convert data types as needed              |
| **Collection Handling** | Transform arrays and lists                |
| **Default Values**      | Provide defaults for missing fields       |
| **Validation**          | Ensure transformed data meets constraints |

### Example Transform

```yaml
transform:
  source: katana-crawl.outputs
  target: screenshot.inputs
  mappings:
    - from: login_urls
      to: urls
      transform: flatten
    - from: metadata.depth
      to: options.max_depth
      default: 5
```
