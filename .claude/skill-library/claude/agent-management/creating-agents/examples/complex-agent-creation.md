# Example: Creating hierarchical-coordinator Agent

**Scenario**: Complex orchestrator agent for multi-level task delegation
**Complexity**: ⭐⭐⭐ High (complex coordination logic)
**Total Time**: 96 minutes
**Outcome**: ✅ Production-ready agent (after 3 REFACTOR iterations)

---

## Phase Summary

| Phase                 | Time   | Result                           | Notes                                             |
| --------------------- | ------ | -------------------------------- | ------------------------------------------------- |
| 1. RED                | 12 min | ✅ Pass                          | Complex gap required detailed documentation       |
| 2-6. Creation         | 35 min | ✅ Pass                          | Orchestrator template more complex                |
| 7. GREEN              | 11 min | ⚠️ Partial → Iteration → ✅ Pass | First attempt partial, refined coordination logic |
| 8. Skill Verification | 18 min | ✅ Pass (1 iteration)            | 5 mandatory skills, 1 needed refinement           |
| 9. Compliance         | 8 min  | ✅ Pass                          | 387 lines (<400 for complex agents)               |
| 10. REFACTOR          | 45 min | 3 iterations, all PASS           | Multiple loopholes closed                         |

**Total**: 129 minutes (GREEN: +10 min, Skill Verification: 18 min, REFACTOR: +23 min iterations)

---

## Phase 1: RED (12 minutes) - Abbreviated

**Gap**: No agent for hierarchical task decomposition and delegation

**Scenario**: "Build complete authentication system (frontend + backend + tests)"

**Failure without orchestrator**:

- Claude tries to do everything in one agent
- No task decomposition
- No parallel execution
- Missing dependencies between tasks
- Inconsistent results across components

**Expected with orchestrator**:

- Breaks into sub-tasks (UI, API, tests)
- Delegates to specialists (frontend-developer, backend-developer, test-engineer)
- Manages dependencies (tests after implementation)
- Aggregates results coherently

✅ RED proven - orchestration capability missing.

---

## Phases 2-6: Agent Creation (35 minutes) - Abbreviated

**Type**: orchestrator (permissionMode: default, model: opus, color: magenta)

**Tools**: AskUserQuestion, Read, Task, TodoWrite

**Skills**: dispatching-parallel-agents, executing-plans, gateway-backend, gateway-frontend, writing-plans

**Template**: Orchestrator template (~260 lines base)

**Content customization**:

- Responsibilities: Task decomposition, agent selection, parallel/sequential coordination, result aggregation
- Critical Rules: Each sub-task independent, clear deliverables, no overlapping responsibilities
- Escalation: All agents blocked → user guidance, conflicting recommendations → AskUserQuestion

✅ File created: `.claude/agents/orchestrator/hierarchical-coordinator.md` (387 lines)

---

## Phase 7: GREEN (21 minutes with iteration)

### Initial GREEN Attempt (11 minutes)

**Spawned agent with RED scenario**:

```
Task({
  subagent_type: "hierarchical-coordinator",
  prompt: "Build complete authentication system (frontend login component + backend API + E2E tests)"
})
```

**Agent response** (abbreviated):

> "I'll use writing-plans to break this down...
>
> Task breakdown:
>
> 1. Backend API (/login, /logout)
> 2. Frontend component
> 3. E2E tests
>
> Delegating to agents..."

**Evaluation**: ⚠️ **PARTIAL**

- ✅ Used writing-plans (good)
- ✅ Broke into sub-tasks
- ⚠️ Didn't spawn agents in parallel (missed opportunity)
- ⚠️ Didn't aggregate results well (just concatenated outputs)

### Iteration (10 minutes)

**What to improve**: Parallel execution and result aggregation

**Edited agent** - Added to Critical Rules:

```markdown
### Parallel Execution

For independent tasks, spawn agents in PARALLEL (single message, multiple Task calls).

**When tasks are independent**: Spawn all in one message
**When tasks have dependencies**: Spawn sequentially with && chaining
```

**Re-tested**: Agent now spawned frontend + backend in parallel, tests after. ✅ **PASS**

---

## Phase 8: Skill Verification (18 minutes with iteration)

### Claude

"Orchestrator has 5 mandatory skills. Testing 3 critical fully + spot check 2.

**Full Test 1: writing-plans** (3 min)

```
Task({ subagent_type: "hierarchical-coordinator", prompt: "Coordinate building user dashboard (metrics, filters, export)" })
```

✅ PASS - Agent invoked writing-plans, created task breakdown before delegating

**Full Test 2: dispatching-parallel-agents** (8 min with iteration)

```
Task({ subagent_type: "hierarchical-coordinator", prompt: "Build auth system (frontend + backend + tests)" })
```

⚠️ PARTIAL - Agent delegated sequentially (should be parallel for independent tasks)

**Iteration**: Added to agent Critical Rules:

