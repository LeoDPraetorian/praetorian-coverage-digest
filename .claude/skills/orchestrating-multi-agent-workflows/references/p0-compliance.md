# P0/Compliance Validation

**Generic P0 validation pattern for orchestration workflows. Domain-specific requirements live in each orchestration skill.**

---

## Overview

P0/Compliance Validation is a **blocking gate** in orchestration workflows that verifies implementation meets mandatory requirements BEFORE code enters review. This prevents:

- Wasted reviewer time on non-compliant code
- Multiple review cycles fixing the same violations
- Late-stage architectural rework
- Production bugs from skipped safety checks

**When it runs**: After implementation phase, before review phase
**Blocking behavior**: ❌ Violations found → 🛑 Human Checkpoint → Must fix before proceeding
**Success behavior**: ✅ All checks pass → Automatic progression to review

---

## Domain-Specific P0 Requirements

Each orchestration skill defines its own P0 requirements. **Do NOT look here for domain tables - use the skill-specific reference.**

| Domain                   | Orchestration Skill                      | P0 Reference                                                                                            |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Integration Development  | `orchestrating-integration-development`  | [references/p0-compliance.md](../../orchestrating-integration-development/references/p0-compliance.md)  |
| Capability Development   | `orchestrating-capability-development`   | [references/p0-compliance.md](../../orchestrating-capability-development/references/p0-compliance.md)   |
| Fingerprintx Development | `orchestrating-fingerprintx-development` | [references/p0-compliance.md](../../orchestrating-fingerprintx-development/references/p0-compliance.md) |
| Feature Development      | `orchestrating-feature-development`      | [references/p0-compliance.md](../../orchestrating-feature-development/references/p0-compliance.md)      |

**Why domain-specific?** Each domain has unique requirements:

- **Integration**: VMFilter, CheckAffiliation, errgroup safety
- **Capability**: Type matrix, output schema, error handling
- **Fingerprintx**: Shodan validation, protocol markers, test coverage
- **Feature**: Build/lint/type checks, component patterns

---

## Validation Protocol

**3-Step Validation Process (MANDATORY):**

### Step 1: Load Domain-Specific P0 Requirements

1. Identify which orchestration skill you're running
2. Read the skill's `references/p0-compliance.md` file
3. Extract the P0 requirements table for that domain

| User Says...                                       | Orchestration Skill                    | P0 Reference to Load               |
| -------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| "integrate X API" / "sync from Y"                  | orchestrating-integration-development  | Load integration p0-compliance.md  |
| "create VQL capability" / "write Nuclei template"  | orchestrating-capability-development   | Load capability p0-compliance.md   |
| "new fingerprintx module for X protocol"           | orchestrating-fingerprintx-development | Load fingerprintx p0-compliance.md |
| "add feature to UI" / "implement backend endpoint" | orchestrating-feature-development      | Load feature p0-compliance.md      |

### Step 2: Run ALL P0 Checks for Domain (BLOCKING)

For each requirement in the domain's P0 table:

1. **Run validation command** (from "Validation Command" column)
2. **Capture output** (verbatim)
3. **Determine status** (✅ PASS, ❌ FAIL, ⚠️ WARNING)
4. **Document evidence** (file paths, line numbers, violation details)

**All checks must complete before proceeding** - do not stop at first failure.

### Step 3: Proceed or Escalate

**Decision matrix:**

| Result             | Action                                   | Human Checkpoint? |
| ------------------ | ---------------------------------------- | ----------------- |
| ✅ All checks PASS | Proceed automatically to review phase    | No                |
| ❌ Any check FAILS | 🛑 Generate compliance report + escalate | **YES**           |
| ⚠️ Warnings only   | Document warnings + ask user preference  | Optional          |

**Escalation protocol (when violations found):**

1. **Generate compliance report** using domain-specific template
2. **Use AskUserQuestion** with violation summary:

   ```
   P0 Compliance Verification found {count} violations.

   **Critical**: {critical-violation-summary}
   **Error**: {error-violation-summary}
   **Warning**: {warning-violation-summary}

   Options:
   1. Fix violations now (Recommended) - I will guide you through fixes
   2. Proceed anyway with violations documented - Code review will likely reject
   3. Review violations and decide - Show me details of each violation
   ```

