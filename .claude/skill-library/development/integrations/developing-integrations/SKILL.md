---
name: developing-integrations
description: Use when creating or updating Chariot backend integrations (Go) - enforces mandatory requirements (VMFilter, CheckAffiliation, ValidateCredentials), prevents security bugs (race conditions, infinite loops), provides pre-PR checklist and detailed implementation patterns in references/
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Developing Chariot Backend Integrations

**Complete development workflow for creating secure, compliant, and maintainable Chariot backend integrations with external APIs.**

## When to Use

Use this skill when:

- Creating a new Chariot integration in `modules/chariot/backend/pkg/tasks/integrations/`
- Reviewing an existing integration for compliance violations
- User asks "How do I create a Chariot integration?"
- Implementing integrations for: Wiz, CrowdStrike, Qualys, Tenable, GitHub, Okta, AWS, Azure, GCP, etc.

**NOT for generic Go API clients.** This skill is specific to Chariot's integration task interface.

## Quick Reference

| Requirement          | Status | Description                                    |
| -------------------- | ------ | ---------------------------------------------- |
| BaseCapability       | P0     | REQUIRED embedding in struct                   |
| init() registration  | P0     | REQUIRED for capability discovery              |
| Integration() method | P0     | REQUIRED - must return true                    |
| Match() method       | P0     | REQUIRED for class validation                  |
| VMFilter             | P0     | REQUIRED for all Asset/Risk emissions          |
| CheckAffiliation     | P0     | REQUIRED - use Pattern A/B/C                   |
| ValidateCredentials  | P0     | REQUIRED - verify before processing            |
| errgroup Safety      | P0     | SetLimit + loop variable capture               |
| Error Handling       | P0     | Never ignore errors                            |
| Pagination Safety    | P0     | Termination guarantee (maxPages OR API signal) |
| File Size Limit      | P1     | <400 lines (split at 500+)                     |
| Frontend Integration | P1     | UI card + enum + logos                         |

**For detailed patterns and code examples**, see the references in this skill.

---

## Integration Skeleton

**Every integration MUST include these 6 critical patterns for runtime discovery and execution:**

```go
package integrations

import (
	"context"
	"fmt"

	"github.com/praetorian-inc/chariot/pkg/base"
	"github.com/praetorian-inc/chariot/pkg/filter"
	"github.com/praetorian-inc/chariot/pkg/model"
	"github.com/praetorian-inc/chariot/pkg/registries"
)

// 1. REQUIRED: Struct with BaseCapability embedding
type VendorName struct {
	Job    model.Job
	Asset  model.Integration  // NOTE: model.Integration, NOT model.Asset
	Filter model.Filter
	base.BaseCapability        // REQUIRED - provides GetClient(), AWS, Collectors
}

// 2. REQUIRED: init() registration
func init() {
	registries.RegisterChariotCapability(&VendorName{}, NewVendorName)
}

// 3. REQUIRED: Constructor with NewBaseCapability
func NewVendorName(job model.Job, asset *model.Integration, opts ...base.Option) model.Capability {
	opts = append(opts, base.WithStatic())  // For static IP compliance
	baseCapability := base.NewBaseCapability(job, opts...)
	return &VendorName{
		Job:            job,
		Asset:          *asset,  // NOTE: Dereference pointer
		Filter:         filter.NewVMFilter(baseCapability.AWS, baseCapability.Collectors),
		BaseCapability: baseCapability,
	}
}

// 4. REQUIRED: Integration() returns true
func (t *VendorName) Integration() bool { return true }

// 5. REQUIRED: Match() validates class
func (t *VendorName) Match() error {
	if !t.Asset.IsClass("vendorname") {
		return fmt.Errorf("expected class 'vendorname', got '%s'", t.Asset.Class)
	}
	return nil
}

// 6. REQUIRED: Type distinction - *model.Integration in constructor, model.Integration in struct
```

**Without these patterns, integrations compile but fail at runtime with:**

- Registration errors (missing init)
- Class validation failures (missing Match)
- Type errors (model.Asset vs model.Integration)
- Missing capabilities (no BaseCapability)

**See [Integration Skeleton](references/integration-skeleton.md) for complete working template with all required methods.**

---

## Development Workflow

### Step 1: Mandatory Requirements Checklist

Before writing any code, review the [Mandatory Requirements](references/mandatory-requirements.md) reference:

1. **VMFilter** - Asset/Risk filtering by username
2. **CheckAffiliation** - Use approved pattern (A/B/C) for ownership verification
3. **ValidateCredentials** - Credential verification before processing
4. **errgroup Safety** - Concurrency limits and variable capture
5. **Error Handling** - No ignored errors
6. **Pagination Safety** - Infinite loop prevention

