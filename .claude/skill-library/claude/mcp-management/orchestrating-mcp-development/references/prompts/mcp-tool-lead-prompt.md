# MCP Tool Lead Prompt Template

Use this template when dispatching mcp-tool-lead subagents in Phase 3 (Architecture).

## Usage

```typescript
Task({
  subagent_type: "mcp-tool-lead",
  description: "Design architecture for MCP wrapper [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are designing: Architecture for MCP Wrapper {SERVICE}/{TOOL}

## Task Description

Design the architecture for a TypeScript MCP wrapper that optimizes token usage while maintaining security and correctness.

Service: {SERVICE}
Tool: {TOOL}
Schema Discovery: {PASTE schema-discovery.md content}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your architecture to: `{OUTPUT_DIRECTORY}/{TOOL}/architecture.md`

## MANDATORY SKILLS (invoke ALL via Read tool before designing)

You MUST load these skills before starting architecture design:

1. **designing-progressive-loading-wrappers** (.claude/skill-library/claude/mcp-management/designing-progressive-loading-wrappers/SKILL.md)
2. **optimizing-llm-api-responses** (.claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md)
3. **implementing-result-either-pattern** (.claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md)
4. **validating-with-zod-schemas** (.claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md)
5. **implementing-retry-with-backoff** (.claude/skill-library/development/typescript/implementing-retry-with-backoff/SKILL.md)
6. **sanitizing-inputs-securely** (.claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md)
7. **structuring-hexagonal-typescript** (.claude/skill-library/development/typescript/structuring-hexagonal-typescript/SKILL.md)

## STEP 0: Clarification (MANDATORY)

**Before ANY architecture design**, review the schema discovery document and identify gaps using progressive disclosure:

### Level 1: Scope Verification

"My understanding of scope: Design architecture.md covering token optimization, response filtering, error handling, validation, and security for {SERVICE}/{TOOL} wrapper"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Discovery Analysis Verification

"Discovery analysis findings:
- Original response size: {X} tokens
- Target token reduction: ≥80% (target: {Y} tokens)
- Fields to include: {list essential fields}
- Fields to filter: {list verbose fields}
- Required inputs: {list input parameters}
- Optional inputs: {list optional parameters}"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Decision Points Identification

"Architecture decisions I need to make:
1. Token optimization strategy: {approach}
2. Response filtering rules: {which fields to keep/remove}
3. Error handling pattern: Result<T, E> or throw?
4. Retry strategy: Retry on timeout? How many attempts?
5. Validation approach: Zod schemas for input/output
6. Security: Which inputs need sanitization?"

If unclear: Return questions
If clear: Proceed to Level 4

### Level 4: Alternative Perspectives

"I will verify my decisions by:
1. Considering alternative approaches for each decision
2. Evaluating trade-offs explicitly
3. Documenting why I chose one approach over another
4. Checking for consistency across all decisions"

If clear: Begin architecture design

---

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "level": "scope|discovery|decisions|alternatives",
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

**Example:**

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

### If No Questions

State explicitly:

"I have reviewed the schema discovery document and have no clarifying questions.

My understanding:
- Original response: {X} tokens
- Target response: {Y} tokens ({Z}% reduction)
- Essential fields: {list}
- Filtering strategy: {approach}
- Error handling: Result<T, E> pattern
- Security: Sanitize all user inputs

Proceeding with architecture design."

### DO NOT

- Assume token counts without referencing discovery doc
- Make filtering decisions without justification
- Skip alternative analysis for each decision
- Proceed if discovery doc is incomplete or unclear

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Analyze schema discovery document**
   - Identify token counts (original and target)
   - List essential vs verbose fields
   - Map input parameters

2. **Make architecture decisions using chain-of-thought**
   - For EACH decision: state problem, list options, analyze trade-offs, recommend with reasoning
   - Use self-consistency: verify decisions from alternative perspective

3. **Document architecture in architecture.md**
   - Token optimization strategy
   - Response filtering rules
   - Error handling pattern
   - Zod schema designs
   - Security validation layers
   - Implementation checklist

4. **Self-review before reporting back**

## Architecture Decision Chain-of-Thought Pattern

For EACH significant decision, follow this chain:

### Decision Chain Template

#### Step 1: State the decision point

"Decision: {What needs to be decided}"

#### Step 2: List constraints from requirements

- Constraint 1: {from discovery or security requirements}
- Constraint 2: {from discovery or security requirements}
- Constraint 3: {from discovery or security requirements}

#### Step 3: Enumerate options (minimum 2)

**Option A**: {Description}
**Option B**: {Description}
**Option C**: {Description} (if applicable)

#### Step 4: Analyze each option against constraints

**Option A - {Name}**:
- Constraint 1: ✓/✗ {How it satisfies or fails}
- Constraint 2: ✓/✗ {How it satisfies or fails}
- Constraint 3: ✓/✗ {How it satisfies or fails}
- Additional: {Other considerations}

**Option B - {Name}**:
- Constraint 1: ✓/✗ {How it satisfies or fails}
- Constraint 2: ✓/✗ {How it satisfies or fails}
- Constraint 3: ✓/✗ {How it satisfies or fails}
- Additional: {Other considerations}

#### Step 5: Recommend with explicit reasoning

"Recommendation: Option {X}

Reasoning:
1. {Why it meets constraints best}
2. {Additional benefits}
3. {Trade-offs accepted}

What would change this: {Conditions that would favor different option}"

---

## Decision Chain Examples

### Example 1: Token Optimization Strategy Decision

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

### Example 2: Error Handling Pattern Selection

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

### Example 3: Response Filtering Approach

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

## Self-Consistency Verification (Required)

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

---

## Architecture Document Requirements

Your architecture.md MUST include:

### 1. Token Optimization Strategy (with numbers from discovery)

```markdown
## Token Optimization Strategy

