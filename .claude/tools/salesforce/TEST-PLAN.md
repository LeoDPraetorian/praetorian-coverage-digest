# Salesforce MCP Wrapper Test Plan

**Purpose**: Comprehensive test plan for validating Salesforce MCP wrappers against common user queries and real-world scenarios.

**Status**: Ready for execution
**Last Updated**: 2026-01-16
**Coverage**: 9 wrappers, 7 user scenarios, 21 test cases

---

## PRODUCTION SAFEGUARDS

### CRITICAL: Read Before Running Any Tests

**This test plan is designed for SANDBOX/DEVELOPER orgs only. Tests are READ-ONLY or use validation-only modes.**

### Pre-Flight Safety Checklist

Run these checks BEFORE executing any tests:

```bash
# 1. Verify your default org is NOT production
sf config list

# 2. List all orgs and identify production
sf org list --all

# 3. Check the target org type (should NOT be "Production")
sf org display --target-org <your-test-org-alias>
```

### Environment Classification

| Org Type | Safe for Testing? | Notes |
|----------|-------------------|-------|
| Production | **NO** | Never run tests against production |
| Sandbox (Full/Partial) | **YES** | Recommended for integration tests |
| Developer Edition | **YES** | Good for isolated testing |
| Scratch Org | **YES** | Best for CI/CD (managed externally) |

### Blocked Operations

The following operations are **NOT included** in this test plan to prevent accidental data modification:

| Operation | Reason | Alternative |
|-----------|--------|-------------|
| `create-scratch-org` | Creates billable resources | Create scratch orgs manually before testing |
| `delete-org` | Irreversible destruction | Delete orgs manually after testing |
| DML operations (INSERT/UPDATE/DELETE) | Data mutation | Use SELECT-only SOQL queries |
| Destructive deployments | Data loss risk | Use `--dry-run` or `--check-only` flags |

### Wrapper-Specific Safeguards

| Wrapper | Risk Level | Safeguard |
|---------|------------|-----------|
| `run-soql-query` | LOW | SELECT-only queries, no DML |
| `deploy-metadata` | MEDIUM | Use `--dry-run` flag for validation |
| `retrieve-metadata` | LOW | Read-only, downloads to local |
| `list-all-orgs` | LOW | Read-only enumeration |
| `get-username` | LOW | Read-only |
| `org-open` | LOW | Opens browser, no data changes |
| `resume-tool-operation` | LOW | Status polling only |
| `create-scratch-org` | **HIGH** | **EXCLUDED from tests** |
| `delete-org` | **HIGH** | **EXCLUDED from tests** |

### Emergency Stop Procedure

If you accidentally target production:

1. **STOP** all running tests immediately (Ctrl+C)
2. **DO NOT** run any more commands
3. **VERIFY** current org: `sf org display`
4. **REVIEW** recent actions: `sf org list --all`
5. **CONTACT** your Salesforce admin if any changes were made

---

## Test Infrastructure

### Prerequisites

```bash
# 1. Authenticate with a SANDBOX or DEVELOPER org (NOT production)
sf org login web --alias test-org

# 2. VERIFY the org type before proceeding
sf org display --target-org test-org
# Look for: "Org Type" - should NOT be "Production"

# 3. Verify MCP server is running
npx -y @modelcontextprotocol/salesforce --version

# 4. Navigate to test workspace
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT/.claude/tools/salesforce"
```

### Test Execution Commands

```bash
# Unit tests (all wrappers) - uses mocked MCP, safe
npm run test:unit -- salesforce

# Integration tests (requires real Salesforce org)
# ONLY run against sandbox/developer orgs
npm run test:integration -- salesforce

# Coverage report
npm run test:coverage -- salesforce
```

---

## User Scenario Matrix

### Scenario 1: Developer Onboarding (New Team Member)

**User Goal**: Set up local Salesforce development environment

**Test Cases**:

| Test ID | Query | Expected Wrapper | Validation Criteria |
|---------|-------|------------------|---------------------|
| S1-T1 | "List all my Salesforce orgs" | `list-all-orgs` | Returns orgs with username, status, type |
| S1-T2 | "Get the username for my default org" | `get-username` | Returns valid username string |
| S1-T3 | "Open the Salesforce org in browser" | `org-open` | Returns org URL, opens browser |

