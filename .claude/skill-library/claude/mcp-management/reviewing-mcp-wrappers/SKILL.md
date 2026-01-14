---
name: reviewing-mcp-wrappers
description: Use when reviewing MCP wrapper implementations - provides HOW-to methodology for validating against architecture plans, checking code quality, running verification commands, and writing structured review documents with verdicts
allowed-tools: Read, Bash, Grep, Glob, Write, TodoWrite
---

# Reviewing MCP Wrappers

**Methodology for reviewing MCP wrapper implementations against architecture plans and quality standards.**

## When to Use

Use this skill when:

- Reviewing an MCP wrapper implementation
- Validating wrapper code against an architecture plan
- Performing code quality checks on MCP tools
- Writing structured review documents with verdicts

## Quick Reference

| Review Phase      | Focus                                     |
| ----------------- | ----------------------------------------- |
| 1. Locate Plan    | Find architecture.md in wrapper/feature   |
| 2. Plan Adherence | Compare implementation to specifications  |
| 3. Code Quality   | Check standards (types, validation, etc.) |
| 4. Verification   | Run tsc, tests, eslint                    |
| 5. Write Review   | Structured review.md with verdict         |

---

## Step 1: Locate Architecture Plan

**Find the plan that guided this wrapper's implementation.**

### Check Standard Locations

```bash
# Check wrapper directory (standard location)
ls .claude/mcp-wrappers/{service}/{tool}/architecture.md

# Check feature directory (from persisting-agent-outputs discovery)
ls .claude/features/*/architecture*.md

# Or ask user for plan location
```

**If no plan exists**: Escalate to `tool-lead` to create one, OR review against general standards only (note this limitation in output).

---

## Step 2: Review Against Plan (Primary)

**Compare implementation to plan's specifications.**

For detailed plan adherence criteria and comparison methodology, see [references/plan-adherence.md](references/plan-adherence.md).

### Quick Checklist

| Plan Section         | What to Check                              |
| -------------------- | ------------------------------------------ |
| Token Optimization   | Is target reduction achieved?              |
| Response Filtering   | Are filtering rules followed correctly?    |
| Error Handling       | Does pattern match design (Result/Either)? |
| Zod Schemas          | Do schemas match specified structure?      |
| Security             | Is input sanitization implemented?         |
| Implementation Steps | Were all steps completed?                  |

**Deviations from plan require justification or are flagged as issues.**

---

## Step 3: Review Code Quality (Secondary)

**Independent of plan, check standard quality.**

For complete code quality standards and severity classifications, see [references/code-quality-standards.md](references/code-quality-standards.md).

### Quality Issues Matrix

| Issue                    | Severity | Standard                         |
| ------------------------ | -------- | -------------------------------- |
| `any` types              | HIGH     | Type properly with generics      |
| Barrel files (index.ts)  | HIGH     | Direct imports only              |
| Missing Zod validation   | CRITICAL | All inputs must be validated     |
| Token target not met     | HIGH     | Must achieve 80%+ reduction      |
| Missing error handling   | CRITICAL | Handle all MCP call failures     |
| No TSDoc on public API   | MEDIUM   | Document exported functions      |
| Unsanitized user input   | CRITICAL | Sanitize before MCP call         |
| Missing output filtering | HIGH     | Filter response per architecture |

---

## Step 4: Run Verification Commands

**You MUST run and show output.**

```bash
# Type checking (required)
cd .claude/tools && npx tsc --noEmit

# Run wrapper tests
npm run test:run -- tools/{service}/{tool}

# Lint check (if available)
npx eslint tools/{service}/{tool}/**/*.ts
```

For troubleshooting verification failures, see [references/verification-troubleshooting.md](references/verification-troubleshooting.md).

---

## Step 5: Write Review Document

**Follow `persisting-agent-outputs` skill for file output location.**

Write review findings to the wrapper directory using this structure:

```markdown
## Review: [Service/Tool] MCP Wrapper

### Plan Adherence

**Plan Location**: `.claude/mcp-wrappers/{service}/{tool}/architecture.md`

| Plan Requirement    | Status | Notes     |
| ------------------- | ------ | --------- |
| Token optimization  | ✅/❌  | [Details] |
| Response filtering  | ✅/❌  | [Details] |
| Error handling      | ✅/❌  | [Details] |
| Zod schemas         | ✅/❌  | [Details] |
| Security validation | ✅/❌  | [Details] |

### Deviations from Plan

1. **[Deviation]**: [What differs from plan]
   - **Impact**: [Why this matters]
   - **Action**: [Keep with justification / Revise to match plan]

### Code Quality Issues

| Severity | Issue   | Location  | Action |
| -------- | ------- | --------- | ------ |
| CRITICAL | [Issue] | file:line | [Fix]  |
| HIGH     | [Issue] | file:line | [Fix]  |

### Verification Results

- tsc: ✅ Pass / ❌ [errors]
- tests: ✅ Pass / ❌ [failures]
- eslint: ✅ Pass / ❌ [errors]

### Verdict

**APPROVED** / **CHANGES REQUESTED** / **BLOCKED**

[Summary of what needs to happen before approval]
```

For complete review document template with examples, see [references/review-document-template.md](references/review-document-template.md).

---

## Verdict Criteria

| Verdict               | Criteria                                |
| --------------------- | --------------------------------------- |
| **APPROVED**          | All checks pass, no critical issues     |
| **CHANGES REQUESTED** | Minor issues or non-critical deviations |
| **BLOCKED**           | Critical issues, major plan deviations  |

---

## Escalation Protocol

| Situation                   | Recommend            |
| --------------------------- | -------------------- |
| Fixes needed                | `tool-developer` |
| Plan unclear/missing        | `tool-lead`      |
| Architecture changes needed | `tool-lead`      |

---

## Related Skills

- `persisting-agent-outputs` - File output location discovery protocol
- `managing-tool-wrappers` - Complete MCP wrapper lifecycle management

---

## References

- [Plan Adherence Methodology](references/plan-adherence.md) - Detailed comparison criteria
- [Code Quality Standards](references/code-quality-standards.md) - Complete quality matrix
- [Review Document Template](references/review-document-template.md) - Structured review format with examples
- [Verification Troubleshooting](references/verification-troubleshooting.md) - Common verification failures and fixes
