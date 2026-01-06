# Core Principles

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Note**: These core principles are **implemented** throughout the platform, though some use alternative approaches that achieve the same goals:
>
> | Principle                  | Status                         | Notes                                                      |
> | -------------------------- | ------------------------------ | ---------------------------------------------------------- |
> | Task-Based Abstraction     | :white_check_mark: Implemented | Via Agora registry and capability-based execution          |
> | Capability Registry        | :white_check_mark: Implemented | Agora is fully operational with 3-way executor integration |
> | Executor Agnosticism       | :white_check_mark: Implemented | REST API routes to Janus/Aegis based on registry metadata  |
> | Capability-Based Execution | :white_check_mark: Implemented | 87 Janus capabilities + VQL artifacts in Aegis             |
> | Orchestration              | :warning: Partial              | AI-driven exists; operator-defined workflows not started   |
>
> **Key Alternative**: REST API over gRPC (pragmatic for Lambda/serverless), intensity-based constraints over OPA policies (simpler, sufficient for current needs).

The Chariot platform is built on foundational architectural principles that enable AI-driven offensive security at scale. These principles guide all design decisions and ensure the platform remains flexible, maintainable, and capable of evolving with the rapidly changing AI landscape.

## Table of Contents

- [Task-Based Abstraction](#task-based-abstraction)
- [Capability Registry](#capability-registry)
- [Executor Agnosticism](#executor-agnosticism)
- [Capability-Based Execution](#capability-based-execution)
- [Orchestration](#orchestration)

---

## Task-Based Abstraction

The primary interaction model involves AI Agents requesting the execution of **high-level offensive tasks** from specialized execution services (Janus, Aegis) via well-defined APIs.

### Key Characteristics

| Aspect                | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| **Abstraction Level** | High-level tasks (e.g., `PerformReconnaissance`, `ExecuteLateralMovement`) |
| **Interface**         | Well-defined APIs (Janus gRPC Task API)                                    |
| **Benefit**           | Abstracts away complexity of underlying tool execution and sequencing      |

### Example High-Level Tasks

```
PerformReconnaissance     - Discover attack surface
ExecuteLateralMovement    - Move between network segments
IdentifyLoginPortals      - Find authentication endpoints
TryDefaultCredentials     - Attempt common credential attacks
ValidateVulnerability     - Confirm exploitability
```

### Why Task-Based Abstraction Matters

This approach abstracts away the complexity of underlying tool execution and sequencing, enabling more effective agent planning and operation. Research (e.g., Singer et al., 2025) demonstrates that task-based abstraction significantly improves agent effectiveness by allowing them to reason at the appropriate level of abstraction.

---

## Capability Registry

A central metadata catalog (Agora) lists all available capabilities across the platform. The registry defines:

- **What** each capability does (inputs/outputs via the Chariot Schema)
- **Where** it runs (executor mapping)
- **When** it can be used (preconditions, constraints)

### Registry Metadata Structure

For each registered capability, the registry stores:

| Field                      | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| **Basic Information**      | Name, description, purpose, and category                    |
| **Input Schema**           | Required and optional parameters with types and constraints |
| **Output Schema**          | Structure and content of expected results                   |
| **Preconditions**          | Conditions that must be met before execution                |
| **Constraints**            | Limitations on execution (e.g., scope restrictions)         |
| **Examples**               | Sample invocations with parameters and expected results     |
| **Executor Mapping**       | Which service(s) can perform this capability                |
| **Vulnerability Mappings** | Links to relevant vulnerability identifiers                 |

### Execution Flow

```
Agent Request -> Registry Lookup -> Executor Selection -> Task Execution
```

Execution services consult this registry internally during task orchestration to find and select the appropriate capabilities.

---

## Executor Agnosticism

By relying on the Capability Registry for implementation details, the Agent Layer and high-level orchestration logic can request actions based on **intent** rather than being tied to a specific execution engine.

### Routing Logic

```

  Agent Request
  (Intent-Based)


         v

 Registry Lookup
 (Agora)


         v

  Route to
  Executor



    v         v

 Janus   Aegis

```

### Benefits

1. **Decoupled Planning**: Agents focus on strategy, not execution details
2. **Flexible Routing**: Platform routes execution based on registry metadata
3. **Future-Proof**: New executors can be added without agent changes
4. **Unified Interface**: Single API regardless of backend implementation

---

## Capability-Based Execution

High-level tasks are fulfilled by the execution services (Janus/Aegis) orchestrating sequences of lower-level, atomic actions known as **capabilities**.

### Capability Hierarchy

```
High-Level Task
     Capability Sequence
             Capability 1 (e.g., run scanner module)
             Capability 2 (e.g., execute exploit primitive)
             Capability 3 (e.g., parse results)
```

### Atomic Capability Examples

| Category         | Capability             | Description                        |
| ---------------- | ---------------------- | ---------------------------------- |
| **Scanning**     | `RunNmapScan`          | Execute network port scan          |
| **Discovery**    | `CrawlWebApp`          | Spider web application endpoints   |
| **Analysis**     | `ParseNucleiOutput`    | Process vulnerability scan results |
| **Exploitation** | `ExecuteSQLInjection`  | Attempt SQL injection attack       |
| **Validation**   | `ConfirmVulnerability` | Verify exploitability              |

### Abstraction Benefits

The platform provides a high level of abstraction for agents to request capabilities without being tightly coupled to their implementation details. This enables:

- **Modularity**: Individual capabilities can be updated independently
- **Composability**: Capabilities can be combined into complex workflows
- **Testability**: Each capability can be tested in isolation
- **Maintainability**: Clear separation of concerns

---

## Orchestration

The platform supports both dynamic, AI-driven task planning and deterministic, operator-defined workflows.

### Orchestration Modes

| Mode                 | Description                                    | Use Case                              |
| -------------------- | ---------------------------------------------- | ------------------------------------- |
| **AI-Driven**        | Dynamic planning initiated by high-level goals | Exploratory testing, adaptive attacks |
| **Operator-Defined** | Predefined sequences (attack chains/workflows) | Repeatable assessments, compliance    |
| **Hybrid**           | AI-driven with operator constraints            | Guided exploration within boundaries  |

### Framework Agnosticism

The orchestration layer is designed to be **framework-agnostic**, allowing for migration between agent frameworks. This is achieved through:

1. **Agent Definition Abstraction**: Framework-agnostic agent definitions
2. **Tool Integration Abstraction**: Unified tool interface across frameworks
3. **Execution Decoupling**: Stable APIs between orchestration and execution
4. **Workflow Pattern Abstraction**: Framework-agnostic workflow patterns

### Orchestration Principles

```

                    Orchestration Layer

  1. Accept high-level security goals
  2. Decompose into discrete tasks
  3. Discover available capabilities
  4. Select appropriate execution strategy
  5. Route to correct executor
  6. Monitor execution and adapt
  7. Synthesize results

```

This flexibility provides different operational modes for different needs while maintaining a consistent underlying architecture.
