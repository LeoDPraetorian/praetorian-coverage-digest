# Phase 8: Implementation

**Execute architecture plan by spawning developer agents with injected skills.**

---

## Overview

Implementation phase executes the plan by delegating to developer agents:

1. Read skill manifest from Phase 4
2. Spawn developer agents for each domain
3. Inject domain-specific skills into agent prompts
4. Execute in batches (from Phase 5 complexity plan)
5. Track progress and handle blockers

**Entry Criteria:** Phase 7 (Architecture Plan) complete with approved design.

**Exit Criteria:** All plan tasks implemented, code written to files, agents returned successfully.

**⛔ COMPACTION GATE 2 FOLLOWS:** Before proceeding to Phase 9, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Read Skill Manifest

**REQUIRED:** Load skill manifest from Phase 4:

```bash
Read("{OUTPUT_DIR}/skill-manifest.yaml")
```

This provides:

- `skills_by_domain.frontend.library_skills[]` - Skills for frontend developers
- `skills_by_domain.backend.library_skills[]` - Skills for backend developers
- `skills_by_domain.testing.library_skills[]` - Skills for testers (used in Phase 13)

Store these for Step 3 (prompt injection).

---

## Step 2: Determine Developer Agents

Based on `technologies_detected` from Phase 3:

| Technologies Detected | Developer Agent(s)      | Parallel |
| --------------------- | ----------------------- | -------- |
| React, TypeScript     | `frontend-developer`    | No       |
| Go, Lambda            | `backend-developer`     | No       |
| Frontend + Backend    | Both agents             | Yes      |
| Python                | `python-developer`      | No       |
| Integration APIs      | `integration-developer` | No       |
| VQL, Nuclei           | `capability-developer`  | No       |
| MCP wrappers          | `tool-developer`        | No       |

**Multiple domains:** Spawn agents in parallel if their file scopes don't overlap (checked in Step 3).

---

## Step 3: Build Agent Prompts with Skill Injection

**This is the critical step where Phase 4's work pays off.**

For each developer agent, construct prompt by:

1. Reading plan tasks for this domain (from Phase 7 Architecture Plan)
2. Reading architecture for this domain (from Phase 7 Architecture Plan)
3. **Reading skill manifest for this domain** (from Phase 4)
4. **Injecting library skills into prompt**

**Agent prompt template:**

```markdown
Task: Implement {task description}

## Plan Tasks for Your Domain

[List tasks from Phase 7 architecture-plan.md that match this agent's domain]

## Architecture

[Relevant sections from Phase 7 architecture-plan.md]

## MANDATORY SKILLS TO READ BEFORE STARTING

Based on codebase discovery (Phase 3) and skill discovery (Phase 4), you MUST read these library skills:

{{#each skills_by_domain.{domain}.library_skills}}

- Path: {{this.path}}
  Reason: {{this.trigger}}
  {{/each}}

**Example for frontend-developer:**

- Path: .claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
  Reason: TanStack Query detected in useUser.ts
- Path: .claude/skill-library/development/frontend/preventing-react-hook-infinite-loops/SKILL.md
  Reason: Custom hooks detected

YOU MUST READ THESE BEFORE WRITING CODE. No exceptions.

## Output Format

Follow persisting-agent-outputs for file locations and MANIFEST updates.

**Expected deliverables:**

- Code files written
- MANIFEST.yaml updated with your contribution
- Output metadata with skills_invoked array
```

---

## Step 4: Check File Scope Conflicts

Before spawning multiple agents in parallel:

```javascript
// Check for file overlap
const frontend_files = plan.tasks.filter((t) => t.domain === "frontend").map((t) => t.file);
const backend_files = plan.tasks.filter((t) => t.domain === "backend").map((t) => t.file);

const overlap = frontend_files.filter((f) => backend_files.includes(f));

if (overlap.length > 0) {
  // CONFLICT - agents would edit same files
  // → Execute sequentially OR split file ownership
} else {
  // SAFE - spawn in parallel
}
```

See [file-conflict-protocol.md](file-conflict-protocol.md) for complete resolution strategies.

---

## Step 5: Execute Implementation in Batches

**⚡ PRE-SPAWN CHECK:** Before EACH agent spawn (including retries), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%. This is especially critical after failed agents—their verbose output pollutes context.

Use batch plan from Phase 5 Complexity:

**Batch 1 (Parallel if safe):**

