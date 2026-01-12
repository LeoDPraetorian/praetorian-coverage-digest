# MCP Tool Reviewer Prompt Template

Use this template when dispatching mcp-tool-reviewer subagents in Phase 8 (Code Review).

## Usage

```typescript
Task({
  subagent_type: "mcp-tool-reviewer",
  description: "Review MCP wrapper implementation for [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are reviewing: MCP Wrapper Implementation for {SERVICE}/{TOOL}

## Task Description

Review the implemented MCP wrapper against architecture specification, ensuring compliance, quality, and security.

Service: {SERVICE}
Tool: {TOOL}
Implementation File: `.claude/tools/{SERVICE}/{TOOL}.ts`
Test File: `.claude/tools/{SERVICE}/{TOOL}.unit.test.ts`

## Architecture Context

{PASTE architecture.md content here - include token optimization targets, response filtering rules, error handling pattern, Zod schemas, security requirements}

## Implementation Context

{PASTE tool.ts content here - the actual implementation to review}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your review to: `{OUTPUT_DIRECTORY}/{TOOL}/review.md`

## MANDATORY SKILLS (invoke ALL via Read tool before reviewing)

You MUST load these skills before starting code review:

1. **avoiding-barrel-files** (.claude/skill-library/development/typescript/avoiding-barrel-files/SKILL.md)
2. **documenting-with-tsdoc** (.claude/skill-library/development/typescript/documenting-with-tsdoc/SKILL.md)
3. **implementing-result-either-pattern** (.claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md)

## STEP 0: Clarification (MANDATORY)

**Before ANY review work**, verify you have all necessary context using progressive disclosure:

### Level 1: Scope Verification

"My understanding of scope: Review {SERVICE}/{TOOL} implementation against architecture.md for compliance, quality, security, and TypeScript patterns"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Review Criteria Verification

"Review criteria I will check:
1. Architecture adherence (token optimization, error handling, validation)
2. TypeScript patterns (no barrel files, proper imports, TSDoc)
3. Security (sanitization, validation, error messages)
4. Code quality (naming, structure, maintainability)
5. Testing (coverage ≥80%, all categories present)
6. Verification (TypeScript compiles, tests pass)"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Architecture Requirements Verification

"Architecture requirements I will verify:
- Token reduction target: {X}% ({original} → {target} tokens)
- Response filtering: {list fields to include/exclude}
- Error handling: Result<T, E> pattern with specific error messages
- Input validation: Zod schema with {list constraints}
- Security: Sanitization using sanitize.ts for {list inputs}"

If unclear: Return questions
If clear: Begin review

---

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "level": "scope|criteria|requirements",
  "verified_so_far": ["Items I'm confident about"],
  "questions": [
    {
      "category": "requirement|dependency|scope|assumption",
      "question": "Specific question text",
      "options": ["Option A", "Option B", "Option C"],
      "default_assumption": "What I'll assume if no answer",
      "impact": "What happens if this assumption is wrong"
    }
  ]
}
```

### If No Questions

State explicitly:

"I have reviewed the architecture specification and implementation and have no clarifying questions.

My understanding:
- Review implementation at `.claude/tools/{SERVICE}/{TOOL}.ts`
- Verify compliance with architecture.md requirements
- Check token optimization ({X}% target)
- Verify security (sanitization, validation)
- Run verification commands (TypeScript, tests)
- Provide verdict: APPROVED | CHANGES_REQUESTED | BLOCKED

Proceeding with review."

### DO NOT

- Assume requirements not in architecture.md
- Skip verification commands
- Approve without running tests
- Proceed if architecture.md is unclear

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Perform two-pass review**
   - Pass 1: Fresh read (understand what code does)
   - Pass 2: Adversarial read (find problems)
   - Check consistency between passes

2. **Verify spec compliance using chain-of-thought**
   - For EACH requirement: state it, locate implementation, verify independently, compare, document evidence

3. **Run verification commands**
   - TypeScript compilation: `npx tsc --noEmit`
   - Tests: `npm test -- tools/{SERVICE}/{TOOL}`
   - Must pass before APPROVED verdict

4. **Document findings in review.md**
   - Compliance issues (blocking)
   - Quality issues (should fix)
   - Suggestions (nice to have)
   - Verdict with justification

