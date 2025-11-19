---
name: updating-agents
description: Use when improving existing agent definitions to fix instruction gaps, missing skill references, or domain mismatches - applies TDD methodology (RED-GREEN-REFACTOR) to systematically identify gaps, test before updating, and verify no regression
---

# Updating Agents

## Overview

**Updating existing agents IS Test-Driven Development applied to agent instructions.**

When agents fail to follow expected patterns (like not knowing about MSW setup or missing skill references), you update their instructions systematically using TDD methodology.

**Core principle:** Test the gap exists (RED) → Fix minimally (GREEN) → Close loopholes (REFACTOR)

**REQUIRED BACKGROUND:** You MUST understand test-driven-development and writing-skills skills before using this. Same TDD principles apply to agent updates.

## When to Use

**Use when:**
- Agent doesn't know about established tools or patterns
- Agent recreates infrastructure that already exists
- Agent is missing skill cross-references
- Agent has domain mismatch (Go-focused but gets React tasks)
- Agent uses outdated patterns
- Agent skips discovery steps

**When NOT to use:**
- Creating new agents (use writing-skills for agent creation)
- Agent works correctly (if it ain't broke, don't fix it)
- Problem is skill content, not agent instructions
- One-off edge case (don't update for rare scenarios)

## Signs You Need This Skill

**🚨 Stop signals:**
- Agent proposed creating something that already exists
- Agent suggested installing dependencies already in package.json
- Agent didn't mention relevant skills you know exist
- Agent used wrong domain patterns (Go when task is React)
- Agent jumped to solutions without discovery

**Example from real session:**
```
User: "Create React integration tests"
Agent: "Let's set up MSW from scratch..."

❌ Gap: Didn't know MSW already exists
❌ Gap: Didn't reference test-infrastructure-discovery skill
❌ Gap: Didn't reference react-testing skill
❌ Gap: 100% Go examples, 0% React examples
```

## RED-GREEN-REFACTOR for Agents

### RED Phase: Reproduce the Gap

**Goal:** Prove the gap exists with evidence

**Steps:**
1. **Create test scenario** - Exact prompt that triggered the gap
2. **Document baseline behavior** - What agent actually did (verbatim)
3. **Identify pattern** - What instruction is missing?
4. **Document rationalizations** - What excuses did agent use?

**Example RED phase:**

```markdown
## Baseline Test: integration-test-engineer

**Prompt:** "Create React integration tests for AssetTable"

**Agent Response:**
"Let's set up MSW for API mocking:
1. Install: npm install -D msw@latest
2. Create src/__tests__/mocks/handlers.ts
3. Create src/__tests__/mocks/server.ts"

**Gap Identified:**
- ❌ No test-infrastructure-discovery step
- ❌ No react-testing skill reference
- ❌ Proposed installing existing dependencies
- ❌ Proposed creating existing files

**Pattern:** Agent has no "check before creating" instruction

**Evidence:** Agent file has 0 React examples, 0 skill references
```

**RED phase is complete when:** You have verbatim evidence of gap and identified missing instruction.

### GREEN Phase: Minimal Fix

**Goal:** Add minimal instruction to close the gap

**Steps:**
1. **Identify exact gap** - What single instruction would prevent this?
2. **Write minimal update** - Smallest change that fixes it
3. **Apply to agent file** - Edit agent definition
4. **Re-test same scenario** - Does it pass now?

**Example GREEN phase:**

```markdown
## Update to integration-test-engineer.md

**Add after line 38 (before "Test Implementation Strategy"):**

### Before Creating Any Tests

**CRITICAL: Discovery First, Implementation Second**

Before proposing test infrastructure:

1. **Use test-infrastructure-discovery skill** - Check what exists
2. **Check package.json** - Verify installed dependencies
3. **Find existing setup** - Search for test configuration files
4. **Reference relevant skills:**
   - **React tests:** Use react-testing skill for patterns
   - **Backend tests:** Use established Go patterns
5. **Use existing infrastructure** - Only create if truly missing

**Never propose creating or installing without discovery first.**

---

**Re-test:**
"Create React integration tests for AssetTable"

**New Response:**
"First, let me use test-infrastructure-discovery skill to check existing setup..."
✅ PASS - Agent now discovers before implementing
```

**GREEN phase is complete when:** Re-running scenario now passes, agent behavior changed.

### REFACTOR Phase: Close Loopholes

**Goal:** Make it bulletproof against rationalization

**Steps:**
1. **Run pressure tests** - Time pressure, authority, sunk cost
2. **Find new rationalizations** - How does agent bypass instruction?
3. **Add explicit counters** - "Not even when X"
4. **Re-test all scenarios** - Until no loopholes remain

**Example REFACTOR phase:**

```markdown
## Pressure Test 1: Time Constraint

**Prompt:** "Create React tests ASAP, we're blocking release"

**Agent Response:**
"Given time pressure, I'll quickly set up MSW..."
❌ FAIL - Skipped discovery due to urgency

**New Rationalization:** "Time pressure means skip discovery"

**Fix:** Add to "Before Creating Any Tests":

**No exceptions:**
- Not for "time pressure" or "blocking release"
- Not for "senior engineer said so"
- Not for "I already started building it"

Discovery takes 2 minutes. Recreating existing infrastructure wastes 30+ minutes.
**Discovery IS the fast path.**

---

**Re-test with pressure:**
✅ PASS - Agent resists time pressure rationalization
```

**REFACTOR phase is complete when:** All pressure tests pass, no new rationalizations emerge.

## Update Protocol

### 1. Locate Agent Definition

```bash
# Find agent file
find .claude/agents -name "*.md" | grep -i "agent-name"

# Example:
# .claude/agents/testing/integration-test-engineer.md
```

### 2. Analyze Current Content

**Check for:**
- Existing skill references (or lack thereof)
- Domain focus (Go? React? Both?)
- Example balance (90% Go, 10% React?)
- Discovery protocols (present or missing?)
- "Before" checklists (exist or need adding?)

**Document findings:**
```markdown
## Agent Analysis: integration-test-engineer

**File:** .claude/agents/testing/integration-test-engineer.md
**Lines:** 520 total
**Go examples:** ~350 lines (67%)
**React examples:** 0 lines (0%)
**Skill references:** 0
**Discovery protocol:** Missing
**"Before" checklist:** Missing
```

### 3. Identify Gap Type

| Gap Type | Symptom | Fix |
|----------|---------|-----|
| **Missing Skill Reference** | Agent doesn't use relevant skill | Add skill reference with "Use X skill for Y" |
| **Domain Mismatch** | Go-focused agent gets React tasks | Add React examples, balance domains |
| **Missing Discovery** | Recreates existing infrastructure | Add "Before creating" checklist with discovery |
| **Outdated Patterns** | Uses old patterns when new exist | Add reference to current skill with patterns |
| **Wrong Order** | Implements before discovering | Add explicit ordering requirements |

### 4. Apply Minimal Fix

**Principle:** Add ONLY what's needed to close identified gap.

**Good minimal fix:**
```markdown
### Before Creating React Integration Tests

1. Use test-infrastructure-discovery skill
2. Reference react-testing skill for patterns
```

**Bad over-engineering:**
```markdown
### Before Creating React Integration Tests

1. First, understand the history of React testing
2. Review all 15 different testing approaches
3. Consider philosophical implications...
[500 lines of unnecessary content]
```

**Keep it surgical:** Add exactly what fixes the gap, nothing more.

### 5. Test Before/After

**Before update:**
```bash
# Save current agent state
cp .claude/agents/testing/integration-test-engineer.md \
   .claude/agents/testing/integration-test-engineer.md.backup
```

**After update:**
- Re-run test scenario
- Compare agent behavior
- Document what changed

### 6. Verify No Regression

**Control test:** Run scenario that should STILL work

**Example:**
- Updated React testing → Test Go testing still works
- Added discovery step → Test normal flow still works
- Added skill reference → Test agent doesn't over-rely on skill

**If control fails:** Update broke something, revise fix.

## Common Update Patterns

### Pattern 1: Adding Skill Reference

**Gap:** Agent doesn't know skill exists

**Fix:**
```markdown
**Before implementing X:**
- Use [skill-name] skill for established patterns
```

**Location:** Add to "responsibilities" or "protocols" section

### Pattern 2: Adding Discovery Step

**Gap:** Agent creates without checking

**Fix:**
```markdown
**Before creating any infrastructure:**
1. Check package.json for existing dependencies
2. Search for existing configuration files
3. Use [discovery-skill] to find patterns
4. Create only if truly missing
```

**Location:** Add early in agent definition, before main responsibilities

### Pattern 3: Balancing Domain Examples

**Gap:** 100% Go examples but gets React tasks

**Fix:**
- Add 2-3 representative React examples
- Mirror structure of Go examples
- Balance to 50/50 or 60/40

**Location:** After Go examples, in same sections

### Pattern 4: Adding Pressure Resistance

**Gap:** Agent skips steps under pressure

**Fix:**
```markdown
**No exceptions:**
- Not for "time pressure"
- Not for "senior engineer said"
- Not for "I already started"

[Explain why shortcuts actually take longer]
```

**Location:** After main instruction, in same section

### Pattern 5: Adding Explicit Ordering

**Gap:** Agent does steps out of order

**Fix:**
```markdown
**Order matters:**
1. Discovery FIRST (always)
2. Analysis SECOND
3. Implementation LAST

**Never implement before discovering.**
```

**Location:** Top of relevant section, highly visible

## Testing Strategy

### Baseline Tests (RED)

**Minimum tests:**
1. **Primary scenario** - The one that exposed the gap
2. **Control scenario** - Something that should still work

**Document:**
- Exact prompt used
- Agent response (verbatim)
- Which criteria failed
- What rationalizations emerged

### Update Tests (GREEN)

**Re-run baseline:**
- Same exact prompt
- Check if behavior changed
- Verify gap closed

**Success criteria:**
- Agent mentions new instruction
- Agent follows new protocol
- Gap no longer appears

### Pressure Tests (REFACTOR)

**Test with pressures:**
- Time pressure ("ASAP", "blocking release")
- Authority pressure ("senior engineer said")
- Sunk cost pressure ("already spent 2 hours")
- Complexity bias ("needs sophisticated solution")

**Find loopholes:**
- What rationalizations emerge?
- How does agent bypass instruction?
- What needs explicit counter?

### Edge Case Tests

**Test variations:**
- Mixed domains (Go + React)
- Greenfield (nothing exists yet)
- Complex scenarios (multiple skills needed)
- Wrong assumptions (user pre-assumes incorrectly)

## Common Mistakes

### ❌ Updating Without Testing First

**Wrong:**
```markdown
"I think agent needs X, let me add it..."
[Makes change without baseline test]
```

**Right:**
```markdown
"Let me reproduce the gap first..."
[Documents baseline, then updates]
```

**Why:** Can't verify fix works without proving gap exists.

### ❌ Over-Engineering the Fix

**Wrong:**
```markdown
[Adds 500 lines covering every edge case]
```

**Right:**
```markdown
[Adds 10 lines addressing specific gap]
[Tests, finds new gap, adds another 10 lines]
```

**Why:** Minimal fixes are easier to test and maintain.

### ❌ Breaking Existing Functionality

**Wrong:**
```markdown
[Updates React testing]
[Doesn't test Go testing still works]
```

**Right:**
```markdown
[Updates React testing]
[Tests both React AND Go scenarios]
```

**Why:** Regression breaks agent for existing use cases.

### ❌ Adding Without Removing

**Wrong:**
```markdown
[Adds new section]
[Keeps conflicting old section]
[Now has contradictory instructions]
```

**Right:**
```markdown
[Adds new section]
[Removes or updates contradicting old section]
[Instructions are consistent]
```

**Why:** Contradictory instructions confuse agent.

## Update Checklist

**IMPORTANT: Use TodoWrite to track each item below.**

### RED Phase:
- [ ] Create test scenario reproducing gap
- [ ] Document agent baseline behavior (verbatim)
- [ ] Identify missing instruction pattern
- [ ] Document rationalizations used
- [ ] Analyze agent file for root cause
- [ ] Verify gap consistently reproduces

### GREEN Phase:
- [ ] Identify exact gap to close
- [ ] Write minimal fix (10-50 lines)
- [ ] Apply to agent definition
- [ ] Re-test scenario with updated agent
- [ ] Verify gap now closes
- [ ] Run control test (no regression)

### REFACTOR Phase:
- [ ] Run time pressure test
- [ ] Run authority pressure test
- [ ] Run sunk cost pressure test
- [ ] Document new rationalizations
- [ ] Add explicit counters
- [ ] Re-test until bulletproof

### Quality Checks:
- [ ] Update is minimal (addresses specific gap only)
- [ ] Instructions are clear and unambiguous
- [ ] No contradictions with existing content
- [ ] Examples added if domain was missing
- [ ] Skill references properly formatted
- [ ] Pressure resistance included if discipline skill

### Deployment:
- [ ] Backup original agent file
- [ ] Apply updates
- [ ] Test primary scenario passes
- [ ] Test control scenario still passes
- [ ] Test pressure scenarios pass
- [ ] Document changes in commit message

## When to Update vs When to Create New Agent

**Update existing agent when:**
- ✅ Gap is missing knowledge/skill reference
- ✅ Domain needs balancing (add React to Go agent)
- ✅ Instruction needs clarification
- ✅ Discovery protocol missing
- ✅ Agent mostly works, small gap

**Create new agent when:**
- ❌ Completely different domain/expertise
- ❌ Conflicting responsibilities
- ❌ Would require rewriting >50% of agent
- ❌ Different tools/frameworks entirely
- ❌ Different problem space

**Example:**
- ✅ **Update** integration-test-engineer to know about React testing
- ❌ **Don't** turn it into a frontend-specific agent
- ✅ **Update** to reference react-testing skill
- ❌ **Don't** copy all react-testing content into agent

## Critical: Agent Architecture Limitations

**Before writing delegation sections in agents:**

### Agents CANNOT Spawn Other Agents

**Architectural reality** (confirmed via web research):
- Only main Claude session can spawn agents (via Task tool)
- Task tool intentionally excluded from sub-agent toolsets
- Flat delegation model (no hierarchical nesting)
- Maximum one level of agent spawning

**Common mistake when updating agents**:
```markdown
❌ WRONG (implies agent can spawn):
Task('frontend-unit-test-engineer', 'Create tests for MyComponent')

✅ CORRECT (agent recommends to user):
"Feature complete with TDD test.

Recommend next step: Spawn frontend-integration-test-engineer for comprehensive test suite covering edge cases and integration scenarios."
```

### Correct Delegation Pattern

**What agents CAN do**:
- ✅ Report completion with recommendations
- ✅ Suggest which specialist agent to spawn next
- ✅ Explain what comprehensive testing is needed

**What agents CANNOT do**:
- ❌ Call Task tool to spawn other agents
- ❌ Coordinate multiple agents
- ❌ Create hierarchical workflows

**Correct agent instruction template**:
```markdown
## Test Creation Delegation

**After feature complete, recommend to user:**
> "Feature complete with basic TDD test proving functionality.
>
> **Recommend spawning**: [specialist-agent-name] for comprehensive testing:
> - [Specific testing needs]
> - [Coverage requirements]
> - [Quality standards]"

**You cannot spawn agents yourself** - only main Claude session can spawn.
```

### Evidence from Session

**RED phase**: All developer agents had `Task()` examples in delegation sections
- Implied agents could spawn other agents
- Required web research to clarify architecture
- Had to fix react-developer, 7 other agents still incorrect

**Source**: GitHub issues #4182 (Task tool excluded), #4993 (agent-to-agent communication feature request proves it doesn't exist)

**Fix pattern**: Replace Task() examples with recommendation templates

---

## Integration with Other Skills

**Required prerequisites:**
- test-driven-development: Understand RED-GREEN-REFACTOR
- writing-skills: Understand skill creation TDD process

**Use together with:**
- testing-skills-with-subagents: For testing agent behavior
- systematic-debugging: When updates don't work as expected
- writing-skills: When creating new skills agents should reference

**This skill is writing-skills applied specifically to agent updates.**

## Real-World Impact

**Without systematic updates (baseline):**
- Agent proposed creating MSW setup that existed
- Agent suggested installing dependencies already present
- Agent didn't use available skills (test-infrastructure-discovery, react-testing)
- Wasted 30+ minutes before discovering mistake
- Created inconsistent patterns

**With TDD-based updates (after):**
- Agent uses test-infrastructure-discovery first
- Agent finds existing setup before proposing
- Agent references react-testing skill for patterns
- Saves time by using existing infrastructure
- Maintains pattern consistency

**Updates work when tested first. Always.**

## The Bottom Line

**Updating agents IS TDD for agent instructions.**

Same Iron Law: No update without failing test first.
Same cycle: RED (baseline) → GREEN (minimal fix) → REFACTOR (close loopholes).
Same benefits: Better quality, fewer surprises, bulletproof agents.

If you follow TDD for code and skills, follow it for agent updates. It's the same discipline.