3. **Track violations** in output file for code review reference

---

## Integration with Gated Verification

P0 Compliance Validation is **Stage 1 (Spec Compliance)** in the Gated Verification workflow:

| Stage                  | Focus                                  | P0 Role                                | Reference                     |
| ---------------------- | -------------------------------------- | -------------------------------------- | ----------------------------- |
| **1. Spec Compliance** | Requirements met, P0 checks pass       | **P0 validation runs here** (BLOCKING) | gated-verification.md:Stage 1 |
| 2. Code Quality        | Patterns, readability, maintainability | P0 violations flagged in review        | gated-verification.md:Stage 2 |
| 3. Test Coverage       | Unit/integration/E2E tests exist       | P0 test requirements validated         | gated-verification.md:Stage 3 |

**Relationship:**

- **P0 → Gated Verification**: P0 checks are a SUBSET of Stage 1 (Spec Compliance)
- **Gated Verification → P0**: Stage 1 includes P0 checks PLUS domain-specific requirements
- **Blocking behavior**: Stage 1 (including P0) MUST pass before Stage 2 begins

**Why P0 is separate:**

- P0 focuses on **high-impact**, **commonly-violated** patterns
- Gated Verification covers **full compliance** (all requirements, not just P0)
- P0 enables **early validation** before spawning reviewer agents

---

## Failure Handling

**When P0 checks fail, follow this protocol:**

### Immediate Actions

1. **Generate compliance report** (see Output Format below)
2. **Classify violations**:
   - 🚨 **CRITICAL**: Security issues, production bugs (e.g., stub implementations, ignored errors)
   - ❌ **ERROR**: Pattern violations, mandatory requirements (e.g., missing safety checks)
   - ⚠️ **WARNING**: Code quality issues, technical debt (e.g., file size limits)
3. **Escalate to user** via AskUserQuestion with fix recommendations

### Fix Workflow

**Option 1: Fix now (RECOMMENDED)**

```markdown
I'll guide you through fixing violations:

1. {Violation 1} ({file}:{line})
   - Reference implementation: {reference-file}:{lines}
   - Fix pattern: {description}

2. {Violation 2} ({file}:{line})
   - Current: {problematic-code}
   - Fix: {corrected-code}

Proceed with fixes?
```

**Option 2: Proceed with violations documented**

```markdown
⚠️ WARNING: Code review will likely reject PRs with P0 violations.

Documenting violations in p0-compliance-review.md for reviewer reference.
You can fix these later, but expect delays in code review.

Proceeding to review phase...
```

**Option 3: Review and decide**

```markdown
[Show detailed violation analysis with code snippets, fix patterns, and impact assessment]

After reviewing, choose:

1. Fix violations now
2. Proceed anyway (violations documented)
```

---

## Output Format

P0 validation produces a **structured compliance report** with this format:

### Report Template

````markdown
# P0 Compliance Report: {domain} - {component-name}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count} ({critical-count} CRITICAL, {error-count} ERROR, {warning-count} WARNING)
**Date**: {ISO 8601 timestamp}
**Domain**: Integration | Capability | Fingerprintx | Feature

## Requirements Summary

| Requirement     | Status      | Evidence                          |
| --------------- | ----------- | --------------------------------- |
| {requirement-1} | ✅          | {file}:{line} ({what-passed})     |
| {requirement-2} | ❌ CRITICAL | {file}:{line} ({what-failed})     |
| {requirement-3} | ⚠️ WARNING  | {file}:{line} ({warning-details}) |

## Violations Details

### {Severity}: {Requirement Name} ({file}:{line})

**Current implementation:**

```{language}
{code-snippet-showing-violation}
```

**Required Fix**: {what-needs-to-change}

**Reference Implementation**: {file-with-correct-pattern}:{line-range}

[Repeat for each violation]
````

---

## Rationalization Prevention

