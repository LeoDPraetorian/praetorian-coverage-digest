---
name: integration-step-validator
description: Use when implementing or reviewing Chariot integrations to validate workflow steps are completed correctly - checks frontend Integration card format and enum registration, backend stub structure with credential validation and Name() function, test coverage with unit and integration tests, Invoke implementation with error handling and tabularium mapping, VMFilter integration, CheckAffiliation implementation - prevents incomplete integrations from reaching production
allowed-tools: "Read, Bash, WebFetch"
---

# Integration Step Validator

## Overview

Chariot integrations require multiple coordinated steps across frontend, backend, and testing layers. This skill provides a systematic validation checklist to ensure all required components are implemented correctly before deployment.

**Core principle:** Incomplete integrations cause production failures. Validate each step systematically to catch missing implementations early.

**Quick Start:** Use `scripts/generate-integration.sh <name>` to scaffold new integrations from templates, then customize using patterns from `references/integration-templates.md`.

## When to Use

Trigger validation when:

- **Implementing new integration** - Before marking as complete
- **Reviewing integration PR** - Checklist-driven code review
- **Debugging integration issues** - Missing step often the root cause
- **Onboarding to integration patterns** - Learn required components
- **Before deployment** - Final validation gate

## Integration Workflow Steps

Chariot integrations follow a 7-step workflow. Each step has specific validation criteria.

### Step 1: Frontend Integration Card

**Purpose:** UI component for integration configuration

**Required Elements:**

- [ ] Integration card component in `ui/src/sections/settings/integrations/`
- [ ] Follows standardized card structure (header, description, form, actions)
- [ ] Enum constant defined in `ui/src/types/integrations.ts`
- [ ] Enum registered in integration type mapping
- [ ] Icon component imported and used
- [ ] Form validation for all input fields
- [ ] Loading states for async operations
- [ ] Error handling with user-friendly messages
- [ ] Success/failure toast notifications

**Validation:**

```bash
# Check enum registration
grep -r "YOUR_INTEGRATION" ui/src/types/integrations.ts

# Check card component exists
ls ui/src/sections/settings/integrations/YourIntegrationCard.tsx

# Check import in index
grep "YourIntegrationCard" ui/src/sections/settings/integrations/index.tsx
```

**Common Mistakes:**

