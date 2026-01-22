# Stage 2: Parallel Deep Discovery - Agent Spawning Patterns

**Executor**: N Explore agents (spawned by orchestrator)

**Duration**: 10-20 minutes (parallel execution)

**Purpose**: Deep DRY-focused analysis of each relevant component, executed in parallel for maximum efficiency.

---

## Critical: Parallel Execution Pattern

**ALWAYS spawn ALL agents in a SINGLE message with multiple Task tool uses.**

**Correct approach (parallel)**:

- Single message containing N Task tool invocations
- All agents start simultaneously
- Results return when all agents complete

**Incorrect approach (sequential)**:

- Send message with Task tool → wait for result → send next Task tool
- Agents run one at a time
- Takes N times longer

**Why parallelization matters**:

- 3 agents sequential: 30 minutes total (10 min each)
- 3 agents parallel: 10 minutes total (all run simultaneously)
- 10 agents parallel: Still ~15 minutes (most complete around same time)

---

## Input: scoping-report.json

Read from Stage 1 output:

```bash
cat $OUTPUT_DIR/discovery/scoping-report.json
```

Extract:

- `relevant_components` array (list of paths to analyze)
- `feature_context` (summary to include in prompts)
- `agent_count` (number of agents to spawn)

---

## Agent Configuration (Non-Negotiable)

### Thoroughness Mode

**ALWAYS use 'very thorough' mode.**

Do NOT use 'quick' or 'medium' modes for this workflow.

**Why**: Discovery is a one-time cost. Missing reusable code leads to:

- Duplicated effort in implementation
- Inconsistent patterns across codebase
- Technical debt from not following conventions

**Cost-benefit**:

- Very thorough: +5 minutes discovery time
- Missed patterns: +2 hours implementation time + ongoing maintenance burden

### Model Selection

**Recommend**: Use default model (sonnet) for most agents

**Upgrade to opus**: Only if component is:

- Large (>100 files)
- Critical infrastructure (authentication, authorization)
- Highly complex patterns (state management, async flows)

---

## Agent Prompt Template

Each agent receives a structured prompt with:

1. **Feature context** (from design.md via scoping-report.json)
2. **Assigned component path**
3. **DRY-focused search objectives**
4. **Structured output format requirements**
5. **Thoroughness mandate**

**Template**:

```
You are analyzing COMPONENT_PATH for the following feature:

FEATURE_CONTEXT_HERE

Your role: Discover ALL existing code in this component that can be EXTENDED or REUSED
for this feature. Do NOT propose implementations - only catalog what exists.

OBJECTIVES (DRY/Reuse Focus):

1. EXISTING CODE TO EXTEND
   Find all functions, classes, components, hooks that could be modified/extended
   to support this feature. Document their current purpose and extension points.

2. UTILITIES TO REUSE
   Find all utilities, helpers, formatters, validators that apply to this feature.
   Document their signatures and use cases.

3. PATTERNS TO FOLLOW
   Identify architectural patterns, naming conventions, file structures that
   new code MUST follow. Document the pattern and where it's exemplified.

4. FILE PLACEMENT GUIDANCE
   Based on existing structure, WHERE should new code be placed?
   (e.g., "New components go in features/X/, new hooks in hooks/useX.ts")

5. ANTI-PATTERNS TO AVOID
   List specific code smells, duplications, or deprecated patterns that exist
   in this component that new code should NOT replicate.

OUTPUT FORMAT:

Use structured markdown tables for all findings (see references/agent-output-format.md).

Tables MUST include:
- Name/Identifier
- Location (file path, NOT line numbers - use function names)
- Purpose/Use Case
- Extension Point or Reuse Pattern

THOROUGHNESS: very thorough mode

OUTPUT FILE: discovery-COMPONENT_NAME.md in OUTPUT_DIR/discovery/

MANDATORY SKILLS: persisting-agent-outputs (for output location)
```

---

## Component Path Assignment

**Mapping strategy**:

If `agent_count == relevant_components.length`:

- 1:1 mapping (ideal case)
- Agent 1 → Component 1
- Agent 2 → Component 2
- etc.

If `agent_count < relevant_components.length` (max 10 agents, >10 components):

