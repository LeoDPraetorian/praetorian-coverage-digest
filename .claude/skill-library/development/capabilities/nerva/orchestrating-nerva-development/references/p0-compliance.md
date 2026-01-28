# P0 Compliance (Fingerprintx Development)

Domain-specific compliance checks for fingerprintx module implementations.

## Overview

P0 Compliance Validation is a **blocking gate** that verifies fingerprintx implementations meet mandatory requirements BEFORE code enters review. This prevents:

- Interface implementation errors
- Missing method implementations
- Runtime panics from unhandled errors
- Protocol detection failures
- Integration test failures

**When it runs**: Phase 10 (Domain Compliance), after implementation
**Blocking behavior**: Violations found → Human Checkpoint → Must fix before proceeding
**Success behavior**: All checks pass → Automatic progression to review

## Fingerprintx P0 Requirements

| P0 Requirement          | What to Verify                 | Validation Command                                 | Blocking |
| ----------------------- | ------------------------------ | -------------------------------------------------- | -------- |
| **Go Compilation**      | Module compiles without errors | `go build ./...`                                   | Always   |
| **5-Method Interface**  | All 5 methods implemented      | `go vet` + manual check                            | Always   |
| **Type Constant**       | Added to types.go              | `grep "{SERVICE}Type" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`        | Always   |
| **Plugin Registration** | Registered in plugins.go       | `grep "{service}" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go`          | Always   |
| **Unit Tests Exist**    | \*\_test.go file created       | `ls {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/*_test.go`      | Always   |
| **No Panics**           | No panic() calls in code       | `grep -r "panic(" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/` | Always   |

## 5-Method Interface Requirements

Every fingerprintx plugin MUST implement these 5 methods:

| Method       | Signature                                                                                                     | Purpose                |
| ------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `Name()`     | `func (p *Plugin) Name() string`                                                                              | Return service name    |
| `Priority()` | `func (p *Plugin) Priority() int`                                                                             | Detection priority     |
| `Type()`     | `func (p *Plugin) Type() plugins.Protocol`                                                                    | Protocol type constant |
| `Run()`      | `func (p *Plugin) Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error)` | Probe and detect       |
| `Scan()`     | `func (p *Plugin) Scan(conn net.Conn, target plugins.Target) (*plugins.Service, error)`                       | Banner grab            |

### P1 Requirements (Recommended)

| P1 Requirement    | What to Verify                   | Notes                        |
| ----------------- | -------------------------------- | ---------------------------- |
| Version Detection | Extracts version from response   | Recommended for accuracy     |
| CPE Generation    | Generates valid CPE string       | Recommended for integrations |
| Integration Tests | Tests with real service (Docker) | Recommended for reliability  |

## Validation Protocol

### Step 1: Go Compilation Check

```bash
cd {CAPABILITIES_ROOT}/modules/fingerprintx
go build ./...
```

**If fails:** Fix compilation errors, do not proceed

### Step 2: Interface Implementation Check

```bash
# Verify all 5 methods exist
grep -c "func (p \*.*Plugin) Name()" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/*.go
grep -c "func (p \*.*Plugin) Priority()" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/*.go
grep -c "func (p \*.*Plugin) Type()" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/*.go
grep -c "func (p \*.*Plugin) Run(" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/*.go
grep -c "func (p \*.*Plugin) Scan(" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/*.go
```

**Expected:** Each grep returns 1 (exactly one implementation)

### Step 3: Type Constant Check

```bash
grep "{SERVICE}Type" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go
```

**Expected:** Type constant defined (e.g., `MySQLType`)

### Step 4: Registration Check

```bash
grep -i "{service}" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go
```

**Expected:** Import and registration entry present

### Step 5: Panic Check

```bash
grep -rn "panic(" {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{service}/ || echo "No panics found"
```

**Expected:** No output (no panic calls)

## Failure Handling

**When P0 checks fail:**

1. Generate compliance report
2. Classify violations:
   - **CRITICAL**: Compilation failure, missing methods
   - **ERROR**: Missing registration, panic calls
   - **WARNING**: Missing version detection
3. Escalate to user with fix recommendations

## Output Format

```markdown
# P0 Compliance Report: Fingerprintx - {service}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count} ({critical} CRITICAL, {error} ERROR, {warning} WARNING)
**Date**: {ISO 8601 timestamp}

## P0 Requirements

| Requirement         | Status | Evidence                    |
| ------------------- | ------ | --------------------------- |
| Go Compilation      | ✅     | Build successful            |
| 5-Method Interface  | ✅     | All methods found           |
| Type Constant       | ✅     | MySQLType in types.go       |
| Plugin Registration | ✅     | Import + registration found |
| Unit Tests          | ✅     | mysql_test.go exists        |
| No Panics           | ✅     | No panic() calls found      |

## P1 Requirements (Recommended)

| Requirement       | Status     | Evidence                         |
| ----------------- | ---------- | -------------------------------- |
| Version Detection | ✅         | Version extracted from handshake |
| CPE Generation    | ⚠️ WARNING | Not implemented                  |
| Integration Tests | ✅         | Docker tests pass                |
```

## Rationalization Prevention

| Rationalization                            | Reality                          | Counter                |
| ------------------------------------------ | -------------------------------- | ---------------------- |
| "panic() is fine for unrecoverable errors" | Plugins must NEVER panic         | Return error instead   |
| "Version detection is optional"            | It's P1 but strongly recommended | Implement for accuracy |
| "I'll add tests later"                     | Tests are P0 requirement         | Write tests now        |
| "Registration can wait"                    | Unregistered plugin won't work   | Register immediately   |

## Related References

| Reference              | Location                                                                       | Purpose                    |
| ---------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| Phase 10 Details       | `references/phase-10-domain-compliance.md`                                     | Full compliance checklist  |
| Interface Requirements | `references/interface-requirements.md`                                         | 5-method interface details |
| Writing fingerprintx   | `.claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/` | Development patterns       |