```
Task(subagent_type: "frontend-developer", prompt: {batch_1_frontend_prompt})
Task(subagent_type: "backend-developer", prompt: {batch_1_backend_prompt})
```

**Wait for batch 1 to complete before starting batch 2** (dependencies).

**Batch 2 (After Batch 1):**

```
Task(subagent_type: "frontend-developer", prompt: {batch_2_frontend_prompt})
```

**For COMPLEX+ work:** Use `Skill("developing-with-subagents")` for execution with code review between batches.

---

## Step 6: Validate Agent Returns

When each agent returns:

1. **Check status:** `complete` | `blocked` | `needs_review` | `needs_clarification`
2. **Read output file** (don't just trust summary)
3. **Verify skills_invoked array** includes injected skills
4. **Check files were written** (grep for modified files)

**If agent skipped injected skills:**

- DO NOT proceed
- Re-spawn agent with stronger emphasis
- Or escalate to user with warning

See [agent-output-validation.md](agent-output-validation.md) for complete validation protocol.

---

## Step 7: Handle Blocked Agents

If agent returns `status: "blocked"`:

1. Read `blocked_reason` category
2. Check blocked agent routing table (in `persisting-agent-outputs`)
3. Route to appropriate specialist OR escalate to user
4. Update MANIFEST with blocker info

**Common blockers:**

| blocked_reason          | Next Action                              |
| ----------------------- | ---------------------------------------- |
| `missing_requirements`  | Escalate to user for clarification       |
| `architecture_decision` | Return to Phase 7 or escalate            |
| `security_concern`      | Route to security specialist or escalate |
| `test_failures`         | Fix and retry OR escalate                |

---

## Step 8: Update MANIFEST.yaml

```yaml
phases:
  8_implementation:
    status: "complete"
    completed_at: "{timestamp}"
    batches_executed: 3
    developer_agents: ["frontend-developer", "backend-developer"]

implementation:
  tasks_completed: 4
  files_modified: 3
  files_created: 1

  batches:
    - batch: 1
      tasks: ["T001", "T002"]
      status: "complete"
      agents: ["frontend-developer"]

    - batch: 2
      tasks: ["T003"]
      status: "complete"
      agents: ["frontend-developer"]
      depends_on: ["batch_1"]

  skills_injected:
    frontend:
      - using-tanstack-query
      - preventing-react-hook-infinite-loops
    backend:
      - go-best-practices
      - implementing-lambda-handlers

  blockers_encountered: 0
```

---

## Step 9: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 8: Implementation", status: "completed", activeForm: "Implementing code" },
  { content: "Phase 9: Design Verification", status: "in_progress", activeForm: "Verifying implementation" },
  // ... rest
])
```

Output to user:

```markdown
## Implementation Complete

**Tasks Completed:** 4 of 4
**Files Modified:** 3
**Files Created:** 1
**Batches:** 3 (executed sequentially with dependencies)

**Developer Agents Used:**

- frontend-developer (batches 1, 2)
- backend-developer (batch 1)

**Skills Injected & Verified:**

- Frontend: using-tanstack-query, preventing-react-hook-infinite-loops
- Backend: go-best-practices, implementing-lambda-handlers

→ Proceeding to Phase 9: Design Verification
```

---

## Edge Cases

### Agent Returns Partial Implementation

If agent completes some tasks but not all:

- Mark completed tasks in MANIFEST
- Document incomplete tasks
- Re-spawn agent with remaining tasks
- Or escalate if repeatedly incomplete

### Skills Not Invoked

If agent's `skills_invoked` array doesn't include injected skills:

- DO NOT mark phase complete
- Re-spawn with stronger language
- Add to prompt: "Your output metadata shows you did NOT invoke {skill}. This is unacceptable."

### Implementation Deviates from Architecture

If code doesn't match Phase 7 architecture:

- Flag for Phase 9 (Design Verification)
- Don't block here (verification phase handles)
- Document deviation in notes

### File Conflicts in Parallel Execution

If parallel agents both try to modify same file:

- One agent will fail (git conflict)
- Retry with sequential execution
- Document in MANIFEST: `parallel_conflict: true`

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
- [developing-with-subagents](../../developing-with-subagents/SKILL.md) - For COMPLEX+ execution
- [agent-output-validation.md](agent-output-validation.md) - Validation protocol
- [file-conflict-protocol.md](file-conflict-protocol.md) - Conflict detection/resolution
