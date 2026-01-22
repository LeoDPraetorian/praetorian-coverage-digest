# Phase Validators

**Generic validators for each phase of orchestrated workflows.**

This file defines WHAT each phase validates and the expected pass criteria. Domain orchestrations provide the specific commands (e.g., `go build` vs `npm run build`).

---

## Validator Table (Generic)

| Phase | Phase Name            | Validator Type       | Pass Criteria                                    |
| ----- | --------------------- | -------------------- | ------------------------------------------------ |
| 1-2   | Setup/Triage          | Directory check      | Output directory exists                          |
| 3     | Discovery             | Agent completion     | Discovery report generated                       |
| 4     | Skill Discovery       | Manifest check       | skill-manifest.yaml exists                       |
| 5     | Complexity            | Assessment complete  | Work type determined (BUGFIX/SMALL/MEDIUM/LARGE) |
| 6     | Brainstorming         | Design approval      | User approves design (LARGE only)                |
| 7     | Architecture          | Architect agent      | Plan approved, architecture.md exists            |
| 8     | Implementation        | Build step           | Exit code 0                                      |
| 9     | Design Verification   | Reviewer agent       | verdict: "SPEC_COMPLIANT"                        |
| 10    | Domain Verification   | Domain reviewer      | verdict: "APPROVED"                              |
| 11    | Code Quality          | Quality reviewer     | verdict: "APPROVED"                              |
| 12    | Test Planning         | Test lead agent      | test-plan.md exists                              |
| 13    | Testing               | Test runner          | All tests pass                                   |
| 14    | Coverage Verification | Coverage tool        | Meets threshold (domain-specific)                |
| 15    | Test Quality          | Test lead validation | verdict: "APPROVED"                              |
| 16    | Completion            | Exit criteria check  | All criteria met                                 |

---

## Validator Categories

### 1. Agent-Based Validators

Validators that spawn an agent and check the return status:

| Agent Type | Return Field | Pass Value                        |
| ---------- | ------------ | --------------------------------- |
| Reviewer   | `verdict`    | "APPROVED" or "SPEC_COMPLIANT"    |
| Tester     | `status`     | "complete" with all tests passing |
| Lead       | `approval`   | "approved"                        |

**Validation protocol:**

1. Spawn agent with appropriate prompt
2. Check return JSON for required fields
3. Compare against pass criteria
4. If fail: route per [agent-output-validation.md](agent-output-validation.md)

### 2. Command-Based Validators

Validators that run a command and check exit code:

| Validator | Generic Form         | Pass Criteria               |
| --------- | -------------------- | --------------------------- |
| Build     | `{build_command}`    | Exit code 0                 |
| Test      | `{test_command}`     | Exit code 0, all tests pass |
| Lint      | `{lint_command}`     | Exit code 0, no errors      |
| Coverage  | `{coverage_command}` | Coverage >= threshold       |

**Domain orchestrations specify** the actual commands:

- Backend (Go): `go build ./...`, `go test ./...`, `golangci-lint run`
- Frontend (React): `npm run build`, `npm test`, `npm run lint`
- Python: `python -m py_compile`, `pytest`, `ruff check`

### 3. File-Based Validators

Validators that check for artifact existence:

| Phase         | Required Artifact | Validation                         |
| ------------- | ----------------- | ---------------------------------- |
| Discovery     | discovery.md      | File exists with content           |
| Architecture  | architecture.md   | File exists with required sections |
| Test Planning | test-plan.md      | File exists with test cases        |
| Completion    | MANIFEST.yaml     | All phases marked complete         |

**Validation protocol:**

```bash
# Check file exists and has content
[ -s "{OUTPUT_DIR}/{artifact}" ] && echo "PASS" || echo "FAIL"
```

---

## Phase-Specific Validation Details

### Phase 7 (Architecture) Validation

```
Validator: Architect agent
Pass criteria:
  - architecture.md created
  - Contains required sections (Overview, Components, Data Flow, etc.)
  - User approved design (if LARGE work type)
```

### Phase 8 (Implementation) Validation

```
Validator: Build command
Pass criteria:
  - Build exits 0
  - No compilation errors
  - Files created match plan
```

### Phase 9-11 (Verification) Validation

```
Validator: Reviewer agents (may be 2-stage)
Pass criteria:
  - Stage 1: SPEC_COMPLIANT (matches architecture)
  - Stage 2: APPROVED (quality standards met)
  - No critical/high issues
```

### Phase 13 (Testing) Validation

```
Validator: Test runner
Pass criteria:
  - All tests pass
  - No test errors or failures
  - Test output captured for Phase 14
```

### Phase 14 (Coverage) Validation

```
Validator: Coverage tool
Pass criteria:
  - Coverage >= threshold (domain-specific)
  - All critical paths covered
  - Coverage report generated
```

---

## Validation Protocol

For each phase transition:

1. **Identify validator type** from table above
2. **Execute validator**:
   - Agent: Spawn and check return
   - Command: Run and check exit code
   - File: Check existence and content
3. **Compare against pass criteria**
4. **If PASS**: Update MANIFEST.yaml, proceed to next phase
5. **If FAIL**: Route per failure type:
   - Transient → Retry
   - Fixable → Return to phase
   - Blocking → Escalate

---

## Domain Override Pattern

Domain orchestrations override validators by providing:

```yaml
# In domain orchestration's phase file
validators:
  build:
    command: "go build ./..." # Domain-specific
    pass_criteria: "exit_code: 0"
  test:
    command: "go test ./..."
    pass_criteria: "exit_code: 0, all_pass: true"
  coverage:
    command: "go test -cover ./..."
    threshold: 80 # Domain-specific threshold
```

---

## Validation Output Format

All validators should produce structured output:

```yaml
validation:
  phase: {N}
  validator: "{validator_type}"
  result: "PASS" | "FAIL"
  details:
    command: "{if command-based}"
    exit_code: {if command-based}
    agent: "{if agent-based}"
    verdict: "{if agent-based}"
    artifact: "{if file-based}"
    exists: {if file-based}
  timestamp: "{ISO timestamp}"
```

---

## Related References

- [agent-output-validation.md](agent-output-validation.md) - Agent return validation
- [orchestration-guards.md](orchestration-guards.md) - Retry limits on validation failures
- [exit-criteria.md](exit-criteria.md) - Phase 16 final validation (in domain orchestrations)
