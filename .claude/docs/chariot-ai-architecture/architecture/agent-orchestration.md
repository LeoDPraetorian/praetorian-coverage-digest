# Agent Orchestration Layer (Prometheus)

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :warning: PARTIAL (35%) for AI Agents | :white_check_mark: COMPLETE for Event-Driven Orchestration
>
> **Two Orchestration Systems**:
>
> 1. **Event-Driven Orchestration** :white_check_mark: COMPLETE
>    - LocalProcessor + spawnAll() = automatic capability chaining
>    - GetTargetTasks() = registry-based capability discovery
>    - Match() + Job.Send() = type-based routing
>    - See [orchestration-pattern.md](orchestration-pattern.md) for details
> 2. **AI Agent Orchestration** :warning: PARTIAL
>    - Uses AWS Bedrock + Claude (not Google ADK) - valid for AWS integration
>    - Single ReAct agent pattern (not hierarchical HPTSA)
>    - No specialized sub-agents for SQLi/XSS/Zero-Day yet
>    - N-Day Pattern: Not started
>    - Zero-Day Pattern: Not started (no hypothesis generation)
>    - Framework abstraction: Deferred per spec
>
> **Key Insight**: Chariot has a sophisticated orchestration system - it's just event-driven rather than AI-agent-driven. The LocalProcessor + spawnAll() pattern provides supervisor-loop equivalent functionality.

The Agent Orchestration Layer, codenamed Prometheus, coordinates security operations through two complementary systems:

1. **Event-Driven Orchestration** (IMPLEMENTED) - Automatic capability chaining via registry-based type matching
2. **AI Agent Orchestration** (PARTIAL) - AI-driven planning and goal decomposition

> **[Implementation Reality]**: The event-driven system is production-ready and handles most orchestration needs. AI agents (AWS Bedrock + Claude) provide goal interpretation and planning, but the actual execution orchestration is event-driven.

## Table of Contents