- Assign largest N-1 components to dedicated agents
- Group remaining small components into 1 agent
- Example: 12 components → 9 dedicated agents + 1 agent analyzing 3 small components

If `agent_count == 1` (single component):

- One agent analyzes that component
- Still use structured prompt for consistency

---

## Spawn Command Pattern

**Pseudo-code**:

```
agents_to_spawn = []

for component in relevant_components:
  agent_config = {
    subagent_type: "Explore",
    description: f"Discover {component.name} for {feature_name}",
    prompt: generate_prompt(feature_context, component.path),
    model: "sonnet"  # or "opus" if component is large/critical
  }
  agents_to_spawn.append(agent_config)

# Spawn ALL agents in SINGLE message
spawn_all_agents_parallel(agents_to_spawn)
```

**Real implementation**: Use Task tool with multiple invocations in one message block.

---

## Agent Output Collection

Each agent produces: `discovery-{component-name}.md`

**Output location**:

```
$OUTPUT_DIR/discovery/discovery-{component-name}.md
```

**Output structure** (see references/agent-output-format.md for full schema):

```markdown
# Discovery: {Component Name}

## Component Overview

- Path: {path}
- Files analyzed: {count}
- Primary purpose: {description}

## 1. Existing Code to Extend

| Name | Location | Current Purpose | Extension Point |
| ---- | -------- | --------------- | --------------- |
| ...  | ...      | ...             | ...             |

## 2. Utilities to Reuse

| Name | Location | Signature | Use Case |
| ---- | -------- | --------- | -------- |
| ...  | ...      | ...       | ...      |

## 3. Patterns to Follow

| Pattern | Description | Example Location |
| ------- | ----------- | ---------------- |
| ...     | ...         | ...              |

## 4. File Placement Guidance

{prose describing where new code should go}

## 5. Anti-Patterns to Avoid

- {specific anti-pattern with rationale}
```

---

## Handling Agent Failures

### Agent Timeout

**Scenario**: Agent exceeds 30-minute timeout (rare for very thorough mode, but possible for massive components)

**Response**:

1. Check agent output file - may be partially complete
2. Mark component as "incomplete" in synthesis phase
3. Document gap in discovery.md: "X component not fully analyzed due to size"
4. Proceed with available discovery - DO NOT block Stage 3

### Agent Returns Empty Report

**Scenario**: Agent finds no reusable code (genuine greenfield component)

**Response**:

1. Verify agent actually analyzed the component (check output file exists)
2. Document "greenfield justification" in synthesis: "X is new feature area, no existing patterns"
3. Proceed normally - this is valid outcome

### Agent Returns Unstructured Output

**Scenario**: Agent writes prose instead of tables

**Response**:

1. Re-prompt agent: "Please reformat findings as tables per references/agent-output-format.md"
2. If still fails, extract data manually and restructure in synthesis phase
3. Note in changelog that agent output needed manual reformatting

---

## Quality Gates (Before Stage 3)

**Checklist**:

- [ ] All agents spawned in SINGLE message (parallel execution verified)
- [ ] All agents configured with 'very thorough' mode
- [ ] Each agent received feature_context + component_path + DRY-focused objectives
- [ ] All expected output files exist: discovery-{component}.md for each component
- [ ] Output files contain structured tables (not just prose)
- [ ] No agent reported critical errors (timeouts OK if partial output exists)

**If quality gate fails**: Address issues before proceeding to synthesis.

---

## Performance Expectations

| Agent Count | Typical Duration | Factors                                                   |
| ----------- | ---------------- | --------------------------------------------------------- |
| 1 agent     | 8-12 minutes     | Component size, thoroughness mode                         |
| 2-3 agents  | 10-15 minutes    | Parallel execution, largest component determines duration |
| 4-6 agents  | 12-18 minutes    | Good parallelization, slight coordination overhead        |
| 7-10 agents | 15-20 minutes    | Max parallelization, coordination overhead increases      |

**Note**: All agents run simultaneously, so total time ≈ slowest agent's time + coordination overhead.

---

## Next Stage

Once all agents return and output files validated → Proceed to Stage 3: Synthesis
