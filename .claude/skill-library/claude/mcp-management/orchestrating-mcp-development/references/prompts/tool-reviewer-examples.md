# Tool Reviewer Examples

**Parent document**: [tool-reviewer-prompt.md](tool-reviewer-prompt.md)

This document contains detailed examples of the 5-step spec compliance verification chain.

## Spec Compliance Verification (Chain-of-Thought)

For EACH requirement in architecture.md, follow this reasoning chain:

### 5-Step Verification Chain

#### Step 1: State the requirement exactly

"Requirement R{N}: {Exact text from architecture.md}"

Example: "Requirement R1: Response must be filtered to ≤450 tokens (81% reduction from 2347 tokens)"

#### Step 2: Locate claimed implementation

"Developer implemented: {Where in code + what they did}"

Example: "Developer implemented: Lines 45-52 in get-issue.ts, filtering to {id, title, state, assignee}"

#### Step 3: Verify independently (DO NOT TRUST CLAIM)

"Reading implementation independently:

- Code at lines {X-Y}: {what it actually does}
- Observed behavior: {what I see}
- Test evidence: {what tests show}"

Example: "Reading lines 45-52:

```typescript
const filtered = {
  id: response.id,
  title: response.title,
  state: response.state?.name,
  assignee: response.assignee?.name,
};
```

Observed: Extracts 4 fields from response, drops history/metadata/etc.
Test evidence: Line 87 in test file verifies token count < 450"

#### Step 4: Compare against requirement

"Requirement: {restate requirement}
Implementation: {what code does}
Verdict: COMPLIANT | NOT_COMPLIANT | PARTIAL

Reasoning: {why compliant or not}"

Example: "Requirement: ≤450 tokens (81% reduction)
Implementation: Filters to 4 scalar fields
Verdict: COMPLIANT

Reasoning: Test at line 87 verifies token count is 412 tokens, which is <450. Reduction is (2347-412)/2347 = 82%, meeting 81% target."

#### Step 5: Document evidence

"File: {file path}:{line numbers}
Expected: {what requirement specifies}
Actual: {what code does}
Gap: {if any - what's missing or wrong}
Evidence: {test results, measurements, observations}"

---

## Verification Chain Examples

### Example 1: Token Reduction Requirement

**Step 1: State the requirement**

"Requirement R1: Response must reduce tokens from 2347 to ≤450 (81% reduction)"

**Step 2: Locate claimed implementation**

"Developer claim: 'Implemented token reduction in filtering logic at lines 45-52'"

**Step 3: Verify independently**

"Reading lines 45-52:

```typescript
const filtered = {
  id: response.id,
  title: response.title,
  state: response.state?.name || "Unknown",
  assignee: response.assignee?.name,
};
```

Reading test file lines 85-98:

```typescript
it("reduces tokens by ≥80%", async () => {
  const mockResponse = generateLargeResponse(); // 2347 tokens
  const result = await getIssue({ issue_id: "123" });
  const tokenCount = JSON.stringify(result.value).length;
  expect(tokenCount).toBeLessThan(450);
});
```

Observation: Filtering extracts 4 scalar values. Test verifies token count."

**Step 4: Compare against requirement**

"Requirement: ≤450 tokens (81% reduction)
Implementation: Filters to {id, title, state, assignee}
Verdict: COMPLIANT

Reasoning: Test passes with token count 412 < 450. Calculated reduction: (2347-412)/2347 = 82.5%, exceeds 81% target."

**Step 5: Document evidence**

"File: .claude/tools/linear/get-issue.ts:45-52
Expected: ≤450 tokens
Actual: 412 tokens (verified in test)
Gap: None
Evidence: Test 'reduces tokens by ≥80%' passes, token count measured at 412"

---

### Example 2: Error Handling Requirement

**Step 1: State the requirement**

"Requirement R2: Use Result<T, E> pattern for all error cases (validation, timeout, not found, connection)"

**Step 2: Locate claimed implementation**

"Developer claim: 'Implemented Result pattern with error handling for all cases'"

**Step 3: Verify independently**

"Reading function signature line 25:

```typescript
export async function getIssue(input: GetIssueInput): Promise<Result<GetIssueOutput, string>>;
```

✓ Returns Result<T, E>

Reading error handling lines 30-35:

```typescript
const parseResult = GetIssueInputSchema.safeParse(input);
if (!parseResult.success) {
  return Err(`Invalid input: ${parseResult.error.message}`);
}
```

✓ Validation error returns Err

Reading try-catch lines 45-60:

```typescript
try {
  const response = await callMCPTool(...);
  return Ok(filtered);
} catch (error) {
  if (error.message.includes("timeout")) {
    return Err("Tool execution timed out");
  }
  if (error.message.includes("not found")) {
    return Err("Issue not found");
  }
  return Err(`MCP error: ${error.message}`);
}
```

✓ Timeout, not found, and generic errors return Err

Checking for missing error types:

- Connection error: Handled by generic case ⚠️
- MCP malformed response: NOT HANDLED ✗"

**Step 4: Compare against requirement**

"Requirement: Result<T, E> for validation, timeout, not found, connection errors
Implementation: Result<T, E> for validation, timeout, not found, generic error
Verdict: PARTIAL

Reasoning: Missing explicit handling for malformed MCP responses. Architecture.md specifies output validation, but code at lines 45-60 doesn't validate response structure before filtering."

**Step 5: Document evidence**

"File: .claude/tools/linear/get-issue.ts:45-60
Expected: Validate MCP response structure before filtering
Actual: Directly accesses response.id, response.title without validation
Gap: Missing output schema validation - could crash on malformed response
Evidence: No OutputSchema.safeParse() call before accessing response fields"

---

### Example 3: Security Requirement

**Step 1: State the requirement**

"Requirement R3: Sanitize all user inputs using sanitize.ts before passing to MCP"

**Step 2: Locate claimed implementation**

"Developer claim: 'Sanitized input at line 38'"

**Step 3: Verify independently**

"Reading lines 35-42:

```typescript
const parseResult = GetIssueInputSchema.safeParse(input);
if (!parseResult.success) {
  return Err(`Invalid input: ${parseResult.error.message}`);
}

const sanitized = sanitizeInput(parseResult.data.issue_id);
if (!sanitized.ok) {
  return Err(`Invalid issue ID: ${sanitized.error}`);
}
```

✓ Calls sanitizeInput

Reading MCP call line 47:

```typescript
const response = await callMCPTool("linear", "get_issue", {
  issue_id: sanitized.value,
});
```

✓ Uses sanitized.value

Checking import line 5:

```typescript
import { sanitizeInput } from "../config/lib/sanitize.js";
```

✓ Correct import"

**Step 4: Compare against requirement**

"Requirement: Sanitize all user inputs using sanitize.ts
Implementation: Sanitizes issue_id input before MCP call
Verdict: COMPLIANT

Reasoning: Input is validated by Zod, then sanitized, then used. Follows architecture pattern."

**Step 5: Document evidence**

"File: .claude/tools/linear/get-issue.ts:38-42, 47
Expected: sanitizeInput(userInput) before MCP call
Actual: sanitizeInput(parseResult.data.issue_id) at line 38, used at line 47
Gap: None
Evidence: sanitized.value used in MCP call, not raw input"

---

**CRITICAL**: Complete ALL 5 steps for EVERY requirement in architecture.md. Do not batch or skip.
