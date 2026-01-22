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

**Entry Criteria:** Phase 7 (Architecture Plan) complete with approved design (or skipped for BUGFIX/SMALL).

**Exit Criteria:** All plan tasks implemented, code written to files, agents returned successfully.

**⛔ COMPACTION GATE 2 FOLLOWS:** Before proceeding to Phase 9, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Read Skill Manifest

**REQUIRED:** Load skill manifest from Phase 4:

```bash
Read(".feature-development/skill-manifest.yaml")
```

This provides:

- `skills_by_domain.frontend.library_skills[]` - Skills for frontend developers
- `skills_by_domain.backend.library_skills[]` - Skills for backend developers
- `skills_by_domain.testing.library_skills[]` - Skills for testers (used in Phase 13)

Store these for Step 3 (prompt injection).

---

## Step 2: Determine Developer Agents

Based on `feature_type` from Phase 3:

| Feature Type | Developer Agent(s)                        | Parallel                 |
| ------------ | ----------------------------------------- | ------------------------ |
| Frontend     | `frontend-developer`                      | No                       |
| Backend      | `backend-developer`                       | No                       |
| Full-stack   | `frontend-developer`, `backend-developer` | Yes (if no file overlap) |

---

## Step 3: Build Agent Prompts with Skill Injection

**This is the critical step where Phase 4's work pays off.**

For each developer agent, construct prompt by:

1. Reading plan tasks for this domain (from Phase 7 architecture-plan.md Part 2)
2. Reading architecture for this domain (from Phase 7 architecture-plan.md Part 1)
3. **Reading skill manifest for this domain** (from Phase 4)
4. **Injecting library skills into prompt**

**Agent prompt template:**

```markdown
Task: Implement {task description}

## Plan Tasks for Your Domain

[List tasks from Phase 7 architecture-plan.md Part 2 that match this agent's domain]

## Architecture

[Relevant sections from Phase 7 architecture-plan.md Part 1]

## MANDATORY SKILLS TO READ BEFORE STARTING

Based on codebase discovery (Phase 3) and skill discovery (Phase 4), you MUST read these library skills:

{{#each skills_by_domain.frontend.library_skills}}

- Path: {{this.path}}
  Reason: {{this.trigger}}
  {{/each}}

**Example for frontend-developer:**

- Path: .claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
  Reason: TanStack Query detected in useAssets.ts
- Path: .claude/skill-library/development/frontend/using-tanstack-table/SKILL.md
  Reason: TanStack Table detected in AssetTable.tsx

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

See [file-scope-boundaries.md](file-scope-boundaries.md) for complete resolution strategies.

---

## Step 5: Execute Implementation in Batches

**⚡ PRE-SPAWN CHECK:** Before EACH agent spawn (including retries), run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases). If tokens >75%, compact first. Hook blocks at 85%.

Use batch plan from Phase 5 Complexity:

**Batch 1 (Foundation):**

```
Task(subagent_type: "frontend-developer", prompt: {batch_1_prompt})
```

**Wait for batch 1 to complete before starting batch 2** (dependencies).

**Batch 2 (Dependent tasks):**

```
Task(subagent_type: "frontend-developer", prompt: {batch_2_prompt})
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

---

## Step 7: Handle Blocked Agents

If agent returns `status: "blocked"`:

1. Read `blocked_reason` category
2. Route to appropriate resolution:

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
    batches_executed: 2
    developer_agents: ["frontend-developer"]

implementation:
  tasks_completed: 4
  files_modified: 3
  files_created: 1

  batches:
    - batch: 1
      tasks: ["T001"]
      status: "complete"
      agents: ["frontend-developer"]

    - batch: 2
      tasks: ["T002", "T003"]
      status: "complete"
      agents: ["frontend-developer"]
      depends_on: ["batch_1"]

  skills_injected:
    frontend:
      - using-tanstack-query
      - using-tanstack-table
      - preventing-react-hook-infinite-loops

  blockers_encountered: 0
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Implementation Complete

**Tasks Completed:** 4 of 4
**Files Modified:** 3
**Files Created:** 1
**Batches:** 2 (executed sequentially with dependencies)

**Developer Agents Used:**

- frontend-developer (batches 1, 2)

**Skills Injected & Verified:**

- Frontend: using-tanstack-query, using-tanstack-table, preventing-react-hook-infinite-loops

→ Proceeding to Compaction Gate 2, then Phase 9: Design Verification
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
**Technologies:** [from Phase 3]

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
