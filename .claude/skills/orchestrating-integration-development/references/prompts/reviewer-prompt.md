# Reviewer Agent Prompt Template (Phase 5)

**Agent**: backend-reviewer
**Phase**: 5 (Review - Both Stages)
**Purpose**: Validate implementation quality against specification and standards

## Stage 1: Spec Compliance Review

**Focus**: Does implementation match architecture.md?

### Prompt Template

```markdown
Task: Spec Compliance Review for {vendor} integration

You are in Phase 5 Stage 1 of integration development. Your goal is to verify the implementation matches the architecture specification.

## Input Files (READ ALL)

1. **architecture.md** (Phase 3): The specification to review against
2. **Implementation files**: {list from Phase 4}
3. **implementation-log.md** (Phase 4): Developer's notes and decisions
4. **p0-compliance-review.md** (Phase 4.5): P0 verification results

## Review Questions

For each section in architecture.md, verify implementation matches:

### 1. File Structure
- Question: Are all planned files created per file-placement.md?
- Check: architecture.md File Organization section vs. actual files

### 2. Required Methods
- Question: Are Match(), Invoke(), CheckAffiliation(), ValidateCredentials() present?
- Check: Each method exists and has correct signature

### 3. Authentication Flow
- Question: Does auth match architecture.md Authentication Flow section?
- Check:
  - Credential retrieval from Job.Secret
  - Client initialization
  - Token refresh (if applicable)
  - ValidateCredentials() implementation

### 4. Pagination Strategy
- Question: Does pagination match architecture.md Pagination Strategy section?
- Check:
  - Pattern type (token | page | cursor)
  - maxPages constant or API-provided limit
  - Break condition
  - Loop structure

### 5. CheckAffiliation Approach
- Question: Does CheckAffiliation match architecture.md CheckAffiliation Approach?
- Check:
  - API Query: Endpoint, parameters, response handling
  - Re-enumerate: Uses CheckAffiliationSimple correctly
  - NOT stub implementation

### 6. Tabularium Mapping
- Question: Do transformations match architecture.md Tabularium Mapping section?
- Check:
  - Field mappings (vendor → Chariot)
  - Data type conversions
  - Optional field handling
  - Example: architecture says map cloudId → asset.CloudId, verify present

### 7. errgroup Concurrency
- Question: Does errgroup usage match architecture.md Concurrency Strategy?
- Check:
  - SetLimit value matches planned value
  - Loop variables captured
  - Error handling

### 8. P0 Checklist
- Question: Are all P0 requirements satisfied per P0 Compliance Checklist?
- Check: Cross-reference with p0-compliance-review.md (should all pass)

## Review Approach

1. Read architecture.md section-by-section
2. For each section, find corresponding implementation code
3. Compare specification to implementation
4. Document matches and mismatches
5. For mismatches, determine if:
   - Implementation is wrong (spec violation)
   - Architecture is unclear (ambiguity)
   - Implementation is improvement (document and approve)

## MANDATORY SKILLS (invoke ALL before completing)

- using-skills: Skill discovery workflow
- adhering-to-dry: Code quality patterns
- enforcing-evidence-based-analysis: Verify claims about code
- gateway-backend: Go backend patterns
- persisting-agent-outputs: Output file format
- verifying-before-completion: Exit criteria verification

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: spec-compliance-review.md

COMPLIANCE: Document invoked skills in output metadata.

## Output Format: spec-compliance-review.md

```markdown
# Spec Compliance Review: {vendor}

## Verdict: {SPEC_COMPLIANT | SPEC_VIOLATIONS}

## Compliance Checklist

| Aspect | Status | Evidence |
|--------|--------|----------|
| File structure | {✅|❌} | {files created vs. planned} |
| Required methods | {✅|❌} | {methods present} |
| Auth flow | {✅|❌} | {comparison} |
| Pagination | {✅|❌} | {comparison} |
| Data mapping | {✅|❌} | {comparison} |
| Concurrency | {✅|❌} | {comparison} |
| P0 requirements | {✅|❌} | {reference to p0-compliance-review.md} |

## Violations (if any)

### Violation 1: {Description}
**Architecture says**: {quote from architecture.md}
**Implementation has**: {what was actually implemented}
**Location**: {file}:{method/line reference}
**Required fix**: {specific instruction}

{Repeat for each violation}

## Recommendation

{IF SPEC_COMPLIANT}:
Implementation correctly follows architecture specification. Proceed to Stage 2 (Quality + Security Review).

{IF SPEC_VIOLATIONS}:
Implementation deviates from specification. Return to integration-developer to fix violations listed above.

{Include JSON metadata block at end}
```

## Success Criteria

Review is complete when:
- [ ] All architecture.md sections checked against implementation
- [ ] All mismatches documented
- [ ] Clear verdict (COMPLIANT or VIOLATIONS)
- [ ] Specific fixes provided for violations
- [ ] Evidence cited for all findings
```

## Stage 2: Quality Review

**Focus**: Code quality, style, maintainability

### Prompt Template

```markdown
Task: Code Quality Review for {vendor} integration

You are in Phase 5 Stage 2 of integration development. Your goal is to assess code quality, style, and maintainability.

## Input Files

1. **Implementation files**: {list}
2. **architecture.md**: Reference for context
3. **spec-compliance-review.md**: Stage 1 results (should be SPEC_COMPLIANT)

## Quality Review Checklist

### Error Handling Quality
- [ ] All errors checked (no `_, _ =`)
- [ ] Errors wrapped with context using `%w`
- [ ] Error messages are clear and actionable
- [ ] Error context includes relevant details (page number, item ID, etc.)

### Code Style
- [ ] Follows gofmt formatting
- [ ] Naming conventions followed (Go idioms)
- [ ] Exported functions documented
- [ ] Complex logic has comments

### Logging
- [ ] Appropriate debug logging for troubleshooting
- [ ] No sensitive data logged (API keys, tokens, PII)
- [ ] Log levels appropriate (Info, Warn, Error, Debug)

### Code Organization
- [ ] Functions have single responsibility
- [ ] No duplicate code (DRY principle)
- [ ] Helper functions extracted when appropriate
- [ ] File organization logical

### Edge Case Handling
- [ ] Nil checks for optional fields
- [ ] Empty response handling
- [ ] Boundary conditions checked
- [ ] Invalid data handling

### Performance Considerations
- [ ] No obvious performance issues
- [ ] Appropriate use of concurrency
- [ ] No unnecessary allocations in hot paths

## MANDATORY SKILLS

- adhering-to-dry: Code quality patterns
- gateway-backend: Go backend patterns
- persisting-agent-outputs: Output file format

OUTPUT_DIRECTORY: {provided by orchestrator}

OUTPUT FILE: code-quality-review.md

## Output Format

```markdown
# Code Quality Review: {vendor}

## Verdict: {APPROVED | NEEDS_WORK}

## Findings by Category

### Error Handling
- {✅|⚠️|❌} {finding}

### Code Style
- {✅|⚠️|❌} {finding}

### Logging
- {✅|⚠️|❌} {finding}

### Edge Cases
- {✅|⚠️|❌} {finding}

## Required Fixes
{None if APPROVED}
{List with locations if NEEDS_WORK}

## Recommendations (optional improvements)
1. {optional suggestion}
2. {optional suggestion}
```

## Success Criteria

Review is complete when:
- [ ] All quality dimensions assessed
- [ ] Clear verdict (APPROVED or NEEDS_WORK)
- [ ] Required fixes specified (if NEEDS_WORK)
- [ ] Optional recommendations provided
```
