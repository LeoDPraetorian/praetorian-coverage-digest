# Tool Lead Decision Chain Examples

Detailed examples of the decision chain-of-thought pattern for MCP wrapper architecture design.

**Parent document**: [tool-lead-prompt.md](tool-lead-prompt.md)

---

## Example 1: Token Optimization Strategy Decision

**Step 1: State the decision point**

"Decision: How should we optimize the MCP response from 2347 tokens to <470 tokens (80% reduction)?"

**Step 2: List constraints from requirements**

- Must reduce tokens by ≥80%
- Must preserve essential functionality (id, title, state, assignee)
- Must not break downstream consumers expecting specific fields
- Should be maintainable (clear filtering rules)

**Step 3: Enumerate options**

**Option A**: Field-based filtering (explicit allowlist)
**Option B**: Pattern-based filtering (remove arrays/objects)
**Option C**: Hybrid (allowlist + pattern rules)

**Step 4: Analyze each option against constraints**

**Option A - Field-based filtering**:

- 80% reduction: ✓ Full control over output size
- Preserve essential: ✓ Explicit allowlist ensures fields kept
- No breaking changes: ✓ Clear contract
- Maintainable: ✓ Easy to understand rules
- Additional: Requires updating if schema changes

**Option B - Pattern-based filtering**:

- 80% reduction: ⚠️ Unpredictable - depends on response structure
- Preserve essential: ⚠️ Might remove needed nested fields
- No breaking changes: ✗ May change with schema updates
- Maintainable: ✗ Rules harder to predict
- Additional: More flexible for schema changes

**Option C - Hybrid**:

- 80% reduction: ✓ Combines benefits
- Preserve essential: ✓ Allowlist ensures core fields
- No breaking changes: ✓ Explicit contract
- Maintainable: ⚠️ More complex rules
- Additional: Most flexible but adds complexity

**Step 5: Recommend with explicit reasoning**

"Recommendation: Option A (Field-based filtering)

Reasoning:

1. Provides deterministic token counts for verification
2. Explicit contract makes breaking changes obvious
3. Simpler implementation and testing
4. Discovery doc already identifies exact fields needed

Trade-offs accepted: Requires schema updates if new essential fields added

What would change this: If schema is highly volatile or we need to support multiple versions, hybrid approach becomes better."

---

## Example 2: Error Handling Pattern Selection

**Step 1: State the decision point**

"Decision: How should the wrapper handle errors (validation failures, MCP timeouts, connection errors)?"

**Step 2: List constraints from requirements**

- Must distinguish between user errors (invalid input) and system errors (MCP timeout)
- Must be type-safe
- Must not expose sensitive information
- Should integrate with existing Claude Code error patterns

**Step 3: Enumerate options**

**Option A**: Result<T, E> pattern (functional)
**Option B**: Throw exceptions (traditional)
**Option C**: Error callbacks (callback pattern)

**Step 4: Analyze each option against constraints**

**Option A - Result<T, E>**:

- Distinguish errors: ✓ Type system encodes error types
- Type-safe: ✓ Compiler enforces error handling
- No sensitive data: ✓ Explicit error mapping
- Integration: ✓ Matches implementing-result-either-pattern skill
- Additional: Requires Result type import

**Option B - Throw exceptions**:

- Distinguish errors: ⚠️ Can use error types but not enforced
- Type-safe: ✗ Exceptions not tracked by type system
- No sensitive data: ⚠️ Easy to accidentally expose stack traces
- Integration: ✗ Different from Claude Code patterns
- Additional: Simpler syntax but less safe

**Option C - Error callbacks**:

- Distinguish errors: ✓ Can separate error types
- Type-safe: ⚠️ Partial - depends on callback types
- No sensitive data: ✓ Explicit handling
- Integration: ✗ Not used in Claude Code
- Additional: Adds complexity

**Step 5: Recommend with explicit reasoning**

"Recommendation: Option A (Result<T, E> pattern)

Reasoning:

1. Type system forces error handling at call sites
2. Matches implementing-result-either-pattern skill
3. Explicit error mapping prevents sensitive data leaks
4. Clear distinction between Ok and Err cases

