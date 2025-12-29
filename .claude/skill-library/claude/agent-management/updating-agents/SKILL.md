---
name: updating-agents
description: Use when modifying existing agents - guides through TDD update workflow (RED-GREEN) with compliance validation
allowed-tools: Read, Write, Edit, Bash, Grep, TodoWrite, Task, Skill, AskUserQuestion
---

# Updating Agents

**Instruction-driven agent updates with TDD enforcement (simplified RED-GREEN for updates).**

> **Compliance**: This skill MAINTAINS the [Agent Compliance Contract](../../../../skills/managing-agents/references/agent-compliance-contract.md).

**MANDATORY**: You MUST use TodoWrite to track phases. Updates still require validation.

---

## When to Use

- Modifying existing agent (add/change/remove content)
- User says "update the X agent"
- Fixing issues found in agent

**NOT for**: Creating new agents (use `creating-agents` skill)

---

## Quick Reference

| Phase                   | Purpose                         | Time      | Checkpoint                 |
| ----------------------- | ------------------------------- | --------- | -------------------------- |
| **0. Navigate**         | Go to repository root           | 30 sec    | In super-repo root         |
| **1. 🔴 RED**           | Document current failure        | 5 min     | Failure captured           |
| **2. Locate**           | Find agent file                 | 1 min     | File found                 |
| **3. Minimal Change**   | Edit agent (minimal diff)       | 5-10 min  | Change applied             |
| **4. 🟢 GREEN**         | Verify fix works                | 5 min     | Agent solves problem       |
| **5. Update Changelog** | Document changes                | 2 min     | Changelog updated          |
| **6. Compliance**       | Quality checks                  | 3 min     | Audit passed               |
| **7. 🔵 REFACTOR**      | Pressure test (if major change) | 10-15 min | Optional for minor changes |

**Total**: 22-42 minutes (minor changes ~22 min, major changes ~42 min with REFACTOR)

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any agent operation:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**See:** [Repository Root Navigation](../../../../skills/managing-agents/references/patterns/repo-root-detection.md)

**⚠️ If agent file not found:** You are in the wrong directory. Navigate to repo root first. Never assume "built-in agent" or "system agent" - the file exists, you're looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Phase 1: 🔴 RED (Document Current Failure)

### 1.1 What's Wrong Today?

Use AskUserQuestion:

```
Question: What behavior is wrong with the current agent?
Header: Current Issue
Options:
  - Agent gives wrong guidance
  - Agent missing important rules
  - Agent uses wrong tools/skills
  - Agent needs additional capabilities
```

### 1.2: Capture Failure

Ask user to test current agent and show failure:

```
Question: Can you demonstrate the failure with the current agent?
Header: Failure Demo
Options:
  - I'll describe what goes wrong
  - Let me spawn the agent and show you
```

**If "spawn agent"**: Use Task tool with scenario, capture wrong behavior.

**If "describe"**: Record their description.

### 1.3 Confirm This Needs Agent Update

```
Question: Does this require updating the agent (vs updating a skill)?
Header: Update Scope
Options:
  - Yes - agent itself needs changes
  - No - should update a skill instead
  - Unclear - help me determine
```

**If "skill"**: Recommend using `managing-skills` instead.

**Cannot proceed without confirming agent update needed** ✅

---

## Phase 2: Locate Agent

### 2.1 Find Agent File

**If user provided name**:

```bash
find .claude/agents -name "{name}.md"
```

**If searching**:

```bash
cd .claude/skill-library/claude/agent-management/searching-agents/scripts && npm run --silent search -- "{keywords}"
```

### 2.2 Read Current Agent

```
Read `.claude/agents/{type}/{name}.md`
```

Understand current structure before changing.

### 2.3 Create Backup (Before Changes)

**🚨 MANDATORY** - See [Backup Strategy](../../../../skills/managing-agents/references/patterns/backup-strategy.md)

Quick command:

```bash
mkdir -p .claude/agents/{type}/.local
cp .claude/agents/{type}/{name}.md \
   .claude/agents/{type}/.local/{name}.md.bak.$(date +%Y%m%d_%H%M%S)
```

**Cannot proceed to edits without backup** ✅

### 2.4 How to Rollback

See [Backup Strategy](../../../../skills/managing-agents/references/patterns/backup-strategy.md) for rollback procedure.

---

## Phase 3: Minimal Change

### 3.1 Identify Specific Section to Change

**Based on RED failure**, determine which section needs update:

