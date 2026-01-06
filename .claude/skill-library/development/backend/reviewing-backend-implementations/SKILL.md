---
name: reviewing-backend-implementations
description: Use when executing code reviews for Go backend implementations - provides 5-step review process validating plan adherence, code quality, and verification commands with severity classification
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite
---

# Reviewing Backend Implementations

**Complete review methodology for validating Go backend code against architecture plans and quality standards.**

## When to Use

Use this skill when:

- Reviewing backend implementation against architect's plan
- Validating code quality for Go backend services
- Performing PR reviews for backend changes
- Checking implementation completeness and correctness

## Quick Reference

| Step | Purpose                         | Critical Elements                    |
| ---- | ------------------------------- | ------------------------------------ |
| 1    | Locate Architecture Plan        | Feature directory or docs/plans/     |
| 2    | Review Against Plan (Primary)   | Architecture, structure, concurrency |
| 3    | Review Code Quality (Secondary) | File size, functions, error handling |
| 4    | Run Verification Commands       | go vet, lint, tests, build           |
| 5    | Write Review Document           | Findings, severity, verdict          |

## Step 1: Locate the Architecture Plan

**Find the plan that guided this implementation:**

```bash
# Check feature directory first (from persisting-agent-outputs discovery)
ls .claude/features/*/architecture*.md

# Check standard location
ls docs/plans/*-architecture.md

# Or ask user for plan location
```

**If no plan exists**: Escalate to `backend-lead` to create one, OR review against general standards only (note this limitation in output).

## Step 2: Review Against Plan (Primary)

Compare implementation to plan's specifications:

| Plan Section           | What to Check                              |
| ---------------------- | ------------------------------------------ |
| Architecture Decisions | Did developer follow the chosen approach?  |
| File Structure         | Do files match the specified organization? |
| Concurrency Strategy   | Is the specified pattern used correctly?   |
| Implementation Steps   | Were all steps completed?                  |
| Acceptance Criteria    | Are all criteria met?                      |
| Review Checklist       | Check each item the architect specified    |

**Deviations from plan require justification or are flagged as issues.**

## Step 3: Review Code Quality (Secondary)

Independent of plan, check standard quality:

| Issue                        | Severity | Standard                        |
| ---------------------------- | -------- | ------------------------------- |
| Files >500 lines             | HIGH     | Split required                  |
| Functions >50 lines          | MEDIUM   | Extract recommended             |
| Ignored errors (`_`)         | CRITICAL | Handle or document why ignored  |
| Race conditions              | CRITICAL | Add synchronization             |
| Missing context propagation  | HIGH     | Pass context through call chain |
| Goroutines without exit path | CRITICAL | Add lifecycle management        |
| Global mutable state         | HIGH     | Use dependency injection        |
| Missing defer for cleanup    | HIGH     | Add defer statements            |

## Step 4: Run Verification Commands

**Execute all verification commands and capture output:**

```bash
# Static analysis (required)
go vet ./...

# Linting (required)
golangci-lint run ./...

# Tests with race detection (required)
go test -race -v ./...

# Build verification
go build ./...
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

- go vet: ✅ Pass / ❌ [errors]
- golangci-lint: ✅ Pass / ❌ [errors]
- go test -race: ✅ Pass / ❌ [failures]
- go build: ✅ Pass / ❌ [errors]

### Verdict

**APPROVED** / **CHANGES REQUESTED** / **BLOCKED**

[Summary of what needs to happen before approval]
```

## Escalation Protocol

| Situation                      | Recommend            |
| ------------------------------ | -------------------- |
| Fixes needed                   | `backend-developer`  |
| Architecture concerns          | `backend-lead`       |
| No plan exists (design needed) | `backend-lead`       |
| Security vulnerabilities       | `backend-security`   |
| Test gaps                      | `backend-tester`     |
| Clarification needed           | AskUserQuestion tool |

Report: "Blocked: [issue]. Attempted: [what]. Recommend: [agent] for [capability]."

## Related Skills

- `enforcing-evidence-based-analysis` - Prevents hallucination, requires source verification
- `adhering-to-dry` - Detects code duplication patterns
- `adhering-to-yagni` - Identifies scope creep and unrequested features
- `debugging-systematically` - Root cause analysis for complex issues
- `persisting-agent-outputs` - Output file location and format
- `verifying-before-completion` - Final validation checklist
