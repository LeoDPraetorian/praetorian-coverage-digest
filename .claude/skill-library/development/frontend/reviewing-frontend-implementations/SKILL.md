---
name: reviewing-frontend-implementations
description: Use when executing code reviews for React/TypeScript frontend implementations - provides 5-step review process validating plan adherence, code quality, and verification commands with severity classification
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite
---

# Reviewing Frontend Implementations

**Complete review methodology for validating React/TypeScript frontend code against architecture plans and quality standards.**

## When to Use

Use this skill when:

- Reviewing frontend implementation against architect's plan
- Validating code quality for React/TypeScript components
- Performing PR reviews for frontend changes
- Checking implementation completeness and correctness

## Quick Reference

| Step | Purpose                         | Critical Elements                   |
| ---- | ------------------------------- | ----------------------------------- |
| 1    | Locate Architecture Plan        | Feature directory or docs/plans/    |
| 2    | Review Against Plan (Primary)   | Architecture, structure, state mgmt |
| 3    | Review Code Quality (Secondary) | Component size, functions, types    |
| 4    | Run Verification Commands       | tsc, eslint, tests                  |
| 5    | Write Review Document           | Findings, severity, verdict         |

## Step 1: Locate the Architecture Plan

**Find the plan that guided this implementation:**

```bash
# Check feature directory first (from persisting-agent-outputs discovery)
ls .claude/features/*/architecture*.md

# Check standard location
ls docs/plans/*-architecture.md

# Or ask user for plan location
```

**If no plan exists**: Escalate to `frontend-lead` to create one, OR review against general standards only (note this limitation in output).

## Step 2: Review Against Plan (Primary)

Compare implementation to plan's specifications:

| Plan Section           | What to Check                              |
| ---------------------- | ------------------------------------------ |
| Architecture Decisions | Did developer follow the chosen approach?  |
| File Structure         | Do files match the specified organization? |
| State Management       | Is the specified strategy used correctly?  |
| Implementation Steps   | Were all steps completed?                  |
| Acceptance Criteria    | Are all criteria met?                      |
| Review Checklist       | Check each item the architect specified    |

**Deviations from plan require justification or are flagged as issues.**

## Step 3: Review Code Quality (Secondary)

Independent of plan, check standard quality:

| Issue                        | Severity | Standard            |
| ---------------------------- | -------- | ------------------- |
| Components >200 lines        | HIGH     | Split required      |
| Functions >30 lines          | MEDIUM   | Extract recommended |
| Relative imports (./ or ../) | HIGH     | Use @/ paths        |
| 'any' types                  | HIGH     | Type properly       |
| JSON.stringify in deps       | CRITICAL | Remove immediately  |
| Missing error boundaries     | HIGH     | Add ErrorBoundary   |
| Hardcoded colors             | MEDIUM   | Use theme classes   |

## Step 4: Run Verification Commands

**Execute all verification commands and capture output:**

**Type checking (required):**
```bash
cd modules/chariot/ui && npx tsc --noEmit
```

**Linting (required):**

Use the `using-eslint` skill instead of inline commands. It provides:
- Checks both modified and staged files
- Auto-fix with `--fix` flag
- Deduplicates file lists
- Filters deleted files correctly

```
Read(".claude/skill-library/development/frontend/using-eslint/SKILL.md")
```

Then follow the skill's instructions to run ESLint on modified files.

**Tests:**
```bash
npm test -- --passWithNoTests
```

**You MUST run and show output.** Do not skip verification commands.

## Step 5: Write Review Document

Follow `persisting-agent-outputs` skill for file output location. Write review findings to the feature directory using this structure:

```markdown
## Review: [Feature/Component Name]

### Plan Adherence

**Plan Location**: `.claude/features/{slug}/architecture.md` or `docs/plans/YYYY-MM-DD-feature-architecture.md`

| Plan Requirement | Status | Notes     |
| ---------------- | ------ | --------- |
| [From plan]      | ✅/❌  | [Details] |

### Deviations from Plan

1. **[Deviation]**: [What differs from plan]
   - **Impact**: [Why this matters]
   - **Action**: [Keep with justification / Revise to match plan]

### Code Quality Issues

| Severity | Issue   | Location  | Action |
| -------- | ------- | --------- | ------ |
| CRITICAL | [Issue] | file:line | [Fix]  |
| HIGH     | [Issue] | file:line | [Fix]  |

### Verification Results

- tsc: ✅ Pass / ❌ [errors]
- eslint: ✅ Pass / ❌ [errors]
- tests: ✅ Pass / ❌ [failures]

### Verdict

**APPROVED** / **CHANGES REQUESTED** / **BLOCKED**

[Summary of what needs to happen before approval]
```

## Related Skills

- `persisting-agent-outputs` - File output location discovery protocol
- `using-eslint` - Robust ESLint execution for modified files (used in Step 4)
- `frontend-lead` - Architecture planning for frontend features
- `frontend-developer` - Implementation that gets reviewed by this process

## Changelog

See `.history/CHANGELOG` for version history.
