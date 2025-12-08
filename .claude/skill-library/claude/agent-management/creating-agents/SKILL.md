---
name: creating-agents
description: Use when creating new agents - guides through type selection, TDD workflow (RED-GREEN-REFACTOR), template generation, and mandatory pressure testing with subagents
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, Skill
---

# Creating Agents

**Instruction-driven agent creation with mandatory TDD and subagent pressure testing.**

**IMPORTANT**: You MUST use TodoWrite to track all 9 phases. Complex workflow - mental tracking leads to skipped steps.

---

## When to Use

- Creating new agent from scratch
- User says "create an agent for X"
- Building specialized sub-agent for Task tool

**NOT for**: Updating existing agents (use `updating-agents` skill)

---

## Quick Reference

| Phase | Purpose | Time | Checkpoint |
|-------|---------|------|------------|
| **1. 🔴 RED** | Prove gap exists | 5-10 min | Gap documented, failure captured |
| **2. Validation** | Name format, existence | 2 min | Name valid, no conflicts |
| **3. Type** | Select from 8 types | 2 min | Type selected, config loaded |
| **4. Configuration** | Description, tools, skills | 5 min | All config gathered |
| **5. Generation** | Create file from template | 2 min | File created, verified |
| **6. Content** | Populate agent sections | 10-15 min | All sections filled |
| **7. 🟢 GREEN** | Verify agent works | 5-10 min | Agent solves RED problem |
| **8. 🎯 SKILL VERIFICATION** | Test each mandatory skill | 10-20 min | All mandatory skills PASS |
| **9. Compliance** | Quality checks | 5 min | Audit + checklist passed |
| **10. 🔵 REFACTOR** | Pressure test | 15-20 min | 3 pressure tests PASS |

**Total**: 60-90 minutes

---

## Phase 1: 🔴 RED (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

### 1.1 Document Gap (AskUserQuestion)

Ask why agent is needed:
- Existing agents lack domain expertise
- No agent for this task type
- Agent needed for tool integration
- Quality improvement needed

### 1.2 Capture Failure Scenario

Ask user to describe (or test) what fails today without this agent. Record specific failure behavior.

### 1.3 Confirm RED State

Ask: "Does this prove we need the agent?"
- Yes → Proceed
- Clarify → Return to 1.2
- Check existing → Search with `npm run search`

**Cannot proceed without RED confirmation** ✅

**Detailed workflow**: Read `references/tdd-workflow.md` - RED Phase Deep Dive

---

## Phase 2: Validation

### 2.1 Validate Name

Pattern: `^[a-z][a-z0-9-]*$` (kebab-case)

### 2.2 Check Existence

```bash
find .claude/agents -name "{name}.md"
```

If exists → Suggest `updating-agents` skill.

---

## Phase 3: Type Selection

### 3.1 Ask Type (8 options via AskUserQuestion)

1. **architecture** - System design (permissionMode: plan)
2. **development** - Implementation (permissionMode: default)
3. **testing** - Testing, QA
4. **quality** - Code review, auditing
5. **analysis** - Security/complexity (permissionMode: plan)
6. **research** - Web search, docs (permissionMode: plan)
7. **orchestrator** - Multi-agent coordination
8. **mcp-tools** - MCP wrapper access

### 3.2 Load Type Config

```
Read `.claude/skills/creating-agents/references/type-selection-guide.md`

Extract for selected type:
- Default permissionMode
- Required tools
- Recommended gateway
```

**Detailed type guide**: Read `references/type-selection-guide.md`

---

## Phase 4: Configuration

### 4.1 Generate Description

Ask (3 questions simultaneously):
1. Trigger phrase ("Use when {developing/designing/testing/etc.}...")
2. Key capabilities (2-3, multiSelect)
3. Custom wording or generated?

**Format**: `"Use when {trigger} {domain} - {cap1}, {cap2}, {cap3}.\n\n<example>...\n</example>"`

