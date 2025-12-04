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
| 6. Generation | Create directory and SKILL.md | Write |
| 7. Research | Populate content | `researching-skills` skill |
| 8. 🟢 GREEN | Verify skill works, test passes | manual test |
| 9. 🔵 REFACTOR | Pressure test, close loopholes | Task (spawn subagents) |

---

## Phase 1: 🔴 RED Phase (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

### 1.1 Document the Gap

Ask via AskUserQuestion:
```
Why is this skill needed? What problem does it solve?

Please describe:
1. What task/scenario requires this skill?
2. What happens today without this skill?
3. What should happen with this skill?
```

**Record the answer** - this becomes the skill's "Why" documentation.

### 1.2 Test Without the Skill

Ask via AskUserQuestion:
```
Let's prove the gap exists. Can you describe a specific scenario where
Claude currently fails or behaves incorrectly without this skill?

Example: "When I ask Claude to integrate Jira, it doesn't know the
Chariot patterns and creates inconsistent code."
```

### 1.3 Capture Failure Behavior

**CRITICAL**: Actually test the scenario and capture the failure:

1. Ask Claude to perform the task (without using any skill)
2. Document exactly what goes wrong:
   - Wrong approach taken?
   - Missing context?
   - Incorrect patterns?
   - Takes too long?

**Record verbatim** what Claude does wrong. This proves the skill is needed.

### 1.4 Confirm RED State

Ask via AskUserQuestion:
```
I've documented the failure:

"{description of what went wrong}"

Does this accurately capture why we need this skill?

Options:
- Yes, this proves the gap - proceed to create skill
- No, let me clarify the problem
- Actually, existing skills might handle this - let's check first
```

**If "existing skills might handle this"**: Use `skill-manager search` to check before proceeding.

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

### 5.2 Generate SKILL.md

Use the appropriate template from [references/skill-templates.md](references/skill-templates.md):

| Skill Type | Template |
|------------|----------|
| Process/Pattern | Methodology, workflow templates |
| Library/Framework | npm package, API documentation templates |
| Integration | Service connection templates |
| Tool Wrapper | CLI/MCP wrapper templates |

### 5.3 Create Placeholder References

Create placeholder files for the references/ directory:

**references/detailed-guide.md** (or api-reference.md for libraries):
```markdown
# {Skill Name} - Detailed Guide

This document will be populated with detailed documentation.

## TODO

- [ ] Add comprehensive documentation
- [ ] Include code examples
- [ ] Document edge cases
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

Verify compliance:
```bash
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

Run audit and confirm all phases pass:
```bash
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

## Anti-Patterns

### ❌ Don't Copy-Paste Without Context

Don't just fill templates with placeholder text. Use `researching-skills` to find real patterns from the codebase.

### ❌ Don't Skip the Research Phase

Empty skills with TODO placeholders are useless. Always populate with real content.

### ❌ Don't Exceed Line Limits

- SKILL.md should be <500 lines
- Use references/ for detailed documentation
- Use progressive disclosure pattern

## Related Skills

- `researching-skills` - Research workflow for populating skill content
- `skill-manager` - Audit and fix existing skills (TypeScript CLI)
- `testing-skills-with-subagents` - Detailed pressure testing methodology for REFACTOR phase
