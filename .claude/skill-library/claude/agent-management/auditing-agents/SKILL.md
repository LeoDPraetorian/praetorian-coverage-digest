---
name: auditing-agents
description: Use when auditing agents for critical issues - validates description syntax (block scalars), name consistency, plus quality checks (triggers, examples, line count, output format, frontmatter ordering). Runs in 30-60 seconds.
allowed-tools: Bash, Read, TodoWrite
---

# Auditing Agents

**Critical validation of agent files before committing or deploying.**

> **IMPORTANT**: You MUST use TodoWrite to track audit progress when checking multiple agents.

---

## What This Skill Does

Audits agents for **CRITICAL issues** that break agent discovery:
- **Block scalar descriptions** (`|` or `>`) - Makes agents invisible to Claude
- **Name mismatches** - Frontmatter name ≠ filename
- **Missing/empty descriptions** - Discovery metadata absent

**Plus EXTENDED checks** for quality and maintainability:
- **Description trigger** - Starts with "Use when" pattern (warning)
- **Has examples** - Contains `<example>` blocks (warning)
- **Line count** - ≤300 lines (most), ≤400 (architecture/orchestrator) (failure)
- **Gateway skill** - Has `gateway-*` in frontmatter (warning)
- **Output format** - Has standardized JSON output section (warning)
- **Escalation protocol** - Has handoff/escalation section (warning)
- **Explicit skill invocation (Phase 9)** - Has `EXTREMELY_IMPORTANT` block with mandatory skill enforcement for agents with `skills:` frontmatter (warning)
- **Deprecated skills detection (Phase 8)** - No references to deprecated/archived skills (warning)

**Why this is critical:** Block scalar issues prevent Claude from seeing or selecting the agent. An agent with a block scalar description is completely invisible to the Task tool. Extended checks ensure maintainable, discoverable agents.

---

## When to Use

- After editing any agent file
- Before committing agent changes
- When debugging agent discovery issues ("Why can't Claude find my agent?")
- As part of create/update workflows (automatic)

**Automatically invoked by:**
- `creating-agents` (Phase 7: Audit compliance)
- `updating-agents` (Phase 5: Verify no regressions)

---

## Quick Reference

| Command | Purpose | Time |
|---------|---------|------|
| `npm run audit-critical -- <name>` | Critical checks (single agent) | 30 sec |
| `npm run audit-critical` | Critical checks (all agents) | 1-2 min |

**Checks:**
- **Block scalars** (`|` or `>`) - Makes agents invisible to Claude
- **Name mismatches** - Frontmatter name ≠ filename
- **Missing/empty descriptions** - No discovery metadata

---

## How to Use

### Audit Single Agent