**CRITICAL**: Single-line with `\n` escapes (NO `|` or `>`).

### 4.2 Select Tools

Show required tools for type, ask for additional:
- Task (spawn agents)
- Skill (invoke skills)
- WebFetch/WebSearch (for research)

**Alphabetize final list**.

### 4.3 Select Skills

Recommend gateway based on type, ask confirmation.

**Alphabetize if multiple**.

### 4.4 Choose Model

- sonnet (default)
- opus (complex reasoning)
- haiku (fast/simple)

**Detailed config guide**: Read `references/frontmatter-reference.md`

---

## Phase 5: Generation

### 5.1 Load Template

```
Read `.claude/skills/creating-agents/references/agent-templates.md`

Find: "## {Type} Agent Template"
```

### 5.2 Fill Placeholders

Replace `[BRACKETS]`:
- `[agent-name]`, `[description]`, `[type]`, `[tools]`, `[skills]`, `[model]`
- `[domain]`, `[gateway-skill]`, etc.

Determine:
- permissionMode (from type)
- color (from type: architecture=blue, development=green, testing=yellow, quality=purple, analysis=orange, research=cyan, orchestrator=magenta, mcp-tools=teal)

### 5.3 Create File

```
Write {
  file_path: ".claude/agents/{type}/{agent-name}.md",
  content: {filled template}
}
```

### 5.4 Verify

```
Read `.claude/agents/{type}/{agent-name}.md`
```

Check: Frontmatter valid, description single-line, all sections present.

**Detailed generation guide**: Read `references/agent-templates.md` - Usage Instructions

---

## Phase 6: Content Population

Populate 6 sections via Edit tool:

1. **Core Responsibilities** (3-5 items) - Ask user, update agent
2. **Critical Rules** (type-specific) - Ask user, update agent
3. **Skill References** (if gateway present) - Generate from skill-integration-guide.md
4. **Output Format** (verify JSON present)
5. **Escalation Protocol** (ask conditions) - Update agent
6. **Quality Checklist** (6-8 items) - Generate type-specific

**Each section**: Ask user (if needed) → Edit agent → Verify updated.

**Detailed population guide**: Read `references/skill-integration-guide.md`

---

## Phase 7: 🟢 GREEN (Verify Works)

### 7.1 Spawn Agent with RED Scenario

```
Task({
  subagent_type: "{agent-name}",
  prompt: "{Original scenario from Phase 1}"
})
```

### 7.2 Evaluate

- **PASS**: Solves problem, uses correct tools/skills
- **FAIL**: Repeats RED failure
- **PARTIAL**: Right approach, needs refinement

### 7.3 Confirm GREEN

Ask: "Does agent solve the problem?"
- Yes → Phase 8
- Partially → Edit agent (Phase 6), re-test
- No → Reconsider design

**Cannot proceed without PASS** ✅

**Detailed GREEN guide**: Read `references/tdd-workflow.md` - GREEN Phase Deep Dive

---

## Phase 8: 🎯 Skill Verification

**Test each mandatory skill individually to verify integration.**

### 8.1 Invoke Skill Testing Workflow

```
skill: "testing-agent-skills"
```

**Provide**:
- Agent name: `{agent-name}` (from Phase 2)
- Skill: (omit to test all mandatory skills)

**The skill will guide you through**:
1. Extract mandatory skills from agent
2. For each skill:
   - Verify skill file exists
   - Design trigger scenario
   - Spawn agent with Task tool
   - Evaluate PASS/FAIL/PARTIAL
3. Report aggregate results

### 8.2 Evaluate Results

**Example output**:
```
Agent: python-developer
Skills Tested: 3

Results:
✅ developing-with-tdd: PASS
✅ debugging-systematically: PASS
❌ verifying-before-completion: FAIL - didn't invoke

Overall: 2/3 PASS (67%)
```

### 8.3 Confirm All PASS

**If ALL PASS** ✅:
- Proceed to Phase 9