**Common rationalizations when P0 checks fail:**

| Rationalization                                   | Reality                                                     | Counter                                      |
| ------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| "Stub implementation is fine, we'll fix it later" | Stubs cause production bugs (false positives, missing data) | Must implement real logic before PR          |
| "File size limit is arbitrary"                    | Large files are hard to maintain and review                 | Split using established patterns             |
| "Error handling here never fails"                 | Edge cases DO occur in production                           | Check and wrap all errors                    |
| "This is a quick prototype, P0 is overkill"       | Prototypes become production code without refactoring       | P0 prevents tech debt from day 1             |
| "We can fix P0 violations in code review"         | Fixing in review causes 2-3 review cycles (wastes time)     | P0 catches issues BEFORE review (saves time) |
| "Coverage threshold is too high"                  | 80% catches most edge cases                                 | Hit the target or justify specific gaps      |

**If you detect rationalization phrases, STOP and validate the claim:**

1. Check if violation is truly acceptable (rare cases exist)
2. If not acceptable, explain WHY it matters (production impact, security risk, etc.)
3. Provide fix guidance
4. Use AskUserQuestion if user wants to proceed anyway (document risk)

---

## Integration with Orchestration Skills

P0/Compliance Validation integrates into orchestration workflows at specific phases:

| Orchestration Skill                      | P0 Phase | Before         | After       | P0 Reference                                                                                 |
| ---------------------------------------- | -------- | -------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `orchestrating-integration-development`  | Phase 10 | Implementation | Code Review | [p0-compliance.md](../../orchestrating-integration-development/references/p0-compliance.md)  |
| `orchestrating-capability-development`   | Phase 10 | Implementation | Code Review | [p0-compliance.md](../../orchestrating-capability-development/references/p0-compliance.md)   |
| `orchestrating-fingerprintx-development` | Phase 8  | Implementation | Code Review | [p0-compliance.md](../../orchestrating-fingerprintx-development/references/p0-compliance.md) |
| `orchestrating-feature-development`      | Phase 10 | Implementation | Code Review | [p0-compliance.md](../../orchestrating-feature-development/references/p0-compliance.md)      |

**Workflow integration pattern:**

```
Phase N: Implementation
  ↓
  Developer agents write code
  ↓
Phase N+1: P0 Validation (THIS PATTERN)
  ↓
  Run domain-specific P0 checks
  ↓
  ✅ PASS → Proceed to Phase N+2
  ❌ FAIL → 🛑 Human Checkpoint → Fix or document
  ↓
Phase N+2: Review/Testing
```

---

## Related Skills

| Skill                                      | Access Method                                                                                            | Purpose                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **orchestrating-integration-development**  | `Read(".claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md")`  | Integration workflow with P0  |
| **orchestrating-capability-development**   | `Read(".claude/skill-library/development/capabilities/orchestrating-capability-development/SKILL.md")`   | Capability workflow with P0   |
| **orchestrating-fingerprintx-development** | `Read(".claude/skill-library/development/capabilities/orchestrating-fingerprintx-development/SKILL.md")` | Fingerprintx workflow with P0 |
| **orchestrating-feature-development**      | `Read(".claude/skill-library/development/orchestrating-feature-development/SKILL.md")`                   | Feature workflow with P0      |
| **validating-integrations**                | `Read(".claude/skill-library/.../validating-integrations/SKILL.md")`                                     | Integration P0 automation     |
| **gated-verification**                     | See references/gated-verification.md                                                                     | Multi-stage verification      |

---

## Architecture Note

**This file is GENERIC.** Domain-specific P0 requirements have been moved to each orchestration skill's own `references/p0-compliance.md` file. This ensures:

1. **Single source of truth** - Each domain owns its P0 requirements
2. **Independent evolution** - Domains can update requirements without affecting others
3. **Reduced duplication** - Generic patterns here, specific requirements in domain skills
4. **Clearer ownership** - Domain skill maintainers own their P0 checks

**If you need domain-specific P0 checks**, read the appropriate skill's p0-compliance.md, NOT this file.