**Setup:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skill-library/claude/agent-management/auditing-agents/scripts"
```

**Execute:**
```bash
npm run audit-critical -- <agent-name>
```

**Example:**
```bash
npm run audit-critical -- frontend-developer
```

### Audit All Agents

**Execute:**
```bash
npm run audit-critical
```

**What it does:** Recursively checks all `.md` files in `.claude/agents/`

---


## Interpreting Results

See [Interpreting Results Reference](references/interpreting-results.md) for detailed output interpretation:
- **Success (Exit Code 0)** - No issues found, ready to commit
- **Failure (Exit Code 1)** - Critical/extended issues with line numbers and fixes
- **Tool Error (Exit Code 2)** - Agent not found or parse errors

**Quick summary**: How to read audit output, understand exit codes, and determine next actions based on results.

## Common Issues & Fixes

**Critical issues** that break agent discovery - detected by `audit-critical` CLI.

See [Common Issues Reference](references/common-issues.md) for detailed troubleshooting:
- **Issue 1**: Block Scalar Pipe (`|`) - Claude sees literal "|"
- **Issue 2**: Block Scalar Folded (`>`) - Claude sees literal ">"
- **Issue 3**: Name Mismatch - Frontmatter name ≠ filename
- **Issue 4**: Missing Description - No discovery metadata
- **Issue 5**: Empty Description - Field exists but empty

**Quick summary**: These are the 5 critical issues that make agents invisible or undiscoverable. The reference contains full symptom/cause/fix patterns for each.

---


## Extended Structural Issues

**Quality warnings** detected by `test` CLI and manual checks - improve agent selection and maintainability.

See [Extended Issues Reference](references/extended-issues.md) for detailed guidance:
- **Issue 6**: Missing "Use when" Trigger - Improves discovery
- **Issue 7**: No Examples in Description - Trains selection
- **Issue 8**: Line Count Exceeded - Delegate to skills
- **Issue 9**: Missing Gateway Skill - Progressive loading
- **Issue 10**: Missing Output Format - Standardized responses
- **Issue 11**: Missing Escalation Protocol - Clear boundaries
- **Issue 12**: Missing EXTREMELY_IMPORTANT Block - Skill enforcement (Phase 9)
- **Issue 13**: Deprecated Skills Usage - Technical debt prevention (Phase 8)
- **Issue 14**: Frontmatter Field Order - Maintenance and consistency (Phase 2)
- **Issue 15**: Frontmatter Skill Location - Progressive loading enforcement (Phase 5)

**Quick summary**: These are quality improvements, not blocking issues (except line count). The reference contains full symptom/cause/fix patterns, including the complete EXTREMELY_IMPORTANT template for Phase 9 enforcement and frontmatter ordering guidance for Phase 2.

---

## Workflow

### Step-by-Step Audit Process

1. **Run Critical Checks (TypeScript):**
   ```bash
   REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
   REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
   cd "$REPO_ROOT/.claude/skill-library/claude/agent-management/auditing-agents/scripts"
   npm run audit-critical -- <agent-name>
   ```
   **Checks:** Block scalars, name mismatch, description missing/empty

2. **Manual Checks - Phases 9, 8, 7, 4, 5, 6, 3, 2, 1:**

   See [Manual Check Procedures](references/workflow-manual-checks.md) for detailed instructions on each phase.

   **Quick checklist:**
   - [ ] **Phase 9**: EXTREMELY_IMPORTANT block (if `skills:` in frontmatter)
   - [ ] **Phase 8**: Deprecated skills (no references to archived/renamed skills)
   - [ ] **Phase 7**: Phantom skills (verify all `skill: "name"` references exist)
   - [ ] **Phase 4**: Gateway enforcement (no direct library paths)
   - [ ] **Phase 5**: Frontmatter skill location (only core or gateway skills in frontmatter)
   - [ ] **Phase 6**: Pattern delegation (no embedded workflows >200 chars)
   - [ ] **Phase 3**: Tool validation (required/forbidden tools by type)
   - [ ] **Phase 2**: Frontmatter organization (fields in canonical order)
   - [ ] **Phase 1**: PermissionMode alignment (matches type→mode mapping)

   **Report results:** PASS/WARNING/ERROR/N/A for each phase

3. **Check Exit Codes & Consolidate Results:**
   - Critical audit (step 1): 0 = Success ✅, 1 = Issues ❌, 2 = Tool error ⚠️
   - Phase 9 manual check (step 2): Record PASS/WARNING/N/A
   - Phase 8 manual check (step 2): Record PASS/WARNING
   - Phase 7 manual check (step 2): Record PASS/ERROR
   - Phase 4 manual check (step 2): Record PASS/ERROR
   - Phase 5 manual check (step 2): Record PASS/ERROR
   - Phase 6 manual check (step 2): Record PASS/WARNING
   - Phase 3 manual check (step 2): Record PASS/ERROR
   - Phase 2 manual check (step 2): Record PASS/WARNING
   - Phase 1 manual check (step 2): Record PASS/ERROR

9. **If Issues Found:**
   - Read error report line by line
   - Identify each issue type (including Phase 9, Phase 8, Phase 7, Phase 4, Phase 5, Phase 6, Phase 3, Phase 2, Phase 1)
   - Note line numbers
   - Plan fixes

10. **Fix Each Issue:**
   - Use Edit tool for changes
   - Follow fix patterns above (including Phase 9 template in Issue 12)
   - For deprecated skills: Update to current skill name or remove if obsolete
   - For phantom skills: Either remove reference or create the missing skill
   - For direct paths: Replace with appropriate gateway-* skill
   - For library skills in frontmatter: Replace with appropriate gateway-* skill
   - For embedded patterns: Extract to skill, replace with delegation reference
   - For tool violations: Add missing required tools or remove forbidden tools
   - For frontmatter order: Reorder fields to match canonical order (name, description, type, permissionMode, tools, skills, model, color)
   - For permissionMode mismatch: Update to expected value for agent type
   - Make minimal changes

4. **Re-Audit:**
   ```bash
   npm run audit-critical -- <agent-name>
   ```
   **And repeat manual checks:**
   - Phase 9 (step 2): EXTREMELY_IMPORTANT block
   - Phase 8 (step 2): Deprecated skills
   - Phase 7 (step 2): Phantom skills
   - Phase 4 (step 2): Gateway enforcement
   - Phase 5 (step 2): Frontmatter skill location
   - Phase 6 (step 2): Pattern delegation
   - Phase 3 (step 2): Tool validation
   - Phase 2 (step 2): Frontmatter organization
   - Phase 1 (step 2): PermissionMode alignment

5. **Verify Success:**
   - Critical audit: Exit code 0
   - Phase 9: PASS or N/A
   - Phase 8: PASS (no deprecated skill references)
   - Phase 7: PASS (no phantom skills)
   - Phase 4: PASS (no direct library paths)
   - Phase 5: PASS (only core or gateway skills in frontmatter)
   - Phase 6: PASS (no embedded patterns >200 chars)
   - Phase 3: PASS (all required tools present, no forbidden tools)
   - Phase 2: PASS or WARNING (fields in canonical order)
   - Phase 1: PASS (correct permissionMode for type)
   - Ready to proceed

---


## Examples

See [Examples Reference](references/examples.md) for detailed audit workflow examples:
- **Example 1**: Audit after editing agent
- **Example 2**: Pre-commit check for all agents
- **Example 3**: Debug discovery issues
- **Example 4**: Batch audit with failures

**Quick summary**: Complete examples showing how to run audits, interpret results, and fix issues in various scenarios.

## Integration with Other Skills

### Used During Creation

`creating-agents` (Phase 7):
```
Phase 7: Audit Compliance
  → skill: "auditing-agents"
  → Validates agent before proceeding
