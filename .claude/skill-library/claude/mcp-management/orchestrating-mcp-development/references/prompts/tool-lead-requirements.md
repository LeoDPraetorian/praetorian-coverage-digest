# Tool Lead Architecture Requirements

Detailed requirements for the architecture.md document, self-review checklist, and blocked format.

**Parent document**: [tool-lead-prompt.md](tool-lead-prompt.md)

---

## Architecture Document Requirements

Your architecture.md MUST include all 6 sections:

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

````markdown
## Response Filtering Rules

Fields to INCLUDE:

- field1: {purpose}
- field2: {purpose}
- field3: {purpose}

Fields to EXCLUDE:

- verboseField1: {reason - e.g., "1500 tokens, not needed"}
- verboseField2: {reason}
- \_internal.\*: {reason - e.g., "debug data"}

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

````markdown
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

````markdown
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

---

## Report Format

When done, include in your response:

1. **Architecture summary** - Key decisions made
2. **Token optimization strategy** - Original/target/reduction
3. **Major trade-offs** - Decisions and alternatives considered
4. **Implementation guidance** - How developer should proceed
5. **Self-consistency findings** - Issues found in adversarial review
6. **Any concerns** - Areas that may need clarification

---

## Blocked Format Template

If you cannot complete this task, return:

```json
{
  "agent": "tool-lead",
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
