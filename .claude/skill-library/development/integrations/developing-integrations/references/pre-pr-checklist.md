# Pre-PR Checklist

**Complete this checklist before submitting integration PR. All items must be checked.**

---

## Mandatory Requirements (P0 - BLOCKING)

### VMFilter

- [ ] VMFilter initialized in struct: `Filter: filter.NewVMFilter(job.Username)`
- [ ] `Filter.Asset(&asset)` called BEFORE every `Job.Send(&asset)`
- [ ] `Filter.Risk(&risk)` called BEFORE every `Job.Send(&risk)`
- [ ] Verified with test: mock `job.Send()` and assert assets/risks are filtered

### CheckAffiliation

- [ ] CheckAffiliation implemented (not just method stub)
- [ ] Queries external API to verify asset ownership (not returning `true` unconditionally)
- [ ] Returns `(true, nil)` if affiliated
- [ ] Returns `(false, nil)` if not affiliated (e.g., asset deleted)
- [ ] Returns `(false, err)` on error (e.g., API unreachable)
- [ ] NOT using full re-enumeration (no `ListAllAssets()` in CheckAffiliation)
- [ ] Verified with test: mock API responses for affiliated/unaffiliated/error cases

### ValidateCredentials

- [ ] ValidateCredentials implemented (not just method stub)
- [ ] Makes lightweight API call (e.g., `GetCurrentUser()`, `ListProjects(limit=1)`)
- [ ] Returns error if credentials invalid
- [ ] Called in `Invoke()` BEFORE asset enumeration
- [ ] Verified with test: mock invalid credentials and assert early return

### Concurrency Safety (errgroup)

- [ ] All errgroup usage has `g.SetLimit(10)` or appropriate limit
- [ ] All loops with `g.Go()` capture loop variables: `item := item`
- [ ] All `g.Wait()` errors are checked and wrapped with context
- [ ] No goroutines returning `nil` on error (silent failures)
- [ ] Verified with race detection: `go test -race ./...`

### Error Handling

- [ ] No ignored errors (no `_, _ = json.Marshal()` or similar)
- [ ] All errors wrapped with context: `fmt.Errorf("action: %w", err)`
- [ ] HTTP errors include request context (URL sanitized, no credentials)
- [ ] Verified with grep: `rg "_, _.*=.*json\." --type go` returns no results

### Pagination Safety

- [ ] All pagination loops have `maxPages` constant (recommended: 1000)
- [ ] Loop breaks if `page >= maxPages` with warning log
- [ ] Empty page/response handled correctly (loop terminates)
- [ ] Verified with test: mock API returning >maxPages and assert loop terminates

---

## High Priority Requirements (P1)

### File Size Limits

- [ ] Main integration file under 400 lines
- [ ] If >400 lines: split into `_types.go`, `_client.go`, `_transform.go`
- [ ] Each split file under 400 lines
- [ ] Verified with: `wc -l integration-name*.go`

**Files requiring splitting (current violations)**:

- wiz.go (914 lines) - CRITICAL
- bitbucket.go (610 lines) - CRITICAL
- crowdstrike.go (569 lines) - CRITICAL
- tenable_vm.go (486 lines) - WARNING

### Frontend Integration

- [ ] Enum added to `modules/chariot/ui/src/types.ts`
- [ ] Enum name matches backend `Name()` method (lowercase)
- [ ] Logo added to `modules/chariot/ui/src/assets/integrations/icons/dark/`
- [ ] Logo added to `modules/chariot/ui/src/assets/integrations/icons/light/`
- [ ] Integration card added to `modules/chariot/ui/src/hooks/useIntegration.tsx`
- [ ] Verified: UI displays integration card in integration list

---

## Anti-Pattern Detection

Run these commands and verify **zero results**:

```bash
# Silent failures (goroutines returning nil on error)
rg "return nil.*log\.(Error|Warn)" integration-name.go

# Missing HTTP timeouts
rg "http\.Client\{\}" integration-name.go

# Ignored errors
rg "_, _.*=" integration-name.go

# Command injection (exec.Command with concatenation)
rg "exec\.Command.*\+" integration-name.go

# URL logging without sanitization
rg "log\..*\"url\"" integration-name.go
```

**If any pattern found**: Fix before PR submission.

---

## Testing Requirements

- [ ] Unit tests for `ValidateCredentials()` (success/failure)
- [ ] Unit tests for `CheckAffiliation()` (affiliated/unaffiliated/error)
- [ ] Unit tests for VMFilter application (mock `job.Send()`)
- [ ] Unit tests for pagination termination (mock API >maxPages)
- [ ] Unit tests for error propagation (no silent failures)
- [ ] All tests pass with race detection: `go test -race ./...`
- [ ] Test coverage >80%: `go test -cover ./...`

---

## Code Review Checklist

- [ ] Constants used for magic numbers (no hardcoded `500`, `100`, etc.)
- [ ] Rate limiting implemented for tight loops (use `golang.org/x/time/rate`)
- [ ] HTTP timeouts configured (minimum 30 seconds)
- [ ] URLs sanitized before logging (no credential leakage)
- [ ] All public methods have godoc comments
- [ ] Tabularium models used correctly (Asset/Risk/Attribute schema)

---

## Verification Commands

```bash
# Run tests with race detection
go test -race ./modules/chariot/backend/pkg/tasks/integrations/

# Check test coverage
go test -cover ./modules/chariot/backend/pkg/tasks/integrations/

# Verify file size
wc -l modules/chariot/backend/pkg/tasks/integrations/integration-name*.go

# Search for violations
rg "_, _.*=" modules/chariot/backend/pkg/tasks/integrations/integration-name.go
rg "return nil.*log\." modules/chariot/backend/pkg/tasks/integrations/integration-name.go
```

---

## Sign-Off

**Before clicking "Create Pull Request"**:

- [ ] All P0 items checked
- [ ] All P1 items checked
- [ ] All anti-pattern detections pass
- [ ] All tests pass with race detection
- [ ] Code review checklist complete

**Developer signature**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_ Date: \_\_\_\_\_\_\_\_

**Reviewer signature**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_ Date: \_\_\_\_\_\_\_\_