Trade-offs accepted: More verbose than exceptions, requires importing Result type

What would change this: If integrating with exception-based code, might use exceptions. But for new code, Result is better."

---

## Example 3: Response Filtering Approach

**Step 1: State the decision point**

"Decision: Should we filter the response immediately after MCP call, or use a separate filtering function?"

**Step 2: List constraints from requirements**

- Token reduction must be verifiable in tests
- Filtering logic must be reusable if multiple tools return similar data
- Must be easy to adjust filtering rules
- Should minimize performance overhead

**Step 3: Enumerate options**

**Option A**: Inline filtering (filter in wrapper function)
**Option B**: Separate filter function (filterResponse(data))
**Option C**: Use response-utils.ts helper

**Step 4: Analyze each option against constraints**

**Option A - Inline filtering**:

- Verifiable: ✓ Test wrapper directly
- Reusable: ✗ Logic duplicated across wrappers
- Adjustable: ⚠️ Need to update each wrapper
- Performance: ✓ No function call overhead
- Additional: Simple for unique filtering logic

**Option B - Separate filter function**:

- Verifiable: ✓ Test filter independently
- Reusable: ✓ Share across wrappers
- Adjustable: ✓ Update in one place
- Performance: ✓ Minimal overhead
- Additional: Better for complex filtering

**Option C - response-utils.ts helper**:

- Verifiable: ✓ Utility already tested
- Reusable: ✓ Used across all wrappers
- Adjustable: ✓ Central location
- Performance: ✓ Optimized utility
- Additional: May not fit all use cases

**Step 5: Recommend with explicit reasoning**

"Recommendation: Option A for this specific wrapper (inline filtering)

Reasoning:

1. Filtering is specific to this tool's schema
2. Simple field extraction doesn't need abstraction
3. Easier to understand for future maintainers
4. Option C (response-utils) can be used if pattern emerges

Trade-offs accepted: If we implement 3+ similar wrappers, refactor to Option B

What would change this: If filtering logic is complex (>20 lines) or shared, use Option B or C immediately."

---

## Example 4: Clarification Question Format

When the agent has questions, it should return this structured format:

```json
{
  "status": "needs_clarification",
  "level": "decisions",
  "verified_so_far": [
    "Schema discovery shows 2347 token response",
    "Target 80% reduction (450 tokens)",
    "Essential fields: id, title, state, assignee"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Should the wrapper support pagination for multi-record responses, or is this a single-record tool?",
      "options": [
        "Single record only",
        "Multiple records with pagination",
        "Unknown - need to check MCP schema"
      ],
      "default_assumption": "Single record based on tool name 'get_issue' (singular)",
      "impact": "Affects response schema design and filtering strategy"
    },
    {
      "category": "assumption",
      "question": "Discovery doc shows 'history' array is 1500 tokens. Should this be completely filtered or summarized?",
      "options": [
        "Filter completely (exclude from response)",
        "Summarize (include count only)",
        "Include recent N items"
      ],
      "default_assumption": "Filter completely to maximize token reduction",
      "impact": "Affects usefulness vs token count trade-off"
    }
  ]
}
```

---

## Self-Consistency Verification

After making all decisions, verify from an alternative perspective:

### Pass 1: Fresh Read

"Reading architecture as if I'm implementing it:

- Are token targets clear? {yes/no + why}
- Are filtering rules unambiguous? {yes/no + why}
- Can I implement error handling from this doc? {yes/no + why}
- Are Zod schemas specified in detail? {yes/no + why}"

### Pass 2: Adversarial Perspective

"Reading architecture as if I'm trying to find problems:

- What happens if MCP returns unexpected fields? {decision}
- What happens if MCP response is 10x larger? {decision}
- What if user provides malicious input? {handled by security layers}
- What if network is slow/unreliable? {retry strategy or explicit no-retry}"

### Consistency Check

"Comparing Pass 1 and Pass 2 findings:

- Inconsistencies found: {list or 'none'}
- Gaps identified: {list or 'none'}
- Architecture updates needed: {list or 'none'}"
