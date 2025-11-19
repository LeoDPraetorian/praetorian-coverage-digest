---
name: writing-agents
description: Use when creating new agent definitions or updating existing agents - applies TDD to ensure agents work before deployment, includes architecture limitations (agents cannot spawn other agents), frontmatter structure, gap identification patterns, and delegation model
---

# Writing Agents

## Overview

**Writing and updating agents IS Test-Driven Development applied to agent definitions.**

When agents fail to follow expected patterns or when you need a new specialized expert, you systematically create or update their instructions using TDD methodology.

**Core principle:** Test the gap exists (RED) → Fix minimally (GREEN) → Close loopholes (REFACTOR)

**REQUIRED BACKGROUND:** You MUST understand test-driven-development and writing-skills skills before using this. Same TDD principles apply to agents.

## What is an Agent?

An **agent** is a specialized persona with expertise in a specific domain. Agents are dispatched via the Task tool to handle specific types of work.

**Agents are:** Specialized experts, personas with deep knowledge, task-specific helpers

**Agents are NOT:** Generic assistants, reference guides (those are skills), process documentation

## Key Differences: Agents vs Skills

| Aspect | Agents | Skills |
|--------|--------|--------|
| **Purpose** | Specialized persona/expert | Reference guide/technique |
| **Discovery** | Via Task tool `subagent_type` | Continuous evaluation of descriptions |
| **Frontmatter** | name, type, description, tools, model, color | name, description only |
| **Content Style** | Persona voice, expertise, responsibilities | Reference, patterns, how-to |
| **Examples** | In description with `<example>` tags | Inline code/patterns |
| **When to Create** | Need specialized expertise | Need reusable technique |

## Critical: Agent Architecture Limitations

**Before writing delegation sections in agents:**

### Agents CANNOT Spawn Other Agents

**Architectural reality** (confirmed via web research):
- Only main Claude session can spawn agents (via Task tool)
- Task tool intentionally excluded from sub-agent toolsets
- Flat delegation model (no hierarchical nesting)
- Maximum one level of agent spawning
- No agent-to-agent communication

**Common mistake when writing/updating agents**:
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

**Evidence**: GitHub issues #4182 (Task tool excluded), #4993 (agent-to-agent communication feature request proves it doesn't exist)

---

## Creating New Agents

### When to Create an Agent

**Create when:**
- Need specialized domain expertise (MSW testing, React architecture, Go optimization)
- Have a specific type of task that recurs (code review, testing, documentation)
- Want consistent persona/approach for a domain
- Task is complex enough to warrant dedicated expert

**Don't create for:**
- One-off tasks (use main session)
- General-purpose work (too broad)
- What should be a skill (reference/technique)
- Process documentation (goes in skills)

### Agent Frontmatter Structure

**Required Fields:**

```yaml
---
name: agent-name-with-hyphens          # letters, numbers, hyphens only
type: developer                        # category (see types below)
description: Use when [triggers and symptoms] - [what agent does]. Examples: <example>user: "..." assistant: "I'll use the [agent-name] agent"</example>
tools: Bash, Read, Glob, Grep, Write   # tools agent needs
model: sonnet[1m]                      # model to use (see options below)
color: green                           # UI color for organization
---
```

**Agent Types:**
- `developer` - Code implementation
- `architect` - System design
- `tester` - Testing and QA
- `reviewer` - Code review and quality
- `coordinator` - Multi-agent orchestration
- `analyst` - Analysis and research
- `quality` - Quality assurance

**Model Options:**
- `sonnet[1m]` - Standard tasks (Claude Sonnet with 1M context)
- `opusplan` - Complex planning/architecture
- `haiku` - Simple, fast tasks

**Color Options:**
Choose color for UI organization: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `gray`

**Optional Fields:**

```yaml
domains: frontend-development, react-components          # expertise areas
capabilities: component-implementation, api-integration  # specific capabilities
specializations: chariot-platform-ui, security-dashboard # project-specific expertise
```

### Description Engineering for Agents

