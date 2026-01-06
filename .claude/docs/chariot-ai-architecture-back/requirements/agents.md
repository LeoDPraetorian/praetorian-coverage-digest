[ Back to Overview](../OVERVIEW.md)

# Agent Requirements

This document contains all agent-related requirements for the Chariot AI Architecture platform, including agent architecture, sub-agent specifications, and learning/RL requirements.

## Summary

| Status      | Count  |
| ----------- | ------ |
| Not Started | 15     |
| **Total**   | **15** |

---

## Core Agent Architecture

### REQ-AGENT-001

**Integration via Model Context Protocol (MCP)**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Implement a public-facing MCP Server to receive requests using the Model Context Protocol. The server will query Agora for capability validation and use the Unified Execution API to dispatch tasks to Janus or Aegis. A corresponding "Chariot Tool" must be published for the Cursor environment to capture user intent and communicate with the MCP server.

**Rationale:**

This integration provides a path for operators to begin using Chariot's powerful execution backend immediately, serving as an official bridge while more advanced agentic and workflow components are developed. Key benefits include:

- **Enables Cloud-Powered Execution:** Allows operators to offload computationally intensive or long-running tasks to the Chariot cloud infrastructure
- **Centralizes Telemetry for AI Development:** Captures high-quality, structured telemetry data required to build and train Chariot's proprietary AI models
- **Unifies Teams and Accelerates Capability Development:** Provides a single, official method for agent-assisted testing
- **Drives Platform Adoption & Upsell Opportunities:** Funnels all activity through this integration, enabling readouts via the Chariot UI

---

### REQ-AGENT-002

**Planner Agent MVP with Hardcoded Workflows**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Design and implement a minimum viable Planner Agent that can orchestrate other capabilities to achieve a high-level goal. The Planner must:

1. Query the Unified Capability Discovery API to get a unified list of all available capabilities (atomic tools and specialized agents)
2. Contain internal, hardcoded workflow logic to define the sequence of steps needed to achieve a mission
3. Use an LLM to reason over the available capabilities and select the appropriate one at each step of its hardcoded workflow
4. Invoke capabilities via the Unified Execution API

**Rationale:**

This requirement allows the AI team to begin developing the Planner's high-level strategic reasoning in parallel with the platform team's work on the formal Workflow Engine. The use of hardcoded workflows is a temporary, pragmatic step to de-risk development and enable progress, with the express intent of replacing this logic with the programmatic Workflow Engine in a future quarter.

---

## Specialized Sub-Agents

### REQ-AGENT-003

**Specialized Account Takeover (ATO) Agent**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Build a self-contained agent dedicated to executing complex, multi-step credential attack strategies.

**Rationale:**

This directly addresses the business need to automate the detection of high-impact credential attacks, reducing manual effort and the competitive risk of being "dinged" by bug bounty programs. It ensures the AI team delivers an integrated, valuable component that solves a specific, material risk for clients.

---

### REQ-AGENT-004

**Specialized SQL Injection Sub Agent**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Build a self-contained agent focused on finding and confirming critical web application vulnerabilities like SQL Injection.

**Rationale:**

This requirement addresses the business need to automate the detection of critical web application vulnerabilities (like SQLi). It also serves as a second use case to prove that the specialized agent development pattern is repeatable for different complex problem domains.

---

### REQ-AGENT-005

**CVE Generator Agent**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q3FY25      |
| **Priority** | High        |

**Description:**

Build the agent that takes a CVE as input and works with a human operator to generate and test a corresponding vulnerability signature.

**Rationale:**

De-risks the larger signature generation initiative by providing immediate value to the security research team. It establishes the crucial Human-in-the-Loop workflow and creates the primary mechanism for generating the high-quality, human-approved feedback data needed to train a fully autonomous model later.

---

### REQ-AGENT-006

**Context Aware Semgrep Rule Generator Agent (Unauthenticated Endpoints)**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Build an agent that denoises semgrep output. First area of focus will be authorization and authentication issues with high accuracy on being a true positive.

**Rationale:**

This allows us to move 60% of our PS business (appsec), along with DAST, to continuous subscriptions.

---

## Asset & Target Management

### REQ-AGENT-007

**Asset Scoring & Prioritization Engine**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Build a service or Janus task that enriches assets with data points (technologies, WAF presence, etc.) and calculates a "target interest" score to guide agent focus.

**Rationale:**

Maximizes return on investment by strategically focusing agent resources on the most valuable and interesting targets first.

---

### REQ-AGENT-008

**Enhance the Planner Agent's Initial Logic**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

The agent's first step will no longer be "attack the target." It will now be: "Query for the highest-scoring, non-deduplicated asset within the program scope and begin assessment."

**Rationale:**

This operationalizes the targeting engine, ensuring the agent's power is always directed at the most valuable targets first.

---

## Agent Integration

### REQ-AGENT-009

**AutoTriage Integration**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Integrate findings from new specialized agents with the existing AutoTriage agent's input queue for automated analysis and recommendation.

**Rationale:**

Closes the loop on new attack capabilities by feeding their findings directly into the AI analysis pipeline, creating a fully automated discovery-to-recommendation chain.