**Success Criteria**: User can discover and access their Salesforce orgs within 2 minutes

**Safety**: All operations are read-only

---

### Scenario 2: Data Exploration (Admin/Business Analyst)

**User Goal**: Query Salesforce data for reporting or debugging

**Test Cases**:

| Test ID | Query | Expected Wrapper | Validation Criteria |
|---------|-------|------------------|---------------------|
| S2-T1 | "Run SOQL: SELECT Id, Name FROM Account LIMIT 10" | `run-soql-query` | Returns account records as JSON |
| S2-T2 | "Query all opportunities closed this month" | `run-soql-query` | Supports complex WHERE clauses |
| S2-T3 | "Export user list with roles" | `run-soql-query` | Handles joins (User + UserRole) |

**Success Criteria**: User can extract data without navigating Salesforce UI

**Safety**: SELECT-only queries, no DML operations

**Security Requirements**:
- Detects SOQL injection attempts (`'; DROP TABLE--`)
- Validates query syntax before execution
- Returns sanitized error messages (no internal details)

---

### Scenario 3: Metadata Deployment Validation (DevOps/Release Manager)

**User Goal**: Validate deployments without modifying the org

**Test Cases**:

| Test ID | Query | Expected Wrapper | Validation Criteria |
|---------|-------|------------------|---------------------|
| S3-T1 | "Validate deployment from force-app/ (dry-run)" | `deploy-metadata` | Returns validation result, no actual deploy |
| S3-T2 | "Check deployment status for ID 0Af..." | `resume-tool-operation` | Polls until complete/failed |
| S3-T3 | "Retrieve metadata for ApexClass:MyClass" | `retrieve-metadata` | Downloads .cls file to local |

**Success Criteria**: User can validate deployments before committing to changes

**Safety**: Use `--dry-run` or `--check-only` flags; retrieve is read-only

---

### Scenario 4: Continuous Integration (CI Pipeline)

**User Goal**: Automate testing in GitHub Actions or Jenkins

**Test Cases**:

| Test ID | Query | Expected Wrapper | Validation Criteria |
|---------|-------|------------------|---------------------|
| S4-T1 | "Validate deployment to sandbox (dry-run)" | `deploy-metadata` | Dry-run validation without actual deploy |
| S4-T2 | "Long-running deployment tracking" | `resume-tool-operation` | Handles 30+ min deployments with polling |
| S4-T3 | "Retrieve current org metadata for comparison" | `retrieve-metadata` | Downloads metadata for diff |

**Success Criteria**: CI pipeline can validate without making permanent changes

**Safety**: All operations use validation/read-only modes

**Note**: Scratch org creation/deletion should be handled by CI scripts outside of these wrappers

---

### Scenario 5: Error Recovery (Production Debugging)

**User Goal**: Diagnose and recover from deployment failures

**Test Cases**:

| Test ID | Query | Expected Wrapper | Validation Criteria |
|---------|-------|------------------|---------------------|
| S5-T1 | "Invalid SOQL syntax query" | `run-soql-query` | Returns `INVALID_QUERY` error code |
| S5-T2 | "Deploy validation to org without permissions" | `deploy-metadata` | Returns `PERMISSION_DENIED` error |
| S5-T3 | "Network timeout during operation" | Any wrapper | Returns `NETWORK_ERROR`, retryable=true |

**Success Criteria**: User gets actionable error messages, not stack traces

**Safety**: Error conditions don't modify data

---

### Scenario 6: Security Validation (Security Team)

**User Goal**: Verify wrappers block malicious inputs

**Test Cases**:

| Test ID | Attack Vector | Expected Wrapper | Validation Criteria |
|---------|---------------|------------------|---------------------|
| S6-T1 | SOQL injection: `'; DELETE FROM Account--` | `run-soql-query` | Returns `SOQL_INJECTION` error |
| S6-T2 | Command injection: `$(rm -rf /)` | `deploy-metadata` | Returns `COMMAND_INJECTION` error |
| S6-T3 | Path traversal: `../../etc/passwd` | `retrieve-metadata` | Returns `PATH_TRAVERSAL` error |
| S6-T4 | Excessive timeout: `{ timeoutMs: 999999999 }` | Any wrapper | Clamps to max allowed (300000ms) |