- ❌ Enum defined but not exported
- ❌ Card component exists but not imported in index
- ❌ Missing form validation (allows invalid data)
- ❌ No loading state (poor UX during API calls)
- ❌ Generic error messages (doesn't help user debug)

### Step 2: Backend Stub Structure

**Purpose:** Capability implementation scaffold

**Required Elements:**

- [ ] Struct definition implementing Capability interface
- [ ] `Name()` function returning capability name
- [ ] `Description()` function with clear explanation
- [ ] `Target()` function specifying entity type
- [ ] Constructor function with dependency injection
- [ ] Credential struct with validation tags
- [ ] Config struct for capability parameters
- [ ] Enum constant in backend capability registry

**Validation:**

```bash
# Check struct implements Capability interface
grep -A 10 "type YourIntegration struct" backend/pkg/capabilities/

# Check Name() function exists
grep -A 3 "func.*Name.*string" backend/pkg/capabilities/your_integration.go

# Check constructor exists
grep -A 5 "func NewYourIntegration" backend/pkg/capabilities/your_integration.go
```

**Common Mistakes:**

- ❌ Name() returns empty string
- ❌ Constructor doesn't validate required dependencies
- ❌ Credential struct missing validation tags
- ❌ No error handling in constructor
- ❌ Struct doesn't implement all interface methods

### Step 3: Credential Validation

**Purpose:** Secure authentication handling

**Required Elements:**

- [ ] Credential struct with proper field types
- [ ] Validation tags on all required fields (`validate:"required"`)
- [ ] Credential broker integration for secure storage
- [ ] No hardcoded credentials in code
- [ ] Environment variable fallback documented
- [ ] Credential rotation support
- [ ] Validation function with descriptive errors
- [ ] Test mode credentials separate from production

**Validation:**

```bash
# Check credential struct has validation
grep -A 10 "type.*Credential struct" backend/pkg/capabilities/your_integration.go | grep validate

# Check no hardcoded secrets
grep -r "password.*=.*\"" backend/pkg/capabilities/your_integration.go

# Check credential broker usage
grep "credentialBroker" backend/pkg/capabilities/your_integration.go
```

**Common Mistakes:**

- ❌ Credentials hardcoded in source
- ❌ No validation on credential fields
- ❌ Credentials logged in error messages
- ❌ Same credentials for test and production
- ❌ No credential expiration handling

### Step 4: Test Coverage

**Purpose:** Reliability through comprehensive testing

**Required Elements:**

**Unit Tests:**

- [ ] Test file with `_test.go` suffix
- [ ] Constructor tests (valid/invalid inputs)
- [ ] Name() function test
- [ ] Credential validation tests
- [ ] Mock dependencies for isolated testing
- [ ] Table-driven tests for multiple scenarios
- [ ] Error path testing

**Integration Tests:**

- [ ] Real API call tests (with test credentials)
- [ ] Error handling tests (network failures, auth failures)
- [ ] Pagination testing (if applicable)
- [ ] Rate limit handling tests
- [ ] Timeout handling tests
- [ ] Idempotency tests (if mutations)

**Validation:**

```bash
# Check unit tests exist
ls backend/pkg/capabilities/your_integration_test.go

# Check test coverage
go test -cover ./backend/pkg/capabilities/your_integration.go

# Check table-driven tests
grep -A 5 "tests := \\[\\]struct" backend/pkg/capabilities/your_integration_test.go
```

**Common Mistakes:**

- ❌ Only happy path tested
- ❌ No error handling tests
- ❌ Tests use production credentials
- ❌ Tests don't clean up resources
- ❌ Flaky tests due to external dependencies
- ❌ No timeout tests (hangs in CI)

### Step 5: Invoke Implementation

**Purpose:** Core capability execution logic

**Required Elements:**

- [ ] `Invoke()` method signature matches interface
- [ ] Context propagation for cancellation
- [ ] Input validation before API calls
- [ ] Comprehensive error handling with wrapped errors
- [ ] Tabularium entity mapping (Asset/Attribute/Risk creation)
- [ ] Logging for observability (structured logging)
- [ ] Metrics emission for monitoring
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker for cascading failures
- [ ] Graceful degradation on partial failures

**Validation:**

```bash
# Check Invoke signature
grep -A 2 "func.*Invoke.*context.Context" backend/pkg/capabilities/your_integration.go

# Check error wrapping
grep "fmt.Errorf.*%w" backend/pkg/capabilities/your_integration.go

# Check tabularium usage
grep -E "(Asset|Attribute|Risk)" backend/pkg/capabilities/your_integration.go

# Check logging
grep "log\\.Info\\|log\\.Error" backend/pkg/capabilities/your_integration.go
```

**Common Mistakes:**

- ❌ Invoke() doesn't respect context cancellation
- ❌ Errors returned without context (hard to debug)
- ❌ No logging (black box in production)
- ❌ No retry on transient failures
- ❌ Tabularium entities malformed
- ❌ Panic instead of returning error

### Step 6: VMFilter Integration

**Purpose:** Virtual machine asset enrichment

**Required Elements (if integration discovers VMs):**

- [ ] VMFilter interface implementation
- [ ] `FilterVM()` method for VM identification
- [ ] VM metadata extraction (OS, version, cloud provider)
- [ ] VM relationship mapping (VPC, subnet, security groups)
- [ ] VM tagging with integration source
- [ ] Deduplication logic for same VM from multiple sources

**Validation:**

```bash
# Check VMFilter implementation
grep -A 5 "FilterVM" backend/pkg/capabilities/your_integration.go

# Check VM metadata extraction
grep -E "(OperatingSystem|CloudProvider|InstanceType)" backend/pkg/capabilities/your_integration.go
```

**Common Mistakes:**

- ❌ VM filtering too broad (false positives)
- ❌ Missing critical VM metadata
- ❌ No deduplication (duplicate VMs)
- ❌ VM relationships not mapped

### Step 7: CheckAffiliation Implementation

**Purpose:** Entity ownership and account association

**Required Elements:**

- [ ] `CheckAffiliation()` method implementation
- [ ] Account ID validation
- [ ] Entity ownership verification
- [ ] Multi-tenant isolation enforcement
- [ ] Authorization check before data access
- [ ] Logging of affiliation checks for audit
- [ ] Error handling for unauthorized access

**Validation:**

```bash
# Check CheckAffiliation exists
grep -A 10 "CheckAffiliation" backend/pkg/capabilities/your_integration.go

# Check account validation
grep "accountID" backend/pkg/capabilities/your_integration.go

# Check authorization
grep -E "(Unauthorized|Forbidden)" backend/pkg/capabilities/your_integration.go
```

**Common Mistakes:**

- ❌ No affiliation check (security vulnerability)
- ❌ Affiliation check bypassable
- ❌ No logging of unauthorized attempts
- ❌ Generic error message leaks info

## Validation Checklist (Complete Workflow)

Use this checklist for every integration implementation:

### Frontend (Step 1)

- [ ] Integration card component created
- [ ] Enum defined and registered
- [ ] Form validation implemented
- [ ] Loading/error states handled
- [ ] Toast notifications configured
- [ ] Icon imported and displayed

### Backend (Steps 2-7)

- [ ] Struct implements Capability interface
- [ ] Name() function returns correct string
- [ ] Constructor validates dependencies
- [ ] Credentials validated (no hardcoding)
- [ ] Unit tests cover all methods
- [ ] Integration tests cover API calls
- [ ] Invoke() implements core logic
- [ ] Error handling comprehensive
- [ ] Tabularium mapping correct
- [ ] Logging for observability
- [ ] VMFilter implemented (if VMs discovered)
- [ ] CheckAffiliation enforces multi-tenancy

### Documentation

- [ ] README documents integration purpose
- [ ] Configuration examples provided
- [ ] Credential setup instructions clear
- [ ] API rate limits documented
- [ ] Known limitations listed

### Deployment

- [ ] CloudFormation template updated
- [ ] Environment variables documented
- [ ] Credential rotation tested
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

## Automated Validation

Use the validation script to check implementation completeness:

```bash
./scripts/validate-integration.sh <integration-name>
```

**Script checks:**

1. Frontend enum registration
2. Backend struct existence
3. Name() function presence
4. Test file existence
5. Invoke() method signature
6. Error handling patterns
7. Tabularium usage
8. Logging statements

## Common Integration Pitfalls

### 1. Missing Frontend Enum Registration

**Symptom:** Integration card doesn't appear in UI

**Cause:** Enum defined but not added to type mapping

**Fix:**

```typescript
// ui/src/types/integrations.ts
export enum IntegrationType {
  // ...
  YOUR_INTEGRATION = "your-integration", // ✅ Add here
}

// ui/src/types/integrations.ts (mapping)
export const INTEGRATION_TYPE_MAP = {
  [IntegrationType.YOUR_INTEGRATION]: "Your Integration", // ✅ Add here
};
```

### 2. Missing Credential Validation

**Symptom:** Integration fails silently with invalid credentials

**Cause:** No validation in constructor or Invoke()

**Fix:**

```go
func NewYourIntegration(creds Credential) (*YourIntegration, error) {
  if creds.APIKey == "" {
    return nil, fmt.Errorf("API key required")
  }
  if creds.SecretKey == "" {
    return nil, fmt.Errorf("secret key required")
  }
  // ✅ Validate before returning
  return &YourIntegration{creds: creds}, nil
}
```

### 3. No Tabularium Mapping

**Symptom:** Integration runs but no assets appear in UI

**Cause:** Invoke() doesn't create Asset/Attribute/Risk entities

**Fix:**

```go
func (c *YourIntegration) Invoke(ctx context.Context) error {
  data, err := c.fetchData(ctx)
  if err != nil {
    return fmt.Errorf("fetch failed: %w", err)
  }

  // ✅ Map to tabularium entities
  for _, item := range data {
    asset := &tabularium.Asset{
      Key:    fmt.Sprintf("#asset#%s#%s", item.DNS, item.Name),
      DNS:    item.DNS,
      Name:   item.Name,
      Status: "A",
      Source: c.Name(),
    }
    if err := c.db.CreateAsset(ctx, asset); err != nil {
      return fmt.Errorf("create asset: %w", err)
    }
  }
  return nil
}
```

### 4. Missing Error Context

**Symptom:** Errors logged but impossible to debug

**Cause:** Errors returned without wrapping or context

**Fix:**

```go
// ❌ BAD: No context
if err != nil {
  return err
}

// ✅ GOOD: Wrapped with context
if err != nil {
  return fmt.Errorf("failed to fetch users: %w", err)
}
```

### 5. No Test Coverage

**Symptom:** Integration breaks in production

**Cause:** Only manual testing, no automated tests

**Fix:**

```go
// backend/pkg/capabilities/your_integration_test.go
func TestYourIntegration_Invoke(t *testing.T) {
  tests := []struct {
    name    string
    creds   Credential
    wantErr bool
  }{
    {
      name:    "valid credentials",
      creds:   Credential{APIKey: "valid", SecretKey: "valid"},
      wantErr: false,
    },
    {
      name:    "invalid credentials",
      creds:   Credential{APIKey: "", SecretKey: ""},
      wantErr: true,
    },
  }

  for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
      c, err := NewYourIntegration(tt.creds)
      if (err != nil) != tt.wantErr {
        t.Errorf("unexpected error: %v", err)
      }
    })
  }
}
```

## Integration Review Checklist

When reviewing integration PRs, verify:

**Code Quality:**

- [ ] No hardcoded credentials
- [ ] Errors wrapped with context
- [ ] Logging comprehensive
- [ ] Comments explain non-obvious logic
- [ ] Variable names descriptive

**Security:**

- [ ] Credentials from broker
- [ ] CheckAffiliation enforced
- [ ] No sensitive data in logs
- [ ] Input validation comprehensive
- [ ] SQL injection prevention (if DB queries)

**Performance:**

- [ ] Rate limit handling implemented
- [ ] Pagination used for large datasets
- [ ] Connection pooling configured
- [ ] Timeouts configured
- [ ] Circuit breaker for external calls

**Testing:**

- [ ] Unit tests pass locally
- [ ] Integration tests pass with test credentials
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] No flaky tests

