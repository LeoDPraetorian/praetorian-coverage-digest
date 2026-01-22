---
name: reviewing-capability-implementations
description: Use when executing code reviews for security capability implementations (VQL/Nuclei/Janus/fingerprintx) - provides 5-step review process validating plan adherence, detection quality, and verification commands with severity classification
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite
---

# Reviewing Capability Implementations

**Complete review methodology for validating security capability code against architecture plans and quality standards.**

## When to Use

Use this skill when:

- Reviewing capability implementation against architect's plan
- Validating code quality for VQL, Nuclei, Janus, or fingerprintx capabilities
- Performing PR reviews for capability changes
- Checking implementation completeness and correctness

## Quick Reference

| Step | Purpose                         | Critical Elements                        |
| ---- | ------------------------------- | ---------------------------------------- |
| 1    | Locate Architecture Plan        | Feature directory or docs/plans/         |
| 2    | Review Against Plan (Primary)   | Architecture, structure, detection logic |
| 3    | Review Code Quality (Secondary) | Capability-specific quality standards    |
| 4    | Run Verification Commands       | Syntax check, validation, tests, build   |
| 5    | Write Review Document           | Findings, severity, verdict              |

## Step 1: Locate the Architecture Plan

**Find the plan that guided this implementation:**

```bash
# Check feature directory first (from persisting-agent-outputs discovery)
ls .claude/features/*/architecture*.md

# Check standard location
ls docs/plans/*-architecture.md

# Or ask user for plan location
```

**If no plan exists**: Escalate to `capability-lead` to create one, OR review against general standards only (note this limitation in output).

## Step 2: Review Against Plan (Primary)

Compare implementation to plan's specifications:

| Plan Section           | What to Check                              |
| ---------------------- | ------------------------------------------ |
| Architecture Decisions | Did developer follow the chosen approach?  |
| Capability Structure   | Do files match the specified organization? |
| Detection Logic        | Is the specified detection strategy used?  |
| Implementation Steps   | Were all steps completed?                  |
| Acceptance Criteria    | Are all criteria met?                      |
| Review Checklist       | Check each item the architect specified    |

**Deviations from plan require justification or are flagged as issues.**

## Step 3: Review Code Quality (Secondary)

Independent of plan, check capability-specific quality standards:

### VQL Capabilities

| Issue                                | Severity | Standard                |
| ------------------------------------ | -------- | ----------------------- |
| Missing error handling in queries    | CRITICAL | Add error boundaries    |
| Hardcoded paths (not cross-platform) | HIGH     | Use path abstraction    |
| No artifact schema validation        | HIGH     | Validate before emit    |
| Inefficient queries (full scans)     | MEDIUM   | Add filters and indexes |
| Missing query timeouts               | MEDIUM   | Add timeout constraints |

### Nuclei Templates

| Issue                                   | Severity | Standard                |
| --------------------------------------- | -------- | ----------------------- |
| Overly broad matchers (false positives) | CRITICAL | Tighten matching        |
| Missing CVE/CWE mapping                 | HIGH     | Add classification      |
| Missing severity classification         | MEDIUM   | Add severity tag        |
| No negative test cases                  | HIGH     | Add false-negative test |
| Unsafe request configuration            | CRITICAL | Review unsafe flags     |

### Janus Tool Chains

| Issue                            | Severity | Standard                 |
| -------------------------------- | -------- | ------------------------ |
| No timeout handling              | CRITICAL | Add context timeout      |
| Error swallowing in pipeline     | CRITICAL | Propagate errors         |
| Missing result aggregation       | HIGH     | Aggregate properly       |
| No retry logic for transient     | MEDIUM   | Add exponential backoff  |
| Missing cleanup (goroutine leak) | CRITICAL | Add lifecycle management |

### Fingerprintx Modules

