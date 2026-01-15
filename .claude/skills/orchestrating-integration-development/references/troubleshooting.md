# Troubleshooting Integration Development

**Purpose**: Common issues, symptoms, and solutions during integration development workflow.

## Overview

This guide provides troubleshooting for issues that arise during the 8-phase integration development workflow. Issues are organized by phase and symptom for quick lookup.

## General Troubleshooting Protocol

When encountering any issue:

1. **Identify the phase** where the issue occurred
2. **Capture the symptom** (error message, unexpected behavior)
3. **Check this guide** for the symptom
4. **Apply the solution** from the matching entry
5. **Document the resolution** in implementation-log.md or metadata.json
6. **Continue the workflow** from recovery point

## Phase 0: Setup Issues

### Issue: Output Directory Already Exists

**Symptom**: `mkdir: cannot create directory: File exists`

**Cause**: Previous workflow run with same timestamp or leftover directory

**Solution**:
```bash
# Check existing directory status
cat .claude/.output/integrations/{timestamp}-{vendor}/metadata.json

# If previous run was incomplete, you can:
# Option A: Continue the existing workflow
# Option B: Archive and create new

# Option B: Archive old and start fresh
mv .claude/.output/integrations/{timestamp}-{vendor} \
   .claude/.output/integrations/archive-{timestamp}-{vendor}
mkdir -p .claude/.output/integrations/$(date +%Y%m%d-%H%M%S)-{vendor}
```

### Issue: Timestamp Collision

**Symptom**: Multiple rapid workflow starts create same timestamp

**Solution**: Add milliseconds or wait between runs
```bash
# With milliseconds
TIMESTAMP=$(date +%Y%m%d-%H%M%S-%3N)

# Or wait 1 second
sleep 1 && TIMESTAMP=$(date +%Y%m%d-%H%M%S)
```

## Phase 1: Brainstorming Issues

### Issue: Unclear Integration Type

**Symptom**: Can't decide between asset_discovery, vuln_sync, or bidirectional_sync

**Solution**: Ask clarifying questions:
- What data does the vendor provide? (assets only, vulns only, both)
- What direction does data flow? (vendor → Chariot, Chariot → vendor, both)
- Primary use case? (discover new assets, sync vulnerabilities, full bidirectional)

**Decision matrix**:
| Vendor Data | Flow Direction | Type |
|-------------|----------------|------|
| Assets only | Vendor → Chariot | asset_discovery |
| Vulns only | Vendor → Chariot | vuln_sync |
| Both | Vendor → Chariot | bidirectional_sync |

### Issue: Unknown API Capabilities

**Symptom**: Can't answer pagination, rate limiting, or auth questions

**Solution**:
1. Check vendor's official API docs (usually at api.vendor.com/docs)
2. Search for "{vendor} API rate limit" on web
3. Check if SDK exists (npm, Go package) - docs usually better
4. Note unknowns in design.md "Open Questions" section
5. Phase 2 discovery will search codebase for patterns

## Phase 2: Skill Check + Discovery Issues

### Issue: Skill Creation Timeout

**Symptom**: skill-manager takes >10 minutes to create skill

**Solution**:
1. Check if skill was partially created:
   ```bash
   ls -la .claude/skill-library/development/integrations/integrating-with-{vendor}/
   ```
2. If partial: Complete manually or delete and retry
3. If failed completely: Proceed without skill, document in discovery.md
4. Alternative: Create skill in separate session, then resume workflow

### Issue: No Similar Integrations Found

**Symptom**: Discovery returns minimal patterns

**Solution**:
- Expand search to ALL integrations (not just similar vendors)
- Use CrowdStrike and Wiz as gold standard references
- Focus on P0 compliance patterns over vendor-specific patterns
- Document that this is a "first of its kind" integration

### Issue: Conflicting Pattern Recommendations

**Symptom**: Discovery finds different approaches for same pattern

**Example**: Some integrations use token pagination, others use page numbers

