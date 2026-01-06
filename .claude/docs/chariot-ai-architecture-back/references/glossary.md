# Glossary

[<- Back to Overview](../OVERVIEW.md)

This glossary provides definitions for key terms used throughout the Chariot AI Architecture documentation. Terms are listed alphabetically.

---

## A

**Action Agent**
: An agent type designed to execute multi-step tasks such as writing scripts, performing code reviews, or running complex workflows. Implemented using Claude Code or Codex CLI patterns rather than structured output approaches.

**Aegis**
: The codename for Chariot's internal network agent, designed to operate inside client environments. It is a multi-component ecosystem built around the Velociraptor open-source DFIR platform to execute security tests and gather data from within a target network.

**Agent Framework Abstraction Layer**
: The architectural layer that sits between the Agent Architecture and the underlying AI agent framework (e.g., Google ADK). Its goal is to decouple Chariot's core logic from any single framework, allowing the platform to adopt new and improved frameworks in the future with minimal porting costs.

**Agent Planner**
: The primary "thinking" component within the Agent Orchestration Layer. It is an AI-driven component responsible for taking a high-level security goal from an operator, breaking it down into a sequence of tasks, and delegating those tasks to Specialized Sub-Agents or the Workflow Engine.

**Agora**
: The codename for Chariot's platform-wide Capabilities Registry. It serves as a central metadata catalog that stores the definitions, input/output schemas, and execution requirements for all capabilities (tools, workflows, and agents) available in the Chariot platform.

---

## B

**Benchmark Alignment Score**
: A composite score measuring Chariot's performance against external benchmarks (e.g., percentage of AIRTBench challenges solved). Used for market positioning and tracking agent capability improvements.

---

## C

**Capability**
: A (usually) deterministic, algorithmic system that performs a particular well-defined task. A small example: a secrets capability that takes a directory of files as input and produces a set of potential secret exposures as output. A large example: a web crawler that takes a set of seed URLs as input and produces a set of requests and responses as output.

**Capability Discovery**
: Programmatically determining which capabilities are available in Chariot, by making API requests to Agora.

**Credential Stuffing**
: An attack whereby a set of known credentials (such as emails and passwords from a password breach) is used against another authenticated service to try to gain access there.

---

## D

**Data Layer**
: The persistence layer of the platform responsible for storing all structured and unstructured data. It consists of the Neo4j Graph Database for storing findings and asset relationships, and the Interaction & Telemetry Data Lake (S3) for storing raw logs and telemetry for AI model training.

**Decision Agent**
: An agent type that evaluates conditions and possible choices to determine optimal actions. Examples include selecting capabilities for an asset, analyzing test results, or choosing parameters for subsequent tests. Implemented using BAML-based decision logic.

**Dual-Tool Logic**
: The Planner Agent's capability to dynamically evaluate and select between executing a pre-defined workflow (for structured, multi-step processes) or invoking individual low-level capabilities (for targeted, ad-hoc actions) based on the current context, available options, and the high-level security goal, enabling flexible and efficient decision-making in achieving objectives.

---

## E

**ETC (Easy to Change)**
: An architectural principle emphasizing flexibility and adaptability. Given the rapid advancement of AI and agent technologies, Chariot's architecture must support quick adoption of new models, tools, and workflow patterns with minimal friction.

**Execution Layer**
: The "hands" of the platform, responsible for all direct interaction with target environments. This layer contains the services that execute tasks, such as Janus (for external targets) and Aegis (for internal targets).

---

## F

**Fast Path Pipeline**
: A low-latency execution pathway within the platform designed to prioritize and accelerate agent and operator requests using persistent workers, ensuring quick processing for time-sensitive tasks while routing bulk or asynchronous jobs to a scaled path, thereby balancing speed and scalability without compromising performance.

---

## G

**Generalization**
: An AI agent's ability to succeed in novel scenarios (e.g., new network topologies, unseen vulnerability patterns). Measured via Novel Scenario Success Rate targeting >40% success on novel CTF challenges.

---

## H

**Harness**
: A programmatic interface created for a specific target (web form, login portal, service) that allows optimized interaction. The architecture explores applying harness creation beyond code functions to generic targets like web applications.

