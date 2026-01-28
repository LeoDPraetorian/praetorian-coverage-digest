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

### Anti-Pattern: Workflow Interruption at TDD Phases

**Symptom**: Orchestrator stops after Witness returns, waits for user prompt to continue to Validator.

**Wrong thinking**: "Response got long, I'll wait for user to continue" or "Let me check the output first"

**Why wrong**: TDD phases must be atomic. RED = Witness + Validator executed together. GREEN = Witness + Validator executed together. User shouldn't babysit phase transitions.

**Fix**: Spawn Validator immediately in same response as Witness. No pause between them.

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

**Witness + Validator pattern:** For complete Phase 1 workflow, agent spawning requirements, and bias-free verification, see [TDD Validator Pattern](/.claude/skills/managing-skills/references/tdd-validator-pattern.md). Separates execution (Witness) from judgment (Validator) to prevent self-assessment bias.

---

### External Evidence Check (MANDATORY FIRST)

Before spawning Witness/Validator, check if external RED evidence already exists (user-provided tests, bug reports, previous session exports).

**If external evidence exists:** See [External Evidence Protocol](/.claude/skills/managing-skills/references/external-evidence-protocol.md) - ASK user whether to accept or spawn fresh agents.

---

## ⚠️ CRITICAL PROHIBITION

