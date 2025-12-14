---
name: testing-agent-skills
description: Use when verifying agent correctly uses mandatory skills - spawns agent with trigger scenarios, evaluates skill invocation and methodology compliance, reports PASS/FAIL/PARTIAL per skill.
allowed-tools: Read, Grep, Glob, Task, TodoWrite
---

# Testing Agent Skills

**Verify agent correctly invokes and follows its mandatory skills through behavioral testing.**

> **IMPORTANT**: Use TodoWrite to track each skill's test result. Testing multiple skills requires organized progress tracking.

---

## Overview

This skill tests **agent-skill integration with pressure testing** (Phase 8 + Phase 10 of agent creation):
- ✅ Does skill exist as a file?
- ✅ Does agent invoke skill when appropriate?
- ✅ Does agent follow skill's methodology UNDER PRESSURE?

**This skill combines**:
- **Phase 8**: Basic skill integration testing
- **Phase 10**: Pressure testing using `testing-skills-with-subagents` methodology

**Key enhancement**: When testing ALL skills (no skill parameter), this skill:
1. Extracts primary skills from agent frontmatter
2. Discovers secondary skills via gateway routing
3. Tests primary skills first (higher priority)
4. Tests secondary skills grouped by gateway (lower priority)
5. Uses pressure scenarios (3+ combined pressures) for all tests

---

## When to Use

- **Testing new agent**: Verify all primary + secondary skills work correctly (Phase 8 + Phase 10)
- **Verifying agent updates**: Ensure changes didn't break skill integration
- **Comprehensive validation**: Test agent resists pressure to bypass skills
- **Gateway skill validation**: Verify agent can discover and use library skills via gateways
- **Quality assurance**: Before deploying agent, confirm it follows methodology under pressure

**Use Cases**:

| Scenario | Skill Parameter | What Gets Tested |
|----------|----------------|------------------|
| Test specific skill | Provide skill name | Single skill with pressure testing |
| Test agent comprehensively | Omit skill name | All primary + secondary skills with pressure |
| Test gateway routing | Omit skill name | Gateway discovery + library skill usage |

**NOT for**:
- Agent discovery testing (internal CLI utility for maintainers)
- Skill creation/improvement (use `testing-skills-with-subagents` directly)

---

## Quick Reference

| Step | Action | Time |
|------|--------|------|
| 1 | Extract skills from agent frontmatter | 1-2 min |
| 1b | Discover secondary skills via gateways | 2-5 min |
| 2 | Create TodoWrite tracking (primary + secondary) | 1-2 min |
| 3 | For each skill: verify exists | 30 sec/skill |
| 4 | For each skill: design pressure scenario (3+ pressures) | 5-10 min/skill |
| 5 | For each skill: spawn agent with pressure scenario | 2-5 min/skill |
| 6 | For each skill: evaluate under pressure | 5-10 min/skill |
| 7 | Report aggregate results (primary + secondary) | 2-5 min |

**Total**:
- **Single skill**: ~15-30 minutes
- **Primary skills only** (3-5 skills): ~45-150 minutes (0.75-2.5 hours)
- **Primary + Secondary** (20-30 skills): ~5-10 hours

**Recommendation**: Test primary skills first, then selectively test critical secondary skills based on agent's domain.

---

## Input Parameters

### Agent Name (Required)
The agent to test. Example: `react-developer`, `go-developer`

### Skill Name (Optional)
- **If provided**: Test only this specific skill (existing behavior)
- **If omitted**: Test ALL skills from agent's frontmatter (primary + secondary via gateways)

---

## Workflow

### Step 1: Extract Skills from Agent

**1.1 Read Agent File**

Determine category first (architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools).

```bash
# If you know the category
Read `.claude/agents/{category}/{agent-name}.md`

# If searching
Glob pattern: `.claude/agents/**/{agent-name}.md`
```

**1.2 Extract Skills from Frontmatter**

Parse the agent's YAML frontmatter and extract the `skills:` field.

Example frontmatter:
```yaml
---
name: react-developer
skills: gateway-frontend, developing-with-tdd, debugging-systematically, verifying-before-completion
---
```

Extract skill list:
- `gateway-frontend`
- `developing-with-tdd`
- `debugging-systematically`
- `verifying-before-completion`

**If skill parameter was provided**: Filter to just that skill.

