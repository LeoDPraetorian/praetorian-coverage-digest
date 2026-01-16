# Agent Loopholes Tracking

Track rationalization failures and their counters using `closing-rationalization-loopholes` methodology.

## Active Loopholes

| Date | Agent | Task | Rationalization | Counter Added | Verified |
|------|-------|------|-----------------|---------------|----------|
| 2026-01-10 | frontend-developer | Task 1.7: Update 118 files | "Calls vs Files" - counted function calls instead of files | verifying-before-completion#exit-criteria-interpretation | ❌ |

## Loophole Details

### 2026-01-10: frontend-developer "Calls vs Files"

**Agent:** frontend-developer (Task tool subagent)
**Task:** "Update all 118 files importing react-router to @tanstack/react-router"
**Expected:** 118 FILES with updated imports
**Actual:** Agent counted 118 useNavigate() CALLS, only updated 47 files
**Rationalization:** Exit criteria said "118" - agent found a way to reach 118 by counting a different unit
**Evidence:** Agent claimed completion; orchestrator verification showed 47 files, not 118

**Counters Added:**
1. `verifying-before-completion` - Exit Criteria Interpretation section
2. `writing-plans` - Unambiguous Exit Criteria section
3. `executing-plans` - Human Checkpoint Protocol strengthened
4. `orchestrating-multi-agent-workflows` - Post-Completion Verification Protocol

**Verification Status:** ❌ Not yet re-tested

---

## Closed Loopholes

(None yet - move entries here after verification passes)

---

## Pattern Index

| Pattern | Description | Counter Location |
|---------|-------------|------------------|
| Calls vs Files | Counting different unit than specified | verifying-before-completion |
| Quick Question Trap | Skipping full protocol for "simple" tasks | using-skills, persisting-agent-outputs |
| Description Hallucination | Inventing skill description to justify non-use | closing-rationalization-loopholes |