| If failure is...     | Update section...                            |
| -------------------- | -------------------------------------------- |
| Wrong guidance       | Critical Rules or Skill References           |
| Missing capability   | Core Responsibilities                        |
| Wrong tools          | Frontmatter tools field                      |
| Wrong skills         | Frontmatter skills field or Skill References |
| Missing escalation   | Escalation Protocol                          |
| Wrong output         | Output Format                                |
| Skills not activated | Mandatory Skills section (see 3.3)           |

### 3.2 Apply Minimal Edit

**Use Edit tool** (not Write - preserve rest of file):

```
Edit {
  file_path: ".claude/agents/{type}/{name}.md",
  old_string: "{Section to change}",
  new_string: "{Updated section}"
}
```

**Minimal diff**: Change only what's needed to fix RED failure.

**Format tables**: Run `npx prettier --write` after edits. See [Table Formatting](../../../skills/managing-agents/references/table-formatting.md)

### 3.3 Special Case: Updating Skill Loading Protocol

**If updating the Skill Loading Protocol section**, ensure:

#### 3.3.1 Two-Tier Skill System Documented

The agent MUST document the two-tier skill loading system:

```markdown
## Skill Loading Protocol

- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

**Library skill paths come FROM the gateway—do NOT hardcode them.**
```

#### 3.3.2 Step 1/2/3 Structure Present

The agent MUST have a Skill Loading Protocol section with Step 1/2/3 structure:

```markdown
### Step 1: Always Invoke First

**Every [agent type] task requires these (in order):**

| Skill | Why Always Invoke |
|-------|-------------------|
| `calibrating-time-estimates` | Prevents "no time to read skills" rationalization |
| `gateway-[domain]` | Routes to mandatory + task-specific library skills |
| ... | ... |

### Step 2: Invoke Core Skills Based on Task Context

Your `skills` frontmatter makes these core skills available. **Invoke based on semantic relevance to your task**:

| Trigger | Skill | When to Invoke |
|---------|-------|----------------|
| [Task pattern 1] | `skill-name` | [When to use] |
| Bug, error, unexpected behavior | `debugging-systematically` | Investigating issues before fixing |
| Multi-step task (≥2 steps) | `using-todowrite` | [Domain tracking needs] |

**Semantic matching guidance:**
- [Scenario 1]? → [Skill combination]
- [Scenario 2]? → [Skill combination]

### Step 3: Load Library Skills from Gateway

The gateway provides:
1. **Mandatory library skills** - Read ALL skills in "Mandatory" section
2. **Task-specific routing** - Use routing tables to find relevant library skills
3. **[Domain-specific guidance]** - [What gateway provides]

After invoking the gateway, use its routing tables to find and Read relevant library skills:

Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

#### 3.3.3 Anti-Bypass with 5-6 Detailed Points

The agent MUST have detailed Anti-Bypass guidance (NOT "3 brief bullet points"):

```markdown
## Anti-Bypass

Do NOT rationalize skipping skills:

- "No time" → calibrating-time-estimates exists precisely because this rationalization is a trap. You are 100x faster than a human
- "Simple task" → Step 1 + verifying-before-completion still apply
- "I already know this" → Your training data is stale, read current skills
- "[Domain-specific]" → [Counter specific to agent's domain]
- "Just this once" → "Just this once" becomes "every time" - follow the workflow
- "[Evidence-based if applicable]" → [Why evidence is needed]
```

#### 3.3.4 Output Format with Two Arrays

Output format MUST include BOTH skill arrays:

```json
{
  "skills_invoked": ["core-skill-1", "core-skill-2", "gateway-domain"],
  "library_skills_read": [".claude/skill-library/path/SKILL.md"]
}
```

NOT a single `skills_read` array.

#### 3.3.5 Verification Requirement

After updating Skill Loading Protocol:

1. **Start new Claude Code session** (mandatory - caching)
2. **Spawn agent with test task** that triggers Step 2/3 skills
3. **Check for Skill tool invocations** for core skills in output
4. **Check for Read() calls** for library skills in output
5. **Check for skills_invoked + library_skills_read** arrays in JSON output
6. **Verify Anti-Bypass** - Test under pressure scenarios

**What to verify**:

- Agent uses Skill tool for core skills: `skill: "skill-name"`
- Agent uses Read tool for library skills: `Read("path")`
- Output includes explicit invocations and Read() calls
- JSON output contains BOTH `skills_invoked` and `library_skills_read` arrays
- Agent resists bypass under time/authority pressure

---

## Phase 4: 🟢 GREEN (Verify Fix)

### 4.1 Re-Test Scenario

**Spawn agent with RED scenario**:

```
Task({
  subagent_type: "{agent-name}",
  prompt: "{Same scenario from Phase 1}"
})
```

### 4.2 Evaluate

- **PASS**: Fix resolved the issue
- **FAIL**: Issue persists, need different fix
- **PARTIAL**: Better but not fully fixed

### 4.3 Confirm GREEN

```
Question: Does the updated agent solve the problem?
Header: GREEN Status
Options:
  - Yes - fix works (GREEN)
  - Partially - needs more iteration
  - No - different approach needed
```

**If not PASS**: Edit again (Phase 3), re-test.

**Cannot proceed without GREEN** ✅

---

## Phase 5: Update Changelog

**🚨 MANDATORY** - See [Changelog Format](../../../../skills/managing-agents/references/patterns/changelog-format.md)

### 5.1 Update CHANGELOG

1. Read existing changelog (if exists): `Read .claude/agents/{type}/.history/{name}-CHANGELOG`
2. Append `### Changed` entry with template from pattern
3. Create `.history/` directory if it doesn't exist

Quick command:

```bash
mkdir -p .claude/agents/{type}/.history
```

Then append entry using the update template from the changelog format pattern.

---

## Phase 6: Compliance

### 6.1 Critical Audit

Read and follow the auditing-agents skill:

```
Read('.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md')
```

Then follow its instructions to audit the agent by name.

**If fails**: Fix issues, re-run audit skill.

### 6.2 Line Count Check

**🚨 MANDATORY** - See [Line Count Limits](../../../../skills/managing-agents/references/patterns/line-count-limits.md)

Quick check: `wc -l .claude/agents/{type}/{name}.md` → Must be <300 (or <400 for complex)

**If exceeded**: Extract content to skills.

### 6.3 Universal Step 1 Skills Check

**MANDATORY for ALL agents** - verify these skills are present:

```bash
# Check for MANDATORY universal skills
for skill in verifying-before-completion calibrating-time-estimates; do
  if ! grep -q "$skill" .claude/agents/{type}/{name}.md; then
    echo "⚠️ WARNING: Missing MANDATORY universal skill: $skill"
    echo "   All agents must have this skill in frontmatter AND Step 1"
  fi
done
```

**If either is missing**: Add to frontmatter `skills:` field AND Step 1 of Skill Loading Protocol.

### 6.3.1 Skill Tool Requirement Check

**🚨 CRITICAL POST-EDIT VALIDATION** - Run after making changes, before re-audit

**Purpose**: Prevent updating agents into broken state (skills without Skill tool)

#### If you updated `skills:` field:

```bash
# Check if Skill tool is present
skills=$(grep '^skills:' .claude/agents/{type}/{name}.md)
tools=$(grep '^tools:' .claude/agents/{type}/{name}.md)

if [ -n "$skills" ] && [[ "$skills" != "skills:" ]]; then
  if ! echo "$tools" | grep -q "Skill"; then
    echo "❌ ERROR: Agent has skills but missing Skill tool"
    echo "   Fix: Add 'Skill' to tools: list in alphabetical order"
    echo "   Reference: agent-compliance-contract.md Section 12"
    # Either add Skill tool OR warn user before saving
  fi
fi
```

**Action if missing**: Add `Skill` to `tools:` list in alphabetical order

#### If you updated `tools:` field:

```bash
# Check if Skill tool was removed while skills exist
skills=$(grep '^skills:' .claude/agents/{type}/{name}.md)
tools=$(grep '^tools:' .claude/agents/{type}/{name}.md)

if [ -n "$skills" ] && [[ "$skills" != "skills:" ]]; then
  if ! echo "$tools" | grep -q "Skill"; then
    echo "❌ ERROR: Cannot remove Skill tool when agent has skills"
    echo "   Skills: $skills"
    echo "   Tools: $tools"
    echo "   Fix: Add Skill back to tools list"
    echo "   Reference: agent-compliance-contract.md Section 12"
    exit 1
  fi
fi
```

**Action if removed**: ERROR - must restore `Skill` to tools list (cannot proceed)

**Why Critical**: Core skills in frontmatter require Skill tool to invoke via `skill: "name"` syntax. Without it, agent is broken at runtime.

**Reference**: agent-compliance-contract.md Section 12

**Gold Standard**: frontend-developer.md line 5 shows correct pattern

**Prevention**: This catches the issue proactively during updates, not during audit

### 6.4 Body Trigger Analysis

**Purpose**: Ensure skills field matches agent body's described functionality.

**When agent body mentions these patterns, verify corresponding skills are present:**

| Body Trigger Pattern          | Skill to Include              | When Mentioned                               |
| ----------------------------- | ----------------------------- | -------------------------------------------- |
| "brainstorm", "explore ideas" | `brainstorming`               | Agent explores alternatives or refines ideas |
| "debug", "investigate issues" | `debugging-systematically`    | Agent troubleshoots or finds root causes     |
| "TDD", "test-driven", "tests" | `developing-with-tdd`         | Agent implements with tests-first workflow   |
| "plan", "break down tasks"    | `writing-plans`               | Agent creates implementation plans           |
| "parallel", "concurrent"      | `dispatching-parallel-agents` | Agent spawns multiple agents concurrently    |
| "security review", "threats"  | `gateway-security`            | Agent performs security analysis             |
| "todo", "track progress"      | `using-todowrite`             | Agent manages multi-step workflows           |
| "refactor", "eliminate dupes" | `adhering-to-dry`             | Agent reduces code duplication               |
| "scope", "requirements only"  | `adhering-to-yagni`           | Agent maintains strict scope discipline      |
| "state management", "React"   | `gateway-frontend`            | Agent works with frontend state patterns     |
| "API", "backend services"     | `gateway-backend`             | Agent develops backend services              |

**How to check:**

```bash
# Read agent body
grep -i "debug\|TDD\|brainstorm\|plan\|parallel\|security\|todo\|refactor\|scope\|state\|API" \
  .claude/agents/{type}/{name}.md

# If trigger found, verify corresponding skill exists in frontmatter
grep "^skills:" .claude/agents/{type}/{name}.md
```

**Example**:

```markdown
# Agent body says: "systematically debug Go performance bottlenecks"

# Triggers: "debug" → needs debugging-systematically

# Verify frontmatter includes:

skills: debugging-systematically, gateway-backend, verifying-before-completion
```

**If trigger pattern found but skill missing**: Add to frontmatter `skills:` field (alphabetically).

### 6.5 Manual Checks

**General**:

- [ ] **MANDATORY**: `verifying-before-completion` in frontmatter AND Step 1
- [ ] **MANDATORY**: `calibrating-time-estimates` in frontmatter AND Step 1
- [ ] Skills match body content (no trigger patterns without corresponding skill)
- [ ] Description still valid (if changed)
- [ ] Tools/skills still alphabetized
- [ ] All sections still present
- [ ] No block scalars introduced

**If Skill Loading Protocol Updated**:

- [ ] Step 1/2/3 structure present (NOT Tier 1/2/3)
- [ ] Two-tier skill system documented (Skill tool for core, Read for library)
- [ ] Universal skills in Step 1 (`verifying-before-completion`, `calibrating-time-estimates`)
- [ ] Anti-Bypass section has 5-6 detailed points with explanations
- [ ] Output format includes skills_invoked + library_skills_read arrays (two separate arrays)
- [ ] Will test in fresh session for Skill tool + Read() calls in output

---

## Phase 7: 🔵 REFACTOR (Conditional)

### When to Run Pressure Tests

**Run REFACTOR if**:

- Changed Critical Rules (rules might not resist pressure)
- Changed Mandatory Skills (workflow might be weaker)
- Added new capabilities (new ways to rationalize)

**Skip REFACTOR if**:

- Minor wording changes
- Fixed typos
- Updated skill paths
- Added examples to description

### If Running REFACTOR

**Use same process as creating-agents Phase 9**:

```
skill: "testing-skills-with-subagents"
Read `.claude/skills/creating-agents/references/pressure-testing.md`
```

Run 1-3 pressure tests (depending on change scope):

- Major rule change: All 3 tests
- Minor rule change: 1-2 relevant tests
- Capability addition: 1 test specific to new capability

---

## Success Criteria

Update complete when:

1. ✅ RED documented (current failure)
2. ✅ Agent edited (minimal change)
3. ✅ GREEN passed (fix verified)
4. ✅ Changelog updated (.history/)
5. ✅ Compliance passed (audit + line count)
6. ✅ REFACTOR passed if needed (pressure tests)
7. ✅ TodoWrite complete

**For minor changes**: 1-6 sufficient
**For major changes**: All 7 required

---

## Related Skills

- `creating-agents` - Create new agents
- `testing-skills-with-subagents` - Pressure testing (if REFACTOR needed)
- `agent-manager` - Router to this skill
- `developing-with-tdd` - TDD philosophy
- `verifying-before-completion` - Final validation