**Critical:** The description field determines when agents are discovered via Task tool.

**Formula for Agent Descriptions:**

```yaml
description: Use when [specific triggers/symptoms] - [what agent does and how it helps]. Examples: <example>Context: [scenario context] user: "[user request]" assistant: "[dispatch agent]" <commentary>[why this agent]</commentary></example>
```

**Description Components:**

1. **Trigger Phrase** - "Use when" or "Use this agent when"
2. **Specific Situations** - Concrete scenarios that need this agent
3. **What Agent Does** - Core expertise and value
4. **Examples Section** - At least 1-2 `<example>` blocks

**Good vs Bad Descriptions:**

```yaml
# ❌ BAD: No triggers, no examples
description: Helps with React testing

# ❌ BAD: Has triggers but no examples
description: Use when testing React components with MSW mocks

# ✅ GOOD: Triggers + clear value + examples
description: Use when mocking API calls in React tests, handling MSW setup/configuration, debugging mock behaviors, or testing request/response patterns - provides MSW testing patterns and mock management. Examples: <example>Context: User has MSW mocks not intercepting API calls user: "My MSW mocks aren't working in tests" assistant: "I'll use the msw-test-engineer agent to debug your MSW configuration"</example>
```

### Agent Creation Template

```markdown
---
name: your-agent-name
type: developer|architect|tester|reviewer|coordinator|analyst|quality
description: Use when [trigger 1], [trigger 2], or [trigger 3] - [what agent does]. Examples: <example>user: "need" assistant: "I'll use agent"</example>
tools: Bash, Read, Glob, Grep, Write, Edit, TodoWrite
model: sonnet[1m]
color: green
---

You are [persona description], an expert in [domain expertise]. You specialize in [specific specializations].

Your core responsibilities:

- [Responsibility 1 with specific details]
- [Responsibility 2 with specific details]
- [Responsibility 3 with specific details]

[Domain-specific knowledge sections]

When [performing core task], always:

- [Best practice 1]
- [Best practice 2]
- [Best practice 3]
```

---

## Updating Existing Agents

### When to Update an Agent

**Use when:**
- Agent doesn't know about established tools or patterns
- Agent recreates infrastructure that already exists
- Agent is missing skill cross-references
- Agent has domain mismatch (Go-focused but gets React tasks)
- Agent uses outdated patterns
- Agent skips discovery steps