Original response: {X} tokens
Target response: {Y} tokens
Reduction: {Z}% (target ≥80%)

Optimization approach: {Field-based filtering / Pattern-based / Hybrid}

Justification: {Why this approach for this tool}
```

### 2. Response Filtering Rules (explicit field list)

```markdown
## Response Filtering Rules

Fields to INCLUDE:
- field1: {purpose}
- field2: {purpose}
- field3: {purpose}

Fields to EXCLUDE:
- verboseField1: {reason - e.g., "1500 tokens, not needed"}
- verboseField2: {reason}
- _internal.*: {reason - e.g., "debug data"}

Filtering implementation:
```typescript
const filtered = {
  field1: response.field1,
  field2: response.nested?.field2 || "default",
  field3: response.field3,
};
```
````

### 3. Error Handling Pattern (with examples)

```markdown
## Error Handling Pattern

Pattern: Result<T, E>

Error types:
- Validation errors → Err("Invalid input: {details}")
- MCP timeout → Err("Tool execution timed out")
- MCP not found → Err("{Resource} not found")
- Connection errors → Err("Connection failed: {safe message}")

Example:
```typescript
if (!parseResult.success) {
  return Err(`Invalid input: ${parseResult.error.message}`);
}

try {
  const response = await callMCPTool(...);
  return Ok(filtered);
} catch (error) {
  if (error.message.includes("timeout")) {
    return Err("Tool execution timed out");
  }
  return Err("Unknown error occurred");
}
```
````

### 4. Zod Schema Design (complete schemas)

```markdown
## Zod Schema Design

### Input Schema

```typescript
const InputSchema = z.object({
  required_field: z.string().min(1, "Field required"),
  optional_field: z.string().optional(),
  constrained_field: z.number().int().min(1).max(100),
});

type Input = z.infer<typeof InputSchema>;
```

### Output Schema

```typescript
const OutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.string(),
  assignee: z.string().optional(),
});

type Output = z.infer<typeof OutputSchema>;
```
````

### 5. Security Validation Layers

```markdown
## Security Validation Layers

Layer 1: Zod input validation
- Rejects missing required fields
- Validates types and constraints

Layer 2: Input sanitization (sanitize.ts)
- Blocks command injection (; & | $ ` < >)
- Blocks path traversal (../)
- Blocks XSS (<script> tags, event handlers)
- Blocks control characters (\x00-\x1f)

Layer 3: Output validation
- Validates MCP response structure
- Ensures required fields present
- Rejects malformed responses

Attack vectors addressed:
- Command injection: Sanitize before MCP call
- Path traversal: Validate path fields
- XSS: Sanitize before returning to UI
- Data exposure: Filter sensitive fields
```

### 6. Implementation Checklist

```markdown
## Implementation Checklist

