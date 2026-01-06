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

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any skill operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](.claude/skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If skill file not found:** You are in the wrong directory. Navigate to repo root first. The file exists, you're just looking in the wrong place.

**Cannot proceed without navigating to repo root** ✅

---

## Workflow Continuation Rules

**9 phases run automatically Phase 1 → 9. ONLY stop for:** AskUserQuestion prompts, Phase 8 GREEN approval, Phase 9 pressure test spawning.

**Research continuation:** Phase 6.2 writes remaining phases to TodoWrite → orchestrating-research returns → Check TodoWrite → Continue Phase 6.3-9 automatically. Don't stop to report research findings.

---

## Phase 0: Scope Validation

**Skill vs Agent:** Skills = knowledge/patterns/workflows. Agents = task executors with tools.
If agent is more appropriate: `agent-manager create`

**Compliance Target:**
Skills created by this workflow must comply with the [Skill Compliance Contract](.claude/skills/managing-skills/references/skill-compliance-contract.md).

---

## Rationalization Prevention

Skill creation has many shortcuts that lead to low-quality skills. Watch for warning phrases and use evidence-based gates.

**References**: [Shared prevention patterns](../using-skills/references/rationalization-prevention.md) | [Skill-specific rationalizations](references/rationalization-table.md)

**Key principle**: Detect rationalization phrases → STOP → Return to phase checklist → Complete all items.

---

## Phase 1: 🔴 RED Phase (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

**Statistical evidence**: Skills created without RED phase have ~40% failure rate (don't solve the actual problem). The 5 minutes to document failure prevents hours of building the wrong thing.

For complete TDD methodology, see [TDD Methodology for Skills](.claude/skills/managing-skills/references/tdd-methodology.md).

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

For complete file organization requirements, see [File Organization](.claude/skills/managing-skills/references/file-organization.md).

**⚠️ PATH WARNING**: All paths below use `$ROOT` from Step 0. **NEVER** run from inside `.claude/` - this causes `.claude/.claude/` duplication.

Based on location selection:

**Core skill**:

```bash
# $ROOT is set in Step 0 - ALWAYS use it for path operations
mkdir -p $ROOT/.claude/skills/{skill-name}/references
mkdir -p $ROOT/.claude/skills/{skill-name}/examples
```

**Library skill**:

```bash
# $ROOT is set in Step 0 - ALWAYS use it for path operations
mkdir -p $ROOT/.claude/skill-library/{category}/{skill-name}/references
mkdir -p $ROOT/.claude/skill-library/{category}/{skill-name}/examples
```

### 5.2 Generate SKILL.md with Progressive Disclosure

**🚨 CRITICAL: Design for progressive disclosure from the start.**

For complete progressive disclosure patterns, see [Progressive Disclosure](.claude/skills/managing-skills/references/progressive-disclosure.md).

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

#### 🚨 Integration Section (MANDATORY)

Every skill MUST include an Integration section documenting dependencies. This is validated by Phase 28 of the audit.

**Required subsections:**

```markdown
## Integration

### Called By

- [What invokes this skill - commands, agents, or other skills]

### Requires (invoke before starting)

| Skill        | When  | Purpose    |
| ------------ | ----- | ---------- |
| `skill-name` | Start | Why needed |

### Calls (during execution)

| Skill        | Phase/Step | Purpose      |
| ------------ | ---------- | ------------ |
| `skill-name` | Phase N    | What it does |

### Pairs With (conditional)

| Skill        | Trigger | Purpose    |
| ------------ | ------- | ---------- |
| `skill-name` | When X  | Why paired |
```

**If no dependencies**: Still include section with "None - standalone skill" or "None - terminal skill"

**Why required**: Based on [obra/superpowers](https://github.com/obra/superpowers) analysis, skills with explicit Integration sections are never orphaned, have clear dependencies, and form traceable workflow chains.

**See**: [Phase 28 details](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-details.md#phase-28-integration-section)

#### 🚨 Code Reference Pattern (MANDATORY)

❌ **NEVER**: `file.go:123-127` (line numbers drift with every change)
✅ **USE**: `file.go - func MethodName()` or `file.go (between Match() and Invoke())`

**See:** [code-reference-patterns.md](.claude/skills/managing-skills/references/patterns/code-reference-patterns.md)

### 5.3 Verify Line Count (MANDATORY)

See [Line Count Limits](.claude/skills/managing-skills/references/patterns/line-count-limits.md) for complete thresholds and extraction strategy.

```bash
wc -l $ROOT/{skill-path}/SKILL.md  # Must be <500
```

**Quick reference:** <350 = safe, 350-450 = caution, 450-500 = warning, >500 = FAIL.

**Cannot proceed to research phase if > 500 lines** ✅

**Format tables:** Run `npx prettier --write` on .md files. See [Table Formatting](.claude/skills/managing-skills/references/table-formatting.md)

### 5.4 Create Initial Changelog

See [Changelog Format](.claude/skills/managing-skills/references/patterns/changelog-format.md) for complete entry format.

**CRITICAL**: Use `$ROOT` to avoid `.claude/.claude/` path duplication:

```bash
mkdir -p $ROOT/{skill-path}/.history
```

Create `.history/CHANGELOG` with "Initial Creation" entry including:

- RED failure documentation
- Category (library-category or core)
- Skill type (process/library/integration/tool-wrapper)

### 5.5 Prepare Reference File Structure

Prepare `references/` directory. Files created later when you have content. **Do NOT create empty placeholder files.**

**Common reference files (create only with content):**

| Skill Type        | Reference Files                        |
| ----------------- | -------------------------------------- |
| Process/Pattern   | `workflow.md`, `advanced-patterns.md`  |
| Library/Framework | `api-reference.md`, `patterns.md`      |
| Integration       | `api-reference.md`, `configuration.md` |
| Tool Wrapper      | `commands.md`, `error-handling.md`     |

```bash
mkdir -p $ROOT/{skill-path}/references
```

## Phase 6: Research & Populate Content

### 6.1 Research Decision

Ask user via AskUserQuestion: "Would you like to conduct research to populate the skill content?"
Options: "Yes, research sources (Recommended)" or "No, skip research"

**If "No":** Populate from original request (not templates), create reference files only with actual content, skip to Phase 7 (library) or 8 (core), document in changelog.
**If "Yes":** Continue to Phase 6.2.

### 6.2 Execute Research

**BEFORE invoking orchestrating-research, set up continuation state:**

1. Write remaining phases to TodoWrite (these persist across the research context switch):

   ```
   TodoWrite([
     { content: 'Phase 6.2: Execute research', status: 'in_progress', activeForm: 'Executing research' },
     { content: 'Phase 6.3: Incorporate research into skill', status: 'pending', activeForm: 'Incorporating research' },
     { content: 'Phase 7: Gateway update', status: 'pending', activeForm: 'Updating gateway' },
     { content: 'Phase 8: GREEN verification', status: 'pending', activeForm: 'Verifying skill works' },
     { content: 'Phase 9: REFACTOR pressure tests', status: 'pending', activeForm: 'Pressure testing' }
   ])
   ```

2. Then invoke orchestrating-research:

   ```
   skill: "orchestrating-research"
   ```

3. When orchestrating-research returns with 'WORKFLOW_CONTINUATION_REQUIRED':
   - Mark Phase 6.2 as complete in TodoWrite
   - Read the SYNTHESIS.md from the output directory
   - Continue immediately to Phase 6.3 (next pending todo)

**Do NOT:**

- Report 'Research complete!' to user
- Summarize research findings and stop
- Wait for user to say 'continue'
- Mark all phases complete when only 6.2 is done

The orchestrating-research skill provides:

- Intent expansion (derives multiple semantic interpretations from vague queries)
- Parallel research across 6 sources (Codebase, Context7, GitHub, arxiv, Perplexity, Web)
- Cross-interpretation conflict detection
- Comprehensive SYNTHESIS.md with executive summary, findings, recommendations

**Common Rationalizations:** See [research-rationalizations.md](references/research-rationalizations.md) for why "I already know this", "Simple task", "No time", etc. fail.

**Statistical evidence**: Skills populated from training data instead of research have ~30% stale/incorrect information. Research takes 10-15 minutes but prevents weeks of propagating wrong patterns.

### 6.3 Incorporate Research into Skill ← POST-RESEARCH RESUME POINT

**This phase executes IMMEDIATELY after Phase 6.2 returns.**

Read SYNTHESIS.md from `.claude/.output/research/{timestamp}-{topic}/` (orchestrating-research creates OUTPUT_DIR with SYNTHESIS.md and source files), update SKILL.md with patterns/docs/practices, populate references/, replace placeholders with real examples.

**See:** [research-integration.md](references/research-integration.md). **Cannot proceed to Phase 7 until skill reflects research findings.** ✅

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

```markdown
Audit {skill-name} to verify compliance with all 28 phase requirements.
```

**For gateways**: Also run gateway-specific audit (phases 17-20). See [references/gateway-creation.md](references/gateway-creation.md#phase-8-green-verification).

**Must pass with no critical issues before proceeding.**

---

## Phase 9: 🔵 REFACTOR Phase (Pressure Test)

**Skills must resist rationalization under pressure.** For REFACTOR scope rules and creating vs updating differences, see [REFACTOR Rules Reference](.claude/skills/managing-skills/references/patterns/refactor-rules.md).

### 9.1 Load Pressure Testing Methodology

**Invoke the `pressure-testing-skill-content` skill:**

```
Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")
```

This skill provides the complete methodology for:

- Creating effective pressure scenarios (3+ combined pressures)
- Spawning test subagents with the Task tool
- Evaluating subagent responses (PASS/FAIL criteria)
- Closing loopholes when subagents rationalize/bypass the skill

**Claude performs pressure tests autonomously** - do NOT ask the user to evaluate scenarios.

### 9.2 Run Three Pressure Tests

Follow the `pressure-testing-skill-content` methodology to test:

1. **Time pressure**: Emergency, deadline, deploy window closing
2. **Authority pressure**: Senior says skip it, "I'll take responsibility"
3. **Sunk cost pressure**: Hours of work already done, "waste to delete"

**If any test FAILS:** Add explicit counter-rationalization to the skill, then re-test.

### 9.3 Final Verification

Run audit and confirm all phases pass:

```markdown
Audit {skill-name} to verify compliance with all 28 phase requirements.
```

**Skill is complete when:**

- ✅ RED phase documented (gap proven)
- ✅ GREEN phase passed (skill works)
- ✅ REFACTOR phase passed (pressure-tested with subagents)
- ✅ Audit passes (compliance verified)
- ✅ Gateway updated (if library skill)

---

## Validation and Anti-Patterns

Before completing skill creation, review the validation checklist and common anti-patterns.

**See:** [Validation and Anti-Patterns](references/validation-and-anti-patterns.md)

---

## Related Skills

- `orchestrating-research` - Parallel research orchestrator for populating skill content
- `managing-skills` - Audit and fix existing skills (instruction-based)
- `pressure-testing-skill-content` - Detailed pressure testing methodology for REFACTOR phase