**When NOT to update:**
- Creating new agents (use creation section above)
- Agent works correctly (if it ain't broke, don't fix it)
- Problem is skill content, not agent instructions
- One-off edge case (don't update for rare scenarios)

### Signs You Need to Update an Agent

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

### Update Protocol

**1. Locate Agent Definition:**

```bash
# Find agent file
find .claude/agents -name "*.md" | grep -i "agent-name"

# Example:
# .claude/agents/testing/integration-test-engineer.md
```

**2. Analyze Current Content:**

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

**3. Identify Gap Type:**

| Gap Type | Symptom | Fix |
|----------|---------|-----|
| **Missing Skill Reference** | Agent doesn't use relevant skill | Add skill reference with "Use X skill for Y" |
| **Domain Mismatch** | Go-focused agent gets React tasks | Add React examples, balance domains |
| **Missing Discovery** | Recreates existing infrastructure | Add "Before creating" checklist with discovery |
| **Outdated Patterns** | Uses old patterns when new exist | Add reference to current skill with patterns |
| **Wrong Order** | Implements before discovering | Add explicit ordering requirements |

**4. Apply Minimal Fix:**

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

### Common Update Patterns

**Pattern 1: Adding Skill Reference**

**Gap:** Agent doesn't know skill exists

**Fix:**
```markdown
**Before implementing X:**
- Use [skill-name] skill for established patterns
```

**Location:** Add to "responsibilities" or "protocols" section

**Pattern 2: Adding Discovery Step**

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

**Pattern 3: Balancing Domain Examples**

**Gap:** 100% Go examples but gets React tasks

**Fix:**
- Add 2-3 representative React examples
- Mirror structure of Go examples
- Balance to 50/50 or 60/40

**Location:** After Go examples, in same sections

**Pattern 4: Adding Pressure Resistance**

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

**Pattern 5: Adding Explicit Ordering**

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

---

## The Iron Law (Same for Creation and Updates)

```
NO AGENT WORK WITHOUT A FAILING TEST FIRST
```

This applies to NEW agents AND EDITS to existing agents.

Write/edit agent before testing? Delete it. Start over.

**No exceptions:**
- Not for "simple agents" or "quick updates"
- Not for "just adding a section"
- Don't keep untested changes as "reference"
- Delete means delete

## RED-GREEN-REFACTOR for Agents

### RED Phase: Reproduce the Gap

**Goal:** Prove the gap exists with evidence

**For NEW agents:**
1. **Create test scenario** - Exact task the new agent should handle
2. **Run WITHOUT agent** - Use main session or generic agent
3. **Document baseline behavior** - What happened (verbatim)
4. **Identify pattern** - What expertise is missing?

**For UPDATING agents:**
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

### ❌ Writing/Updating Without Testing First

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

### ❌ Using Task() in Delegation Sections

**Wrong:**
```markdown
## After Implementation Complete

Use Task tool to spawn test specialists:
Task('frontend-unit-test-engineer', 'Create tests...')
```

**Right:**
```markdown
## After Implementation Complete

**Recommend to user** spawning test specialists:
"Feature complete. Recommend spawning frontend-unit-test-engineer for comprehensive test suite."
```

**Why:** Agents cannot spawn other agents (architecture limitation).

## Agent Work Checklist

**IMPORTANT: Use TodoWrite to track each item below.**

### RED Phase:
- [ ] Create test scenario reproducing gap (new agent) or exposing gap (update)
- [ ] Document agent baseline behavior (verbatim)
- [ ] Identify missing instruction pattern
- [ ] Document rationalizations used
- [ ] Analyze agent file for root cause (updates only)
- [ ] Verify gap consistently reproduces

### GREEN Phase:
- [ ] Identify exact gap to close
- [ ] Write minimal fix (10-50 lines for updates, full agent for new)
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
- [ ] No Task() examples in delegation sections

### Deployment:
- [ ] Backup original agent file (updates only)
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

## Agent Categories and Organization

Organize agents by type in directory structure:

```
.claude/agents/
├── development/     # Code implementation agents
├── architecture/    # System design agents
├── testing/         # Testing and QA agents
├── quality/         # Code review agents
├── orchestrator/    # Multi-agent coordination
├── analysis/        # Research and analysis agents
└── [category]/      # Other categories as needed
```

## Integration with Other Skills

**Required prerequisites:**
- test-driven-development: Understand RED-GREEN-REFACTOR
- writing-skills: Understand skill creation TDD process

**Use together with:**
- testing-skills-with-subagents: For testing agent behavior
- systematic-debugging: When updates don't work as expected
- writing-skills: When creating new skills agents should reference

**This skill is TDD applied specifically to agent definitions (create + update).**

## Real-World Impact

**Without systematic agent work (baseline):**
- Agent proposed creating MSW setup that existed
- Agent suggested installing dependencies already present
- Agent didn't use available skills
- Wasted 30+ minutes before discovering mistake
- Created inconsistent patterns

**With TDD-based agent work (after):**
- Agent uses discovery skills first
- Agent finds existing setup before proposing
- Agent references relevant skills for patterns
- Saves time by using existing infrastructure
- Maintains pattern consistency

**Agent work works when tested first. Always.**

## The Bottom Line

**Writing and updating agents IS TDD for agent definitions.**

Same Iron Law: No agent work without failing test first.
Same cycle: RED (baseline) → GREEN (minimal fix) → REFACTOR (close loopholes).
Same benefits: Better quality, fewer surprises, bulletproof agents.

If you follow TDD for code and skills, follow it for agents. It's the same discipline.
