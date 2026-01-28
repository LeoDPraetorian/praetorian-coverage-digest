# Phase 8: Implementation

**Execute architecture plan by spawning capability developer agents with injected skills.**

---

## Overview

Implementation phase executes the plan by delegating to developer agents:

1. Read skill manifest from Phase 4
2. Spawn capability-developer agent for capability type
3. Inject capability-specific skills into agent prompts
4. Execute in batches (from Phase 5 complexity plan)
5. Track progress and handle blockers

**Entry Criteria:** Phase 7 (Architecture Plan) complete with approved design (or skipped for BUGFIX/SMALL).

**Exit Criteria:** All plan tasks implemented, capability artifacts written to files, agents returned successfully.

**COMPACTION GATE 2 FOLLOWS:** Before proceeding to Phase 9, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Read Skill Manifest

**REQUIRED:** Load skill manifest from Phase 4:

```bash
Read(".capability-development/skill-manifest.yaml")
```

This provides:

- `skills_by_domain.capability.library_skills[]` - Skills for capability developers
- `skills_by_domain.backend.library_skills[]` - Skills for Go implementation (if applicable)
- `skills_by_domain.testing.library_skills[]` - Skills for testers (used in Phase 13)

Store these for Step 3 (prompt injection).

---

## Step 2: Determine Developer Agents

Based on `capability_type` from Phase 3:

| Capability Type | Developer Agent        | Additional Agents                   |
| --------------- | ---------------------- | ----------------------------------- |
| VQL             | `capability-developer` | None                                |
| Nuclei          | `capability-developer` | None                                |
| Janus           | `capability-developer` | `backend-developer` (if Go modules) |
| Fingerprintx    | `capability-developer` | `backend-developer` (Go required)   |
| Scanner         | `capability-developer` | `backend-developer` (API client)    |

---

## Step 3: Build Agent Prompts with Skill Injection

**This is the critical step where Phase 4's work pays off.**

For each developer agent, construct prompt by:

1. Reading plan tasks for this domain (from Phase 7 plan.md)
2. Reading architecture for this domain (from Phase 7 architecture.md)
3. **Reading skill manifest for this domain** (from Phase 4)
4. **Injecting library skills into prompt**

**Agent prompt template:**

```markdown
Task: Implement {capability description}

## Plan Tasks

[List tasks from Phase 7 plan.md]

## Architecture

[Relevant sections from Phase 7 architecture.md]

## MANDATORY SKILLS TO READ BEFORE STARTING

Based on codebase discovery (Phase 3) and skill discovery (Phase 4), you MUST read these library skills:

{{#each skills_by_domain.capability.library_skills}}

- Path: {{this.path}}
  Reason: {{this.trigger}}
  {{/each}}

**Example for capability-developer (VQL):**

- Path: .claude/skill-library/development/capabilities/writing-vql-capabilities/SKILL.md
  Reason: VQL capability detected

**Example for capability-developer (Nuclei):**

- Path: .claude/skill-library/development/capabilities/writing-nuclei-templates/SKILL.md
  Reason: Nuclei template detected

**Example for capability-developer (Fingerprintx):**

- Path: .claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/SKILL.md
  Reason: Fingerprintx module detected

YOU MUST READ THESE BEFORE WRITING CODE. No exceptions.

## Output Format

Follow persisting-agent-outputs for file locations and MANIFEST updates.

**Expected deliverables:**

- Capability artifact files written
- MANIFEST.yaml updated with your contribution
- Output metadata with skills_invoked array
```

---

## Step 4: Check File Scope Conflicts

Before spawning multiple agents in parallel:

```javascript
// Check for file overlap
const capability_files = plan.tasks.filter((t) => t.domain === "capability").map((t) => t.file);
const backend_files = plan.tasks.filter((t) => t.domain === "backend").map((t) => t.file);

const overlap = capability_files.filter((f) => backend_files.includes(f));

if (overlap.length > 0) {
  // CONFLICT - agents would edit same files
  // -> Execute sequentially OR split file ownership
} else {
  // SAFE - spawn in parallel
}
```

See [file-scope-boundaries.md](file-scope-boundaries.md) for complete resolution strategies.

---