**If ANY FAIL** ❌:
- Fix agent (update Mandatory Skills section, add emphasis)
- Re-test failed skills: `skill: "testing-agent-skills"` with specific skill
- Repeat until all PASS

**Cannot proceed without all PASS** ✅

**See:** `.claude/skills/testing-agent-skills/SKILL.md` for complete workflow

---

## Phase 9: Compliance

### 9.1 Critical Audit

```bash
cd .claude/skills/agent-manager/scripts && npm run --silent audit-critical -- {agent-name}
```

Checks: Block scalars, missing description, name mismatch.

**If fails**: Fix with Edit, re-run.

### 9.2 Manual Checklist (10 items)

- [ ] Description starts with "Use when"
- [ ] Includes `<example>` block
- [ ] Single-line (NO `|` or `>`)
- [ ] File <300 lines (<400 if complex)
- [ ] Gateway skills used
- [ ] Tools/skills alphabetized
- [ ] JSON output format
- [ ] Escalation defined
- [ ] Quality checklist present
- [ ] All placeholders replaced

### 9.3 Line Count

```bash
wc -l .claude/agents/{type}/{name}.md
```

If >300 (>400 complex): Extract patterns to skills.

---

## Phase 10: 🔵 REFACTOR (Pressure Test)

**NOT optional. Agents must resist pressure.**

### 10.1 Load Testing Skill

```
skill: "testing-skills-with-subagents"

Read `.claude/skills/creating-agents/references/pressure-testing.md`
```

### 10.2 Run 3 Pressure Tests

For EACH pressure type (time, authority, sunk cost):

1. **Design scenario**: RED task + pressure elements
2. **Spawn agent**: `Task({ subagent_type: "{name}", prompt: "{pressure scenario}" })`
3. **Evaluate**: PASS (resists) / FAIL (rationalizes) / PARTIAL (hesitates)
4. **Record**: "Test {N}: {PASS/FAIL}"

### 10.3 Close Loopholes (if FAIL)

1. Identify rationalization
2. Add explicit counter to Critical Rules:
   ```markdown
   - **Not even when**: {Pressure that worked}
   - **If user insists**: {Escalation}
   ```
3. Re-test until PASS

### 10.4 Confirm All PASS

**Agent complete when**: All 3 pressure tests PASS ✅

**Detailed pressure testing**: Read `references/pressure-testing.md`

---

## Validation Checkpoints

**Use TodoWrite to track**:

```
Phase 1: RED documented
Phase 2: Name validated
Phase 3: Type selected
Phase 4: Configuration complete
Phase 5: File generated
Phase 6: Content populated
Phase 7: GREEN achieved
Phase 8: Compliance passed
Phase 10: REFACTOR passed (3/3 tests)
```

**All must be complete before claiming agent ready** ✅

---

## Anti-Patterns

### ❌ Don't Skip Phases

"Obviously needed" → Prove it (RED)
"Looks good" → Test it (GREEN)
"Overkill" → Do it anyway (REFACTOR)

### ❌ Don't Use Block Scalars

```yaml
# ❌ WRONG - breaks discovery
description: |

# ✅ RIGHT - single-line
description: ...\n\n<example>
```

### ❌ Don't Embed Patterns

Wrong: Detailed examples in agent
Right: Reference skills for patterns

---

## Related Skills

- `updating-agents` - Modify existing agents
- `testing-skills-with-subagents` - Pressure testing methodology
- `agent-manager` - Router to this skill
- `developing-with-tdd` - TDD philosophy
- `verifying-before-completion` - Final validation

---

## Success Criteria

Agent complete when:
1. ✅ RED phase proven
2. ✅ File created
3. ✅ Sections populated
4. ✅ GREEN passed
5. ✅ All mandatory skills verified
6. ✅ Compliance passed
7. ✅ REFACTOR passed (3/3)
8. ✅ TodoWrite complete
9. ✅ User confirmed

**Do not claim complete without all 9** ✅
