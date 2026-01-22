---
name: fixing-tool-wrappers
description: Use when remediating MCP tool wrapper compliance issues - auto-fixes deterministic problems found by audit
allowed-tools: Bash, Glob, Read, Edit, Write, TodoWrite, AskUserQuestion
---

# Fixing Tool Wrappers

**Auto-fix deterministic compliance issues found by audit.**

> **You MUST use TodoWrite** to track fix progress when handling multiple wrappers.

**Fix capability tiers:**

- **Auto-fixable**: Mechanical transformations (Phases 2, 4, 11)
- **Partial auto-fix**: Template generation + user input (Phase 12)
- **Manual required**: Human judgment needed (Phases 1, 3, 5-10)

---

## Quick Reference

| Phase | Validation Target     | Fix Capability    | Command                                  |
| ----- | --------------------- | ----------------- | ---------------------------------------- |
| 1     | Schema Discovery      | Manual            | Create discovery docs manually           |
| 2     | Optional Fields       | Auto              | `npm run fix -- service/tool`            |
| 3     | Type Unions           | Manual            | Add union test cases manually            |
| 4     | Nested Access Safety  | Auto              | `npm run fix -- service/tool`            |
| 5     | Reference Validation  | Manual            | Update deprecated refs manually          |
| 6     | Unit Test Coverage    | Manual            | Write more tests                         |
| 7     | Integration Tests     | Manual            | Write integration tests                  |
| 8     | Test Quality          | Manual            | Improve test patterns                    |
| 9     | Security Validation   | Manual            | Fix security issues                      |
| 10    | TypeScript Validation | Manual            | Fix type errors                          |
| 11    | Skill-Schema Sync     | Auto              | `npm run fix -- service/tool --phase 11` |
| 12    | Service Metadata      | Partial (prompts) | `npm run fix -- service/tool --phase 12` |

**Common commands:**

```bash
# Preview fixes (dry-run)
npm run fix -- service/tool --dry-run

# Apply all auto-fixes
npm run fix -- service/tool

# Fix specific phase
npm run fix -- service/tool --phase N

# Fix all wrappers in service
npm run fix -- --service service-name
```

---

## Rationalization Prevention

Tool wrapper fixing has shortcuts that leave issues unresolved. Complete all steps fully.

**Reference**: See [shared rationalization prevention](../../../../skills/using-skills/references/rationalization-prevention.md) for:

- Statistical evidence (technical debt ~10% fix rate, 'later' ~5% completion)
- Phrase detection patterns ('close enough', 'just this once', 'I'll fix it later')
- Override protocol (requires AskUserQuestion with explicit risk disclosure)

### Tool Wrapper Fixing Rationalizations

| Thought                           | Reality                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| "Auto-fix will handle everything" | Only phases 2, 4, 11 auto-fix; 9 phases need manual work     |
| "Skip --dry-run, saves time"      | Dry-run shows what changes before apply; prevents surprises  |
| "Phase 12 is optional metadata"   | Service metadata is P0; impacts discoverability in gateway   |
| "Tests can come later"            | Phases 6-8 block deployment; must pass ≥80% coverage         |
| "Schema discovery is just docs"   | Phase 1 blocks all other phases; required for test validity  |
| "Union tests are edge cases"      | Phase 3 validates multi-type handling; prevents runtime bugs |

**Key principle**: If you detect rationalization phrases, STOP. Return to current phase. Complete it fully before proceeding.

---

## Workflow Overview

```
1. Run Audit          → Get issues list from auditing-tool-wrappers
2. Preview Fixes      → npm run fix --dry-run (see changes before apply)
3. Apply Auto-Fixes   → npm run fix (phases 2, 4, 11)
4. Handle Phase 12    → Interactive: prompt for service description
5. Guide Manual Fixes → Phases 1, 3, 5-10 (provide guidance)
6. Verify Fixes       → Re-run audit
7. Update Wrapper Log → Document changes in wrapper's .history/
```

---

## Step 0: Navigate to Repository Root (MANDATORY)

**Execute BEFORE any fix operation:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```

**See:** [Repository Root Navigation](.claude/skills/managing-skills/references/patterns/repo-root-detection.md)

**⚠️ If wrapper not found:** You are in the wrong directory. Navigate to repo root first.

**Cannot proceed without navigating to repo root** ✅

---

## Step 1: Run Audit

Invoke the auditing-tool-wrappers skill to get issues list:

```
Read(".claude/skill-library/claude/mcp-management/auditing-tool-wrappers/SKILL.md")
# Then audit the target wrapper
```

**Capture findings for issue categorization.**

---

## Step 2: Preview Fixes (MANDATORY)

**Always preview before applying.** This shows what will change without modifying files.

```bash
npm run fix -- service/tool --dry-run
```

**Output shows:**

- Which phases will be fixed
- Exact file modifications
- No changes applied yet

**Statistical evidence**: ~15% of fix previews reveal unintended changes. The 5-second dry-run check prevents hours of debugging regressions.

---

## Step 3: Categorize Issues

Based on audit output, group issues by fix capability:

```
Issues found:
  Auto-fixable:     Phase 2 (optional fields), Phase 4 (nested access)
  Partial auto-fix: Phase 12 (service metadata)
  Manual required:  Phase 6 (test coverage), Phase 9 (security)
```

---

## Step 4a: Apply Auto-Fixes

**Phases: 2, 4, 11**

These phases have deterministic fixes that the CLI applies automatically.

### Phase 2: Optional Fields

**Issue:** Schema fields missing `.optional()` modifier

**Fix:** Adds `.optional()` to all non-required schema fields

```bash
npm run fix -- service/tool --phase 2
```

### Phase 4: Nested Access Safety

**Issue:** Direct property access without optional chaining (`response.data.items`)

**Fix:** Adds optional chaining (`response.data?.items`)

```bash
npm run fix -- service/tool --phase 4
```

### Phase 11: Skill-Schema Sync

**Issue:** Service skill (`.claude/skills/service/SKILL.md`) out of sync with wrapper schemas

**Fix:** Regenerates service skill from current wrapper schemas

```bash
npm run fix -- service/tool --phase 11
```

**Apply all auto-fixes at once:**

```bash
npm run fix -- service/tool
```

---

## Step 4b: Handle Phase 12 (Partial Auto-Fix)

**Phase 12: Service Metadata**

**Issue:** Missing or incomplete `package.json` in `.claude/tools/service/`

**Fix:** Creates `package.json` template, prompts for description

### Workflow

1. **Check if package.json exists**

```bash
ls .claude/tools/service/package.json
```

2. **If missing, fix creates template:**

```bash
npm run fix -- service/tool --phase 12
```

**Template structure:**

```json
{
  "name": "@claude/tools-service",
  "version": "1.0.0",
  "description": "[PROMPT_USER]",
  "keywords": ["mcp", "service-name"],
  "author": "Praetorian",
  "license": "UNLICENSED"
}
```

3. **Prompt user for description via AskUserQuestion:**

```
Question: What user-facing description for the {service} MCP service?
Header: Description
Options:
  1. [Option 1 - 50-80 chars, user-focused]
  2. [Option 2 - 50-80 chars, user-focused]
  3. [Option 3 - 50-80 chars, user-focused]
```

**Guidelines for description:**

- 50-80 characters
- User-focused (what user can do)
- NOT implementation-focused
- Examples:
  - ✅ "Natural language interface for Shodan - search for internet-connected devices"
  - ❌ "Wraps Shodan REST API with Zod schemas and error handling"

4. **Validate description:**

Check for implementation focus patterns:

- Contains "wraps", "implements", "provides wrapper"
- Mentions technical details (REST, API, Zod, TypeScript)
- Focuses on "how" instead of "what user accomplishes"

If implementation-focused, re-prompt user with guidance.

5. **Update package.json:**

Replace `[PROMPT_USER]` placeholder with validated description.

---

## Step 4c: Guide Manual Fixes

**Phases: 1, 3, 5-10**

These phases require human judgment. Provide guidance, not auto-fixes.

### Phase 1: Schema Discovery

**Issue:** Missing schema discovery documentation

**Guidance:**

1. Locate the service's API documentation
2. Create `.claude/tools/service/schema-discovery/`
3. Document endpoints, parameters, response structures
4. Reference in wrapper tests

**See:** [Schema Discovery Guide](references/schema-discovery.md)

### Phase 3: Type Unions

**Issue:** Missing test cases for union types (e.g., `status: "active" | "inactive"`)

**Guidance:**

1. Identify union types in schema
2. Create test case per union variant
3. Verify wrapper handles each variant correctly

**Example:**

```typescript
it('handles status: "active"', async () => { ... });
it('handles status: "inactive"', async () => { ... });
```

### Phase 5: Reference Validation

**Issue:** Wrapper references deprecated/removed endpoints

**Guidance:**

1. Review service's API changelog
2. Identify deprecated endpoints in wrapper
3. Update to current endpoints
4. Update tests accordingly

### Phases 6-8: Testing

**Phase 6:** Unit test coverage <80%
**Phase 7:** Missing integration tests
**Phase 8:** Test quality issues (missing assertions, poor patterns)

**Guidance:**

1. Run coverage report: `npm test -- --coverage`
2. Identify untested branches
3. Write tests for uncovered code
4. Follow test patterns from other wrappers

**See:** [Testing Guide](references/testing-guide.md)

### Phase 9: Security Validation

**Issue:** Security vulnerabilities (injection, auth bypass, etc.)

**Guidance:**

1. Review security audit findings
2. Apply security fixes (input validation, sanitization)
3. Add security-focused tests
4. Re-run security scan

**See:** [Security Guide](references/security-guide.md)

### Phase 10: TypeScript Validation

**Issue:** TypeScript compilation errors

**Guidance:**

1. Run TypeScript check: `npm run type-check`
2. Fix type errors (any types, missing imports, etc.)
3. Verify no regressions

---

## Step 5: Verify Fixes

Re-run audit to verify all issues are resolved:

```
Read(".claude/skill-library/claude/mcp-management/auditing-tool-wrappers/SKILL.md")
# Then re-audit the target wrapper
```

**Expected:** All phases pass. If failures remain, return to Step 3.

---

## Step 6: Update Wrapper Log

Document fixes applied in wrapper's `.history/` log:

```bash
mkdir -p .claude/tools/service/.history
```

Add changelog entry documenting:

- Phases fixed
- Method (auto/partial/manual)
- Verification outcome

---

## Common Scenarios

### Scenario 1: New Wrapper Compliance

**Typical issues:** Phase 2, 4, 6, 12

**Fix order:**

1. Auto-fix phases 2, 4
2. Interactive phase 12 (description)
3. Manual phase 6 (write tests to reach 80%)
4. Verify

### Scenario 2: Schema Update

**Typical issues:** Phase 1, 2, 3, 11

**Fix order:**

1. Manual phase 1 (update schema discovery)
2. Auto-fix phase 2 (optional fields)
3. Manual phase 3 (union test cases)
4. Auto-fix phase 11 (regenerate service skill)
5. Verify

### Scenario 3: Security Remediation

**Typical issues:** Phase 9, 10

**Fix order:**

1. Manual phase 9 (security fixes)
2. Manual phase 10 (fix type errors from security changes)
3. Verify with security scan
4. Verify with TypeScript check
5. Re-run audit

---

## Integration

### Called By

- `managing-tool-wrappers` (routes fix operation from core skill)
- User direct invocation for wrapper compliance remediation

### Requires (invoke before starting)

| Skill                    | When   | Purpose                    |
| ------------------------ | ------ | -------------------------- |
| `auditing-tool-wrappers` | Step 1 | Identify compliance issues |

### Calls (during execution)

| Skill                    | Phase/Step | Purpose                      |
| ------------------------ | ---------- | ---------------------------- |
| `auditing-tool-wrappers` | Step 5     | Verify fixes resolved issues |

### Pairs With (conditional)

None - terminal skill for fix operations

---

## Related Skills

- `managing-tool-wrappers` - Routes to this skill for fix operation
- `auditing-tool-wrappers` - Identifies issues that this skill fixes
- `creating-tool-wrappers` - Creates new wrappers (uses this for compliance)
