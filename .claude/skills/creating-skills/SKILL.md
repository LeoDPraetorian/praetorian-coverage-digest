---
name: creating-skills
description: Use when creating new skills - guides through location selection, skill type, template generation, and research integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, Skill
---

# Creating Skills

**Instruction-driven skill creation workflow using native tools.**

## When to Use

Use this skill when:
- Creating a new skill from scratch
- User says "create a skill for X"
- You need to scaffold a new skill structure

**You MUST use TodoWrite** to track progress through all phases.

## Quick Reference

| Phase | Purpose | Tools Used |
|-------|---------|------------|
| 1. 🔴 RED | Prove gap exists, test fails without skill | AskUserQuestion, manual test |
| 2. Validation | Name format, check existence | Grep |
| 3. Location | Core vs Library | AskUserQuestion |
| 4. Category | Which library folder | AskUserQuestion, Bash |
| 5. Skill Type | Process/Library/Integration/Tool-wrapper | AskUserQuestion |
| 6. Generation | Create directory, SKILL.md (<500 lines), references/ | Write |
| 7. Research | Populate content with progressive disclosure | `researching-skills` skill |
| 8. 🟢 GREEN | Verify skill works, test passes | manual test |
| 9. 🔵 REFACTOR | Pressure test, close loopholes | Task (spawn subagents) |

---

## Phase 0: Scope Validation

**Skill vs Agent:** Skills = knowledge/patterns/workflows. Agents = task executors with tools.
If agent is more appropriate: `agent-manager create`

---

## Phase 1: 🔴 RED Phase (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

### 1.1 Document the Gap

Ask: "Why is this skill needed? What problem does it solve?"
Record the answer - this becomes the skill's "Why" documentation.

### 1.2 Test Without the Skill

Ask user to describe a specific scenario where Claude currently fails without this skill.

### 1.3 Capture Failure Behavior

**CRITICAL**: Actually test the scenario and capture the failure.

**Option A: Conversational Testing (Recommended for Most Skills)**

1. Ask Claude to perform the task (without using any skill)
2. Document exactly what goes wrong:
   - Wrong approach taken?
   - Missing context?
   - Incorrect patterns?
   - Takes too long?

**Record verbatim** what Claude does wrong. This proves the skill is needed.

**Option B: Structured Evaluations (Advanced)**

For heavily reused skills, create `evaluations/test-case-{n}.json` with query, expected_behavior, and files fields.

**Use when:** Skills used across multiple projects, critical workflows, team-shared skills.

**For most skills, conversational testing (Option A) is sufficient.**

### 1.4 Confirm RED State

Ask: "Does this failure accurately capture why we need this skill?"
**If unsure**: Use `skill-manager search` to check for existing skills first.

---

## Phase 2: Validation

### 2.1 Validate Skill Name

Name must be kebab-case (lowercase letters, numbers, hyphens only):

```
Valid:   my-skill, tanstack-query, debugging-react
Invalid: MySkill, my_skill, my skill, 123-skill
```

**Regex pattern**: `^[a-z][a-z0-9-]*$`

### 2.2 Check If Skill Exists

Search both core and library locations:

```bash
# Check core skills
ls .claude/skills/ | grep -w "^skill-name$"

# Check library skills
find .claude/skill-library -name "skill-name" -type d
```

**If skill exists**: Stop and inform user. Suggest using `update` workflow instead.

## Phase 2: Location Selection

Ask the user via AskUserQuestion:

```
Question: Where should this skill be created?

Options:
1. Core Skills (.claude/skills/)
   - High-frequency, always-loaded
   - Limited to ~25 skills (15K token budget)
   - Auto-discovered by Claude Code

2. Skill Library (.claude/skill-library/)
   - Specialized, on-demand loading
   - No token budget impact
   - Loaded via gateway routing
```

**Decision factors**:
- Used in every conversation? → Core
- Domain-specific (frontend, testing, etc.)? → Library
- Referenced by multiple agents? → Consider Core

## Phase 3: Category Selection (Library Only)

If library selected, discover available categories:

```bash
# List available library categories
ls -d .claude/skill-library/*/ .claude/skill-library/*/*/ 2>/dev/null | \
  sed 's|.claude/skill-library/||' | sort -u
```

Common categories:
- `development/frontend/` - React, TypeScript, UI patterns
- `development/backend/` - Go, APIs, infrastructure
- `testing/` - Unit, integration, E2E testing
- `claude/` - Claude Code specific (agents, commands, MCP)
- `operations/` - DevOps, deployment, monitoring

Ask user to select or create new category.

## Phase 4: Skill Type Selection

Ask the user via AskUserQuestion:

```
Question: What type of skill is this?

Options:
1. Process/Pattern
   - Methodology, workflow, or best practice
   - Examples: TDD, debugging, brainstorming

2. Library/Framework
   - Documentation for npm package, API, or framework
   - Examples: TanStack Query, Zustand, Zod

3. Integration
   - Connecting two or more tools/services
   - Examples: GitHub + Linear, AWS + Terraform

4. Tool Wrapper
   - Wraps CLI tool or MCP server
   - Examples: praetorian-cli wrapper, context7 wrapper
```

## Phase 5: Generate Skill Structure

### 5.1 Create Directory Structure

Based on location selection:

**Core skill**:
```bash
mkdir -p .claude/skills/{skill-name}/references
mkdir -p .claude/skills/{skill-name}/examples
```

**Library skill**:
```bash
mkdir -p .claude/skill-library/{category}/{skill-name}/references
mkdir -p .claude/skill-library/{category}/{skill-name}/examples
```

### 5.2 Generate SKILL.md with Progressive Disclosure

**🚨 CRITICAL: Design for progressive disclosure from the start.**

Use the appropriate template from [references/skill-templates.md](references/skill-templates.md):

| Skill Type | Template |
|------------|----------|
| Process/Pattern | Methodology, workflow templates |
| Library/Framework | npm package, API documentation templates |
| Integration | Service connection templates |
| Tool Wrapper | CLI/MCP wrapper templates |

**Line Count Thresholds** (unified across all skill management):

| Lines | Status | Action |
|-------|--------|--------|
| < 350 | ✅ Safe | Ideal target for new skills |
| 350-450 | ⚠️ Caution | Monitor during creation |
| 450-500 | ⚠️ Warning | Extract before proceeding |
| > 500 | ❌ Hard limit | MUST restructure |

**SKILL.md Structure (Target: 300-450 lines):**

See [references/skill-templates.md](references/skill-templates.md) for complete templates by skill type.

**Required sections:**
- Frontmatter (name, description, allowed-tools)
- When to Use
- Quick Reference / Quick Start
- Core Workflow (with links to references/)
- Critical Rules
- Related Skills

**Description Requirements (CRITICAL for Discovery):**

**🚨 MUST be third-person** - Description is injected into system prompt, inconsistent point-of-view breaks discovery.

```yaml
# ✅ CORRECT: Third-person
description: Processes Excel files and generates reports. Use when analyzing spreadsheets or .xlsx files.

# ❌ WRONG: First-person
description: I can help you process Excel files and generate reports.

# ❌ WRONG: Second-person
description: You can use this to process Excel files and generate reports.
```

**Why this matters:** The description appears in Claude's system prompt. Using "I" or "You" creates point-of-view confusion that degrades skill selection accuracy.

**Pattern:** `[Action verb]s [object]` - "Processes files", "Analyzes data", "Generates reports"

---

**Tool Access Control (Optional but Recommended):**

Use `allowed-tools` to restrict which tools Claude can use when executing this skill. This improves security and prevents unintended side effects.

**Tool scoping patterns:**

| Skill Type | Tools | Example |
|------------|-------|---------|
| Read-only | `Read, Grep, Glob` | Analysis skills |
| Git workflow | `Bash(git:*), Read, Write` | Version control |
| Full access | `Read, Write, Edit, Bash, Grep, Glob` | Development skills |

**Content placement:** SKILL.md = overview, quick examples, core workflow, critical rules. references/ = detailed explanations, API docs, advanced patterns.

### 5.3 Verify Line Count (MANDATORY)

**After generating SKILL.md:**
```bash
wc -l {skill-path}/SKILL.md  # Must be <500
```

**Actions by line count:** <350 = safe, 350-450 = caution, 450-500 = warning (plan extraction), >500 = FAIL (must restructure).

**Cannot proceed to research phase if > 500 lines** ✅

### 5.4 Create Initial Changelog

**Create `.history/CHANGELOG` to document skill creation:**

```bash
mkdir -p {skill-path}/.history
```

**Initial entry:**
```markdown
## [Date: YYYY-MM-DD] - Initial Creation

### Created
- Skill created via creating-skills workflow
- RED failure documented: {brief description}
- Category: {library-category or core}
- Type: {process/library/integration/tool-wrapper}
```

### 5.5 Create Reference File Structure

Create placeholder files based on skill type. Use [references/skill-templates.md](references/skill-templates.md) for complete templates.

**Common reference files:**

| Skill Type | Reference Files |
|------------|-----------------|
| Process/Pattern | `workflow.md`, `advanced-patterns.md` |
| Library/Framework | `api-reference.md`, `patterns.md` |
| Integration | `api-reference.md`, `configuration.md` |
| Tool Wrapper | `commands.md`, `error-handling.md` |

**Create structure:**
```bash
mkdir -p {skill-path}/references
touch {skill-path}/references/{appropriate-file}.md
```

## Phase 6: Research & Populate Content

After creating the structure, use the `researching-skills` skill to populate content:

```
skill: "researching-skills"
```

The researching-skills skill will guide you through:
1. Codebase research (find similar skills, patterns)
2. Context7 research (library documentation)
3. Web research (supplemental sources)
4. Content generation with real examples