**Solution**:
1. Document all variants in discovery.md
2. Note which is most recent (prefer newer over older)
3. Check git blame for pattern age:
   ```bash
   git log -p --follow modules/chariot/backend/pkg/tasks/integrations/{integration}/
   ```
4. Flag for architecture decision in Phase 3
5. Default to most common pattern if uncertain

## Phase 3: Architecture Issues

### Issue: Missing API Documentation

**Symptom**: Architect can't determine pagination or rate limit patterns

**Solution**:
- Document uncertainty in architecture.md
- Use conservative defaults:
  - maxPages = 1000 (safe fallback)
  - SetLimit = 10 (safe concurrency)
  - Rate limit: Assume strict limits, add backoff
- Note for verification during testing (Phase 6)
- Plan to adjust after real API testing

### Issue: No CheckAffiliation Endpoint

**Symptom**: API doesn't support individual asset lookup for affiliation

**Solution**:
1. Document in architecture.md: Use CheckAffiliationSimple
2. Note performance impact (full re-enumeration per check)
3. Consider caching strategy for high-volume integrations
4. Example: Okta, Azure AD use CheckAffiliationSimple successfully

### Issue: Complex Data Mapping

**Symptom**: Vendor data structure doesn't map cleanly to Chariot models

**Solution**:
1. Document detailed transformation logic in architecture.md
2. Plan separate transform file if >100 lines
3. Note edge cases explicitly for testing
4. Example complex mappings:
   - Nested cloud provider metadata
   - Multi-valued fields
   - Enum translations

## Phase 4: Implementation Issues

### Issue: Import Cycle

**Symptom**: `import cycle not allowed`

**Solution**:
```bash
# Identify the cycle
go list -f '{{.ImportPath}} -> {{join .Imports ", "}}' ./...

# Common causes:
# 1. Types file imports handler, handler imports types
#    Fix: Move shared types to separate package or inline

# 2. Circular package dependencies
#    Fix: Use interfaces to break cycle
```

### Issue: Missing Dependencies

**Symptom**: `cannot find package`

**Solution**:
```bash
cd modules/chariot/backend
go mod tidy
go get {missing-package}
```

### Issue: VMFilter Not Available

**Symptom**: `undefined: filter.NewVMFilter`

**Solution**:
1. Check import: `"github.com/praetorian-inc/chariot/backend/pkg/filter"`
2. Verify filter package exists:
   ```bash
   ls modules/chariot/backend/pkg/filter/
   ```
3. If missing, check git submodule status:
   ```bash
   git submodule status
   ```

### Issue: Compile Error After Agent Completion

**Symptom**: Agent reports success but `go build` fails

**Solution**:
1. Capture exact error:
   ```bash
   cd modules/chariot/backend
   go build ./pkg/tasks/integrations/{vendor}/... 2>&1 | tee /tmp/build-error.txt
   ```
2. Read error carefully
3. Common causes:
   - Missing import
   - Type mismatch
   - Undefined variable
   - Syntax error
4. Fix in place (if simple) or respawn agent with error context

## Phase 4.5: P0 Compliance Issues

### Issue: CheckAffiliation is Stub

**Symptom**: P0 validation detects `return true, nil` without API call

**Solution**:
1. Read vendor API docs for asset lookup endpoint
2. Implement real API query (use Wiz pattern as reference: wiz.go:717-783)
3. If no endpoint exists, document and use CheckAffiliationSimple
4. Re-run P0 validation after fix

### Issue: Error Handling Violations

**Symptom**: P0 validation finds `_, _ =` patterns

**Solution**:
Find and fix all ignored errors:
```bash
# Find violations
grep -n "_, _.*=" modules/chariot/backend/pkg/tasks/integrations/{vendor}/*.go

# Common culprits:
# json.Marshal - CAN fail (cyclic refs, invalid types)
# json.Unmarshal - CAN fail (malformed JSON)
# io.Copy - CAN fail (network issues)

# Fix pattern:
# ❌ Before: payload, _ := json.Marshal(req)
# ✅ After:
payload, err := json.Marshal(req)
if err != nil {
    return fmt.Errorf("marshaling request: %w", err)
}
```

### Issue: File Size Over 400 Lines