## Step 5: Execute Implementation in Batches

**PRE-SPAWN CHECK:** Before EACH agent spawn (including retries), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%.

Use batch plan from Phase 5 Complexity:

**Batch 1 (Foundation):**

```
Task(subagent_type: "capability-developer", prompt: {batch_1_prompt})
```

**Wait for batch 1 to complete before starting batch 2** (dependencies).

**Batch 2 (Dependent tasks):**

```
Task(subagent_type: "capability-developer", prompt: {batch_2_prompt})
```

**For COMPLEX+ work:** Use `Skill("developing-with-subagents")` for execution with code review between batches.

---

## Step 6: Validate Agent Returns

When each agent returns:

1. **Check status:** `complete` | `blocked` | `needs_review` | `needs_clarification`
2. **Read output file** (don't just trust summary)
3. **Verify skills_invoked array** includes injected skills
4. **Check files were written** (verify capability artifact exists)

**If agent skipped injected skills:**

- DO NOT proceed
- Re-spawn agent with stronger emphasis
- Or escalate to user with warning

**Capability-specific validation:**

| Capability Type | Validation Check                           |
| --------------- | ------------------------------------------ |
| VQL             | Query parses without errors                |
| Nuclei          | Template validates with `nuclei -validate` |
| Janus           | Go code compiles                           |
| Fingerprintx    | Go code compiles, implements interface     |
| Scanner         | Go/Python code runs without import errors  |

---

## Step 7: Handle Blocked Agents

If agent returns `status: "blocked"`:

1. Read `blocked_reason` category
2. Route to appropriate resolution:

| blocked_reason          | Next Action                        |
| ----------------------- | ---------------------------------- |
| `missing_requirements`  | Escalate to user for clarification |
| `architecture_decision` | Return to Phase 7 or escalate      |
| `security_concern`      | Route to security-lead or escalate |
| `syntax_error`          | Provide error details, retry       |
| `test_failures`         | Fix and retry OR escalate          |

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
  files_modified: 1
  files_created: 2

  batches:
    - batch: 1
      tasks: ["T001", "T002"]
      status: "complete"
      agents: ["capability-developer"]

    - batch: 2
      tasks: ["T003", "T004"]
      status: "complete"
      agents: ["capability-developer"]
      depends_on: ["batch_1"]

  skills_injected:
    capability:
      - writing-vql-capabilities
      - gateway-capabilities

  blockers_encountered: 0

  artifacts_created:
    - path: "{capability_file}"
      type: "{VQL/Nuclei/Go}"
      validated: true
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Implementation Complete

**Tasks Completed:** 4 of 4
**Files Modified:** 1
**Files Created:** 2
**Batches:** 2 (executed sequentially with dependencies)

**Developer Agents Used:**

- capability-developer (batches 1, 2)

**Skills Injected & Verified:**

- Capability: writing-vql-capabilities, gateway-capabilities

**Artifacts Created:**

- {capability_file}: VQL capability (validated)
- {test_file}: Test fixtures

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
Task: {Fix bug | Implement small change}

**Files to modify:** [from Phase 3 Discovery]
**Capability Type:** {from Phase 3}

**MANDATORY SKILLS TO READ:**
[From Phase 4 skill manifest]

**Constraint:** Keep changes minimal and focused.
```

---

## Capability-Specific Implementation Notes

| Capability Type | Key Implementation Considerations                |
| --------------- | ------------------------------------------------ |
| VQL             | Query structure, artifact paths, output format   |
| Nuclei          | Template syntax, matcher accuracy, metadata      |
| Janus           | Go interfaces, pipeline ordering, error handling |
| Fingerprintx    | 5-method interface, probe design, CPE format     |
| Scanner         | API client, auth handling, result normalization  |

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

### Capability Validation Fails

If validation check fails (VQL parse error, Go compile error):

- Capture error details
- Re-spawn agent with error context
- Track retry count

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
- [Capability Types](capability-types.md) - Type-specific implementation guidance
- [Quality Standards](quality-standards.md) - Type-specific quality targets
- [Compaction Gates](compaction-gates.md) - Gate 2 follows this phase
- [file-scope-boundaries.md](file-scope-boundaries.md) - Conflict detection/resolution