**Success Criteria**: All 12 security scenarios from `@claude/testing` pass

**Safety**: Malicious inputs are rejected before reaching Salesforce

---

### Scenario 7: Token Optimization (Cost Control)

**User Goal**: Minimize LLM token usage when querying Salesforce

**Test Cases**:

| Test ID | Query | Expected Wrapper | Validation Criteria |
|---------|-------|------------------|---------------------|
| S7-T1 | "List orgs with minimal response" | `list-all-orgs` | Returns summary (username, status) not full JSON |
| S7-T2 | "SOQL query with 1000 records" | `run-soql-query` | Paginates, returns top 100 + nextOffset |
| S7-T3 | "Deployment validation result with logs" | `deploy-metadata` | Filters logs, includes only failures |

**Success Criteria**: Token reduction ≥80% vs raw MCP responses

**Safety**: All operations are read-only or validation-only

**Measurement**:
```typescript
tokenEstimate: {
  withoutCustomTool: 15000,  // Raw MCP response
  withCustomTool: 2000,      // Filtered wrapper response
  reduction: "86.7%"
}
```

---

## Integration Test Strategy

### Test Environment Setup

**Required Resources**:
- Salesforce Sandbox or Developer Org (**NOT production**)
- Authenticated SF CLI session
- MCP server running locally
- Test metadata package (`test-fixtures/metadata/`)

**Setup Script**:
```bash
# 1. Login to sandbox/developer org (VERIFY it's not production)
sf org login web --alias test-org

# 2. SAFETY CHECK - verify org type
sf org display --target-org test-org
# STOP if "Org Type" shows "Production"

# 3. Deploy test fixtures (to sandbox only)
sf project deploy start --source-dir test-fixtures/metadata --target-org test-org --dry-run
# Remove --dry-run only if you've verified this is a sandbox

# 4. Run integration tests
npm run test:integration -- salesforce --org test-org
```

**Note**: Scratch org lifecycle (create/delete) should be managed by external CI scripts, not by these wrappers during testing.

---

## Coverage Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Unit Test Coverage | ≥80% | TBD | Pending |
| Integration Tests | 7/9 wrappers | 0/7 | Missing |
| Security Scenarios | 12/12 pass | TBD | Pending |
| Token Reduction | ≥80% | TBD | Pending |
| User Scenarios | 7/7 pass | 0/7 | Not Started |

**Note**: `create-scratch-org` and `delete-org` are excluded from integration tests (unit tests only with mocks).

---

## Test Execution Plan

### Phase 1: Unit Tests (1-2 hours)

**Goal**: Achieve ≥80% code coverage with mocked MCP calls

**Commands**:
```bash
npm run test:unit -- salesforce/run-soql-query
npm run test:unit -- salesforce/deploy-metadata
npm run test:unit -- salesforce/retrieve-metadata
npm run test:unit -- salesforce/list-all-orgs
npm run test:unit -- salesforce/get-username
npm run test:unit -- salesforce/org-open
npm run test:unit -- salesforce/resume-tool-operation
# create-scratch-org and delete-org: unit tests only (mocked)
npm run test:unit -- salesforce/create-scratch-org
npm run test:unit -- salesforce/delete-org
npm run test:coverage -- salesforce  # Generate coverage report
```

**Validation**:
- [ ] All tests pass
- [ ] Coverage ≥80% per wrapper
- [ ] Security scenarios included
- [ ] Response format handling tested

---

### Phase 2: Integration Tests (2-3 hours)

**Goal**: Validate against real Salesforce MCP server (sandbox only)

**Prerequisites**:
1. Salesforce SANDBOX org authenticated
2. Test metadata fixtures deployed
3. MCP server running
4. **VERIFIED** target org is NOT production

**Commands**:
```bash
# Safety check first
sf org display --target-org test-org | grep "Org Type"
# Must NOT show "Production"

# Run integration suite (excludes create/delete org)
npm run test:integration -- salesforce --org test-org --exclude create-scratch-org,delete-org

# Verify
npm run audit -- salesforce  # Should show 10/11 phases pass
```