**Symptom**: Handler file is 450+ lines, exceeds limit

**Solution**: Split into multiple files
```bash
# Analysis: identify sections
wc -l {vendor}.go
# Find natural split points (types, client, transforms)

# Create split files:
# 1. {vendor}_types.go - API response structs (~150 lines)
# 2. {vendor}_client.go - HTTP client (~150 lines)
# 3. {vendor}_transform.go - Data transforms (~100 lines)
# 4. {vendor}.go - Main handler (<350 lines)

# Move code to appropriate files
# Update imports
# Rebuild and test
```

## Phase 5: Review Issues

### Issue: Reviewer Misunderstands Architecture

**Symptom**: False positive violations reported

**Solution**:
1. Review the architecture.md section cited
2. Check if implementation actually matches or if reviewer misread
3. If implementation is correct:
   - Provide specific architecture.md quotes in response
   - Include implementation-log.md explaining developer intent
4. If truly ambiguous:
   - Clarify in architecture.md
   - Re-run review

### Issue: Security Finding Requires Architecture Change

**Symptom**: Security issue can't be fixed without design change

**Example**: OAuth2 token storage requires database, but design assumed Job.Secret

**Solution**:
1. Document finding in security-review.md
2. Escalate to human checkpoint
3. Options:
   - Accept risk with documented mitigation
   - Return to Phase 3 (Architecture) to revise design
   - Find alternative approach (e.g., encrypt tokens in Job.Secret)

### Issue: Max Retries Exhausted

**Symptom**: After 3 attempts, issues still remain

**Solution**:
1. Analyze the pattern of fixes attempted:
   - Same issue reappearing? Root cause not addressed
   - New issues each time? Fixes introducing bugs
2. Present to human checkpoint with options:
   - Manual intervention
   - Architecture revision
   - Continue with documented issues

## Phase 6: Testing Issues

### Issue: Mock Server Complexity

**Symptom**: Vendor API is complex, hard to mock all behaviors

**Solution**:
- Start with happy path mocks
- Add error scenarios incrementally
- Use table-driven tests for response variations
- Consider mocking at client level instead of HTTP level:
  ```go
  type vendorClient interface {
      ListAssets(ctx, token) (*Response, error)
  }

  type mockClient struct {
      listResponse *Response
      listError    error
  }
  ```

### Issue: Coverage Below 80%

**Symptom**: Tests pass but coverage is 75%

**Solution**:
```bash
# Find uncovered lines
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
# Open coverage.html in browser

# Common uncovered areas:
# - Error paths (add error scenario tests)
# - Edge cases (nil checks, empty responses)
# - Conditional branches (add tests for both paths)
```

### Issue: Flaky Tests

**Symptom**: Tests pass sometimes, fail randomly

**Common Causes & Solutions**:
1. **Time-dependent assertions**
   ```go
   // ❌ Flaky
   assert.True(t, time.Now().After(startTime))

   // ✅ Stable
   assert.WithinDuration(t, expected, actual, 1*time.Second)
   ```

2. **Race conditions in concurrent code**
   ```bash
   # Detect races
   go test -race ./...

   # Common fix: proper synchronization
   ```

3. **External dependencies**
   ```go
   // ❌ Flaky (real API)
   resp, _ := http.Get("https://api.vendor.com/...")

   // ✅ Stable (mock)
   server := httptest.NewServer(...)
   ```

### Issue: Test Timeout

**Symptom**: Tests run forever, eventually timeout

**Solution**:
```go
// Add context timeout to tests
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// Use ctx in all API calls
resp, err := client.ListAssets(ctx, token)
```

## Phase 7: Frontend Issues

### Issue: Enum Already Exists

**Symptom**: Vendor enum conflicts with existing integration

**Solution**:
```typescript
// Check existing enums
grep -n "= '{vendor}'" modules/chariot/ui/src/types.ts

// If conflict (rare):
// Use vendor-variation: VENDOR_V2, VENDOR_NEW, etc.
export enum IntegrationType {
    SHODAN = 'shodan',
    SHODAN_V2 = 'shodan_v2',  // New version
}
```