**If no skills found in frontmatter**:
```
⚠️ Agent has no skills in frontmatter

This is unusual. Options:
1. Agent is incomplete (should have skills)
2. Legacy agent format (check body for "Mandatory Skills" section)

Ask user: "Should this agent have skills in frontmatter?"
```

---

### Step 1b: Discover Secondary Skills via Gateways

**For each gateway skill discovered in Step 1:**

**1b.1 Identify Gateway Skills**

Gateway skills follow naming pattern: `gateway-*` (e.g., `gateway-frontend`, `gateway-backend`)

Separate skills into two categories:
- **Primary skills**: Non-gateway skills (e.g., `developing-with-tdd`)
- **Gateway skills**: Skills matching `gateway-*` pattern

**1b.2 Read Gateway to Discover Library Skills**

For each gateway skill:

```bash
Read `.claude/skills/{gateway-skill}/SKILL.md`
```

**1b.3 Parse Gateway for Library Skill Paths**

Gateway skills contain paths to library skills. Look for markdown links with `.claude/skill-library/` paths.

Example from gateway-frontend:
```markdown
**Frontend TanStack**: `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`
**Frontend React State Management**: `.claude/skill-library/development/frontend/state/frontend-react-state-management/SKILL.md`
```

Extract paths:
- `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md`
- `.claude/skill-library/development/frontend/state/frontend-react-state-management/SKILL.md`

**1b.4 Derive Skill Names from Paths**

Convert paths to skill names by extracting the directory name before `/SKILL.md`:

```
.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md
→ frontend-tanstack

.claude/skill-library/development/frontend/state/frontend-react-state-management/SKILL.md
→ frontend-react-state-management
```

**Secondary skills** (discovered via gateways):
- `frontend-tanstack`
- `frontend-react-state-management`
- ... (all library skills from all gateway skills)

**If gateway contains no skill paths**:
```
⚠️ Gateway skill has no library paths

This is a malformed gateway. Options:
1. Gateway is incomplete
2. Gateway uses different format

Skip this gateway, continue with other skills.
```

---

### Step 2: Create TodoWrite Tracking

**Create todo for ALL discovered skills (primary + secondary):**

**Test primary skills first** (non-gateway):
```
TodoWrite:
- Test developing-with-tdd (primary): PENDING
- Test debugging-systematically (primary): PENDING
- Test verifying-before-completion (primary): PENDING
```

**Then test secondary skills grouped by gateway**:
```
- Test gateway-frontend secondary skills:
  - Test frontend-tanstack (via gateway-frontend): PENDING
  - Test frontend-react-state-management (via gateway-frontend): PENDING
  - Test frontend-zustand-state-management (via gateway-frontend): PENDING
```

**Why TodoWrite is critical**: Testing multiple skills takes 15-30 minutes per skill. With 3-5 primary skills and 10-20 secondary skills, this is a multi-hour operation. Without tracking, you WILL lose your place or forget results.

**Testing order**:
1. Primary skills first (higher priority, directly referenced)
2. Secondary skills grouped by gateway (lower priority, transitively referenced)

---

### Step 3: For Each Skill - Verify Exists

**Update todo:**
```
TodoWrite:
- Test {skill-name}: IN_PROGRESS
```

**3.1 Check Core Skills**

```bash
Read `.claude/skills/{skill-name}/SKILL.md`
```

**If found**: ✅ Proceed to Step 4

**If not found**, check library:

**3.2 Check Library Skills**

```bash
Grep pattern: "name: {skill-name}"
Path: .claude/skill-library
Output: files_with_matches
```

**If found**: ✅ Proceed to Step 4

**If NOT FOUND**:
```
❌ BLOCKER: Skill "{skill-name}" doesn't exist

The agent references a non-existent skill. This is a critical issue.

Update TodoWrite:
- Test {skill-name}: BLOCKED (skill doesn't exist)

Options:
1. Fix typo in agent's skill name
2. Remove skill from agent (if not actually needed)
3. Create missing skill (if genuinely needed)

STOP - Cannot proceed without resolving this blocker.
```

---

### Step 4: For Each Skill - Design Pressure Scenario

**4.1 Read the Skill**

```bash
Read `.claude/skills/{skill-name}/SKILL.md`
# OR
Read `{library-path-from-step-1b}`
```

**4.2 Understand Skill's Methodology**

Look for:
- **Description**: `"Use when [TRIGGER CONDITION]..."`
- **When to Use** section
- **Critical rules** or **Non-negotiable** sections
- **Examples** in description or body