**Validation**:
- [ ] Target org verified as sandbox/developer
- [ ] Real MCP calls succeed
- [ ] Error handling works with actual errors
- [ ] Token reduction verified
- [ ] Performance < 10ms wrapper overhead

---

### Phase 3: User Scenario Validation (1-2 hours)

**Goal**: Manually validate 7 user scenarios with real workflows

**Process**:
1. For each scenario (S1-S7):
   - Execute test cases in order
   - Verify expected outputs
   - Document any deviations
   - Note user experience issues
2. Record results in `TEST-RESULTS.md`

---

## Success Criteria

### Minimum Viable (MVP)

- All 9 wrappers have unit tests
- Unit test coverage ≥80%
- Security scenarios pass (12/12)
- Audit shows 0 critical failures
- No utility files in audit results

### Production Ready

- MVP criteria met
- Integration tests pass (7/9 wrappers, excluding create/delete org)
- Token reduction ≥80%
- User scenarios validated (7/7)
- Performance tests pass
- Schema discovery documented

---

## Known Issues & Limitations

### Current Warnings (Non-Blocking)

1. **Phase 1**: No schema discovery comments
   - Impact: Developers may not understand response formats
   - Workaround: Refer to Salesforce MCP documentation

2. **Phase 2**: Zero optional fields
   - Impact: May fail if Salesforce returns sparse data
   - Mitigation: Test with real API responses in integration tests

3. **Phase 7**: Missing integration tests
   - Impact: Bugs may slip to production
   - Plan: Add in Phase 2 of this test plan

### Excluded from Integration Tests

- `create-scratch-org` - Creates billable Salesforce resources
- `delete-org` - Irreversible org deletion

These wrappers have unit tests only (with mocked MCP calls).

### Edge Cases to Test

- [ ] Rate limiting (429 responses)
- [ ] Token expiration (401 mid-operation)
- [ ] Large deployments (>10 min)
- [ ] Concurrent operations
- [ ] Network interruptions

---

## Test Data Requirements

### Sample SOQL Queries (READ-ONLY)

```soql
-- Simple query
SELECT Id, Name FROM Account LIMIT 10

-- Complex query with joins
SELECT Id, Name, Owner.Name, Owner.Profile.Name
FROM Opportunity
WHERE StageName = 'Closed Won'
AND CloseDate = THIS_MONTH

-- Aggregate query
SELECT COUNT(Id), AVG(Amount)
FROM Opportunity
GROUP BY StageName
```

### Test Metadata Package

Located in `test-fixtures/metadata/`:
- `classes/TestApexClass.cls` - Simple Apex class
- `triggers/AccountTrigger.trigger` - Test trigger
- `objects/CustomObject__c/` - Custom object definition

---

## Reporting Template

### Test Results Format

```markdown
## Test Run: {Date}
**Tester**: {Name}
**Environment**: {Org Type} - MUST be Sandbox/Developer
**Duration**: {MM:SS}

### Pre-Flight Checklist
- [ ] Verified org is NOT production
- [ ] Ran `sf org display` to confirm org type
- [ ] Backed up any critical sandbox data

### Results Summary
- Passed: X/Y
- Failed: X/Y
- Skipped: X/Y

### Failures
1. **S2-T2** - SOQL query with complex WHERE clause
   - Error: `INVALID_QUERY: Unexpected token 'AND'`
   - Root Cause: Missing parentheses in query
   - Fix: Update query syntax
```

---

## Next Steps

1. **Execute Phase 1** (Unit Tests)
   - Run: `npm run test:unit -- salesforce`
   - Target: ≥80% coverage

2. **Fix Audit Script** **COMPLETED**
   - Exclude utility files (errors.ts, types.ts)
   - Result: 9 wrappers, 0 critical failures

3. **Execute Phase 2** (Integration Tests)
   - Authenticate to sandbox org
   - Run integration suite (excluding create/delete org)
   - Validate real API interactions

4. **Execute Phase 3** (User Scenarios)
   - Manual validation of 7 scenarios
   - Document findings
   - Iterate on UX improvements

---

## Resources

- **Salesforce MCP Docs**: [Link to MCP server documentation]
- **SF CLI Docs**: https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/
- **Test Library**: `.claude/lib/testing/README.md`
- **Audit Tool**: `.claude/skills/managing-tool-wrappers/`