- [Overview](#overview)
- [Event-Driven Orchestration (IMPLEMENTED)](#event-driven-orchestration-implemented)
- [Comparison to Other Patterns](#comparison-to-other-patterns)
- [Planner / Orchestrator Agent](#planner--orchestrator-agent)
- [Specialized Sub-Agents](#specialized-sub-agents)
- [N-Day vs Zero-Day Agent Patterns](#n-day-vs-zero-day-agent-patterns)
- [Inter-Agent Communication](#inter-agent-communication)
- [Agent Framework Abstraction Layer](#agent-framework-abstraction-layer)

---

## Overview

The Prometheus layer coordinates all AI-driven decision-making within Chariot. It receives high-level security goals and decomposes them into executable tasks through a hierarchy of specialized agents.

```

              Agent Orchestration Layer (Prometheus)



              Planner / Orchestrator Agent

    - Receives security goals from operators
    - Breaks goals into discrete tasks
    - Coordinates specialized sub-agents



           v             v             v

     Recon         SQLi         Zero-Day
     Agent         Agent         Agent



            Framework Abstraction Layer



```

### Key Responsibilities

| Responsibility         | Description                                         |
| ---------------------- | --------------------------------------------------- |
| **Goal Decomposition** | Break high-level security goals into discrete tasks |
| **Task Discovery**     | Query available capabilities from Agora registry    |
| **Agent Coordination** | Dispatch tasks to specialized sub-agents            |
| **Context Management** | Maintain and share state across agent workflows     |
| **Safety Enforcement** | Ensure operations stay within authorized scope      |

---

## Event-Driven Orchestration (IMPLEMENTED)

> :white_check_mark: **Production Ready** - This is the primary orchestration mechanism in Chariot today.

Before discussing AI agents, it's important to understand that Chariot already has sophisticated orchestration through its **event-driven registry-based system**. This system handles:

- Automatic capability chaining based on asset type matching
- Unbounded parallelism via queue-based execution
- Fault isolation and recovery at the job level
- Self-organizing workflows that adapt to discoveries

### How Event-Driven Orchestration Works

```

                            Chariot Event-Driven
                             Orchestration Flow


User/Schedule  Job Created  SQS Queue  Compute Executor

                                                       v

                                              Match()
                                              "Can this
                                               capability
                                               process this
                                               asset type?"


                                               nil       error
                                              (yes)      (skip)
                                                      v

                                              Invoke()
                                              (Execute scan)


                                                      v

                                              Job.Send()
                                              (Stream results
                                               to Kinesis)


                                                      v

                                              LocalProcessor
                                              .Process()




                                         v                         v

                                    Neo4j                spawnAll()
                                    Insert
                                               GetTargetTasks
                                                           (Find all
                                                            capabilities
                                                            for this
                                                            asset type)


                                                                  v
                                                          Queue New Jobs

                                                                  v
                                                              [LOOP]
```

### Event-Driven vs AI-Agent Orchestration

| Aspect                  | Event-Driven (Current)         | AI Agent (Future)        |
| ----------------------- | ------------------------------ | ------------------------ |
| **Decision Maker**      | Type matching rules            | LLM reasoning            |
| **Workflow Definition** | Implicit (type declarations)   | Explicit (goals/plans)   |
| **Flexibility**         | Fixed rules, dynamic expansion | Adaptive reasoning       |
| **Predictability**      | High - deterministic           | Variable - probabilistic |
| **Use Case**            | Discovery, enumeration         | Attack planning, CTFs    |

For detailed documentation of the event-driven system, see [orchestration-pattern.md](orchestration-pattern.md).

---

## Comparison to Other Patterns

Chariot's event-driven orchestration maps directly to patterns used in other security automation systems:

| Pattern             | Example Systems                | Chariot Equivalent            |
| ------------------- | ------------------------------ | ----------------------------- |
| **Supervisor Loop** | ARTEMIS, AutoGPT               | LocalProcessor + spawnAll()   |
| **Phase Sequence**  | SHANNON, traditional pipelines | Emergent from asset type flow |
| **Explicit DAG**    | Temporal.io, Airflow, n8n      | Registry + type matching      |
| **Agent Hierarchy** | CrewAI, LangGraph              | Flat capabilities + routing   |

### Supervisor Loop Equivalence

ARTEMIS-style supervisor loops:

```
while not done:
    state = observe()
    action = decide(state)
    result = execute(action)
    update(result)
```

Chariot's equivalent:

```
LocalProcessor.Process():
    asset = receive_from_kinesis()          # observe
    capabilities = GetTargetTasks(asset)    # decide
    for cap in capabilities:
        queue_job(cap, asset)               # execute
    # Loop continues via Kinesis trigger     # update + loop
```

### Phase Sequence Equivalence

SHANNON-style phase sequences:

```
Phase 1: Reconnaissance
Phase 2: Enumeration
Phase 3: Vulnerability Scanning
Phase 4: Exploitation
```

Chariot's equivalent (emergent from type flow):

```
domain  DomainDiscovery  ipv4
ipv4  PortScan  port
port  Fingerprint  technology
technology  CVEMatch  vulnerability
```

The phases emerge naturally from asset type progressions rather than being explicitly defined.

---

## Planner / Orchestrator Agent

The Planner Agent is the strategic coordinator that receives security goals and orchestrates their execution.

### Input and Initialization

An initial "security goal" and scope are typically specified by:

- An operator via the UI
- An external system via the Platform API

### Task Discovery Process

The Planner Agent leverages the Task Discovery API to:

1. **Discover Available Tasks**
   - Query Agora for capabilities that could achieve the security goal
   - Understand task parameters and constraints

2. **Select Appropriate Tasks**
   - Analyze context and target environment
   - Choose tasks based on available capabilities

3. **Adapt Dynamically**
   - Respond to newly added capabilities without code changes
   - Adjust strategy based on execution results

### Planning Workflow

```

 Security
 Goal


       v

              Planner Agent

  1. Parse security goal and scope
  2. Query Task Discovery API
  3. Analyze available capabilities
  4. Formulate execution strategy
  5. Decompose into sub-tasks
  6. Dispatch to specialized agents
  7. Monitor and adapt



       v              v              v

 Sub-Task     Sub-Task     Sub-Task
    1            2            3

```

---

## Specialized Sub-Agents

Specialized agents carry out specific security tasks, each with domain expertise in particular attack categories.

### Agent Categories

| Agent Type              | Focus Area                    | Capabilities                                       |
| ----------------------- | ----------------------------- | -------------------------------------------------- |
| **Recon Agent**         | Attack surface discovery      | Asset enumeration, service identification          |
| **SQLi Agent**          | SQL injection                 | Injection detection, exploitation, data extraction |
| **XSS Agent**           | Cross-site scripting          | Payload generation, filter bypass                  |
| **ATO Agent**           | Account takeover              | Credential attacks, session hijacking              |
| **SSRF Agent**          | Server-side request forgery   | Internal scanning, cloud metadata access           |
| **Zero-Day Agent**      | Novel vulnerability discovery | Hypothesis generation, exploratory testing         |
| **Signature Gen Agent** | Detection signature creation  | Nuclei templates, Semgrep rules                    |

### N-Day Exploitation Agent

Agents that leverage known vulnerability descriptions (CVEs, advisories) to execute targeted attacks.

**Characteristics:**

- Uses vulnerability intelligence as input
- Matches vulnerability conditions to target systems
- Executes targeted exploits based on known parameters
- Validates successful exploitation

### Zero-Day Discovery Agent

Agents that perform broader exploration and hypothesis testing to discover previously unknown vulnerabilities.

**Characteristics:**

- Comprehensive attack surface mapping
- Pattern-based vulnerability hypothesis generation
- Structured coverage testing across vulnerability classes
- Synthesis of findings into coherent reports

### Vulnerability Signature Generation Agent

Dedicated workflows where agents analyze new CVE/advisory data and generate corresponding detection signatures.

**Outputs:**

- Semgrep rules for static analysis
- Nuclei templates for dynamic scanning
- Janus capability configurations

---

## N-Day vs Zero-Day Agent Patterns

The Chariot platform implements distinct agent methodologies for two fundamentally different vulnerability scenarios.

### N-Day Exploitation Agent Pattern

> **[Not Implemented]**: This pattern is not yet built. The basic agent infrastructure exists but CVE-driven exploitation workflows are not automated.

| Aspect        | Description                                               |
| ------------- | --------------------------------------------------------- |
| **Purpose**   | Exploit known vulnerabilities with available descriptions |
| **Structure** | ReAct-style single agent or simple sequential workflow    |
| **Input**     | Vulnerability descriptions (CVEs, advisories)             |
| **Approach**  | Direct application of vulnerability knowledge             |

**Key Capabilities:**

- Parsing vulnerability descriptions to identify exploitation methods
- Matching vulnerability conditions to target systems
- Executing targeted exploits based on known parameters
- Validation of successful exploitation

### Zero-Day Discovery Agent Pattern

> **[Not Implemented]**: This hierarchical team structure is a Q2FY26 goal. No hypothesis generation or specialized testing agents exist today.

| Aspect        | Description                                     |
| ------------- | ----------------------------------------------- |
| **Purpose**   | Discover previously unknown vulnerabilities     |
| **Structure** | Hierarchical team following HPTSA pattern       |
| **Input**     | Target scope and attack surface data            |
| **Approach**  | Systematic generation and testing of hypotheses |

**Hierarchical Team Structure:**

```

                   Supervisor Agent
  - Coordinates overall discovery strategy
  - Assigns tasks to specialized agents
  - Synthesizes findings



         v                 v                 v

  Reconnaissance     Hypothesis       Verification
     Agent           Generation          Agent
                       Agent
 Maps attack       Formulates        Validates
 surface           vulnerability     potential
 comprehensively   theories          findings



         v                 v                 v

 SQLi Testing      XSS Testing       SSRF Testing
 Agent             Agent             Agent

 Domain expert     Domain expert     Domain expert
 for SQL           for cross-site    for server-side
 injection         scripting         request forgery

```

**Key Capabilities:**

- Comprehensive attack surface mapping
- Pattern-based vulnerability hypothesis generation
- Structured coverage testing across vulnerability classes
- Correlation of multiple test results to identify complex vulnerabilities
- Synthesis of findings into coherent vulnerability reports

---

## Inter-Agent Communication

Data passing between agents within the same workflow invocation uses structured state management.

### Communication Mechanisms

**Shared Session State:**

- Primary mechanism for data passing (especially in Sequential/Loop Agent contexts)
- Uses ADK's `context.state` for shared data
- `output_key` property on `LlmAgent` instances saves results to shared state

**Example State Flow:**

```python
# Agent 1 writes to shared state
context.state["recon_results"] = {
    "endpoints": [...],
    "technologies": [...],
    "potential_vulnerabilities": [...]
}

# Agent 2 reads from shared state
recon_data = context.state["recon_results"]
for endpoint in recon_data["endpoints"]:
    # Perform targeted testing
    pass
```

### Context Sources

| Source                              | Purpose                           |
| ----------------------------------- | --------------------------------- |
| **Session State**                   | Intra-workflow data sharing       |
| **Environment State Service (ESS)** | External attack surface context   |
| **Agora Registry**                  | Capability and task metadata      |
| **Neo4j Graph**                     | Persistent asset and finding data |

---

## Agent Framework Abstraction Layer

To address the rapidly evolving AI landscape, Chariot implements a deliberate abstraction strategy to isolate core business logic from the underlying agent framework.

> **Note:** The implementation of this layer is a long-term architectural goal and is currently deferred from the immediate roadmap to prioritize core execution and agent capabilities.

### Framework Independence Principles

#### Agent Definition Abstraction

Agent definitions (prompts, tools, core behaviors) are maintained in a framework-agnostic format. An **Agent Definition Compiler** translates these abstract definitions into framework-specific implementations.

```

          Framework-Agnostic Agent Definition

  {
    "name": "SQLiAgent",
    "role": "SQL injection specialist",
    "tools": ["detect_sqli", "exploit_sqli"],
    "prompt_template": "..."
  }


                           v

              Agent Definition Compiler



              v                         v

   Google ADK                LangChain
   Implementation            Implementation

```

#### Tool Integration Abstraction

A **Unified Tool Interface** abstracts away framework-specific constraints, providing a consistent method for any agent to access any registered capability.

#### Execution Decoupling

The Agent Orchestration Layer interfaces with the Execution Layer through a well-defined, stable API. This ensures planning logic is completely decoupled from task execution specifics.

#### Workflow Pattern Abstraction

Core workflow patterns are defined using a framework-agnostic model. A **Workflow Translator** converts these patterns into framework-specific implementations.

| Pattern     | Description            | ADK Implementation |
| ----------- | ---------------------- | ------------------ |
| Sequential  | Steps execute in order | `SequentialAgent`  |
| Conditional | If/then/else logic     | `ConditionalAgent` |
| Parallel    | Concurrent execution   | `ParallelAgent`    |
| Loop        | Iterative execution    | `LoopAgent`        |

### Pragmatic Implementation Approach

1. **Lightweight Abstractions**: Begin with minimal abstractions focused on immediate pain points
2. **Compiler-Based Pattern**: Framework-agnostic definitions translated at runtime or build time
3. **Incremental Expansion**: Start with volatile areas and expand as patterns clarify
4. **Business Logic Isolation**: Security expertise and business logic remain pure and separate from framework details