**Cannot proceed without understanding these requirements** ✅

### Step 2: Integration Structure

**Standard integration file structure:**

```
modules/chariot/backend/pkg/tasks/integrations/
├── vendor-name.go              # Main integration (<400 lines)
├── vendor-name_types.go        # API response types (if needed)
├── vendor-name_client.go       # HTTP client wrapper (if needed)
├── vendor-name_transform.go    # Tabularium mapping (if needed)
└── vendor-name_test.go         # Unit tests
```

**When to split files**: If main file exceeds 400 lines, extract types/client/transform.

### Step 3: Implementation Checklist

Use [Pre-PR Checklist](references/pre-pr-checklist.md) to verify compliance:

- [ ] VMFilter initialized in struct: `Filter: filter.NewVMFilter(job.Username)`
- [ ] Filter called before emission: `task.Filter.Asset(&asset)` → `task.Job.Send(&asset)`
- [ ] CheckAffiliation uses approved pattern (A/B/C) - not stub returning true
- [ ] ValidateCredentials implemented and called in `Invoke()`
- [ ] All errgroup usage has `g.SetLimit(10)` and `item := item` before `g.Go()`
- [ ] No ignored errors (no `_, _ = json.Marshal()`)
- [ ] Pagination has `maxPages` constant with break condition
- [ ] File under 400 lines (split if larger)
- [ ] Frontend card added to `modules/chariot/ui/src/hooks/useIntegration.tsx`
- [ ] Enum name in `modules/chariot/ui/src/types.ts` matches backend `Name()` (lowercase)
- [ ] Logos added to both `icons/dark/` AND `icons/light/` directories
- [ ] **`linkOnValidateFailure` is NOT set (validation bypass disabled)**
- [ ] `validate: true` is set and invalid credentials are rejected
- [ ] Tests added with `-race` flag enabled

### Step 4: Anti-Pattern Detection

Review [Anti-Patterns](references/anti-patterns.md) before implementation:

1. **Silent batch failures** - Goroutines returning `nil` instead of propagating errors
2. **Missing HTTP timeouts** - Use `Timeout: 30*time.Second` minimum
3. **No rate limiting** - Use `golang.org/x/time/rate` for tight loops
4. **Hardcoded magic numbers** - Use named constants
5. **Error URL leakage** - Sanitize URLs before logging
6. **Command injection** - Never pass user input to `exec.Command` (AWS/Azure/GCP CLIs)

### Step 5: Detailed Implementation Patterns

This skill now includes comprehensive validated code examples in `references/`:

#### Core Patterns (NEW - Validated from Production)

- **[CheckAffiliation Patterns](references/checkaffiliation-patterns.md)** - Wiz real implementation (only working example), stub patterns
- **[Pagination Patterns](references/pagination-patterns.md)** - 4 patterns with code: token-based, page-based, cursor-based, SDK-based
- **[errgroup Patterns](references/errgroup-patterns.md)** - Concurrent processing, shared state, loop capture, continue-on-error
- **[Tabularium Mapping](references/tabularium-mapping.md)** - Model decision tree: Asset, Cloud Resource, Webpage, Risk
- **[ValidateCredentials Patterns](references/validatecredentials-patterns.md)** - 6 auth patterns: API calls, OAuth2, JWT, HMAC
- **[Test Patterns](references/test-patterns.md)** - Table-driven tests, mock servers, mock collectors, race detection

#### Additional Resources

All integration patterns are documented in the references/ directory of this skill.

### Step 6: Frontend Integration

**UI card requirements** (P1):

1. **Add enum** to `modules/chariot/ui/src/types.ts`:

```typescript
export enum IntegrationName {
  // ... existing
  SHODAN = "shodan", // MUST match backend Name() method (lowercase)
}
```

2. **Add logos** to BOTH directories:

```
modules/chariot/ui/src/assets/integrations/icons/dark/shodan.svg
modules/chariot/ui/src/assets/integrations/icons/light/shodan.svg
```

3. **Update hook** in `modules/chariot/ui/src/hooks/useIntegration.tsx` - Add integration to routing logic

### Step 7: Testing

**Minimum test coverage:**

- [ ] ValidateCredentials success/failure cases
- [ ] CheckAffiliation affiliated/unaffiliated/error cases
- [ ] VMFilter application (mock `job.Send()` and verify filtered)
- [ ] Pagination loop termination (mock API with >maxPages responses)
- [ ] Error propagation (no silent failures)

**Run with race detection:**