---

### REQ-AGENT-010

**Planner Agent Validator Integration**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q4FY25      |
| **Priority** | Medium      |

**Description:**

Enhance the Planner Agent to automatically trigger the corresponding ValidatorCapability after the AutoTriage agent provides an "accept" recommendation.

**Rationale:**

Makes the validation process autonomous. The Planner orchestrates not just attacks, but the entire confirmation process, moving from a simple toolchain to an intelligent workflow.

---

### REQ-AGENT-011

**Enhance Model Context Protocol (MCP) for Multi-Agent Communication**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Expand the existing MCP to support seamless, secure communication between agents in hierarchical setups (e.g., Planner delegating to Sub-Agents). This includes:

- Standardizing message formats for context sharing (e.g., state, retrieved data from RAG/memory), with encryption and validation against injection attacks
- Enabling multi-agent coordination (e.g., self-play or collaborative planning), integrated with the Workflow Engine for dynamic routing
- Add logging and auditing for inter-agent exchanges, tying into safety metrics

**Rationale:**

Inter-agent communication is a growing need for modular systems, but the current MCP focuses on external clients without deep multi-agent support. This would mitigate context loss in multistage attacks, improving Consistency Across Runs and enabling advanced features like BAS correlations. It aligns with 2025 trends toward interoperable agent ecosystems, enhancing platform scalability without major redesign.

---

## Agent Performance & Monitoring

### REQ-AGENT-012

**Planner Agent Performance Metrics**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Develop and implement a set of key performance indicators (KPIs) to measure the effectiveness and efficiency of the Planner Agent. This includes analyzing logged agent interactions to track metrics like 'task success rate', 'time to goal', 'tool selection accuracy', and 'cost per engagement'.

**Rationale:**

"What gets measured gets improved." Establishing concrete metrics is the essential first step to understanding the Planner Agent's performance bottlenecks and decision-making quality. This data is the prerequisite for any targeted improvement.

---

## Advanced AI Capabilities

### REQ-AGENT-013

**Integrate Retrieval-Augmented Generation (RAG) into the Agent Orchestration Layer**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q1FY26      |
| **Priority** | Medium      |

**Description:**

Enhance the Planner Agent and Specialized Sub-Agents to incorporate RAG mechanisms. This involves:

- Building a retrieval component that queries external or internal knowledge bases (e.g., the Telemetry Data Lake in S3, Neo4j Graph Database, or curated vulnerability sources like NVD/CVE feeds)
- Integrating RAG into the reasoning loop: retrieve pertinent data before LLM generation
- Support vector embeddings and semantic search for efficient retrieval
- Ensure RAG is framework-agnostic and includes safeguards against common vulnerabilities
- UI Integration: Expose RAG-retrieved context in the Operator's Workbench for human review

**Rationale:**

RAG addresses key LLM limitations in offensive security, such as hallucinations, nondeterminism, and outdated knowledge, by grounding agent reasoning in factual, real-time data. Empirical evidence demonstrates that RAG can boost success rates by 2x in dynamic environments while reducing error recovery needs.

---

### REQ-AGENT-014

**Implement External Memory Mechanisms for Context Retention**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Low         |

**Description:**

Enhance the Agent Orchestration Layer with external memory modules to store and retrieve long-term context across multistage tasks. This includes:

- Integrating a vector database or key-value store to persist agent states, past actions, and retrieved knowledge
- Enabling agents to query/write to this memory during reasoning loops, using techniques like Summary Injection
- Support for selective memory access via semantic search with safeguards against data leakage
- UI Integration: Display memory contents in the Operator's Workbench

**Rationale:**

LLMs often suffer from context loss in multistage attacks (e.g., forgetting discovered credentials during exploitation), leading to cascading failures and reduced reliability. External memory can improve consistency by 20-30% in complex scenarios like lateral movement.

---

### REQ-AGENT-015

**Incorporate Reinforcement Learning for Adaptive Agent Training**

| Field        | Value       |
| ------------ | ----------- |
| **Status**   | Not Started |
| **Target**   | Q2FY26      |
| **Priority** | Low         |

**Description:**

Integrate reinforcement learning (RL) techniques into the learning loops for training agents on simulated environments. This involves:

- Using RL frameworks (e.g., compatible with SageMaker) to reward agents for successful attack paths
- Supporting self-play scenarios (e.g., agent vs. agent simulations mimicking attack-defend competitions)
- Fine-tuning proprietary models on RL-generated data, with HITL oversight
- Track improvements via metrics like Transfer Learning Improvement

**Rationale:**

Current LLM agents struggle with adaptation to novel threats, limiting generalization. RL enables agents to learn from failures, boosting Novel Scenario Success Rate for zero-days and BAS simulations. It aligns with 2025 trends toward RL-hybrid LLMs for robust offensive security.

---

## Related Requirements

- [REQ-WF-001](workflow.md#req-wf-001) - Sequential Workflow Execution
- [REQ-PERF-001](performance-metrics.md#req-perf-001) - Measure AI Effectiveness
- [REQ-ZDAY-001](zero-day.md#req-zday-001) - Zero-Day Discovery Agent Team