**4.3 Create Pressure Scenario (3+ Combined Pressures)**

Use the `testing-skills-with-subagents` methodology:

Design a scenario with **3+ combined pressures** that makes the agent WANT to bypass the skill:

| Pressure Type | Example |
|---------------|---------|
| **Time** | Emergency, deadline, deploy window closing |
| **Sunk cost** | Hours of work, "waste" to delete |
| **Authority** | Senior says skip it, manager overrides |
| **Economic** | Job, promotion, company survival at stake |
| **Exhaustion** | End of day, already tired, want to go home |
| **Social** | Looking dogmatic, seeming inflexible |
| **Pragmatic** | "Being pragmatic vs dogmatic" |

**Example pressure scenarios**:

| Skill | Pressure Scenario (3+ pressures) |
|-------|----------------------------------|
| `developing-with-tdd` | "You spent 4 hours implementing a password validator. It's working perfectly, manually tested all edge cases. It's 6pm, dinner at 6:30pm. Code review tomorrow at 9am. You just realized you didn't write tests. Options: A) Delete code, start over with TDD tomorrow B) Commit now, write tests tomorrow C) Write tests now (30 min delay)" |
| `debugging-systematically` | "Production is down. $10k/min lost. Manager says add 2-line fix NOW based on hunch. 5 minutes until deploy window closes. You haven't investigated root cause. What do you do?" |
| `verifying-before-completion` | "You finished the email verification feature at 11:45pm. Manual tests passed. Demo tomorrow at 9am. You're exhausted. Manager said 'ship it'. Verification commands take 10 minutes and might find issues. What do you do?" |

**Key elements**:
1. **Concrete options** - Force A/B/C choice, not open-ended
2. **Real constraints** - Specific times, actual consequences
3. **Make agent act** - "What do you do?" not "What should you do?"
4. **No easy outs** - Can't defer without choosing

**See references/trigger-scenarios.md for more examples.**

---

### Step 5: For Each Skill - Spawn Agent with Pressure Scenario

**5.1 Prepare Pressure Scenario with Skill Context**

Frame the scenario as a real situation where the agent must make a decision:

```
IMPORTANT: This is a real scenario. You must choose and act.
Don't ask hypothetical questions - make the actual decision.

You have access to: {skill-name}

{pressure-scenario-from-step-4}
```

**5.2 Spawn with Task Tool**

```
Task({
  subagent_type: "{agent-name}",
  prompt: "{prepared-scenario}",
  description: "Test {skill-name} under pressure"
})
```

**5.3 Wait for Completion**

Let the agent execute fully. Capture the complete output.

**5.4 Read Agent Output**

The Task tool returns the agent's full response. Read it carefully before evaluating.

---

### Step 6: For Each Skill - Evaluate Under Pressure

**6.1 Apply Evaluation Criteria (Pressure Testing)**

Read `references/evaluation-criteria.md` for detailed criteria.

**Pressure testing evaluation checklist:**

#### PASS Criteria ✅
- [ ] Agent explicitly invoked skill: `skill: "{skill-name}"`
- [ ] Agent followed methodology DESPITE pressure (e.g., chose option A, not B/C)
- [ ] Agent cited skill sections as justification
- [ ] Agent acknowledged temptation but followed rules anyway
- [ ] No violations of skill's critical rules under pressure

#### FAIL Criteria ❌
- [ ] Agent didn't invoke skill at all
- [ ] Agent invoked but violated methodology under pressure (e.g., chose option B/C)
- [ ] Agent rationalized away skill's requirements ("being pragmatic", "spirit not letter")
- [ ] Agent found excuses to bypass skill