**Documentation:**

- [ ] README updated
- [ ] Configuration examples provided
- [ ] Known issues documented
- [ ] Rate limits noted

## Quick Reference

**Before merging integration PR:**
→ Run `./scripts/validate-integration.sh <name>`
→ Verify all 7 steps completed
→ Run test suite: `go test ./backend/pkg/capabilities/...`
→ Check frontend builds: `cd ui && npm run build`
→ Review checklist above

**Minimum viable integration:**

1. Frontend card with enum
2. Backend stub with Name()
3. Credential validation
4. Unit tests
5. Invoke() with tabularium mapping
6. Error handling
7. CheckAffiliation (if multi-tenant)

**Time estimate:**

- Frontend card: 2-4 hours
- Backend stub: 1-2 hours
- Tests: 2-4 hours
- Invoke logic: 4-8 hours
- VMFilter (if needed): 2-4 hours
- CheckAffiliation: 1-2 hours
- **Total:** 12-24 hours for complete integration

The systematic validation prevents incomplete integrations and catches issues before production deployment.

## Additional Resources

### Starter Templates & Generator

- **`references/integration-templates.md`** - Complete working examples with TypeScript/React frontend card, Go backend capability struct, unit tests, and integration tests - includes proper error handling, credential validation, and tabularium mapping
- **`scripts/generate-integration.sh <name>`** - Scaffold generator that creates directory structure and starter files from templates for new integrations

**Usage:**

```bash
# Generate integration scaffold
./scripts/generate-integration.sh github

# Outputs:
# - backend/pkg/capabilities/github.go
# - backend/pkg/capabilities/github_test.go
# - ui/src/sections/settings/integrations/GithubCard.tsx
```

### Testing & Performance

- **`references/testing-guide.md`** - Patterns for mocking external APIs, credential testing, error simulation, and CI pipeline setup
- **`references/performance-checklist.md`** - Rate limit testing, timeout handling, memory profiling, and concurrent execution validation

### Time Savings

**Without enhancements:**

- Manual setup: 2-4 hours
- Copy-paste errors common
- Missing test patterns

**With enhancements:**

- Generator scaffold: 2 minutes
- Template customization: 30-45 minutes
- **Total savings: 70-85% reduction**