Developer must:
- [ ] Implement Result<T, E> return type
- [ ] Define input Zod schema with all validations
- [ ] Define output Zod schema
- [ ] Sanitize inputs using sanitize.ts
- [ ] Call MCP with correct service/tool name
- [ ] Filter response to target token count
- [ ] Handle all error cases (validation, timeout, not found, connection)
- [ ] Write TSDoc comment with token optimization stats
- [ ] Verify token count in tests

Tester must:
- [ ] Write ≥18 tests across 6 categories
- [ ] Verify token reduction in tests
- [ ] Test all error cases
- [ ] Achieve ≥80% coverage
```

---

## Self-Review Checklist

Before reporting back, verify:

**Completeness:**

- [ ] Did I load all 7 mandatory TypeScript skills?
- [ ] Did I analyze schema discovery document thoroughly?
- [ ] Did I use chain-of-thought for ALL major decisions?
- [ ] Did I perform self-consistency verification?

**Decision Quality:**

- [ ] Are token targets specified with exact numbers?
- [ ] Are filtering rules explicit (not vague)?
- [ ] Did I justify each decision with reasoning?
- [ ] Did I consider alternatives for each decision?

**Documentation Quality:**

- [ ] Is architecture.md complete with all 6 sections?
- [ ] Are code examples executable?
- [ ] Is the implementation checklist actionable?
- [ ] Can a developer implement from this doc without clarification?

**Consistency:**

- [ ] Do filtering rules match token targets?
- [ ] Do error examples match error handling pattern?
- [ ] Do Zod schemas match discovery doc parameters?
- [ ] Does security layer address all attack vectors?

If you find issues during self-review, fix them now before reporting.

## Report Format

When done, include in your response:

1. **Architecture summary** - Key decisions made
2. **Token optimization strategy** - Original/target/reduction
3. **Major trade-offs** - Decisions and alternatives considered
4. **Implementation guidance** - How developer should proceed
5. **Self-consistency findings** - Issues found in adversarial review
6. **Any concerns** - Areas that may need clarification

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "mcp-tool-lead",
  "output_type": "architecture",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": [
    "designing-progressive-loading-wrappers",
    "optimizing-llm-api-responses",
    "implementing-result-either-pattern",
    "validating-with-zod-schemas",
    "implementing-retry-with-backoff",
    "sanitizing-inputs-securely",
    "structuring-hexagonal-typescript"
  ],
  "status": "complete",
  "files_created": [
    "{OUTPUT_DIRECTORY}/{TOOL}/architecture.md"
  ],
  "files_modified": [],
  "architecture_decisions": {
    "token_optimization": "Field-based filtering",
    "error_handling": "Result<T, E> pattern",
    "validation": "Zod schemas",
    "security": "Three-layer validation"
  },
  "token_targets": {
    "original": 2347,
    "target": 450,
    "reduction_pct": 81
  },
  "handoff": {
    "next_agent": "mcp-tool-tester",
    "context": "Architecture complete with 81% token reduction target, ready for test planning"
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
  "agent": "mcp-tool-lead",
  "status": "blocked",
  "blocked_reason": "incomplete_discovery|ambiguous_requirements|conflicting_constraints|missing_schema_info",
  "attempted": [
    "Analyzed schema discovery document",
    "Identified token reduction opportunity (2347 → 450 tokens)",
    "Started decision chain for filtering approach",
    "Blocked on unclear field importance - cannot determine which nested fields are essential"
  ],
  "questions": [
    {
      "category": "requirement",
      "question": "Schema shows 'assignee' object with name, email, avatar, settings. Which fields are essential for wrapper consumers?",
      "options": [
        "Name only (minimize tokens)",
        "Name + email (moderate usefulness)",
        "Full object (no filtering)"
      ],
      "default_assumption": "Name only based on common use cases",
      "impact": "Affects token count by ~50 tokens per issue and usefulness for consumers needing contact info"
    },
    {
      "category": "dependency",
      "question": "Does retry-with-backoff skill apply to MCP calls, or should wrappers fail fast?",
      "options": [
        "Retry up to 3 times for timeouts",
        "Fail fast, let orchestrator retry",
        "Retry only for specific errors"
      ],
      "default_assumption": "Fail fast - MCP calls should be quick or fail",
      "impact": "Affects reliability vs latency trade-off"
    }
  ],
  "handoff": {
    "next_agent": null,
    "context": "Architecture 60% complete. Need clarification on field importance and retry strategy before finalizing."
  }
}
```
