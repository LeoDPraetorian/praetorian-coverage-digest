---
name: creating-skills
description: Use when creating new skills with TDD - guides through RED-GREEN-REFACTOR phases, progressive disclosure, location selection, and research integration
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

| Phase             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| 1. 🔴 RED         | Prove gap exists, test fails without skill           |
| 2. Validation     | Name format, check existence                         |
| 3. Location & Cat | Core vs Library, which folder                        |
| 4. Skill Type     | Process/Library/Integration/Tool-wrapper             |
| 5. Generation     | Create directory, SKILL.md (<500 lines), references/ |
| 6. Research       | Populate content with progressive disclosure         |
| 7. Gateway Update | Add to routing table (library skills only)           |
| 8. 🟢 GREEN       | Verify skill works, test passes                      |
| 9. 🔵 REFACTOR    | Pressure test, close loopholes                       |

---

## Step 1: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any skill operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](.claude/skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Workflow Continuation Rules

**All 9 phases run automatically.** After Phase 6 research, workflow MUST continue to Phase 6.3 → 7 → 8 → 9 without stopping.

**See:** [Workflow Continuation](references/workflow-continuation.md) for research continuation protocol and anti-patterns.

---

## Phase 0: Scope Validation

Validate that a skill (not an agent) is the appropriate solution. Skills provide knowledge/workflows; agents execute tasks.

**See:** [Scope Validation](references/scope-validation.md) for skill vs agent decision criteria and compliance target.

---

## Rationalization Prevention

Skill creation has many shortcuts that lead to low-quality skills. Watch for warning phrases and use evidence-based gates.

**References**: [Shared prevention patterns](.claude/skills/using-skills/references/rationalization-prevention.md) | [Skill-specific rationalizations](references/rationalization-table.md)

**Key principle**: Detect rationalization phrases → STOP → Return to phase checklist → Complete all items.

---

## Phase 1: 🔴 RED Phase (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

