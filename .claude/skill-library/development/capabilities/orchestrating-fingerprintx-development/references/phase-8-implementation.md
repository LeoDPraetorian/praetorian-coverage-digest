# Phase 8: Implementation

**Execute architecture plan by spawning developer agents with injected skills.**

---

## Overview

Implementation phase executes the plan by delegating to developer agents:

1. Read skill manifest from Phase 4
2. Spawn capability-developer agents
3. Inject domain-specific skills into agent prompts
4. Execute in batches (from Phase 5 complexity plan)
5. Track progress and handle blockers

**Entry Criteria:** Phase 7 (Architecture Plan) complete with approved design (or skipped for BUGFIX/SMALL).

**Exit Criteria:** All plan tasks implemented, code written to files, agents returned successfully.

**:no_entry: COMPACTION GATE 2 FOLLOWS:** Before proceeding to Phase 9, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Read Skill Manifest

**REQUIRED:** Load skill manifest from Phase 4:

```bash
Read(".fingerprintx-development/skill-manifest.yaml")
```

This provides:

- `skills_by_domain.capabilities.library_skills[]` - Skills for capability developers
- `skills_by_domain.backend.library_skills[]` - Go-specific skills
- `skills_by_domain.testing.library_skills[]` - Skills for testers (used in Phase 13)

Store these for Step 3 (prompt injection).

---

## Step 2: Determine Developer Agent

Fingerprintx plugins use a single developer agent:

| Plugin Type | Developer Agent        |
| ----------- | ---------------------- |
| All         | `capability-developer` |

---

## Step 3: Build Agent Prompts with Skill Injection

**This is the critical step where Phase 4's work pays off.**

For the capability-developer agent, construct prompt by:

1. Reading plan tasks (from Phase 7 plan.md)
2. Reading architecture (from Phase 7 architecture.md)
3. **Reading skill manifest** (from Phase 4)
4. **Reading protocol research** (from Phase 3)
5. **Injecting library skills into prompt**

**Agent prompt template:**

```markdown
Task: Implement {protocol} fingerprintx plugin

## Plan Tasks

[List tasks from Phase 7 plan.md]

## Architecture

[Relevant sections from Phase 7 architecture.md]

## Protocol Research

[Summary from Phase 3 protocol-research.md]

- Detection markers: {markers}
- Version extraction: {method}
- Error handling: {strategy}

## MANDATORY SKILLS TO READ BEFORE STARTING

Based on codebase discovery (Phase 3) and skill discovery (Phase 4), you MUST read these library skills:

{{#each skills_by_domain.capabilities.library_skills}}

- Path: {{this.path}}
  Reason: {{this.trigger}}
  {{/each}}

**Example for capability-developer:**

- Path: .claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md
  Reason: Fingerprintx plugin development
- Path: .claude/skill-library/development/backend/go-best-practices/SKILL.md
  Reason: Go implementation patterns

YOU MUST READ THESE BEFORE WRITING CODE. No exceptions.

## Output Format

Follow persisting-agent-outputs for file locations and MANIFEST updates.

**Expected deliverables:**

- Plugin code files written
- Type constant added (alphabetical)
- Plugin import added (alphabetical)
- MANIFEST.yaml updated with your contribution
- Output metadata with skills_invoked array
```

---

## Step 4: Execute Implementation in Batches

**PRE-SPAWN CHECK:** Before EACH agent spawn (including retries), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%.

Use batch plan from Phase 5 Complexity:

**Batch 1 (Registration):**

```
Task(subagent_type: "capability-developer", prompt: {batch_1_prompt})
```

Tasks: Add type constant, add plugin import

**Wait for batch 1 to complete before starting batch 2** (dependencies).

**Batch 2 (Plugin Implementation):**

```
Task(subagent_type: "capability-developer", prompt: {batch_2_prompt})
```

Tasks: Create plugin file(s)

**For COMPLEX+ work:** Use `Skill("developing-with-subagents")` for execution with code review between batches.

---

## Step 5: Validate Agent Returns

When agent returns:

