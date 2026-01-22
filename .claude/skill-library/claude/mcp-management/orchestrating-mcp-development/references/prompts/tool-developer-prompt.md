# MCP Tool Developer Prompt Template

Use this template when dispatching tool-developer subagents in Phase 7 (Implementation).

## Usage

```typescript
Task({
  subagent_type: "tool-developer",
  description: "Implement MCP wrapper for [service]/[tool]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing: MCP Wrapper for {SERVICE}/{TOOL}

## Task Description

Implement a TypeScript wrapper function that calls an MCP tool and returns filtered, optimized results.

Service: {SERVICE}
Tool: {TOOL}
Implementation File: `.claude/tools/{SERVICE}/{TOOL}.ts`

## Architecture Context

{PASTE architecture.md content here - include token optimization strategy, response filtering rules, error handling pattern, Zod schemas}

## Security Requirements

{PASTE security-assessment.md content here - include input validation requirements, output sanitization needs, authentication considerations}

## Output Directory

OUTPUT_DIRECTORY: `.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}`

Write your implementation log to: `{OUTPUT_DIRECTORY}/{TOOL}/implementation-log.md`

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Write test first, verify it fails, then implement
2. **verifying-before-completion** - Run tests and verify before claiming done
3. **implementing-result-either-pattern** (.claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md) - Use Result<T, E> for error handling
4. **validating-with-zod-schemas** (.claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md) - Create input/output schemas
5. **sanitizing-inputs-securely** (.claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md) - Prevent injection attacks
6. **optimizing-llm-api-responses** (.claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md) - Token reduction strategies
7. **adhering-to-yagni** - Only implement what's specified, nothing extra

## STEP 0: Clarification (MANDATORY)

**Before ANY implementation work**, review the architecture and security specifications. Use progressive disclosure to identify gaps:

### Level 1: Scope Verification

"My understanding of scope: [1-2 sentences describing what wrapper will do]"

If unclear: Return questions
If clear: Proceed to Level 2

### Level 2: Dependency Verification

"Dependencies I've identified:

- MCP tool name: `{mcp-tool-name}`
- Response filtering approach: {approach}
- Validation libraries: {zod, sanitize.ts}"

If unclear: Return questions
If clear: Proceed to Level 3

### Level 3: Behavior Verification

"Expected behaviors:

- Happy path: User provides valid input → wrapper calls MCP → returns filtered response
- Error case: Invalid input → Zod validation fails → return Err(error)
- Error case: MCP timeout → return Err('Tool execution timed out')
- Edge cases: Empty responses, missing fields, rate limits"

If unclear: Return questions
If clear: Proceed to Level 4

### Level 4: Acceptance Verification

"This task is complete when:

- [ ] Wrapper function implemented in `.claude/tools/{SERVICE}/{TOOL}.ts`
- [ ] Input schema validates all parameters per architecture.md
- [ ] Response filtering reduces tokens by ≥80% (from discovery)
- [ ] Result<T, E> pattern used for error handling
- [ ] All inputs sanitized per security-assessment.md
- [ ] Tests verify: input validation, MCP integration, response filtering, security, edge cases, error handling"

If unclear: Return questions
If clear: Begin implementation

---

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "level": "scope|dependency|behavior|acceptance",
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

"I have reviewed the architecture and security specifications and have no clarifying questions.

My understanding:

- Implement wrapper at `.claude/tools/{SERVICE}/{TOOL}.ts`
- Target {X}% token reduction (from {original_tokens} to {target_tokens} tokens)
- Use Result<T, E> pattern for all error cases
- Validate inputs with Zod, sanitize for injection attacks
- Filter response to include only: {field1, field2, field3}

Proceeding with implementation."

### DO NOT

- Assume requirements that aren't in architecture.md or security-assessment.md
- Make design decisions without asking (retry logic, caching, rate limiting)
- Proceed if anything is unclear
- Skip this step because "it seems simple"

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Write the failing test first** (TDD)
   - Test the behavior, not the implementation
   - Run test to verify it fails for the right reason
   - See [tool-developer-examples.md](tool-developer-examples.md) for TDD patterns

2. **Implement minimal code to pass**
   - Only what's needed to make the test pass
   - Follow the architecture document exactly

3. **Verify implementation works**
   - All tests pass
   - Coverage ≥80%
   - No TypeScript errors

4. **Self-review before reporting back**
   - See [tool-developer-requirements.md](tool-developer-requirements.md) for checklist

## References

- [TDD Examples](tool-developer-examples.md) - Wrapper implementation examples with tests
- [Requirements & Output](tool-developer-requirements.md) - Self-review checklist, output format, blocked format

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "tool-developer",
  "output_type": "implementation",
  "feature_directory": ".claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{SERVICE}",
  "skills_invoked": [
    "developing-with-tdd",
    "verifying-before-completion",
    "implementing-result-either-pattern",
    "validating-with-zod-schemas",
    "sanitizing-inputs-securely",
    "optimizing-llm-api-responses",
    "adhering-to-yagni"
  ],
  "status": "complete",
  "files_created": [
    ".claude/tools/{SERVICE}/{TOOL}.ts",
    ".claude/tools/{SERVICE}/{TOOL}.unit.test.ts"
  ],
  "files_modified": [],
  "tests_passing": true,
  "coverage": {
    "line": 85,
    "branch": 82,
    "function": 90
  },
  "token_optimization": {
    "original": 2347,
    "optimized": 412,
    "reduction_pct": 82
  },
  "handoff": {
    "next_agent": "tool-reviewer",
    "context": "Implementation complete with 82% token reduction, ready for code review"
  }
}
```

## If Blocked

If you cannot complete this task, return blocked status with questions.

See [tool-developer-requirements.md](tool-developer-requirements.md) for blocked format template.
````
