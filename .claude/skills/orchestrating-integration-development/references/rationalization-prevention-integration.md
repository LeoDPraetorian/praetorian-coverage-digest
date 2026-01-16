# Rationalization Prevention for Integration Development

**Agents rationalize skipping steps. Watch for warning phrases and use evidence-based gates.**

## General Principles

**Reference**: See [shared rationalization prevention](.claude/skill-library/claude/using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

## Integration Development Rationalizations

| Rationalization                                     | Why It Fails                                                             | Counter                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| "CheckAffiliation can be a stub for now"            | 98% of stubs never get fixed; breaks affiliation capability              | Implement real API query or use CheckAffiliationSimple |
| "I'll add ValidateCredentials later"                | Fail-fast pattern prevents wasted compute; never added later             | Add before any enumeration code                         |
| "VMFilter isn't needed for this integration"        | Unless SCM integration, VMFilter prevents duplicate ingestion            | Verify integration type; add if any IP/host assets      |
| "Error handling is overkill for json.Marshal"       | JSON marshaling can fail; silent corruption causes downstream bugs       | Always check error, wrap with context                   |
| "No time for maxPages, API will return empty"       | APIs have bugs; infinite loops crash workers                             | Add defensive maxPages constant (1000)                  |
| "File is only 450 lines, close enough to 400"       | Maintainability degrades; split files are easier to review               | Split now; technical debt compounds                     |
| "Tests can come later"                              | Tests never come later; coverage targets become blocking                 | Write tests in Phase 6, not 'later'                     |
| "The skill check is unnecessary, I know the API"    | Skills capture rate limits, auth quirks, pagination; memory is unreliable | Always check/create integrating-with-{vendor} skill    |
| "P0 validation is redundant, I followed the patterns" | 98% CheckAffiliation violation rate proves patterns aren't followed      | Run validating-integrations every time                  |

## Key Principle

If you detect rationalization phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.

## Override Protocol

If a P0 requirement genuinely doesn't apply:

1. Use AskUserQuestion to confirm with user
2. Document the exception in p0-compliance-review.md
3. Include rationale (e.g., "SCM integration, no IP assets")
4. User must explicitly approve the exception

Never self-approve exceptions to P0 requirements.

## Detection Patterns

Watch for these phrases in agent thinking or responses:

- "close enough" → Precision matters, exact compliance required
- "just this once" → Exceptions become patterns
- "I'll fix it later" → 95% never fixed
- "it's obvious" → Document it anyway
- "this is different" → Patterns exist for a reason
- "users won't notice" → They will, eventually
- "we can refactor later" → Later never comes

## Evidence-Based Gates

Use these gates to prevent rationalization:

1. **Phase 4.5 P0 Validation** - Automated check, no human judgment
2. **Phase 5 Review** - Max 3 retries, then human escalation
3. **Phase 6 Testing** - ≥80% coverage or block
4. **Phase 8 Exit Criteria** - All checkboxes verified

Gates remove subjectivity and enforce standards.