```bash
go test -race ./modules/chariot/backend/pkg/tasks/integrations/...
```

---

## Common Violations

Integration code reviews frequently identify 6 categories of violations. Before submitting your integration, review these patterns to ensure compliance.

**See [Violation Examples](references/violation-examples.md) for detailed code examples and corrections:**

1. **Missing VMFilter** - Emitting assets without filtering (DigitalOcean, GitHub, GitLab, Cloudflare)
2. **Stub CheckAffiliation** - Returning `true` without using Pattern A/B/C
3. **Missing errgroup Limits** - Unlimited goroutines without `SetLimit(10)` (wiz.go, github.go, tenable-vm.go)
4. **Ignored Errors** - Using `_, _` with error-returning functions (wiz, okta, xpanse, tenable_vm)
5. **Infinite Pagination** - No `maxPages` safety limit (MS Defender, EntraID, CrowdStrike, Xpanse, InsightVM, GitLab)

---

## Related Skills

| Skill                                 | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| (See references/ directory)           | Detailed code examples and implementation patterns |
| **go-errgroup-concurrency**           | Deep dive on errgroup safety and concurrency       |
| **error-handling-patterns**           | Go error wrapping and propagation best practices   |
| **reviewing-backend-implementations** | Code review criteria for backend Go code           |

---

## Integration

### Called By

- `/integration` command - Entry point for integration development workflow via `gateway-integrations`
- `orchestrating-integration-development` (LIBRARY) - 8-phase orchestration for complete integration lifecycle - `Read(".claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md")`
- `gateway-integrations` (CORE) - Routes integration-related tasks to appropriate library skills - `skill: "gateway-integrations"`

### Requires (invoke before starting)

None - This is an implementation guidance skill, not an orchestrator

### Calls (during execution)

This skill is documentation-based and does not invoke other skills. It provides reference patterns that developers follow when implementing integrations.

### Pairs With (conditional)

| Skill                                             | Trigger                                      | Purpose                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validating-integrations` (LIBRARY)               | After implementation                         | Validates P0 compliance before PR submission - `Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")`                        |
| `testing-integrations` (LIBRARY)                  | When writing tests                           | Unit/integration test patterns for integrations - `Read(".claude/skill-library/testing/testing-integrations/SKILL.md")`                                         |
| `go-best-practices` (LIBRARY)                     | When implementing Go code                    | Go coding patterns and conventions - `Read(".claude/skill-library/development/backend/go-best-practices/SKILL.md")`                                             |
| `orchestrating-integration-development` (LIBRARY) | When orchestrating full integration workflow | Provides 8-phase workflow using this skill's guidance - `Read(".claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md")` |

---

## References

All detailed content has been extracted to `references/` for progressive disclosure:

### Requirements & Compliance

- [Mandatory Requirements](references/mandatory-requirements.md) - P0 blocking requirements (6 critical patterns + VMFilter, CheckAffiliation, etc.)
- [Integration Skeleton](references/integration-skeleton.md) - Complete working template with all required methods
- [Pre-PR Checklist](references/pre-pr-checklist.md) - Complete checklist before submitting PR
- [Anti-Patterns](references/anti-patterns.md) - Common mistakes and how to avoid them
- [Violation Examples](references/violation-examples.md) - Real violations with corrected patterns

### Implementation Patterns (Validated from Production)

- [CheckAffiliation Patterns](references/checkaffiliation-patterns.md) - Real implementations with file:line references
- [Pagination Patterns](references/pagination-patterns.md) - Token, page, cursor, SDK patterns from Okta, GitHub, Xpanse, DigitalOcean
- [errgroup Patterns](references/errgroup-patterns.md) - Standard, shared state, loop capture, continue-on-error patterns
- [Tabularium Mapping](references/tabularium-mapping.md) - Model selection: Asset, Cloud Resource, Webpage, Risk with examples
- [ValidateCredentials Patterns](references/validatecredentials-patterns.md) - API call, OAuth2, JWT, HMAC auth patterns
- [Test Patterns](references/test-patterns.md) - Table-driven, mock server, mock collector, race detection patterns

### Utilities & Helpers

- [pkg/lib Utilities](references/lib-utilities.md) - web.Request, format.Target, cvss.CVSStoStatus, filter.NewVMFilter
- [Timeout Guidelines](references/timeout-guidelines.md) - Timeout values by integration type (30s/60s/120s/180s)

### Frontend & Testing

- [Frontend Integration](references/frontend-integration.md) - Dynamic form system (2026 architecture with definitions/)
- [Testing Strategy](references/testing-strategy.md) - Test coverage requirements and race detection

---

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