5. **Self-review before reporting back**

## Two-Pass Review Protocol (Required)

### Pass 1: Fresh Read

Read the implementation as if seeing it for the first time. Answer:

1. **What does this code do?**
   - Purpose: {1-2 sentences}
   - Inputs: {what it accepts}
   - Outputs: {what it returns}
   - Side effects: {any side effects}

2. **Is the implementation clear?**
   - Variable names: {clear/unclear + examples}
   - Function structure: {easy to follow / hard to follow}
   - Error handling: {comprehensive / has gaps}
   - Comments: {helpful / missing / excessive}

3. **Does it match the architecture intent?**
   - Token optimization: {appears to meet target / unclear / missing}
   - Error handling: {follows Result pattern / doesn't match}
   - Validation: {comprehensive / has gaps}
   - Security: {sanitization present / missing}

### Pass 2: Adversarial Read

Read the implementation looking for problems. Ask:

1. **What could go wrong?**
   - Edge cases: {list edge cases not handled}
   - Error scenarios: {list error paths not covered}
   - Invalid inputs: {list inputs that could break it}

2. **What security issues exist?**
   - Unsanitized inputs: {list any found}
   - Sensitive data exposure: {list any found}
   - Injection vectors: {list any found}

3. **What performance issues exist?**
   - Token count: {verify actual vs target}
   - Unnecessary processing: {list any found}
   - Memory leaks: {list any concerns}

4. **What TypeScript issues exist?**
   - Type safety: {any as any types / proper typing}
   - Import patterns: {barrel files / direct imports}
   - TSDoc: {present / missing / incorrect}

### Consistency Check

Compare findings from both passes:

"Comparing Pass 1 (understanding) with Pass 2 (adversarial):
- Inconsistencies: {list discrepancies between passes}
- New issues found in Pass 2: {list}
- Confirmed issues from Pass 1: {list}
- Overall assessment: {consistent understanding / need deeper review}"

---

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

### Verification Chain Examples

#### Example 1: Token Reduction Requirement

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

#### Example 2: Error Handling Requirement

**Step 1: State the requirement**

"Requirement R2: Use Result<T, E> pattern for all error cases (validation, timeout, not found, connection)"

**Step 2: Locate claimed implementation**

"Developer claim: 'Implemented Result pattern with error handling for all cases'"

**Step 3: Verify independently**

"Reading function signature line 25:
```typescript
export async function getIssue(
  input: GetIssueInput
): Promise<Result<GetIssueOutput, string>>
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

#### Example 3: Security Requirement

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

## Review Checklist (from critical-rules.md)

Use this checklist for the review:

### Architecture Adherence

- [ ] Token optimization: Meets target reduction (≥80%)
- [ ] Response filtering: Includes only specified fields
- [ ] Error handling: Uses Result<T, E> pattern correctly
- [ ] Input validation: Zod schema validates all requirements
- [ ] Output validation: Validates MCP response structure
- [ ] Security: All inputs sanitized per architecture

### TypeScript Patterns

- [ ] No barrel files: Direct imports (e.g., `./file.js`, not `./index.js`)
- [ ] TSDoc present: Function has /** */ comment block
- [ ] Type safety: No `any` types without justification
- [ ] Proper imports: Includes `.js` extensions

### Code Quality

- [ ] Clear naming: Variables and functions have descriptive names
- [ ] Single responsibility: Function does one thing well
- [ ] Error messages: Clear, actionable, no sensitive data
- [ ] Comments: Explain "why", not "what"

### Security

- [ ] Input sanitization: Uses sanitize.ts for user inputs
- [ ] Validation: Zod validates before processing
- [ ] Error handling: Doesn't expose stack traces or internal details
- [ ] No injection vectors: Checked for command injection, XSS, path traversal

### Testing

- [ ] Coverage ≥80%: Line, branch, and function coverage
- [ ] All categories: Input validation, MCP integration, response filtering, security, edge cases, error handling
- [ ] Behavior testing: Tests verify behavior, not implementation
- [ ] Token verification: Tests verify actual token counts

### Verification

- [ ] TypeScript compiles: `npx tsc --noEmit` passes
- [ ] Tests pass: `npm test -- tools/{SERVICE}/{TOOL}` passes
- [ ] No lint errors: Code follows project style

## Verdict Criteria

### APPROVED

All requirements met:
- ✓ All architecture requirements COMPLIANT
- ✓ All TypeScript patterns followed
- ✓ All security checks passed
- ✓ Coverage ≥80%
- ✓ TypeScript compiles
- ✓ Tests pass

### CHANGES_REQUESTED

Issues that must be fixed before approval:
- ✗ 1+ architecture requirements NOT_COMPLIANT or PARTIAL
- ✗ Security issues present
- ✗ Coverage <80%
- ✗ Tests failing
- ✗ TypeScript errors

Provide specific list of changes needed.

### BLOCKED

Critical issues requiring orchestrator intervention:
- ✗ Architecture.md unclear or contradictory
- ✗ Implementation fundamentally wrong (needs redesign)
- ✗ Missing dependencies or infrastructure
- ✗ Requirements conflict with codebase patterns

Escalate to orchestrator with details.

---

## Self-Review Checklist

Before reporting back, verify:

**Two-Pass Review:**

- [ ] Did I complete Pass 1 (fresh read)?
- [ ] Did I complete Pass 2 (adversarial)?
- [ ] Did I check consistency between passes?

**Spec Compliance:**

- [ ] Did I verify EVERY requirement in architecture.md?
- [ ] Did I follow the 5-step verification chain for each?
- [ ] Did I provide evidence (file/line numbers) for each?
- [ ] Did I check implementation independently (not trust claims)?

**Verification Commands:**

- [ ] Did I run `npx tsc --noEmit`?
- [ ] Did I run `npm test -- tools/{SERVICE}/{TOOL}`?
- [ ] Did I check coverage percentage?

**Review Quality:**

- [ ] Is my review specific (file paths, line numbers)?
- [ ] Are my change requests actionable?
- [ ] Did I explain WHY changes are needed, not just WHAT?
- [ ] Is my verdict justified by evidence?

If you find issues during self-review, revise the review before reporting.

## Report Format

When done, include in your response:

1. **Review summary** - Overall assessment
2. **Compliance status** - How many requirements met
3. **Critical issues** - Blocking problems
4. **Quality issues** - Should fix
5. **Suggestions** - Nice to have improvements
6. **Verdict** - APPROVED | CHANGES_REQUESTED | BLOCKED
7. **Change requests** - Specific, actionable list

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "mcp-tool-reviewer",
  "output_type": "code_review",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": [
    "avoiding-barrel-files",
    "documenting-with-tsdoc",
    "implementing-result-either-pattern"
  ],
  "status": "complete",
  "files_created": [
    "{OUTPUT_DIRECTORY}/{TOOL}/review.md"
  ],
  "files_modified": [],
  "verdict": "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED",
  "compliance": {
    "total_requirements": 6,
    "compliant": 5,
    "partial": 1,
    "non_compliant": 0
  },
  "verification": {
    "typescript_compiles": true,
    "tests_pass": true,
    "coverage_pct": 85
  },
  "handoff": {
    "next_agent": "orchestrator" | "mcp-tool-developer",
    "context": "Review complete, 1 change requested: add output validation before filtering"
  }
}
```
````

## If Blocked

If you encounter something unexpected or unclear, **ask questions**.
It's always OK to pause and clarify. Don't guess or make assumptions.

If you cannot complete this task, return:

```json
{
  "agent": "mcp-tool-reviewer",
  "status": "blocked",
  "blocked_reason": "architecture_unclear|implementation_missing|verification_failed|conflicting_requirements",
  "attempted": [
    "Reviewed architecture.md",
    "Performed two-pass review",
    "Started spec compliance verification",
    "Blocked: Architecture.md specifies 80% reduction but tests verify 90% - unclear which is correct"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Architecture.md says '≥80% token reduction' but tests verify '≥90%'. Which is the actual requirement?",
      "options": [
        "80% is minimum (tests are too strict)",
        "90% is target (architecture doc needs update)",
        "Either is acceptable (tests should use 80%)"
      ],
      "default_assumption": "Trust architecture.md (80%), tests are wrong",
      "impact": "Determines if implementation passes review or needs test changes"
    }
  ],
  "handoff": {
    "next_agent": null,
    "context": "Review 50% complete. Need clarification on conflicting token reduction targets before completing spec compliance verification."
  }
}
```