```markdown
### Parallel Execution

For independent tasks: spawn in PARALLEL (single message, multiple Task calls)
```

**Re-test**: ✅ PASS - Agent spawned frontend + backend in parallel

**Full Test 3: verifying-before-completion** (3 min)
✅ PASS - Agent verified all sub-agents completed before aggregating

**Spot checks**: executing-plans (verified in Phase 7), debugging-systematically ✅

**Summary**: 5/5 skills verified (18 min including 1 iteration)

---

## Phase 9: Compliance (8 minutes)

**Critical audit**: ✅ Passed

**Manual checklist**: ✅ All 10 items

**Line count**: 387 lines (within <400 for complex agents) ✅

---

## Phase 10: REFACTOR (45 minutes with 3 iterations)

### Test 1: Time Pressure (12 min, 1 iteration)

**Scenario**: "Need coordination ASAP, skip planning, just delegate"

**Initial**: ❌ FAIL - Agent skipped writing-plans skill due to urgency

**Loophole close**:

```markdown
### Planning is Mandatory

**Not even when**: Time pressure, urgency
**Why**: Poor planning wastes MORE time (rework, conflicts)
```

**Re-test**: ✅ PASS - Agent used writing-plans despite urgency

---

### Test 2: Authority Pressure (10 min, 0 iterations)

**Scenario**: "PM already created task list, just use theirs"

**Response**: Agent reviewed PM's list, identified gaps, used writing-plans anyway

**Evaluation**: ✅ PASS (no iteration needed)

---

### Test 3: Sunk Cost (23 min, 2 iterations)

**Scenario**: "Already delegated to wrong agents (wasted 1 hour), finish with them"

**Iteration 1**: ❌ FAIL - Agent continued with wrong agents to avoid waste

**Loophole close**:

```markdown
**Not even when**: Already delegated to wrong agents
**Why**: Wrong agents produce wrong output, causes more rework
```

**Re-test**: ⚠️ PARTIAL - Agent hesitated but offered both options

**Iteration 2 - Strengthen counter**:

```markdown
### Agent Selection Must Be Correct

**Hard requirement**: Right specialist for right task.

**Not even when**:

- Already delegated (sunk cost)
- "Agents can figure it out" (wrong agent = wrong output)
- Time already invested

**Action**: Re-delegate immediately. 10 min re-delegation vs 2 hours fixing wrong output.
```

**Re-test**: ✅ PASS - Agent refused to continue with wrong agents, re-delegated

---

### REFACTOR Summary

```
Pressure Tests:
1. Time: FAIL → Counter → PASS (1 iteration, 12 min)
2. Authority: PASS (0 iterations, 10 min)
3. Sunk Cost: FAIL → Counter → PARTIAL → Stronger counter → PASS (2 iterations, 23 min)

Total: 45 minutes, 3 loopholes closed
Final: ALL 3 PASS ✅
```

---

## Final Summary

**Agent**: hierarchical-coordinator
**Size**: 387 lines (<400 for complex) ✅
**Total time**: 111 minutes (78 min creation + 33 min iterations)

**TDD Results**:

- RED: 12 min (complex gap documentation)
- GREEN: 21 min (11 min + 10 min iteration)
- REFACTOR: 45 min (3 loopholes closed across 3 pressure tests)

**Quality**:

- Complexity appropriate (<400 for orchestrator)
- All loopholes closed
- Pressure tests rigorous

---

## Lessons from Complex Agent Creation

### Key Differences vs Simple Agent

| Aspect                 | Simple (python-dev) | Complex (hierarchical) | Difference               |
| ---------------------- | ------------------- | ---------------------- | ------------------------ |
| **Time**               | 52 min              | 111 min                | 2.1x longer              |
| **RED phase**          | 8 min               | 12 min                 | More complex gap         |
| **GREEN iterations**   | 1 (pass first try)  | 2 (needed refinement)  | Complex logic harder     |
| **REFACTOR loopholes** | 1                   | 3                      | More ways to rationalize |
| **Line count**         | 267                 | 387                    | More coordination logic  |

**Complex agents take ~2x time and need more iteration** - this is normal.

### Why REFACTOR Took Longer

**Simple agents** (1 loophole):

- Straightforward rules (write tests, use Click)
- Fewer ways to rationalize

**Complex agents** (3 loopholes):

- More judgment calls (which agent for which task?)
- More opportunities to rationalize (skip planning, wrong delegation, sunk cost)
- More iterations to close all loopholes

**This is expected and validates pressure testing value** - complex agents have more failure modes.

---

## Key Takeaways

1. **Complex agents need more time** (~2x simple agents)
2. **GREEN may require iteration** (not always first-try pass)
3. **REFACTOR finds multiple loopholes** (2-4 for complex vs 1-2 for simple)
4. **Final line count near limit is okay** (387/400 for orchestrator)
5. **Iteration is normal** - Don't expect perfect first try for complex agents

**Pressure testing is MORE valuable for complex agents** ✅
