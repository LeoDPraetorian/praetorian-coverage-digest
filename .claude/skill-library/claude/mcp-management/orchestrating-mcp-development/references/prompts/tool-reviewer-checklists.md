# Tool Reviewer Checklists

**Parent document**: [tool-reviewer-prompt.md](tool-reviewer-prompt.md)

This document contains the two-pass review protocol, review checklist, and self-review checklist for tool reviewers.

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
- [ ] TSDoc present: Function has /\*\* \*/ comment block
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