1. **Check status:** `complete` | `blocked` | `needs_review` | `needs_clarification`
2. **Read output file** (don't just trust summary)
3. **Verify skills_invoked array** includes injected skills
4. **Check files were written:**

```bash
# Verify plugin files exist
[ -f "pkg/plugins/services/{protocol}/plugin.go" ] && echo "FOUND" || echo "MISSING"

# Verify type constant added
grep -q "Service{Protocol}" pkg/plugins/types.go && echo "FOUND" || echo "MISSING"

# Verify plugin import added
grep -q "{protocol}" pkg/plugins/plugins.go && echo "FOUND" || echo "MISSING"
```

**If agent skipped injected skills:**

- DO NOT proceed
- Re-spawn agent with stronger emphasis
- Or escalate to user with warning

---

## Step 6: Validate P0 Requirements

Before completing Phase 8, verify P0 compliance:

| Check                      | Verification                                    |
| -------------------------- | ----------------------------------------------- | -------- |
| Type constant alphabetical | `grep "Service" pkg/plugins/types.go            | sort -c` |
| Plugin import alphabetical | `grep "plugins/services" pkg/plugins/plugins.go | sort -c` |
| Default ports documented   | Check package comment                           |
| Error handling complete    | Review error returns                            |

**If P0 failures:** Fix before proceeding or document for Phase 10.

---

## Step 7: Handle Blocked Agents

If agent returns `status: "blocked"`:

1. Read `blocked_reason` category
2. Route to appropriate resolution:

| blocked_reason          | Next Action                            |
| ----------------------- | -------------------------------------- |
| `missing_requirements`  | Escalate to user for clarification     |
| `architecture_decision` | Return to Phase 7 or escalate          |
| `protocol_unclear`      | Return to Phase 3 research or escalate |
| `test_failures`         | Fix and retry OR escalate              |

---

## Step 8: Update MANIFEST.yaml

```yaml
phases:
  8_implementation:
    status: "complete"
    completed_at: "{timestamp}"
    batches_executed: 2
    developer_agents: ["capability-developer"]

implementation:
  tasks_completed: 4
  files_modified: 2
  files_created: 1

  batches:
    - batch: 1
      tasks: ["T001", "T002"]
      status: "complete"
      agents: ["capability-developer"]

    - batch: 2
      tasks: ["T003"]
      status: "complete"
      agents: ["capability-developer"]
      depends_on: ["batch_1"]

  skills_injected:
    capabilities:
      - writing-fingerprintx-modules
      - go-best-practices

  blockers_encountered: 0
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Implementation Complete

**Tasks Completed:** 4 of 4
**Files Modified:** 2 (types.go, plugins.go)
**Files Created:** 1 (plugin.go)
**Batches:** 2 (registration, implementation)

**Developer Agents Used:**

- capability-developer (batches 1, 2)

**Skills Injected & Verified:**

- Capabilities: writing-fingerprintx-modules, go-best-practices

**P0 Quick Check:**

- Type constant: Added alphabetically
- Plugin import: Added alphabetically
- Error handling: Complete

-> Proceeding to Compaction Gate 2, then Phase 9: Design Verification
```

---

## BUGFIX/SMALL Path (No Architecture Plan)

For BUGFIX and SMALL work_types (Phase 7 skipped):

1. Use files from Phase 3 Discovery directly
2. Use skill manifest from Phase 4
3. Single batch execution
4. Simpler validation

**Simplified prompt for BUGFIX/SMALL:**

```markdown
Task: {Fix bug | Implement small change} in {protocol} plugin

**Files to modify:** [from Phase 3 Discovery]
**Protocol research:** [from Phase 3]

**MANDATORY SKILLS TO READ:**
[From Phase 4 skill manifest]

**Constraint:** Keep changes minimal and focused.
```

---

## Edge Cases

### Agent Returns Partial Implementation

If agent completes some tasks but not all:

- Mark completed tasks in MANIFEST
- Document incomplete tasks
- Re-spawn agent with remaining tasks

### Skills Not Invoked

If agent's `skills_invoked` array doesn't include injected skills:

- DO NOT mark phase complete
- Re-spawn with stronger language
- Add: "Your output shows you did NOT invoke {skill}. This is required."

### Build Failure

If `go build` fails after implementation:

- Do NOT proceed to Phase 9
- Fix compilation errors first
- Re-verify P0 requirements

---

## Retry Protocol

**Maximum retries per batch:** 2 (from orchestration-limits.yaml)

If batch fails after 2 retries:

- Mark batch as blocked
- Escalate to user with options:
  - Fix manually and resume
  - Skip batch and continue
  - Abort workflow

---

## Related References

- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Provides technical design and tasks
- [Phase 9: Design Verification](phase-9-design-verification.md) - Verifies implementation
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Provides skill manifest
- [Compaction Gates](compaction-gates.md) - Gate 2 follows this phase
- [file-scope-boundaries.md](file-scope-boundaries.md) - Conflict detection/resolution