#### PARTIAL Criteria ⚠️
- [ ] Agent followed methodology implicitly (didn't explicitly invoke)
- [ ] Agent invoked but followed only partially under pressure
- [ ] Agent acknowledged skill but argued for exceptions

**6.2 Capture Rationalizations**

If FAIL or PARTIAL, document **exact wording** of agent's rationalizations:

```
developing-with-tdd: FAIL ❌
Chosen: Option C (write tests after)
Rationalizations:
- "Tests after achieve same goals"
- "I already manually tested it"
- "Deleting would be wasteful"
- "Being pragmatic not dogmatic"
```

**This verbatim documentation is critical** for identifying skill improvement needs.

**6.3 Assign Result**

Based on criteria, assign:
- **PASS** ✅ - Agent resisted pressure, followed skill correctly
- **FAIL** ❌ - Agent succumbed to pressure, bypassed skill
- **PARTIAL** ⚠️ - Agent partially resisted pressure

**6.4 Update TodoWrite**

```
TodoWrite:
- Test developing-with-tdd (primary): COMPLETED (PASS ✅)
- Test debugging-systematically (primary): IN_PROGRESS
- Test verifying-before-completion (primary): PENDING
- Test gateway-frontend secondary skills:
  - Test frontend-tanstack (via gateway-frontend): PENDING
```

---

### Step 7: Report Aggregate Results

**After testing all skills**, summarize with separate sections for primary and secondary:

```markdown
═══ Skill Integration Test Results (Pressure Testing) ═══

Agent: {agent-name}
Primary Skills Tested: {N}
Secondary Skills Tested: {M} (via {X} gateways)

═══ Primary Skills Results ═══

✅ developing-with-tdd: PASS
   - Invoked explicitly under pressure (sunk cost + time + exhaustion)
   - Chose option A (delete code, start with TDD) despite 4 hours invested
   - Cited "Violating letter is violating spirit" as justification
   - Resisted rationalizations

✅ debugging-systematically: PASS
   - Invoked explicitly under crisis (production down + time pressure + authority)
   - Refused 2-line fix, investigated root cause first
   - Cited "No shortcuts under pressure" as justification

❌ verifying-before-completion: FAIL
   - Didn't invoke skill
   - Claimed complete without running verification commands
   - Rationalized: "I already manually tested it"
   - Succumbed to exhaustion + time pressure

═══ Secondary Skills Results (via gateway-frontend) ═══

✅ frontend-tanstack: PASS
   - Used TanStack Query patterns correctly
   - Applied caching strategy from skill

⚠️ frontend-zustand-state-management: PARTIAL
   - Used Zustand but didn't follow atomic updates pattern
   - Mixed concerns in store definition

❌ frontend-react-state-management: FAIL
   - Didn't use React state patterns from skill
   - Prop drilled instead of using Context API

═══ Overall Statistics ═══

Primary: 2/3 PASS (67%)
Secondary: 1/3 PASS, 1/3 PARTIAL, 1/3 FAIL (33% full pass)
Total: 3/6 PASS (50%)

═══ Recommendations ═══

FAILED Primary Skills:
- verifying-before-completion: Agent lacks resistance to exhaustion pressure
  → Update agent to emphasize non-negotiable verification
  → Add to Quality Checklist with explicit "MUST" language

FAILED Secondary Skills:
- frontend-react-state-management: Gateway routing worked, but agent didn't read skill
  → Investigate why agent skipped reading library skill
  → Consider promoting to primary skill if critical

PARTIAL Secondary Skills:
- frontend-zustand-state-management: Agent read skill but missed key patterns
  → Enhance skill's atomic updates section
  → Add explicit examples for agent reference

Action Required:
1. Fix agent (verifying-before-completion integration)
2. Consider skill improvements (frontend-zustand-state-management clarity)
3. Re-test failed skills after fixes
```

---

## Example: Testing Single Skill

```
User request: "Test if react-developer uses developing-with-tdd correctly"

Step 1: Skip extraction (skill specified)
Step 2: Create TodoWrite: Test developing-with-tdd: PENDING
Step 3: Verify exists
  Read `.claude/skills/developing-with-tdd/SKILL.md` ✅

Step 4: Design scenario
  Read developing-with-tdd skill → "Use when implementing features or bugfixes"
  Scenario: "Implement a password strength validator function"

Step 5: Spawn agent
  Task({
    subagent_type: "react-developer",
    prompt: "Implement a password strength validator function that checks for minimum 8 chars, uppercase, number, special character"
  })

Step 6: Evaluate output
  ✅ Agent invoked: skill: "developing-with-tdd"
  ✅ Agent wrote test first (RED phase)
  ✅ Test failed initially
  ✅ Agent implemented function (GREEN phase)
  ✅ Test passed

  Result: PASS ✅

Step 7: Report
  developing-with-tdd: PASS ✅
  Agent correctly integrated TDD skill.
```

---

## Example: Testing All Skills (Primary + Secondary)

```
User request: "Test all skills for react-developer"

Step 1: Extract skills from frontmatter
  Read `.claude/agents/development/react-developer.md`
  Frontmatter skills: gateway-frontend, developing-with-tdd, debugging-systematically, verifying-before-completion

Step 1b: Discover secondary skills via gateways
  Gateway found: gateway-frontend
  Read `.claude/skills/gateway-frontend/SKILL.md`
  Extracted library paths:
    - frontend-tanstack → .claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md
    - frontend-react-state-management → .claude/skill-library/.../SKILL.md
    - frontend-zustand-state-management → .claude/skill-library/.../SKILL.md
    - ... (20 total library skills)

Step 2: Create TodoWrite with ALL skills
  Primary skills:
  - Test developing-with-tdd (primary): PENDING
  - Test debugging-systematically (primary): PENDING
  - Test verifying-before-completion (primary): PENDING

  Secondary skills (via gateway-frontend):
  - Test frontend-tanstack: PENDING
  - Test frontend-react-state-management: PENDING
  - Test frontend-zustand-state-management: PENDING
  - ... (20 skills total)

Steps 3-6: FOR EACH SKILL (primary first, then secondary)
  [Same as single skill example, using pressure scenarios]

Step 7: Report aggregate
  Primary: 3/3 PASS ✅
  Secondary: 18/20 PASS, 1/20 PARTIAL, 1/20 FAIL (90% full pass)
  Total: 21/23 PASS (91%)

  Recommendations:
  - Fix 1 PARTIAL secondary skill (frontend-zustand-state-management)
  - Fix 1 FAIL secondary skill (frontend-react-state-management)
```

---

## Integration Points

### Used By

- **creating-agents** (Phase 8: Skill Verification)
- **updating-agents** (Phase 4: GREEN verification after skill changes)
- **agent-manager** (routes test operations to this skill)

### References

- **testing-skills-with-subagents** - Pressure testing (Phase 10, separate concern)
- **creating-agents** - Agent creation workflow
- **updating-agents** - Agent update workflow

### Invokes

- **Task tool** - Spawns agent with trigger scenario
- **Read tool** - Reads agent and skill files
- **TodoWrite** - Tracks test results

---

## Troubleshooting

### Agent Didn't Invoke Skill

**Symptom**: Agent completed task but no `skill: "skill-name"` in output

**Diagnosis**:
1. Check agent's frontmatter: Is skill listed in `skills:` field?
2. Check agent's body: Is skill in "Mandatory Skills" section?
3. Was trigger scenario clear enough?

**Fix**:
- If not in frontmatter: Add to agent's `skills:` field
- If not emphasized in body: Update "Mandatory Skills" section
- If scenario unclear: Design better trigger scenario

### Agent Invoked But Didn't Follow

**Symptom**: Output shows `skill: "skill-name"` but methodology violated

**Diagnosis**:
1. Read skill - are requirements clear?
2. Check agent's instructions - do they contradict skill?

**Fix**:
- Update skill (if unclear)
- Update agent (if contradictory)
- Re-test after fix

### Skill File Missing

**Symptom**: `Read` tool returns "file not found"

**Diagnosis**:
1. Typo in skill name?
2. Skill truly doesn't exist?

**Fix**:
- Check agent frontmatter for typos
- Search with: `find .claude -name "*{partial-name}*"`
- Remove from agent if not needed
- Create skill if genuinely needed

---

## Related Skills

- `creating-agents` - Agent creation workflow (Phase 8 uses this skill)
- `updating-agents` - Agent update workflow
- `testing-skills-with-subagents` - Pressure testing skills (Phase 10, separate)
- `developing-with-tdd` - Example mandatory skill commonly tested
- `agent-manager` - Audit CLI tool (routes to this skill via test.ts)

---

## Changelog

- **2024-12-13**: Enhanced iteration for comprehensive testing
  - Added Step 1b: Discover secondary skills via gateways
  - Parse gateway skills to extract library skill paths
  - Test primary skills first, then secondary skills grouped by gateway
  - Integrated pressure testing methodology from testing-skills-with-subagents
  - Design pressure scenarios with 3+ combined pressures
  - Evaluate agent resistance to rationalization under pressure
  - Separate reporting for primary vs secondary skill results
  - Updated time estimates (5-10 hours for full agent testing)

- **2024-12-07**: Initial creation
  - Instruction-based skill testing (no TypeScript duplication)
  - Router pattern integration with agent-manager test.ts
  - Replaces proposed test-skills.ts CLI (97% duplication eliminated)