**After Witness returns:** Do NOT read witness output files. See [TDD Validator Pattern - Orchestrator Role](/.claude/skills/managing-skills/references/tdd-validator-pattern.md#orchestrator-role) for complete prohibition list and rationalization counters.

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

**🚨 ORCHESTRATOR DELEGATION:** For context efficiency, spawn a subagent to generate SKILL.md. The orchestrator should NOT read templates or generate content inline.

**Delegation prompt:** See [references/agent-delegation-prompts.md](references/agent-delegation-prompts.md#phase-52-skill-generation-agent)

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

Use full `.claude/` paths for cross-skill links, not relative `../../` paths. **Caught by**: auditing-skills Phase 27

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

**Limits:** SKILL.md < 500 lines, each reference < 400 lines. **Cannot proceed if exceeded.**

**Format tables:** Run `npx prettier --write` on .md files.

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

**🚨 ORCHESTRATOR DELEGATION:** Both research (6.2) and reference file generation (6.3) must be delegated to subagents.

### 6.1 Research Decision

Ask user via AskUserQuestion: "Would you like to conduct research to populate the skill content?"

### 6.2 Execute Research (IF YES - DELEGATE)

```
Task(subagent_type: "general-purpose", prompt: "
  Execute: Read('.claude/skill-library/research/orchestrating-research/SKILL.md')
  Research topic: {skill-topic}
  Write output to {OUTPUT_DIR}/research-output.md and SYNTHESIS.md
  Return only: SOURCES_CONSULTED (count), KEY_PATTERNS (3-5 bullets), SYNTHESIS_READY (true/false)
")
```

❌ NOT ACCEPTABLE: `Read(".../orchestrating-research/SKILL.md")` inline in orchestrator

### 6.3 Generate Reference Files (DELEGATE)

```
Task(subagent_type: "general-purpose", prompt: "
  Read: {OUTPUT_DIR}/SYNTHESIS.md and {skill-path}/SKILL.md
  Generate reference files for {skill-type} skill (each <400 lines, >50 lines content)
  Write to {skill-path}/references/
  Return only: FILES_CREATED (list), TOTAL_LINES, SYNTHESIS_INCORPORATED (true/false)
")
```

❌ NOT ACCEPTABLE: Orchestrator using Write() to create reference files inline

**See:** [Phase 6 Research Workflow](references/phase-6-research-workflow.md) for TodoWrite continuation protocol.

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

**CRITICAL**: Spawn GREEN Witness agent (with skill loaded) and GREEN Validator agent (atomic - same response). See [TDD Validator Pattern](/.claude/skills/managing-skills/references/tdd-validator-pattern.md) for complete Phase 8 workflow and orchestrator protocol.

### 8.2 Verify the Gap is Closed

Ask via AskUserQuestion with **verbatim quotes** from both RED (Phase 1) and GREEN (Phase 8) agent outputs, plus observed behavioral differences. Options: Yes (proceed), Partially (improve), No (rethink).

**If "Partially" or "No"**: Go back to Phase 6 (Research) and improve content.

### 8.3 Run Audit (DELEGATE TO SUBAGENT)

**🚨 ORCHESTRATOR DELEGATION:** Spawn a subagent to run the audit. Do NOT run audit inline.

```
Task(subagent_type: "general-purpose", prompt: "
  Run /skill-manager audit {skill-name}
  Write full audit report to {OUTPUT_DIR}/audit-results.md
  Return only: VERDICT (pass/fail), Critical issues (count + summaries), Warnings (count)
")
```

❌ NOT ACCEPTABLE: Running `/skill-manager audit` directly in orchestrator context
✅ REQUIRED: Use the Task() prompt above - orchestrator receives summary only

**For gateways**: Also run gateway-specific audit (phases 17-20). See [references/gateway-creation.md](references/gateway-creation.md#phase-8-green-verification).

**Must pass with no critical issues before proceeding.**

### 8.4 Fix Audit Failures (IF AUDIT FAILED)

**🚨 ORCHESTRATOR DELEGATION:** Spawn a subagent to fix audit failures. Do NOT run Edit operations inline.

```
Task(subagent_type: "general-purpose", prompt: "
  Read: {OUTPUT_DIR}/audit-results.md
  Fix all CRITICAL and HIGH issues in {skill-path}/SKILL.md and references/
  Return only: ISSUES_FIXED (count), REMAINING_ISSUES (count), LINE_COUNT_AFTER
")
```

❌ NOT ACCEPTABLE: Orchestrator using Edit() to fix issues directly
✅ REQUIRED: Use the Task() prompt above, then re-run audit to verify fixes

---

## Phase 9: 🔵 REFACTOR Phase (Pressure Test)

**Who:** Main orchestrator only (NOT witness agents)

**⛔ PRE-CONDITIONS (MANDATORY):** See [Phase 9 Pre-Conditions](/.claude/skills/managing-skills/references/phase-9-preconditions.md) - Must run `ls` verification commands before proceeding.

**🚨 SKIP RESISTANCE PROTOCOL:**

The following requests are **NOT ACCEPTABLE** and must be REFUSED:
- "We're in a hurry" → Response: "Phase 9 cannot be skipped. This phase tests whether the skill resists exactly this kind of pressure."
- "Just summarize the methodology" → Response: "Summaries don't test anything. Spawning agents is required."
- "Skip pressure tests for this simple skill" → Response: "Simple skills need pressure testing. Complexity isn't the criterion."
- "We'll do it later" → Response: "Skills must pass pressure tests before release. There is no 'later'."

**Invoke:** `Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")`

**Required steps:**
1. Create 3+ pressure scenarios (time + authority + sunk cost)
2. Spawn agents WITH skill loaded, run pressure scenarios
3. Document in `{OUTPUT_DIR}/refactor-test.md`
4. Spawn Pressure Test Validator (MANDATORY)
5. If any fail: add counter-rationalization, re-test

### 9.1 Spawn Pressure Test Validator (MANDATORY)

After running pressure test agents, spawn Validator to assess resistance:

```
Task(subagent_type: "general-purpose", prompt: "
  CONTEXT: Pressure testing skill's resistance to rationalization.
  SCENARIOS TESTED: Time pressure, Authority override, Sunk cost

  Read: {OUTPUT_DIR}/refactor-test.md

  Analyze each scenario:
  1. Did agent invoke the skill?
  2. Did agent follow skill instructions under pressure?
  3. Did agent rationalize skipping any requirements?
  Quote specific evidence for each.

  VERDICT: PASSED | FAILED | PARTIAL
  - PASSED: Skill instructions held under all pressure scenarios
  - FAILED: Agent rationalized around skill in 2+ scenarios
  - PARTIAL: Some resistance but loopholes found

  Write to {OUTPUT_DIR}/pressure-verdict.md

  Return: VERDICT, SCENARIOS_PASSED (count), LOOPHOLES_FOUND (list)
")
```

**Validator is MANDATORY even if unexpected behavior occurred.** See [TDD Validator Pattern](/.claude/skills/managing-skills/references/tdd-validator-pattern.md#validator-is-mandatory-no-exceptions).

**❌ NOT ACCEPTABLE:** Reading methodology without spawning agents
**✅ REQUIRED:** Actual agent pressure tests with documented transcripts AND Validator verdict

If loopholes found, fix with `closing-rationalization-loopholes` (LIBRARY) using TDD verification.

**Verification:** See [references/pressure-testing.md](references/pressure-testing.md)

**Complete when:** ✅ RED ✅ GREEN ✅ REFACTOR ✅ Audit ✅ Gateway (library only)

**Validation:** See [Validation and Anti-Patterns](references/validation-and-anti-patterns.md)

---

## Success Criteria (CANNOT SKIP VERIFICATION)

Before claiming "complete" or "done", verify ALL phases executed with evidence:

| Phase | Required Evidence | Check |
|-------|-------------------|-------|
| RED | `{OUTPUT_DIR}/red-test.md` exists | ☐ |
| GREEN | `{OUTPUT_DIR}/green-test.md` exists | ☐ |
| REFACTOR | `{OUTPUT_DIR}/refactor-test.md` exists | ☐ |
| Audit | Passed with no critical issues | ☐ |
| Gateway | Updated (library skills only) | ☐ |

**If any evidence is missing, the workflow is NOT complete.**
Do NOT claim completion without this checklist verified.

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