```

### Used During Updates

`updating-agents` (Phase 5):
```
Phase 5: Verify No Regressions
  → skill: "auditing-agents"
  → Ensures update didn't break discovery
```

### Triggers Fixing

If issues found:
```
Audit → Reports issues
  ↓
Fix → Use skill: "fixing-agents"
  ↓
Re-audit → Verify fixes worked
```

---

## Why CLI Is Needed

From the CLI source code (audit-critical.ts:5-8):

```typescript
/**
 * This is the ONLY audit that remains as code because:
 * 1. Block scalars make agents invisible to Claude (high impact)
 * 2. Detection requires complex regex patterns (hard for Claude)
 * 3. Failure rate was 8/10 agents before enforcement (proven need)
 */
```

**The skill wraps the CLI** to:
- Provide user-friendly interface
- Interpret results clearly
- Integrate with workflows
- Follow Router Pattern

**The CLI provides:**
- Complex regex detection (hard for LLMs)
- Accurate line number reporting
- Fast execution (<1 second)
- Deterministic results

---


## Technical Details

See [Technical Details Reference](references/technical-details.md) for implementation specifics:
- **Block Scalar Detection** - Regex patterns and line-by-line analysis
- **Description Validation** - Field existence and content checks  
- **Name Consistency** - Frontmatter vs filename matching
- **Exit Codes** - Meaning and appropriate responses

**Quick summary**: Technical implementation details of the audit-critical CLI tool and what each check does under the hood.

## See Also

- `creating-agents` - Full creation workflow (includes audit)
- `updating-agents` - Update workflow (includes audit)
- `fixing-agents` - Fix issues found by audit
- `agent-manager` - Routes audit operations to this skill
