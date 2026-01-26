# Hooks Architecture

**Complete architectural documentation for the deterministic enforcement hook system.**

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution: Deterministic Enforcement](#the-solution-deterministic-enforcement)
3. [Hook Types](#hook-types)
4. [Three-Level Loop System](#three-level-loop-system)
5. [Multi-Agent Feedback Loop](#multi-agent-feedback-loop)
6. [Context Compaction Gates](#context-compaction-gates)
7. [Output Location Enforcement](#output-location-enforcement)
8. [State Management](#state-management)
9. [Hook Anatomy](#hook-anatomy)
10. [Execution Model](#execution-model)
11. [Configuration](#configuration)
12. [Composition Patterns](#composition-patterns)
13. [Context Engineering Principles](#context-engineering-principles)
14. [Directory Structure Reference](#directory-structure-reference)
15. [Troubleshooting](#troubleshooting)
16. [FAQ](#faq)
17. [References](#references)
18. [TODO List](#todo-list)

---

## The Problem

Claude Code faces a fundamental tension between guidance and compliance. Skill documentation can establish workflows like "spawn reviewer after code changes" and set defaults like `max_iterations: 10`, but **Claude can rationalize around any documented instruction**. The research validates this: "These are documented defaults. Claude is _instructed_ to follow them but can rationalize around them."

The failure modes are predictable:

| Rationalization    | What Claude Says           | What Happens                   |
| ------------------ | -------------------------- | ------------------------------ |
| Scope minimization | "This is a simple change"  | Skips reviewer                 |
| Time pressure      | "User wants speed"         | Skips tester                   |
| Self-verification  | "I already checked it"     | No independent review          |
| Completion bias    | "Tests would pass"         | Never runs tests               |
| Context drift      | "I forgot about that rule" | Skills ignored late in session |

Skills provide guidance. Hooks provide **enforcement**.

---

## The Solution: Deterministic Enforcement

Hooks intercept Claude Code at specific lifecycle points and can **block execution** until conditions are met. Unlike skill documentation which Claude interprets, hooks are deterministic: JSON `{"decision": "block"}` blocks, `{"decision": "approve"}` allows.

**Key insight from testing:** Exit code 2 + stderr does NOT reliably block (treated as plain text). Only JSON output with `{"decision": "block"}` provides deterministic enforcement.

### Guidance vs Enforcement

| Mechanism            | Type            | Can Be Bypassed? | When to Use                     |
| -------------------- | --------------- | ---------------- | ------------------------------- |
| CLAUDE.md            | Guidance        | Yes              | Session-level rules             |
| Skills               | Guidance        | Yes              | Procedural workflows            |
| Agent definitions    | Guidance        | Yes              | Agent-specific behavior         |
| **Stop hooks**       | **Enforcement** | **No**           | Quality gates, iteration limits |
| **PreToolUse hooks** | **Enforcement** | **No**           | Dangerous command blocking      |

### Our Architecture

We implemented a **layered enforcement system**:

```
┌─────────────────────────────────────────────────────────────────┐
│  GUIDANCE LAYER (can be rationalized)                           │
│  • CLAUDE.md - full rules at session start                      │
│  • Skills - procedural workflows when invoked                   │
│  • Agent definitions - agent-specific behavior                  │
├─────────────────────────────────────────────────────────────────┤
│  REMINDER LAYER (skills usage - not enforced elsewhere)         │
│  • session-reminder.sh - gateway → library skill pattern        │
│  • Dynamic state injection - feedback loop status (if active)   │
├─────────────────────────────────────────────────────────────────┤
│  ENFORCEMENT LAYER (deterministic)                              │
│  • agent-first-enforcement.sh - blocks Edit/Write, spawn agent  │
│  • feedback-loop-stop.sh - blocks exit until review/test pass   │
│  • iteration-limit-stop.sh - prevents runaway loops             │
│  • quality-gate-stop.sh - safety net for ad-hoc changes         │
│  • escalation-advisor.sh - external LLM analysis on escalation  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hook Types

Claude Code provides eight lifecycle hook events. We use seven.

### UserPromptSubmit

**When:** User submits a prompt | **Matcher:** No
| Hook | Matcher | Description |
| --------------------------- | ------- | ---------------------------------------------------- |
| `session-reminder.sh` | \* | Skills usage reminder (gateway → library pattern) |

### PreToolUse

**When:** Before tool runs | **Matcher:** Yes (tool name)
| Hook | Matcher | Description |
| -------------------------------- | ----------- | ---------------------------------------------------------- |
| `agent-first-enforcement.sh` | Edit\|Write | Block direct code edits when developer agent exists |
| `compaction-gate-enforcement.sh` | Task | Block agent spawning when context >85% during orchestration |

### PostToolUse

**When:** After tool succeeds | **Matcher:** Yes (tool name)
| Hook | Matcher | Description |
| --------------------------- | ----------- | -------------------------------------------------- |
| `track-modifications.sh` | Edit\|Write | Track modified files, initialize feedback loop |
| `capture-agent-result.sh` | Task | Capture agent PASS/FAIL, update state |
| `task-skill-enforcement.sh` | Task | Check agent output for skill documentation |

### Stop

**When:** Main agent finishing | **Matcher:** No
All Stop hooks run in parallel. Any exit code 2 blocks the stop.
| Hook | Timeout | Description |
| -------------------------- | ------- | -------------------------------------------------- |
| `feedback-loop-stop.sh` | 15s | Enforce Implementation→Review→Test cycle |
| `iteration-limit-stop.sh` | 5s | Enforce intra-task iteration limits (opt-in) |
| `quality-gate-stop.sh` | 10s | Safety net when feedback loop state missing |
| `escalation-advisor.sh` | 90s | External LLM analysis on escalation |

### SubagentStop

**When:** Subagent finishing | **Matcher:** No
| Hook | Matcher | Description |
| --------------------------------- | ------- | ---------------------------------------------------------- |
| `output-location-enforcement.sh` | \* | Block if untracked .md files exist outside .claude/.output |
| (prompt-based) | \* | Lightweight check that subagent completed task |

### SessionStart

**When:** Session begins | **Matcher:** Yes (startup\|resume\|clear\|compact)
| Hook | Matcher | Description |
| --------------------------- | --------------------------------| -------------------------------------------------- |
| `session-start.sh` | startup\|resume\|clear\|compact | Inject using-skills context, reset state files |

### Notification

**When:** Claude notifies user | **Matcher:** Yes
| Hook | Matcher | Description |
| --------------------------- | ------- | -------------------------------------------------- |
| `sound-notification.sh` | \* | Play audio alert on task completion |

### Utility Scripts (Not Hooks)

These are helper scripts invoked by other hooks or via slash commands, not directly by Claude Code events:

| Script             | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `sound.sh`         | CLI wrapper for `/sound` slash command (on/off/volume/etc) |
| `serena-warmup.sh` | **DEPRECATED** - Health check for Serena SSE on port 9121  |

### Not Registered (Deferred)

These hooks are implemented but intentionally not registered in settings.json:

| Hook                | Event      | Description                                 | Status   |
| ------------------- | ---------- | ------------------------------------------- | -------- |
| `enforce-serena.sh` | PreToolUse | Intercepts Grep/Search, suggests Serena MCP | Deferred |

### PreCompact

**When:** Before context compaction | **Matcher:** Yes
| Hook | Matcher | Description |
| ------------------------ | ------- | --------------------------------------------------------- |
| `precompact-context.sh` | \* | Preserve workflow state (MANIFEST.yaml or feedback-loop) |

### Hook Input/Output

All hooks receive JSON via stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../session.jsonl",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "Stop"
}
```

**SubagentStop receives additional fields:**

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../session.jsonl",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "agent_id": "def456",
  "agent_transcript_path": "~/.claude/projects/.../subagents/agent-def456.jsonl"
}
```

The `agent_transcript_path` is the subagent's JSONL transcript which can be parsed to find tool uses (Edit/Write with file_path).

### Exit Code Behavior

| Exit Code | Behavior           | Claude Sees                                                     |
| --------- | ------------------ | --------------------------------------------------------------- |
| **0**     | Success            | stdout JSON parsed and processed                                |
| **2**     | Error (unreliable) | stderr shown but **does NOT reliably block** (see Known Issues) |
| **Other** | Non-blocking error | stderr shown to user only                                       |

**CRITICAL: Exit code 2 does NOT reliably block.** Testing confirmed that stderr + exit 2 is treated as plain text, not a blocking signal. Use JSON with exit 0 instead.

### JSON Output Formats (By Hook Type)

**Stop hooks (command-based) - BLOCKING:**

```json
{
  "decision": "block",
  "reason": "Explanation shown to Claude"
}
```

**Stop hooks (command-based) - ALLOWING:**

```json
{
  "decision": "approve"
}
```

**UserPromptSubmit hooks (command-based):**

```json
{
  "continue": true,
  "suppressOutput": false,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Context string to inject"
  }
}
```

**CRITICAL:** `hookEventName` is **required** when using `hookSpecificOutput`. Omitting it causes validation error.

**SessionStart hooks (command-based):**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Context string to inject"
  }
}
```

**SubagentStop hooks (prompt-based):**

```json
{"ok": true}
{"ok": false, "reason": "Why subagent should continue"}
```

**SubagentStop hooks (command-based):**

```json
// Block subagent completion
{"decision": "block", "reason": "Explanation shown to subagent"}

// Allow subagent completion (return empty object or omit decision)
{}
```

Note: Prompt-based hooks use `{"ok": boolean}`, command-based use `{"decision": "block"}` or empty object to allow.

---

## Three-Level Loop System

Our configuration file (`.claude/config/orchestration-limits.yaml`) defines three nested loop levels:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR LEVEL (orchestrator section)                                  │
│  Re-invoke entire patterns N times                                          │
│  Config: orchestrator.test_fix_retries: 2                                   │
│  Enforcement: Orchestration skill code (not hooks)                          │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  INTER-PHASE LOOP (inter_phase section) ← HOOKS ENFORCE THIS        │   │
│   │  Cycles: Implement → Review → Test (different agents)               │   │
│   │  Config: inter_phase.max_feedback_iterations: 5                     │   │
│   │  Enforcement: feedback-loop-stop.sh                                 │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │  INTRA-TASK (intra_task section)                            │   │   │
│   │   │  Single agent loops on its own task                         │   │   │
│   │   │  Config: intra_task.max_iterations: 10                      │   │   │
│   │   │  Enforcement: iteration-limit-stop.sh (opt-in)              │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Community research patterns only cover the innermost loop.** We needed to enforce the middle loop for multi-agent workflows.

---

## Multi-Agent Feedback Loop

### Why Multi-Agent?

Community patterns (Ralph Wiggum, Continuous-Claude-v3) focus on **single-agent loops** where one agent verifies its own work. Our quality gates require **separate specialized agents**:

| Role           | Agent               | Verification Type       |
| -------------- | ------------------- | ----------------------- |
| Implementation | `backend-developer` | Creates code            |
| Review         | `backend-reviewer`  | Independent code review |
| Test Planning  | `test-lead`         | Designs test strategy   |
| Testing        | `backend-tester`    | Executes tests          |

### Three-Hook Coordination

Our implementation uses three hooks working together:

| Hook                      | Event                    | Responsibility                                    |
| ------------------------- | ------------------------ | ------------------------------------------------- |
| `track-modifications.sh`  | PostToolUse (Edit/Write) | Initialize feedback loop state when code modified |
| `capture-agent-result.sh` | PostToolUse (Task)       | Capture agent results (PASS/FAIL), update state   |
| `feedback-loop-stop.sh`   | Stop                     | Enforce cycle, block until all phases pass        |

### Feedback Loop Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CODE MODIFIED (Edit/Write on .go, .ts, .py, etc.)                          │
│  └── track-modifications.sh creates feedback-loop-state.json                │
│                                                                             │
│  LOOP until (review PASSES AND tests PASS) OR max_feedback_iterations:      │
│                                                                             │
│    ┌──────────────────┐                                                     │
│    │ 1. REVIEW PHASE  │                                                     │
│    │    Stop blocked  │ ← "Spawn backend-reviewer"                          │
│    │    Agent runs    │ ← Outputs REVIEW_APPROVED or REVIEW_REJECTED        │
│    │    Result captured│ ← capture-agent-result.sh updates state            │
│    └────────┬─────────┘                                                     │
│             ▼ REVIEW_APPROVED                                               │
│    ┌──────────────────┐                                                     │
│    │ 2. TEST PLANNING │                                                     │
│    │    Stop blocked  │ ← "Spawn test-lead"                                 │
│    │    Agent runs    │ ← Outputs TEST_PLAN_READY or TEST_PLAN_BLOCKED      │
│    │    Result captured│ ← capture-agent-result.sh updates state            │
│    └────────┬─────────┘                                                     │
│             ▼ TEST_PLAN_READY                                               │
│    ┌──────────────────┐                                                     │
│    │ 3. TESTING PHASE │                                                     │
│    │    Stop blocked  │ ← "Spawn backend-tester"                            │
│    │    Agent runs    │ ← Outputs TESTS_PASSED or TESTS_FAILED              │
│    │    Result captured│ ← capture-agent-result.sh updates state            │
│    └────────┬─────────┘                                                     │
│             │                                                               │
│             ├─ TESTS_PASSED → EXIT ALLOWED                                  │
│             │                                                               │
│             └─ TESTS_FAILED → Increment iteration                           │
│                               Reset all phases to NOT_RUN                   │
│                               Block: "Fix and retry full cycle"             │
│                                                                             │
│  IF iteration > max_feedback_iterations → ESCALATE TO USER                  │
│  IF consecutive_review_failures >= 3 → ESCALATE TO USER                     │
│  IF consecutive_test_failures >= 3 → ESCALATE TO USER                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Result Protocol

All reviewer and tester agents must output structured result markers:

**Reviewer agents:**

```markdown
## Review Result

REVIEW_APPROVED // or REVIEW_REJECTED

### Issues (if rejected)

- [specific issue 1]
- [specific issue 2]
```

**Tester agents:**

```markdown
## Test Result

TESTS_PASSED // or TESTS_FAILED

### Failures (if failed)

- [test name]: [failure description]
```

**Test-lead agent:**

```markdown
## Test Planning Result

TEST_PLAN_READY // or TEST_PLAN_BLOCKED
```

### Domain-Aware Agent Routing

Different file types route to different agents:

| Modified Domain              | Reviewer              | Tester              |
| ---------------------------- | --------------------- | ------------------- |
| `.go` (backend/, pkg/, cmd/) | `backend-reviewer`    | `backend-tester`    |
| `.tsx`, `.jsx` (ui/)         | `frontend-reviewer`   | `frontend-tester`   |
| `.py`                        | `backend-reviewer`    | `backend-tester`    |
| `.claude/tools/`             | `tool-reviewer`       | `tool-tester`       |
| VQL, Nuclei, capabilities    | `capability-reviewer` | `capability-tester` |

---

## Context Compaction Gates

### Why Compaction Gates?

Orchestration skills have "compaction gates" - phase transitions where context should be compacted to prevent rot. Without enforcement, orchestrators rationalize skipping compaction ("context seems fine") until hitting model limits.

**Skills define the gates, hooks enforce them.**

### Threshold-Based Enforcement

We use a layered threshold model where skills provide guidance and hooks provide enforcement:

| Threshold | Tokens     | Layer                  | Action                     |
| --------- | ---------- | ---------------------- | -------------------------- |
| < 75%     | < 150k     | —                      | Allow agent spawning       |
| 75-80%    | 150-160k   | Guidance (skill)       | SHOULD compact - proactive |
| 80-85%    | 160-170k   | Guidance (skill)       | MUST compact - compact NOW |
| **≥ 85%** | **≥ 170k** | **Enforcement (hook)** | **BLOCKED - run /compact** |

### How It Works

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Orchestrator at Phase 7 (Architecture Plan) complete                        │
│  └── Attempts to spawn developer agents for Phase 8                          │
│                                                                              │
│  PreToolUse (Task) → compaction-gate-enforcement.sh                          │
│  1. Check MANIFEST.yaml exists with current_phase (orchestration active)     │
│  2. Read context size from session JSONL                                     │
│  3. If context > 170k (85%):                                                 │
│     └── BLOCK: "COMPACTION REQUIRED: Context at 87%. Run /compact first."    │
│  4. If context < 170k:                                                       │
│     └── Allow agent spawning                                                 │
│                                                                              │
│  Note: Skill guidance recommends compacting at 75-80% to avoid hitting this  │
│  enforcement block. Hook is the safety net, not primary mechanism.           │
│                                                                              │
│  After /compact: Context drops to ~45k → Next spawn attempt succeeds         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Self-Correcting Design

No marker file needed:

- If compaction works → context drops below threshold → next check passes
- If compaction insufficient → still over threshold → still blocked

### Conditions for Enforcement

Hook only blocks when ALL of:

1. Tool is `Task` (spawning an agent)
2. MANIFEST.yaml exists with `current_phase` (orchestrated workflow active)
3. Context > 170k tokens (85% threshold)

Ad-hoc agent work (no MANIFEST.yaml) is not affected.

**Note:** Skill guidance recommends compacting at 75% (SHOULD) and 80% (MUST). The 85% hook enforcement is the safety net for when guidance is rationalized away.

---

## Output Location Enforcement

### The Problem

Agents are supposed to write output files to `.claude/.output/` following the `persisting-agent-outputs` skill. However, agents can rationalize skipping this skill, resulting in:

1. **Files at repo root** - Clutters the project, may be committed accidentally
2. **Skill compliance failure** - If they skip `persisting-agent-outputs`, they likely skipped other Step 1 skills too
3. **Invalid output** - Work done without proper skill compliance may be incorrect

### Three-Layer Enforcement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: PostToolUse (Task) - FEEDBACK                                     │
│  task-skill-enforcement.sh                                                  │
│  • Warns if agent didn't invoke persisting-agent-outputs                    │
│  • Warns if feature_directory is wrong in metadata                          │
│  • Exit 2 → feedback to Claude (non-blocking)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  LAYER 2: SubagentStop - BLOCKING                                           │
│  output-location-enforcement.sh                                             │
│  • Uses git to find untracked .md files outside .claude/.output/            │
│  • Works in main repo OR worktrees                                          │
│  • Detects cross-worktree leaks (worktree agent → main repo)                │
│  • Parses agent transcript for modified files                               │
│  • Determines safe vs unsafe reverts based on prior git state               │
│  • {"decision": "block"} → BLOCKS subagent completion                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  LAYER 3: Stop - DEFENSE IN DEPTH                                           │
│  quality-gate-stop.sh                                                       │
│  • Same git-based check as SubagentStop                                     │
│  • Catches files that slipped through SubagentStop                          │
│  • {"decision": "block"} → BLOCKS main agent completion                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detection Logic

The hook uses git to detect wrong-location files:

```bash
# Find untracked .md files outside allowed locations
git ls-files --others --exclude-standard | \
    grep -E '\.md$' | \
    grep -vE '^\.claude/\.output/' | \
    grep -vE '^modules/' | \
    grep -vE '^docs/' | \
    grep -vE '^(README|CLAUDE|CHANGELOG)'
```

### Skill Compliance Check

For each wrong-location file, the hook reads it to check:

```bash
# Check if persisting-agent-outputs was invoked
if grep -q "persisting-agent-outputs" "$file_path"; then
    # Invoked skill but didn't follow discovery protocol
    # Just needs moving
else
    # Didn't invoke skill at all - full compliance failure
    # Mark for deletion, check for code reverts
fi
```

### Code Revert Analysis

When an agent fails compliance, the hook analyzes what code changes should be reverted:

1. **Parse agent transcript** (`agent_transcript_path`) to find Edit/Write tool uses
2. **Extract modified files** from `"file_path"` fields in transcript
3. **Compare against git diff** to check for prior uncommitted changes
4. **Classify each file**:
   - **Safe to revert**: Only modified by rogue agent (no prior changes)
   - **Manual review**: Has prior uncommitted changes from other agents

**Path normalization**: Agent transcripts use absolute paths, git diff uses relative paths. The hook normalizes with `${mod_file#${current_git_root}/}`.

### Example Block Message

```
SKILL COMPLIANCE FAILURE DETECTED

The agent wrote output to wrong location(s) AND failed skill compliance checks.
This indicates the agent skipped Step 1 mandatory skills.

- agent-output.md: Missing persisting-agent-outputs in skills_invoked

=== REQUIRED ACTIONS ===

1. DELETE INVALID OUTPUT FILES:
   rm "/path/to/agent-output.md"

2. REVERT NON-COMPLIANT CODE CHANGES (safe - no prior changes):
   git checkout -- "/path/to/new-file.ts"

3. MANUAL REVIEW REQUIRED (has prior uncommitted changes):
- /path/to/shared-file.ts: HAS PRIOR UNCOMMITTED CHANGES - manual review required

4. RE-DO WITH PROPER COMPLIANCE:
   - Invoke ALL Step 1 mandatory skills (especially persisting-agent-outputs)
   - Follow the discovery protocol to find/create output directory
   - Write output to .claude/.output/agents/{timestamp}-{slug}/
```

### Worktree Support

The hook handles git worktrees correctly:

| Scenario | Detection |
|----------|-----------|
| Main repo, file at root | ✅ Detected via `ls-files` |
| Worktree, file at worktree root | ✅ Detected via `ls-files` |
| Worktree, file leaked to main repo | ✅ Detected via `--git-common-dir` check |

### Skip Conditions

The SubagentStop hook skips agents that don't produce file output:

```bash
case "$subagent_type" in
    Explore|Bash|general-purpose|claude-code-guide)
        echo '{}'  # Allow completion
        exit 0
        ;;
esac
```

---

## State Management

### State Files

State files are **session-specific** to avoid conflicts when running multiple Claude Code terminals on the same branch. Each file includes the session ID in its name.

| File Pattern                         | Purpose                           | Lifecycle                                  |
| ------------------------------------ | --------------------------------- | ------------------------------------------ |
| `feedback-loop-state-{session}.json` | Track multi-phase feedback loop   | Created on code mod, removed when all pass |
| `iteration-state-{session}.json`     | Track intra-task iterations       | Opt-in, manual creation                    |
| `modification-state-{session}.json`  | Track modified files by domain    | Created on code mod                        |
| `escalation-context-{session}.json`  | Context for external LLM analysis | Created on escalation, removed after       |

### Feedback Loop State Schema

The state tracks phases **per domain** to support multi-domain changes (e.g., backend + frontend in same session):

```json
{
  "active": true,
  "started_at": "2026-01-18T10:00:00Z",
  "iteration": 2,
  "modified_domains": ["backend", "frontend"],
  "domain_phases": {
    "backend": {
      "review": {
        "status": "PASS",
        "agent": "backend-reviewer",
        "ran_at": "2026-01-18T10:05:00Z",
        "issues": []
      },
      "test_planning": {
        "status": "PASS",
        "agent": "test-lead",
        "ran_at": "2026-01-18T10:10:00Z"
      },
      "testing": {
        "status": "PASS",
        "agent": "backend-tester",
        "ran_at": "2026-01-18T10:15:00Z",
        "issues": []
      }
    },
    "frontend": {
      "review": {
        "status": "PASS",
        "agent": "frontend-reviewer",
        "ran_at": "2026-01-18T10:20:00Z",
        "issues": []
      },
      "test_planning": {
        "status": "PASS",
        "agent": "test-lead",
        "ran_at": "2026-01-18T10:25:00Z"
      },
      "testing": {
        "status": "FAIL",
        "agent": "frontend-tester",
        "ran_at": "2026-01-18T10:30:00Z",
        "issues": ["ComponentRender: missing props"]
      }
    }
  },
  "consecutive_review_failures": 0,
  "consecutive_test_failures": 1
}
```

**Multi-domain behavior:**

- Each domain requires its own review → test planning → testing cycle
- Exit is blocked until ALL domains have passed ALL phases
- If any domain's tests fail, ALL domains reset to NOT_RUN for the next iteration
- Domain-specific agents are spawned (backend-reviewer vs frontend-reviewer)

### State Lifecycle

| Event                        | State Action                             |
| ---------------------------- | ---------------------------------------- |
| SessionStart                 | Clean up all state files (fresh session) |
| Edit/Write code              | Initialize feedback-loop-state.json      |
| Task (agent) completes       | Update phase status (PASS/FAIL)          |
| Stop attempt                 | Check phases, block if incomplete        |
| All phases PASS              | Remove state file, allow exit            |
| Orchestration skill detected | Bypass hook (no double enforcement)      |

### Unified State Architecture

**Hooks use a two-layer state management system:**

**Layer 1: Hook State Files** (Session-specific enforcement)

- `feedback-loop-state-{session}.json` - Multi-phase feedback loop tracking
- `iteration-state-{session}.json` - Intra-task iteration limits
- `modification-state-{session}.json` - Modified files by domain
- Purpose: **Enforcement** of quality gates and iteration limits
- Lifecycle: Created during session, removed when complete or at SessionStart
- Scope: Single Claude Code session

**Layer 2: MANIFEST.yaml** (Persistent workflow state)

- Location: `.claude/.output/{type}/{id}/MANIFEST.yaml`
- Purpose: **Audit trail** and orchestration coordination
- Contains: feature metadata, agents_contributed, artifacts, optional phases/verification
- Lifecycle: Created by first agent, persists across sessions
- Scope: Entire feature/workflow

**Key differences:**

| Aspect           | Hook State Files                 | MANIFEST.yaml                     |
| ---------------- | -------------------------------- | --------------------------------- |
| Purpose          | Enforcement (block/approve)      | Coordination & audit trail        |
| Owner            | Hooks system                     | Agents & orchestrators            |
| Session-specific | Yes (includes session ID)        | No (shared across sessions)       |
| Lifecycle        | Ephemeral (session duration)     | Persistent (project history)      |
| Contents         | Feedback loop phases, iterations | Feature metadata, agent artifacts |

**When orchestration skills are active:**

- MANIFEST.yaml is the **single source of truth** for workflow state
- Optional fields (`current_phase`, `phases`, `verification`) track orchestration progress
- Orchestrators MUST NOT create separate `metadata.json` or `progress.json` files
- Hook state files track enforcement independently (no duplication with MANIFEST.yaml)

**When agents run without orchestration:**

- Agents write output files with embedded JSON metadata
- Agents update MANIFEST.yaml `agents_contributed` and `artifacts` arrays
- Optional orchestration fields remain empty (not applicable)
- Hook state files still track enforcement if code is modified

**For complete MANIFEST.yaml structure, see:** `.claude/skills/persisting-agent-outputs/references/manifest-structure.md`

---

## Hook Anatomy

### File Structure

```bash
#!/bin/bash
# Hook Name
#
# Description of what the hook does.
# Which event it handles and why.

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract relevant fields
field=$(echo "$input" | jq -r '.field // ""')

# Hook logic here
if [[ condition ]]; then
    # Block with JSON response (exit 2 + stderr is UNRELIABLE)
    cat << EOF
{
  "decision": "block",
  "reason": "Reason for blocking"
}
EOF
    exit 0
fi

# Allow (for Stop hooks)
echo '{"decision": "approve"}'
exit 0
```

### Required Elements

| Element                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| Shebang (`#!/bin/bash`) | Interpreter declaration                         |
| `set -euo pipefail`     | Strict error handling                           |
| `input=$(cat)`          | Read JSON from stdin                            |
| `jq` extraction         | Parse JSON fields                               |
| JSON output             | `{"decision": "block\|approve"}` for Stop hooks |
| Exit code 0             | Always exit 0 (exit 2 is unreliable)            |

### Output Formats

**Stop hook blocking (JSON with exit 0):**

```bash
cat << EOF
{
  "decision": "block",
  "reason": "Explanation shown to Claude"
}
EOF
exit 0
```

**Stop hook allowing (JSON with exit 0):**

```bash
echo '{"decision": "approve"}'
exit 0
```

**UserPromptSubmit (JSON with hookEventName):**

```bash
cat << EOF
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Context to inject"
  }
}
EOF
exit 0
```

**WARNING:** `echo "message" >&2; exit 2` does NOT reliably block. Use JSON instead.

---

## Execution Model

### Parallel Execution

All hooks for the same event run **in parallel**. Design for independence:

```
Stop Event Fires
    ├── iteration-limit-stop.sh (5s timeout)
    ├── feedback-loop-stop.sh (15s timeout)
    ├── quality-gate-stop.sh (10s timeout)
    └── escalation-advisor.sh (90s timeout)

All run simultaneously. Any exit 2 blocks the stop.
```

### Hook Order (settings.json)

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "*", "hooks": [{ "command": "iteration-limit-stop.sh", "timeout": 5 }] },
      { "matcher": "*", "hooks": [{ "command": "feedback-loop-stop.sh", "timeout": 15 }] },
      { "matcher": "*", "hooks": [{ "command": "quality-gate-stop.sh", "timeout": 10 }] },
      { "matcher": "*", "hooks": [{ "command": "escalation-advisor.sh", "timeout": 90 }] }
    ]
  }
}
```

### Timeout Handling

| Hook                      | Timeout | Rationale                        |
| ------------------------- | ------- | -------------------------------- |
| `iteration-limit-stop.sh` | 5s      | Simple state check               |
| `track-modifications.sh`  | 5s      | Simple file categorization       |
| `capture-agent-result.sh` | 10s     | JSON parsing, state update       |
| `quality-gate-stop.sh`    | 10s     | State check with bypass logic    |
| `precompact-context.sh`   | 10s     | MANIFEST.yaml/state file parsing |
| `feedback-loop-stop.sh`   | 15s     | Complex phase checking           |
| `escalation-advisor.sh`   | 90s     | External LLM API call            |

---

## Configuration

### orchestration-limits.yaml

Central configuration for all loop limits:

```yaml
# .claude/config/orchestration-limits.yaml

inter_phase:
  max_feedback_iterations: 5 # Max Implementation→Review→Test cycles
  max_consecutive_review_failures: 3 # Escalate if same issue persists
  max_consecutive_test_failures: 3 # Escalate if same failure persists

intra_task:
  max_iterations: 10 # Single agent iteration limit
  max_runtime_minutes: 15 # Time-based limit (future)

orchestrator:
  test_fix_retries: 2 # Full pattern re-invocation limit
```

### settings.json Hook Registration

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/session-reminder.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/agent-first-enforcement.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/track-modifications.sh",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/capture-agent-result.sh",
            "timeout": 10
          },
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/task-skill-enforcement.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/iteration-limit-stop.sh",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/feedback-loop-stop.sh",
            "timeout": 15
          }
        ]
      },
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/quality-gate-stop.sh",
            "timeout": 10
          }
        ]
      },
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/escalation-advisor.sh",
            "timeout": 90
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start.sh" }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/precompact-context.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

---

## Composition Patterns

### Pattern 1: State-Driven Communication

Hooks communicate through state files, not direct calls:

```
track-modifications.sh
    └── writes → feedback-loop-state.json
                        ↓
capture-agent-result.sh
    └── updates → feedback-loop-state.json
                        ↓
feedback-loop-stop.sh
    └── reads → feedback-loop-state.json
```

### Pattern 2: Defense in Depth

Multiple hooks cover the same concern with different approaches:

| Concern          | Primary Hook                             | Backup Hook                            |
| ---------------- | ---------------------------------------- | -------------------------------------- |
| Quality gates    | `feedback-loop-stop.sh` (phase tracking) | `quality-gate-stop.sh` (simple check)  |
| Iteration limits | `feedback-loop-stop.sh` (inter-phase)    | `iteration-limit-stop.sh` (intra-task) |

### Pattern 3: Bypass Detection

Hooks detect when orchestration skills handle enforcement internally:

```bash
# Skip if orchestration workflow is active
if grep -qE '(orchestrating-feature|orchestrating-capability)' "$transcript_path"; then
    exit 0  # Orchestration handles its own loop
fi
```

### Pattern 4: Graceful Degradation

Hooks provide fallback behavior when dependencies are missing:

```bash
# Try yq first (robust YAML parsing)
if command -v yq &> /dev/null; then
    value=$(yq -r "$key" "$CONFIG_FILE")
else
    # Fallback: grep-based extraction
    value=$(grep -E "^\s*${key}:" "$CONFIG_FILE" | sed 's/.*:\s*//')
fi
```

### Pattern 5: Escalation with External LLM

When loops get stuck, an external LLM provides analysis:

```
feedback-loop-stop.sh detects escalation condition
    └── writes → escalation-context.json
                        ↓
escalation-advisor.sh (runs in parallel)
    └── reads → escalation-context.json
    └── calls → Ollama/Gemini/OpenAI/Grok (fallback chain)
    └── outputs → analysis to stderr (exit 2)
```

---

## Context Engineering Principles

### Remind, Don't Lecture

The old approach injected ~200 lines of rules every prompt (~1000 tokens). The new approach focuses only on what's NOT enforced by other hooks (skills usage):

```
<session-reminder>
- **Core skills** (in `.claude/skills/`): Invoke via Skill tool
- **Gateway Skills** (in `.claude/skills/`): Invoke via Skill tool

**ALWAYS read your gateway skills to locate task relevant skills.**

After invoking the gateway, use its routing tables to find and Read library skills:
- **Library skills** (in `.claude/skill-library/`): Load via Read tool

**Invoke relevant skills BEFORE any response or action.**
</session-reminder>
```

~80 words (~100 tokens). Agent-first and quality gates are now ENFORCED by PreToolUse and Stop hooks respectively, so they don't need reminders.

### Enforcement Over Guidance

| Approach                 | Token Cost   | Reliability              |
| ------------------------ | ------------ | ------------------------ |
| 200-line rules injection | ~1000/prompt | Low (rationalized)       |
| 45-word reminder         | ~60/prompt   | Medium (triggers memory) |
| Stop hook enforcement    | 0 tokens     | **High (deterministic)** |

### Dynamic State Injection

Only inject what's relevant:

```bash
# Static: always (~60 tokens)
output="<session-reminder>...</session-reminder>"

# Dynamic: only if feedback loop active (~30 tokens)
if [[ -f "$STATE_FILE" ]]; then
    output="$output<active-feedback-loop>Iteration: $i/$max</active-feedback-loop>"
fi
```

### Heavy Guidance Location

| Content Type         | Where It Lives        | When Loaded          |
| -------------------- | --------------------- | -------------------- |
| Full rules           | CLAUDE.md             | Session start (once) |
| Procedural workflows | Skills                | When invoked         |
| Agent behavior       | Agent definitions     | When spawning        |
| Short reminders      | UserPromptSubmit hook | Every prompt         |
| Enforcement          | Stop hooks            | When trying to exit  |

---

## Directory Structure Reference

### Hooks Directory

```
.claude/hooks/
├── agent-first-enforcement.sh      # PreToolUse (Edit/Write) - spawn agent instead of direct edit
├── compaction-gate-enforcement.sh  # PreToolUse (Task) - block agent spawn when context >85%
├── session-reminder.sh             # UserPromptSubmit - skills usage reminder (gateway → library)
├── session-start.sh                # SessionStart - inject using-skills, reset state
├── precompact-context.sh           # PreCompact - preserve workflow state across compaction
├── track-modifications.sh          # PostToolUse (Edit/Write) - track modified files
├── capture-agent-result.sh         # PostToolUse (Task) - capture PASS/FAIL
├── task-skill-enforcement.sh       # PostToolUse (Task) - check skill compliance + output location
├── output-location-enforcement.sh  # SubagentStop - block if files outside .claude/.output/
├── feedback-loop-stop.sh           # Stop - enforce Implementation→Review→Test
├── iteration-limit-stop.sh         # Stop - enforce intra-task limits
├── quality-gate-stop.sh            # Stop - safety net + output location defense-in-depth
├── escalation-advisor.sh           # Stop - external LLM analysis
├── sound-notification.sh           # Notification - audio alerts (core logic)
├── sound.sh                        # CLI wrapper - /sound slash command interface
├── serena-warmup.sh                # DEPRECATED - health check for Serena SSE server
└── enforce-serena.sh               # NOT REGISTERED - intercepts Grep/Search, suggests Serena MCP
```

### State Files (Runtime)

State files are session-specific (include session ID in filename) to prevent cross-terminal conflicts:

```
.claude/hooks/
├── feedback-loop-state-{session_id}.json   # Multi-phase feedback loop state
├── iteration-state-{session_id}.json       # Intra-task iteration state (opt-in)
├── modification-state-{session_id}.json    # Modified files by domain
└── escalation-context-{session_id}.json    # Context for external LLM (temporary)
```

### Configuration

```
.claude/
├── config/
│   └── orchestration-limits.yaml  # All loop limits
└── settings.json                  # Hook registration
```

---

## Troubleshooting

### State File Persists After Session

SessionStart hook should clean it up. Manual cleanup (cleans all session state files):

```bash
rm -f .claude/hooks/*-state-*.json
rm -f .claude/hooks/escalation-context-*.json
```

### Agent Result Not Captured

1. Verify agent output includes result marker (REVIEW_APPROVED, etc.)
2. Check capture-agent-result.sh timeout (default: 10s)
3. Enable debug: Add `set -x` to capture script

### Hook Not Blocking

**Most common cause:** Using `exit 2` + stderr instead of JSON.

Debug checklist:

1. **Check JSON format:** Hook must output valid JSON with `{"decision": "block", "reason": "..."}`
2. **Check exit code:** Must be `exit 0` (not `exit 2` - that's unreliable!)
3. **Check all Stop hooks:** If ANY hook returns `{"decision": "approve"}`, stop is allowed
4. **Enable debug:** `claude --debug` shows hook output parsing
5. **Look for:** "Hook output does not start with {" means plain text was ignored

**Testing hooks:**

```bash
echo '{}' | CLAUDE_PROJECT_DIR="$(pwd)" .claude/hooks/your-hook.sh
# Output should be: {"decision": "block", "reason": "..."}
# Exit code should be: 0
```

**If hooks still don't block after outputting correct JSON:**

- Check if another Stop hook is returning `{"decision": "approve"}`
- All Stop hooks run in parallel; any approve may override block
- Have backup hooks (quality-gate-stop.sh) also return block when state is active

### Output Location Hook Not Blocking

1. **Check debug log:** `cat /tmp/subagent-stop-debug.log`
2. **Verify hook is called:** Log should show "SubagentStop hook called"
3. **Check WRONG_FILES:** Empty means no untracked .md files detected
4. **Check path normalization:** Absolute vs relative path comparison
5. **Test manually:**
   ```bash
   touch test-file.md
   export CLAUDE_PROJECT_DIR="$(pwd)"
   echo '{"subagent_type": "tool-reviewer"}' | bash .claude/hooks/output-location-enforcement.sh
   rm test-file.md
   ```

**Note:** Settings changes require a new Claude session to take effect (hooks are snapshotted at startup).

### Escalation Advisor Not Working

1. Check API keys: `echo $GEMINI_API_KEY`, `echo $OPENAI_API_KEY`
2. Check Ollama: `curl -s http://localhost:11434/api/tags`
3. Verify escalation-context.json is created on escalation

### Testing Hooks Manually

```bash
export CLAUDE_PROJECT_DIR="$(pwd)"

# Test session-reminder
echo '{"prompt":"test"}' | .claude/hooks/session-reminder.sh | jq .

# Test track-modifications (note: session_id is required)
echo '{"tool_name":"Write","tool_input":{"file_path":"test.go"},"session_id":"test123"}' | .claude/hooks/track-modifications.sh

# Test feedback-loop-stop (with state)
echo '{"session_id":"test123"}' | .claude/hooks/feedback-loop-stop.sh
echo $?  # 0=allow, 2=block

# Clean up test state files
rm -f .claude/hooks/*-state-test123.json
```

---

## FAQ

### Why hooks instead of just better skill documentation?

Skills provide guidance that Claude interprets. Hooks provide enforcement that Claude cannot bypass. **Note:** Despite earlier research suggesting exit code 2 blocks, testing confirmed that only JSON `{"decision": "block"}` reliably blocks.

### Why multiple Stop hooks instead of one?

Single responsibility principle. Each hook does one thing:

- `iteration-limit-stop.sh` - intra-task limits
- `feedback-loop-stop.sh` - inter-phase feedback loop
- `quality-gate-stop.sh` - safety net
- `escalation-advisor.sh` - external analysis

This enables independent testing and debugging.

### Why not use LLM-powered hooks for everything?

We chose deterministic bash hooks because:

1. **Faster** - No LLM inference latency
2. **Cheaper** - No additional API calls
3. **Deterministic** - Same input always produces same output
4. **Debuggable** - Can test with `echo | ./hook.sh`
5. **Reliable** - No LLM hallucination risk

Exception: `escalation-advisor.sh` uses external LLM only at escalation time for "second opinion" analysis.

### Why three phases (review, test planning, testing)?

Community patterns use two phases (implementation → testing). We added test-lead because:

- Not all code requires the same test strategy
- Test planning catches gaps before writing wrong tests
- Prevents wasted effort writing tests that don't cover the changes

### How do hooks handle orchestration skills?

Orchestration skills (`/feature`, `/capability`) manage their own Implementation→Review→Test loops internally. Hooks detect this and skip enforcement to prevent double-checking:

```bash
if grep -qE 'orchestrating-feature' "$transcript_path"; then
    exit 0  # Orchestration handles its own loop
fi
```

### What happens if hooks timeout?

Hooks have configurable timeouts (5s-90s). If a hook times out:

- Claude Code treats it as non-blocking error
- stderr shown to user but not Claude
- Tool execution continues

Set timeouts based on expected execution time with buffer.

---

## References

### Official Documentation

- [Claude Code Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Hooks Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)

### Community Projects

| Project                                                                                            | Stars | Patterns Used                |
| -------------------------------------------------------------------------------------------------- | ----- | ---------------------------- |
| [Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3)                           | 3,270 | YAML handoffs, memory system |
| [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)                   | 2,079 | LLM-powered stop evaluation  |
| [Multi-Agent Observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | 903   | Real-time dashboard          |

### Known Issues

- [#10412 - Plugin Stop Hooks Bug](https://github.com/anthropics/claude-code/issues/10412)
- [#3656 - Restore Blocking Stop Hooks](https://github.com/anthropics/claude-code/issues/3656)

### Internal Documentation

- `.claude/hooks/README.md` - Hook implementation details
- `.claude/config/orchestration-limits.yaml` - Loop configuration
- `.claude/docs/skills/SKILL-ARCHITECTURE.md` - Skill system architecture
- `.claude/.output/research/claude-code-hooks-research.md` - Research findings

---

## TODO List

### High Priority

- [ ] **Register enforce-serena.sh** _(deferred)_
      File exists in `.claude/hooks/` but not registered in `settings.json`.
      Will be enabled when Serena integration is ready.
      per-domain tracking.

### Low Priority (Future Enhancements)

- [ ] **Observability dashboard**
      No visibility into hook state during execution. Consider HTTP POST from
      hooks to local server with WebSocket UI (see Multi-Agent Observability repo).

- [ ] **Auto-handoff to orchestration**
      When `max_feedback_iterations` exceeded, offer to auto-invoke `/feature`
      skill for full orchestration instead of just asking user.

- [ ] **LLM-powered escalation refinement**
      Current escalation messages are templates. Could add intelligent analysis
      of WHY the loop is stuck (partially implemented in `escalation-advisor.sh`).

- [x] **SubagentStop enforcement** _(COMPLETED 2026-01-25)_
      Implemented `output-location-enforcement.sh` for SubagentStop event.
      Detects wrong-location files, checks skill compliance, analyzes code changes
      for safe revert vs manual review. See "Output Location Enforcement" section.

- [ ] **Permission-aware blocking**
      Add PermissionRequest hook to auto-approve safe operations (`go test`, `npm test`)
      while blocking dangerous ones (`rm -rf`).

### Known Limitations (External)

- **Plugin Stop hooks unreliable (#10412)**
  Stop hooks may not block when installed via plugins.
  _Workaround:_ Install hooks in `.claude/hooks/` directory, not via plugins.

- **Exit code 2 + stderr does NOT block (#3656)**
  Despite documentation, `echo "msg" >&2; exit 2` is treated as plain text, not a blocking signal.
  **CONFIRMED BY TESTING (2026-01-18):** Debug logs show "Hook output does not start with {, treating as plain text" when using exit 2.
  _Workaround:_ Use JSON response format with exit 0: `{"decision": "block", "reason": "..."}`

- **Multiple hooks with mixed decisions**
  If some hooks return `{"decision": "approve"}` while one returns plain text (exit 2), the approves take precedence.
  _Workaround:_ Ensure ALL Stop hooks return consistent JSON. Have backup hooks also check shared state and return `{"decision": "block"}`.

- **hookEventName required for UserPromptSubmit**
  `hookSpecificOutput.hookEventName` must be set to `"UserPromptSubmit"` or validation fails.
  _Error:_ "JSON validation failed: Hook JSON output validation failed"

- **Gemini 3 requires paid tier**
  `escalation-advisor.sh` can't use latest Gemini models on free tier.
  _Workaround:_ Use `gemini-2.5-pro` (works on free tier) or upgrade to Vertex AI.

---