### Issue: Logo SVG Format Issues

**Symptom**: SVG doesn't render or has wrong size

**Solution**:
```xml
<!-- Ensure SVG has proper viewBox and dimensions -->
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 48 48"
     width="48"
     height="48">
  <!-- content -->
</svg>

<!-- Test rendering:
1. Open SVG in browser
2. Check at 48x48px
3. Verify both light and dark variants
-->
```

## Phase 8: Completion Issues

### Issue: Build Fails on Final Check

**Symptom**: `go build ./...` fails after previous phases passed

**Solution**:
```bash
# Check for uncommitted changes
git status

# Check for merge conflicts
git diff

# Re-sync dependencies
cd modules/chariot/backend
go mod tidy

# Rebuild
go build ./...
```

### Issue: Lint Failures

**Symptom**: `golangci-lint run` reports issues at the end

**Common Issues & Fixes**:
```go
// 1. Unused variables
// ❌ var foo string
// ✅ Remove or use: _ = foo

// 2. Error shadowing
// ❌ err := x(); if err != nil { err := y(); return err }
// ✅ Use different variable names

// 3. Cyclomatic complexity
// ❌ Function with 15+ if statements
// ✅ Extract subfunctions
```

## Cross-Phase Issues

### Issue: Agent Blocked

**Symptom**: Agent returns `status: "blocked"` with blocked_reason

**Solution**: Route based on blocked_reason (see [Agent Handoffs](agent-handoffs.md))

| blocked_reason | Route To |
|----------------|----------|
| security_concern | backend-security agent |
| architecture_decision | integration-lead agent |
| test_failures | backend-tester agent |
| missing_requirements | AskUserQuestion (user provides info) |

### Issue: Context Pollution

**Symptom**: Agent makes assumptions from earlier failed attempts

**Solution**: Always spawn FRESH agent (see [Context Management](context-management.md))
```markdown
# ❌ WRONG: Resume with same agent
# ✅ CORRECT: Spawn new agent with explicit context

Task({
  subagent_type: "integration-developer",
  description: "Implement {task} (fresh attempt)",
  prompt: `
    Previous attempt failed with: {error}

    Start fresh. Do not assume prior work.
    Implement {task} from scratch following architecture.md.

    INPUT FILES: ...
  `
})
```

### Issue: Lost Progress After Error

**Symptom**: Workflow crashes, unclear where to resume

**Solution**:
1. Read metadata.json to see last completed phase
2. Read MANIFEST.yaml to see what files were created
3. Verify files compile and tests pass for completed phases
4. Resume from next pending phase

```bash
# Check workflow state
cat .claude/.output/integrations/{timestamp}-{vendor}/metadata.json | jq '.phases'

# Verify implementation state
cd modules/chariot/backend
go build ./pkg/tasks/integrations/{vendor}/...
go test ./pkg/tasks/integrations/{vendor}/...

# Resume workflow from first pending phase
```

## Recovery Procedures

For detailed recovery procedures when phases fail partway through, see [Error Recovery](error-recovery.md).

## Getting Additional Help

If issue is not covered here:

1. **Check phase-specific references**:
   - phase-{N}-*.md files have detailed guidance
   - agent-handoffs.md for agent coordination issues
   - context-management.md for agent context issues

2. **Check library skills**:
   - `developing-integrations` - P0 requirements details
   - `validating-integrations` - P0 verification procedures
   - `testing-integrations` - Mock patterns

3. **Search existing integrations**:
   ```bash
   # Find how others solved similar issue
   grep -r "{pattern}" modules/chariot/backend/pkg/tasks/integrations/
   ```

4. **Ask user for clarification**:
   - Use AskUserQuestion when blocked
   - Present specific question with options
   - Don't guess if unclear

## Related References

- [Error Recovery](error-recovery.md) - Systematic recovery procedures
- [Agent Handoffs](agent-handoffs.md) - Agent coordination
- [Context Management](context-management.md) - Fresh agent spawning
- [Phase-specific files](.) - Detailed phase guidance