**Statistical evidence**: Skills created without RED phase have ~40% failure rate (don't solve the actual problem). The 5 minutes to document failure prevents hours of building the wrong thing.

**Complete Phase 1 workflow and agent spawning requirements:** [references/tdd-verification.md](references/tdd-verification.md)

**Quick steps:**

1. Document the gap (why skill is needed)
2. Test without the skill (specific scenario)
3. Capture failure behavior via agent spawning (MANDATORY)
4. Confirm RED state

---

## Phase 2: Validation

### 2.1 Validate Skill Name

For complete naming conventions (gerund form, kebab-case, what to avoid), see [Anthropic Best Practices - Naming Conventions](.claude/skills/managing-skills/references/anthropic-best-practices.md#naming-conventions).

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

**Gateway validation**: Name must match `gateway-{domain}` pattern (e.g., `gateway-frontend`). Reject `gateway` alone or `gateway-foo-bar-baz`.

**If gateway detected**: Use **[references/gateway-creation.md](references/gateway-creation.md)** for complete gateway creation workflow (location, template, validation phases 17-20).

**Return here after completing gateway creation to continue with Phase 8 (GREEN) and Phase 9 (REFACTOR).**

---

## Phase 3: Location and Category Selection

For detailed location selection (Core vs Library) and category selection guidance, see **[Location and Category Selection](references/location-and-category-selection.md)**.

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

Create directories using `$ROOT` from Step 1 (prevents `.claude/.claude/` duplication):

```bash
# Core skill
mkdir -p $ROOT/.claude/skills/{skill-name}/references
# Library skill
mkdir -p $ROOT/.claude/skill-library/{category}/{skill-name}/references
```

**See:** [File Organization](.claude/skills/managing-skills/references/file-organization.md)

### 5.2 Generate SKILL.md with Progressive Disclosure

**🚨 CRITICAL: Design for progressive disclosure from the start.** Target: <500 lines (ideally 300-450).

**See:** [template-guidance.md](references/template-guidance.md) for templates by skill type, line count management, description patterns.

**Gateways:** Use gateway-template.md (see [references/gateway-creation.md](references/gateway-creation.md)).

#### 🚨 Integration Section (MANDATORY)

Every skill MUST include an Integration section documenting dependencies. See **[Integration Section Guidance](references/integration-section-guidance.md)** for:

- Required subsection structure (Called By, Requires, Calls, Pairs With)
- Bullet list format (tables are deprecated)
- Skill reference validation (CORE vs LIBRARY)
- Read() path requirements for library skills
- Validation bash commands

**Cannot proceed to Phase 6 if skill references cannot be validated** ✅

**Note:** Related Skills sections are obsolete - all relationships belong in Integration.

#### 🚨 Code Reference Pattern (MANDATORY)

❌ **NEVER**: `file.go:123-127` (line numbers drift with every change)
✅ **USE**: `file.go - func MethodName()` or `file.go (between Match() and Invoke())`

**See:** [code-reference-patterns.md](.claude/skills/managing-skills/references/patterns/code-reference-patterns.md)

#### 🚨 Phase Numbering Pattern (MANDATORY)

Use sequential integers (Phase 1, 2, 3...) not fractional (Phase 1.5, 4.5). Sub-steps (5.1, 5.2) acceptable.

**See:** [Phase Numbering](.claude/skills/managing-skills/references/patterns/changelog-format.md) | Caught by: auditing-skills Phase 7

#### 🚨 Cross-Skill Link Format (MANDATORY - Phase 27)

When linking to OTHER skills in your content, use full `.claude/` paths:

| Link Type         | Example                                                  | Format                  |
| ----------------- | -------------------------------------------------------- | ----------------------- |
| Within same skill | `[Details](references/foo.md)`                           | Relative path ✅        |
| To other skill    | `[brainstorming](.claude/skills/brainstorming/SKILL.md)` | Full `.claude/` path ✅ |

❌ **NEVER**: `[brainstorming](../../brainstorming/SKILL.md)` (relative path to other skill)
✅ **USE**: `[brainstorming](.claude/skills/brainstorming/SKILL.md)` (explicit path)

**Rationale**: Full paths are instantly resolvable from repo root. Relative paths like `../../` require runtime resolution that can fail.

**Caught by**: auditing-skills Phase 27

### 5.3 Verify Line Count (MANDATORY)

See [Line Count Limits](.claude/skills/managing-skills/references/patterns/line-count-limits.md) for complete thresholds and extraction strategy.

```bash
wc -l $ROOT/{skill-path}/SKILL.md  # Must be <500
```

**Quick reference:** <350 = safe, 350-450 = caution, 450-500 = warning, >500 = FAIL.

**Also verify reference files (each must be <400 lines):**

```bash
for file in $ROOT/{skill-path}/references/*.md; do
  [ -f "$file" ] && lines=$(wc -l < "$file") && [ "$lines" -gt 400 ] && echo "❌ CRITICAL: $(basename $file) is $lines lines (limit: 400)" && exit 1
done
```

**Reference file thresholds (from line-count-limits.md):**

| Lines   | Status      | Action                      |
| ------- | ----------- | --------------------------- |
| < 300   | ✅ Safe     | No action                   |
| 300-350 | ℹ️ Info     | Consider splitting          |
| 351-400 | ⚠️ Warning  | Plan split before adding    |
| > 400   | ❌ CRITICAL | MUST split - blocks proceed |

**Cannot proceed to Phase 6 if any reference file > 400 lines** ✅

**Cannot proceed to research phase if SKILL.md > 500 lines** ✅

**Format tables:** Run `npx prettier --write` on .md files. See [Table Formatting](.claude/skills/managing-skills/references/table-formatting.md)

### 5.4 Create Initial Changelog

Create `.history/CHANGELOG` with "Initial Creation" entry (RED failure, category, skill type).

**See:** [Changelog Format](.claude/skills/managing-skills/references/patterns/changelog-format.md)

### 5.5 Prepare Reference File Structure

Prepare `references/` directory. Files created later when you have content. **Do NOT create empty placeholder files.**

```bash
mkdir -p $ROOT/{skill-path}/references
```

**For reference file patterns by skill type, see:** [references/template-guidance.md](references/template-guidance.md)

## Phase 6: Research & Populate Content

**Complete Phase 6 workflow (research decision, execution, incorporation):** See **[Phase 6 Research Workflow](references/phase-6-research-workflow.md)** for:

- 6.1 Research decision (AskUserQuestion)
- 6.2 Execute research with orchestrating-research
- 6.3 Incorporate research into skill (POST-RESEARCH RESUME POINT)
- TodoWrite continuation protocol
- Verification gates

## Phase 7: Gateway Update (Library Skills Only)

If creating a library skill, add it to the appropriate gateway(s).

**Do NOT use deterministic path-to-gateway mapping.** Paths are organizational; skill PURPOSE determines the gateway. Analyze:

- **Primary consumers**: Which agents use this? READ their definition to verify which gateway they invoke in Step 1
- **Skill purpose**: Testing methodology? Backend patterns? Frontend?
- **Nested paths**: `testing/backend/` could route to `gateway-testing` OR `gateway-backend`

**Confirm with user** via AskUserQuestion - NO EXCEPTIONS, even under time pressure. Present your analysis (purpose, consumer, gateway they invoke, recommendation) and ask which gateway(s) to use.

---

## Phase 8: 🟢 GREEN Phase (Verify Skill Works)

**The skill is only done when it passes the original test.**

### 8.1 Re-Test the Original Scenario (AGENT SPAWNING MANDATORY)

**CRITICAL**: Spawn an agent WITH the skill loaded. Compare RED vs GREEN behavior.

**Complete Phase 8 workflow:** [references/tdd-verification.md](references/tdd-verification.md)

### 8.2 Verify the Gap is Closed

Ask via AskUserQuestion with **verbatim quotes** from both RED (Phase 1) and GREEN (Phase 8) agent outputs, plus observed behavioral differences. Options: Yes (proceed), Partially (improve), No (rethink).

**If "Partially" or "No"**: Go back to Phase 6 (Research) and improve content.

### 8.3 Run Audit

Verify compliance:

```markdown
Audit {skill-name} to verify compliance with all 28 phase requirements.
```

**For gateways**: Also run gateway-specific audit (phases 17-20). See [references/gateway-creation.md](references/gateway-creation.md#phase-8-green-verification).

**Phase 28 validation**: Validates Integration section completeness, bullet list format, and skill reference annotations. Library skills must have (LIBRARY) annotation with Read() path on sub-bullet. Related Skills sections are obsolete and should be removed if present.

**Must pass with no critical issues before proceeding.**

---

## Phase 9: 🔵 REFACTOR Phase (Pressure Test)

Invoke `pressure-testing-skill-content` (LIBRARY) for time/authority/sunk cost pressure testing.

If loopholes found, fix with `closing-rationalization-loopholes` (LIBRARY) using TDD verification.

**Complete when:** ✅ RED ✅ GREEN ✅ REFACTOR ✅ Audit ✅ Gateway (library only)

**Validation:** See [Validation and Anti-Patterns](references/validation-and-anti-patterns.md)

---

## Integration

### Called By

- `managing-skills` (CORE) router, `/skill-manager create` command

### Requires (invoke before starting)

None - standalone workflow initiator

### Calls (during execution)

- **`orchestrating-research`** (LIBRARY) - Phase 6.2 - Content population
  - `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`
- **`auditing-skills`** (LIBRARY) - Phase 8 - Compliance validation
  - `Read(".claude/skill-library/claude/skill-management/auditing-skills/SKILL.md")`
- **`pressure-testing-skill-content`** (LIBRARY) - Phase 9 - Pressure testing
  - `Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")`
- **`closing-rationalization-loopholes`** (LIBRARY) - Phase 9 - Fix loopholes
  - `Read(".claude/skill-library/claude/skill-management/closing-rationalization-loopholes/SKILL.md")`

### Pairs With (conditional)

None - terminal workflow
