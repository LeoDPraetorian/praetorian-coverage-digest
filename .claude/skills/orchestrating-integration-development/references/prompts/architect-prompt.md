# Architecture Agent Prompt Template (Phase 3)

**Agent**: integration-lead
**Phase**: 3 (Architecture)
**Purpose**: Design integration implementation plan with P0 compliance checklist

## Prompt Template

```markdown
Task: Design integration architecture for {vendor}

You are in Phase 3 of integration development. Your goal is to create a comprehensive implementation plan that addresses all P0 requirements and provides clear guidance for the integration-developer agent in Phase 4.

## Input Files (READ ALL BEFORE DESIGNING)

1. **design.md** (Phase 1): Requirements, vendor info, auth method, integration type
2. **skill-summary.md** (Phase 2): Vendor-specific API patterns from `integrating-with-{vendor}` skill
3. **discovery.md** (Phase 2): Codebase patterns from existing integrations
4. **file-placement.md** (Phase 2): Target file locations

Read each file completely to understand context.

## Architecture Sections Required

Your architecture.md MUST include ALL of these sections:

### 1. Authentication Flow

Document complete authentication lifecycle:
- Credential retrieval from Job.Secret
- Client initialization pattern
- Token refresh (if OAuth2)
- ValidateCredentials() implementation (MUST be first in Invoke())

Include code example from discovery.md or skill-summary.md.

### 2. Pagination Strategy

Document pagination approach with termination guarantee:
- Pattern type (token | page | cursor)
- Parameters and field names
- maxPages constant definition (MANDATORY, default 1000)
- Natural termination condition
- Safety termination (maxPages reached)

Include complete implementation example.

### 3. CheckAffiliation Approach

Document how asset ownership is verified:
- Approach (API Query | Re-enumerate | CheckAffiliationSimple)
- IF API Query:
  - Endpoint URL and method
  - Query parameters
  - Response handling
  - deletedAt or equivalent field checking
- MUST NOT be stub implementation

Include complete implementation example.

### 4. Tabularium Mapping

Document entity transformations:
- Vendor entities to Chariot models (Asset, Risk)
- Field-by-field mapping table
- Data type conversions
- Handling optional/nil fields
- Example transformation code

### 5. errgroup Concurrency

Document concurrency strategy:
- SetLimit value (10, 25, 30, or 100 based on API)
- Rationale for chosen limit
- Loop variable capture pattern
- Error aggregation
- Example implementation

### 6. File Size Management

Plan file organization:
- Estimate total lines
- IF >400 lines: Split into multiple files
  - {vendor}.go: Main handler
  - {vendor}_types.go: API structs
  - {vendor}_client.go: HTTP client
  - {vendor}_transform.go: Transformations
- IF <400 lines: Single file acceptable

### 7. P0 Compliance Checklist (MANDATORY)

Pre-fill this checklist with planned implementation locations:

| Requirement | Implementation Location | Pattern Reference |
|-------------|------------------------|-------------------|
| VMFilter initialization | {vendor}.go:~{line} | {pattern from discovery} |
| VMFilter usage before Send | {vendor}.go:~{line} | {pattern from discovery} |
| CheckAffiliation (not stub) | {vendor}.go:~{line} | {pattern from discovery} |
| ValidateCredentials first | {vendor}.go:~{line} | {pattern from discovery} |
| errgroup SetLimit | {vendor}.go:~{line} | {pattern from discovery} |
| errgroup loop capture | {vendor}.go:~{line} | {pattern from discovery} |
| Pagination maxPages | {vendor}.go:~{line} | maxPages = 1000 |
| Error handling (no _, _) | All files | Verified in design |
| File size <400 lines | {vendor}.go: ~{estimate} | Split if >400 |

### 8. Frontend Requirements (MANDATORY)

Document whether UI configuration is needed:

## Frontend Requirements

### Needs UI: {YES | NO}

### Reason: {justification}

**Decision criteria:**
- API key from user → YES
- OAuth2 with user consent → YES
- Service account (backend-only) → NO
- Seed-based (no auth) → NO

### If YES:

#### Enum Name
`IntegrationType.{VENDOR_UPPER}`

#### Logo Requirements
- Dark mode: {vendor}-dark.svg (48x48px)
- Light mode: {vendor}-light.svg (48x48px)

#### Configuration Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| apiKey | password | Yes | Vendor API key |
| {other} | {type} | {Yes/No} | {description} |

### If NO:
- Configuration method: {where/how}
- Access pattern: {service account | seed-based}

## Implementation Guidance

Use patterns from discovery.md as references. Cite specific files and line ranges when referencing patterns.

Use skill-summary.md for vendor-specific details (API endpoints, auth headers, rate limits).

Ensure P0 Checklist is pre-filled with specific line estimates - this guides the developer and enables P0 validation in Phase 4.5.

## MANDATORY SKILLS (invoke ALL before completing)

- using-skills: Skill discovery workflow
- discovering-reusable-code: Find patterns in codebase
- enforcing-evidence-based-analysis: Verify source file claims
- gateway-integrations: Integration patterns and P0 requirements
- gateway-backend: Go backend patterns
- writing-plans: Implementation plan structure
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: architecture.md (with ALL 8 sections above)

COMPLIANCE: Document invoked skills in output metadata JSON block at end of architecture.md.

## Success Criteria

Architecture is complete when:
- [ ] All 8 sections present and detailed
- [ ] P0 Checklist pre-filled with line estimates
- [ ] Frontend Requirements section has YES/NO decision
- [ ] Code examples included from discovery patterns
- [ ] File organization planned with line estimates
- [ ] All claims about patterns cite source files
```