## Phase 7: Gateway Update (Library Skills Only)

If creating a library skill, update the appropriate gateway:

1. **Identify gateway**: Match category to gateway
   - `development/frontend/` → `gateway-frontend`
   - `development/backend/` → `gateway-backend`
   - `testing/` → `gateway-testing`
   - `claude/mcp-tools/` → `gateway-mcp-tools`

2. **Add skill to gateway**: Edit the gateway's routing table to include the new skill path

---

## Phase 8: 🟢 GREEN Phase (Verify Skill Works)

**The skill is only done when it passes the original test.**

### 8.1 Re-Test the Original Scenario

Go back to the scenario from Phase 1 (RED phase) and test again:

1. Start a fresh context (or ask Claude to "forget" the skill content)
2. Load the new skill
3. Ask Claude to perform the same task that failed before

### 8.2 Verify the Gap is Closed

Ask via AskUserQuestion:
```
I've tested the skill with the original scenario.

Before (RED): {what went wrong}
After (GREEN): {what happened with the skill}

Does the skill successfully address the gap?

Options:
- Yes, the skill works - proceed to refactor phase
- Partially - need to improve the skill content
- No - the skill doesn't help, need to rethink approach
```

**If "Partially" or "No"**: Go back to Phase 6 (Research) and improve content.

### 8.3 Run Audit

Verify compliance (from `.claude/` root):
```bash
cd .claude
npm run audit -- {skill-name}
```

**Must pass with no critical issues before proceeding.**

---

## Phase 9: 🔵 REFACTOR Phase (Pressure Test)

**Skills must resist rationalization under pressure.**

### 9.1 Load Pressure Testing Methodology

**Invoke the `testing-skills-with-subagents` skill:**

```
skill: "testing-skills-with-subagents"
```

This skill provides the complete methodology for:
- Creating effective pressure scenarios (3+ combined pressures)
- Spawning test subagents with the Task tool
- Evaluating subagent responses (PASS/FAIL criteria)
- Closing loopholes when subagents rationalize/bypass the skill

**Claude performs pressure tests autonomously** - do NOT ask the user to evaluate scenarios.

### 9.2 Run Three Pressure Tests

Follow the `testing-skills-with-subagents` methodology to test:

1. **Time pressure**: Emergency, deadline, deploy window closing
2. **Authority pressure**: Senior says skip it, "I'll take responsibility"
3. **Sunk cost pressure**: Hours of work already done, "waste to delete"

**If any test FAILS:** Add explicit counter-rationalization to the skill, then re-test.

### 9.3 Final Verification

Run audit and confirm all phases pass (from `.claude/` root):
```bash
cd .claude
npm run audit -- {skill-name}
```

**Skill is complete when:**
- ✅ RED phase documented (gap proven)
- ✅ GREEN phase passed (skill works)
- ✅ REFACTOR phase passed (pressure-tested with subagents)
- ✅ Audit passes (compliance verified)

---

## Validation Checklist

Before completing, verify:

- [ ] Name is kebab-case
- [ ] Skill doesn't already exist
- [ ] Directory structure created correctly
- [ ] SKILL.md has proper frontmatter (name, description, allowed-tools)
- [ ] Description starts with "Use when"
- [ ] Description is <120 characters
- [ ] At least one reference file created
- [ ] Gateway updated (if library skill)

## Error Handling

**If creation fails:** `rm -rf {skill-path}` to clean up partial directories.

---

## Anti-Patterns

### ❌ Don't Copy-Paste Without Context

Don't just fill templates with placeholder text. Use `researching-skills` to find real patterns from the codebase.

### ❌ Don't Skip the Research Phase

Empty skills with TODO placeholders are useless. Always populate with real content.

### ❌ Don't Exceed Line Limits (MANDATORY)

**🚨 CRITICAL: SKILL.md MUST be <500 lines**

- **Target**: 300-500 lines for SKILL.md
- **Always use references/** for detailed documentation (no line limit)
- **Always use progressive disclosure pattern** from the start
- **Plan content distribution** during Phase 5 (Generation), not after

**If you create a skill >500 lines:**
1. You violated the creation workflow
2. You must immediately restructure with progressive disclosure
3. See `.claude/skills/skill-manager/references/progressive-disclosure.md`

**Real example**: `frontend-architecture` skill has 293-line SKILL.md + 7 reference files (16KB total content). This is the standard.

### ❌ Don't Include Time-Sensitive Information

Avoid info that becomes outdated. Use "Old Patterns" section with `<details>` tags for deprecated content.

**Pattern:** Document current method prominently, collapse deprecated patterns in `<details>` tags.

## Related Skills

- `researching-skills` - Research workflow for populating skill content
- `skill-manager` - Audit and fix existing skills (TypeScript CLI)
- `testing-skills-with-subagents` - Detailed pressure testing methodology for REFACTOR phase