| Issue                         | Severity | Standard             |
| ----------------------------- | -------- | -------------------- |
| Incorrect protocol detection  | CRITICAL | Fix probe logic      |
| Missing version extraction    | MEDIUM   | Add version parsing  |
| Inefficient probe patterns    | MEDIUM   | Optimize probe count |
| No protocol fallback handling | HIGH     | Add fallback chain   |

### Scanner Integrations (All Types)

| Issue                           | Severity | Standard               |
| ------------------------------- | -------- | ---------------------- |
| No input sanitization           | CRITICAL | Sanitize all inputs    |
| Credential leakage in logs      | CRITICAL | Mask sensitive data    |
| Missing rate limiting           | HIGH     | Add backoff/throttle   |
| No result normalization         | HIGH     | Normalize to schema    |
| Error messages expose internals | MEDIUM   | Generic error messages |

## Step 4: Run Verification Commands

**Execute all verification commands and capture output:**

### VQL Capabilities

```bash
# Syntax check
velociraptor query parse capability.vql

# Logic review (if velociraptor available)
velociraptor query explain capability.vql
```

### Nuclei Templates

```bash
# Template validation
nuclei -validate -t template.yaml

# Test run (only if safe test target available)
# nuclei -t template.yaml -target test-host
```

### Go-Based (Janus/Fingerprintx/Scanners)

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
## Review: [Capability Name]

### Plan Adherence

**Plan Location**: `.claude/features/{slug}/architecture.md` or `docs/plans/YYYY-MM-DD-capability-architecture.md`

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

- Syntax check: ✅ Pass / ❌ [errors]
- Validation: ✅ Pass / ❌ [errors]
- Tests: ✅ Pass / ❌ [failures]
- Build: ✅ Pass / ❌ [errors]

### Verdict

**APPROVED** / **CHANGES REQUESTED** / **BLOCKED**

[Summary of what needs to happen before approval]
```

## Escalation Protocol

| Situation                      | Recommend              |
| ------------------------------ | ---------------------- |
| Fixes needed                   | `capability-developer` |
| Architecture concerns          | `capability-lead`      |
| No plan exists (design needed) | `capability-lead`      |
| Security vulnerabilities       | `backend-security`     |
| Test gaps                      | `capability-tester`    |
| Clarification needed           | AskUserQuestion tool   |

Report: "Blocked: [issue]. Attempted: [what]. Recommend: [agent] for [capability]."

## Integration

### Called By

- `capability-reviewer` agent (Step 1 mandatory skill)
- `orchestrating-capability-development` skill (review phase)
- `/capability` command workflow (review gate)

### Requires (invoke before starting)

| Skill                               | When  | Purpose                                |
| ----------------------------------- | ----- | -------------------------------------- |
| `persisting-agent-outputs`          | Start | Discover output directory              |
| `enforcing-evidence-based-analysis` | Start | Prevent hallucination about code state |

### Calls (during execution)

| Skill                      | Phase/Step | Purpose                           |
| -------------------------- | ---------- | --------------------------------- |
| `adhering-to-dry`          | Step 3     | Detect code duplication           |
| `adhering-to-yagni`        | Step 3     | Identify scope creep              |
| `debugging-systematically` | Step 4     | Root cause analysis if tests fail |

### Pairs With (conditional)

| Skill                         | Trigger                 | Purpose                     |
| ----------------------------- | ----------------------- | --------------------------- |
| `verifying-before-completion` | Before marking complete | Final validation checklist  |
| `discovering-reusable-code`   | New code detected       | Check for reusable patterns |

## Related Skills

- `persisting-agent-outputs` - Output file location and format
- `capability-lead` - Architecture planning for capabilities
- `capability-developer` - Implementation that gets reviewed
- `enforcing-evidence-based-analysis` - Prevents hallucination
- `adhering-to-dry` - Detects code duplication
- `adhering-to-yagni` - Identifies scope creep
- `debugging-systematically` - Root cause analysis
- `verifying-before-completion` - Final validation

## Changelog

See `.history/CHANGELOG` for version history.
