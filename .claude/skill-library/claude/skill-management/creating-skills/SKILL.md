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

| Phase          | Purpose                                              | Tools Used                   |
| -------------- | ---------------------------------------------------- | ---------------------------- |
| 1. 🔴 RED      | Prove gap exists, test fails without skill           | AskUserQuestion, manual test |
| 2. Validation  | Name format, check existence                         | Grep                         |
| 3. Location    | Core vs Library                                      | AskUserQuestion              |
| 4. Category    | Which library folder                                 | AskUserQuestion, Bash        |
| 5. Skill Type  | Process/Library/Integration/Tool-wrapper             | AskUserQuestion              |
| 6. Generation  | Create directory, SKILL.md (<500 lines), references/ | Write                        |
| 7. Research    | Populate content with progressive disclosure         | `researching-skills` skill   |
| 8. 🟢 GREEN    | Verify skill works, test passes                      | manual test                  |
| 9. 🔵 REFACTOR | Pressure test, close loopholes                       | Task (spawn subagents)       |

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any skill operation:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**See:** [Repository Root Navigation](references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Phase 0: Scope Validation

**Skill vs Agent:** Skills = knowledge/patterns/workflows. Agents = task executors with tools.
If agent is more appropriate: `agent-manager create`

**Compliance Target:**
Skills created by this workflow must comply with the [Skill Compliance Contract](../../../../skills/managing-skills/references/skill-compliance-contract.md).

---

## Phase 1: 🔴 RED Phase (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

For complete TDD methodology, see [TDD Methodology for Skills](../../../../skills/managing-skills/references/tdd-methodology.md).

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
**If unsure**: Use `managing-skills search` to check for existing skills first.

---

## Phase 2: Validation

### 2.1 Validate Skill Name

For complete naming conventions (gerund form, kebab-case, what to avoid), see [Anthropic Best Practices - Naming Conventions](../../../../skills/managing-skills/references/anthropic-best-practices.md#naming-conventions).

**Quick validation:**
- Format: kebab-case (lowercase, hyphens only)
- Style: Gerund form preferred (`creating-skills`, not `create-skill`)
- Pattern: `^[a-z][a-z0-9-]*$`

```
Valid:   creating-skills, managing-agents, debugging-react
Invalid: CreateSkills, create_skills, create skills, 123-skill
```

### 2.2 Check If Skill Exists

Search both core and library locations:

```bash
# Check core skills
ls .claude/skills/ | grep -w "^skill-name$"

# Check library skills
find .claude/skill-library -name "skill-name" -type d
```

**If skill exists**: Stop and inform user. Suggest using `update` workflow instead.

### 2.3 Gateway Detection

**Check if creating a gateway skill**:

```bash
# Gateway if name starts with 'gateway-' OR user specified --type gateway
if [[ "$SKILL_NAME" =~ ^gateway- ]] || [[ "$FLAGS" == *"--type gateway"* ]]; then
  isGateway=true
fi
```

**Gateway validation**: Name must match `gateway-{domain}` pattern (e.g., `gateway-frontend`, `gateway-analytics`). Reject `gateway` alone or `gateway-foo-bar-baz`.

**If gateway detected**: Use **[references/gateway-creation.md](references/gateway-creation.md)** for complete gateway creation workflow (location, template, validation phases 17-20).

**Return here after completing gateway creation to continue with Phase 8 (GREEN) and Phase 9 (REFACTOR).**

---

## Phase 2: Location Selection

**Note**: Gateways skip this phase - they're always created in Core. See [references/gateway-creation.md](references/gateway-creation.md).

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

**Note**: Gateways skip this phase - they don't belong to library categories. See [references/gateway-creation.md](references/gateway-creation.md).

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

**Note**: Gateways have fixed type (routing index). See [references/gateway-creation.md](references/gateway-creation.md).

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

For complete file organization requirements, see [File Organization](../../../../skills/managing-skills/references/file-organization.md).

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

For complete progressive disclosure patterns, see [Progressive Disclosure](../../../../skills/managing-skills/references/progressive-disclosure.md).

**Note**: Gateways use gateway-template.md (see [references/gateway-creation.md](references/gateway-creation.md)).

**For detailed template guidance**, see [references/template-guidance.md](references/template-guidance.md):

- Line count thresholds and management
- Description requirements (third-person, discovery patterns)
- Tool access control patterns
- Content placement strategy
- Template selection by skill type

**Quick template selection**:

| Skill Type        | Template             | See                                                 |
| ----------------- | -------------------- | --------------------------------------------------- |
| Process/Pattern   | Methodology workflow | [skill-templates.md](references/skill-templates.md) |
| Library/Framework | npm package docs     | [skill-templates.md](references/skill-templates.md) |
| Integration       | Service connection   | [skill-templates.md](references/skill-templates.md) |
| Tool Wrapper      | CLI/MCP wrapper      | [skill-templates.md](references/skill-templates.md) |

**Target**: SKILL.md < 500 lines (ideally 300-450). Use references/ for detailed content.

#### 🚨 Code Reference Pattern (MANDATORY)

**When referencing code examples in SKILL.md:**

❌ **NEVER use static line numbers** - they become outdated with every code change:
```markdown
❌ BAD: `file.go:123-127`
❌ BAD: See line 154 in nuclei.go
```

✅ **USE durable patterns** - stable across refactors:
```markdown
✅ GOOD: `file.go` - `func (t *Type) MethodName(...)`
✅ GOOD: `file.go (between Match() and Invoke() methods)`
✅ GOOD: `file.go` (for general file reference)
```

**Why this matters:**
- Line numbers drift with every insert/deletion/refactor
- Method signatures are stable and grep-friendly: `rg "func.*MethodName"`
- Phase 21 audit will flag line number references as compliance failures

**See:** [code-reference-patterns.md](../../../../skills/managing-skills/references/patterns/code-reference-patterns.md)

### 5.3 Verify Line Count (MANDATORY)

See [Line Count Limits](../../../../skills/managing-skills/references/patterns/line-count-limits.md) for complete thresholds and extraction strategy.

```bash
wc -l {skill-path}/SKILL.md  # Must be <500
```

**Quick reference:** <350 = safe, 350-450 = caution, 450-500 = warning, >500 = FAIL.

**Cannot proceed to research phase if > 500 lines** ✅

**Format tables:** Run `npx prettier --write` on .md files. See [Table Formatting](../../../../skills/managing-skills/references/table-formatting.md)

### 5.4 Create Initial Changelog

See [Changelog Format](../../../../skills/managing-skills/references/patterns/changelog-format.md) for complete entry format.

```bash
mkdir -p {skill-path}/.history
```

Create `.history/CHANGELOG` with "Initial Creation" entry including:
- RED failure documentation
- Category (library-category or core)
- Skill type (process/library/integration/tool-wrapper)

### 5.5 Create Reference File Structure

Create placeholder files based on skill type. Use [references/skill-templates.md](references/skill-templates.md) for complete templates.

**Common reference files:**

| Skill Type        | Reference Files                        |
| ----------------- | -------------------------------------- |
| Process/Pattern   | `workflow.md`, `advanced-patterns.md`  |
| Library/Framework | `api-reference.md`, `patterns.md`      |
| Integration       | `api-reference.md`, `configuration.md` |
| Tool Wrapper      | `commands.md`, `error-handling.md`     |

**Create structure:**

```bash
mkdir -p {skill-path}/references
touch {skill-path}/references/{appropriate-file}.md
```

## Phase 6: Research & Populate Content

**🚨 YOU MUST invoke researching-skills before writing content. Do not skip.**

```
Read(".claude/skill-library/claude/skill-management/researching-skills/SKILL.md")
```

The researching-skills skill will guide you through:

1. Codebase research (find similar skills, patterns)
2. Context7 research (library documentation)
3. Web research (supplemental sources)
4. Content generation with real examples

### Common Rationalizations (DO NOT SKIP RESEARCH)

Agents frequently skip research with excuses like "I already know this" or "No time." These are wrong.

**See [Research Rationalizations Table](references/research-rationalizations.md)** for complete list of excuses and why they fail:

- "I already know this" → Training data is 12-18 months stale
- "Simple task" → Even basic topics evolve (React 16→19 changed everything)
- "No time" → 15 min research prevents hours of fixes
- "Optional for Library skills" → WRONG - these change most frequently

**Cannot proceed to Phase 7 without completing research phase.** ✅

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

Verify compliance (from anywhere in the repo):

```bash
# Uses backticks for Claude Code compatibility
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm run audit -- {skill-name}
```

**For gateways**: Also run gateway-specific audit (phases 17-20). See [references/gateway-creation.md](references/gateway-creation.md#phase-8-green-verification).

**Must pass with no critical issues before proceeding.**

---

## Phase 9: 🔵 REFACTOR Phase (Pressure Test)

**Skills must resist rationalization under pressure.** For REFACTOR scope rules and creating vs updating differences, see [REFACTOR Rules Reference](../../../../skills/managing-skills/references/patterns/refactor-rules.md).

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

Run audit and confirm all phases pass (from anywhere in the repo):

```bash
# Uses backticks for Claude Code compatibility
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT/.claude" && npm run audit -- {skill-name}
```

**Skill is complete when:**

- ✅ RED phase documented (gap proven)
- ✅ GREEN phase passed (skill works)
- ✅ REFACTOR phase passed (pressure-tested with subagents)
- ✅ Audit passes (compliance verified)
- ✅ Gateway updated (if library skill)

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

### ❌ Don't Copy-Paste Without Context or Skip Research

Don't fill templates with placeholder text. Use `researching-skills` to find real patterns (see Phase 6 rationalization table).

### ❌ Don't Exceed Line Limits (MANDATORY)

**🚨 CRITICAL: SKILL.md MUST be <500 lines**

- **Target**: 300-500 lines for SKILL.md
- **Always use references/** for detailed documentation (no line limit)
- **Always use progressive disclosure pattern** from the start
- **Plan content distribution** during Phase 5 (Generation), not after

**If you create a skill >500 lines:**

1. You violated the creation workflow
2. You must immediately restructure with progressive disclosure
3. See `.claude/skills/managing-skills/references/progressive-disclosure.md`

**Real example**: `designing-frontend-architecture` skill has 293-line SKILL.md + 7 reference files (16KB total content). This is the standard.

### ❌ Don't Include Time-Sensitive Information

Avoid info that becomes outdated. Document current method prominently, collapse deprecated patterns in `<details>` tags.

## Related Skills

- `researching-skills` - Research workflow for populating skill content
- `managing-skills` - Audit and fix existing skills (TypeScript CLI)
- `testing-skills-with-subagents` - Detailed pressure testing methodology for REFACTOR phase
