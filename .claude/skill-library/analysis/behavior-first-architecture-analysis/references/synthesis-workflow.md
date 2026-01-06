# Synthesis Workflow

How to combine results from parallel agents into accurate architecture documentation.

## Step 1: Collect Agent Outputs

Wait for all 4 agents to return. Each should have:

- Execution path with file:line references
- Pattern identification
- Code evidence
- Counter-evidence searches performed

## Step 2: Build Convergence Matrix

Create a table comparing what each agent found:

```markdown
| Agent            | Entry Point        | Pattern Found | Key Evidence    |
| ---------------- | ------------------ | ------------- | --------------- |
| Request Flow     | HTTP handlers      | [pattern]     | [file:function] |
| Object Lifecycle | Domain objects     | [pattern]     | [file:function] |
| Registration     | Init/registry code | [pattern]     | [file:function] |
| Reverse Trace    | DB writes          | [pattern]     | [file:function] |
```

## Step 3: Assess Convergence

### Strong Convergence (High Confidence)

All agents found the same or compatible patterns:

```
Agent 1: "Distributed, type-driven dispatch"
Agent 2: "Emergent job chaining via capability registry"
Agent 3: "Explicit registry-based dispatch"
Agent 4: "Hybrid: distributed implicit + queue-based"
```

→ All describe the same underlying system from different angles.

### Weak Convergence (Investigate)

Agents found different patterns:

```
Agent 1: "Centralized workflow engine"
Agent 2: "No orchestration found"
Agent 3: "Event-driven dispatch"
Agent 4: "Direct database writes"
```

→ Discrepancies need investigation. One or more agents may have missed something.

### No Convergence (Re-analyze)

Agents found contradictory patterns:

```
Agent 1: "Synchronous request-response"
Agent 2: "Asynchronous queue-based"
```

→ Either the system is inconsistent, or agents traced different subsystems. Narrow scope and re-run.

## Step 4: Identify Common Patterns

Look for recurring themes across agent outputs:

| Pattern Type       | Description                 | Evidence Locations |
| ------------------ | --------------------------- | ------------------ |
| Dispatch mechanism | How work routes to handlers | List all file:line |
| State management   | How state transitions occur | List all file:line |
| Chaining mechanism | How A leads to B            | List all file:line |
| Error handling     | How failures propagate      | List all file:line |

## Step 5: Compare to Original Assumptions

If you started with assumptions or specs:

```markdown
| Original Assumption        | What Agents Found      | Status             |
| -------------------------- | ---------------------- | ------------------ |
| "Workflow engine"          | Event-driven dispatch  | Different paradigm |
| "Centralized orchestrator" | Distributed registry   | Different paradigm |
| "State machine"            | Implicit type matching | Different paradigm |
| "Missing X"                | X implemented via Y    | Naming difference  |
```

## Step 6: Document Actual Gaps

Only list gaps where:

1. All 4 agents failed to find the capability
2. Each agent searched for 3+ alternative implementations
3. Counter-evidence is documented

```markdown
## Actual Gaps (Evidence-Based)

### Gap: Crash-safe audit logging

- Agent 1 searched: audit_log, execution_log, replay_log → None found
- Agent 2 searched: transaction_log, event_store → None found
- Agent 3 searched: journal, chronicle, history → None found
- Agent 4 searched: DB write paths for logging → None found

Conclusion: No append-only execution log for crash recovery.

### NOT a Gap: Workflow orchestration

- Initially assumed missing
- Agent findings: Event-driven orchestration via GetTargetTasks() + Match()
- Different paradigm, not missing functionality
```

## Step 7: Produce Final Documentation

Structure the output:

```markdown
# Architecture Analysis: [Component/System]

## Executive Summary

[2-3 sentences describing what the system actually is]

## Paradigm Identification

| Aspect   | Implementation | Evidence        |
| -------- | -------------- | --------------- |
| [aspect] | [how it works] | [file:function] |

## Triangulation Results

[Include convergence matrix from Step 2]

## Corrected Understanding

[Table from Step 5 if original assumptions existed]

## Actual Gaps

[Only gaps with full counter-evidence documentation]

## Key Code Locations

| Mechanism   | Location    | Purpose        |
| ----------- | ----------- | -------------- |
| [mechanism] | [file:line] | [what it does] |
```

## Common Synthesis Mistakes

| Mistake                                     | Correction                                 |
| ------------------------------------------- | ------------------------------------------ |
| Averaging agent opinions                    | Look for convergence, not compromise       |
| Ignoring contradictions                     | Contradictions mean re-investigate         |
| Trusting single-agent findings              | Require multi-angle confirmation           |
| Documenting gaps without counter-evidence   | Every gap needs search documentation       |
| Using spec language for actual architecture | Use language that describes what code DOES |