**HITL (Human-in-the-Loop)**
: A workflow pattern where human operators provide oversight, input, or validation at key stages of an automated process, such as reviewing AI-generated suggestions or approving actions, to combine machine efficiency with human expertise and ensure accuracy, ethics, and compliance in complex tasks like vulnerability signature generation.

**HPTSA (Hierarchical Planning and Task-Specific Agents)**
: An agent design pattern used by Chariot where a high-level Planner Agent decomposes a complex goal into smaller tasks, which are then delegated to different Specialized Sub-Agents to execute.

---

## J

**Janus**
: The codename for Chariot's primary engine in the Execution Layer responsible for executing offensive tasks against external, internet-facing targets and cloud environments.

---

## M

**MCP (Model Context Protocol)**
: The standardized protocol used by external clients (e.g., the Cursor tool) to communicate with the Chariot platform. It allows for rich, structured context to be passed to the Planner Agent, and for the agent's "tool use" requests to be sent back to the Chariot backend for execution.

---

## N

**Novel Scenario Success Rate**
: A performance metric measuring agent success in unseen environments (e.g., new network topologies). Core metric from NYU CTF Bench and MHBench benchmarks, targeting >40% success on novel CTF challenges.

---

## O

**Operator**
: A human user interacting with the Chariot platform, typically a security professional who defines high-level goals and oversees automated security operations.

---

## P

**Parsing Agent**
: An agent type designed to extract structured information from unstructured or variable-format data. Examples include parsing web pages to identify form fields despite varying naming conventions (user, username, email, userId). Implemented using BAML-based structured output.

**Prometheus**
: The codename for the Agent Orchestration Layer, which contains the Planner Agent, Specialized Sub-Agents, and the Workflow Engine.

---

## S

**Scaled Path**
: The bulk processing execution pathway within the platform, designed for high-volume asynchronous jobs. Complements the Fast Path Pipeline by handling non-time-sensitive operations.

**Sub-Agent**
: An "expert" agent designed to carry out a specific, complex task delegated by the Planner Agent. Examples include agents dedicated to SQL injection, credential attacks, or CVE signature generation.

---

## T

**Tabularium**
: The codename for Chariot's Universal Schema, including the core Go data models for assets, risks, technologies, and vulnerabilities.

**Transfer Learning Improvement**
: A performance metric measuring percentage improvement after fine-tuning on proprietary data. From Galileo AI and HackSynth methodologies, targeting +20% success post-training loop.

---

## V

**Validator Framework**
: A system within the Execution Layer that programmatically verifies and confirms findings (e.g., vulnerabilities) by re-executing attack logic or tests, reducing false positives and automating triage through specialized ValidatorCapabilities that transition risks from pending states to validated outcomes.

---

## W

**Workflow**
: A pre-defined sequence of capabilities chained together to automate a multi-step task. Workflows are executed by the Workflow Engine.

**Workflow Engine**
: A core component designed to execute and manage pre-defined sequences of capabilities. It acts as the platform's "connective tissue," allowing both AI agents and human operators to automate and run complex, multi-step attack chains.

---

## Platform Entity Terms

These terms represent core data entities across the Chariot platform:

**Asset**
: External-facing resources discovered via scanning (e.g., domains, IPs, services).

**Risk**
: Security vulnerabilities and threat assessments associated with assets.

**Attribute**
: Asset properties and metadata enriching the security context.

**Seed**
: Discovery starting points for asset enumeration operations.

**Job**
: Asynchronous security scan operations tracked by the platform.

---

## Performance Metrics

Key metrics referenced in requirements:

| Metric                        | Definition                             | Target                     |
| ----------------------------- | -------------------------------------- | -------------------------- |
| Novel Scenario Success Rate   | Success in unseen environments         | >40% on novel CTFs         |
| Transfer Learning Improvement | Post-fine-tuning improvement           | +20% success               |
| Benchmark Alignment Score     | Composite external benchmark score     | Top-quartile vs. SOTA      |
| Fairness Score                | Equity in vulnerability prioritization | >90% in diverse benchmarks |
