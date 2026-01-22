# P0 Compliance: Feature Development

**Domain-specific compliance checks that MUST pass before proceeding to review phase.**

---

## Overview

P0 Compliance Validation is a **blocking gate** that verifies implementation meets mandatory requirements BEFORE code enters review. This prevents:

- Wasted reviewer time on non-compliant code
- Multiple review cycles fixing the same violations
- Late-stage architectural rework

**When it runs**: Phase 10 (Domain Compliance), after implementation
**Blocking behavior**: Violations found → Human Checkpoint → Must fix before proceeding
**Success behavior**: All checks pass → Automatic progression to review

---

## P0 Requirements Table

Feature development has specific P0 requirements covering build, patterns, and quality:

| P0 Requirement         | What to Verify                                           | Validation Command                                     | Blocking |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------ | -------- |
| **Build Passes**       | npm run build / go build succeeds                        | `npm run build && go build ./...`                      | Always   |
| **Lint Passes**        | npm run lint / golangci-lint succeeds                    | `npm run lint && golangci-lint run`                    | Always   |
| **Type Check**         | TypeScript strict mode / Go vet passes                   | `tsc --noEmit && go vet ./...`                         | Always   |
| **Type Safety**        | All new functions have TypeScript types                  | `grep -n ": any"` + manual review                      | Always   |
| **Component Patterns** | React components follow project patterns                 | Pattern review (hooks, props, naming)                  | Always   |
| **State Management**   | Uses approved state management (TanStack Query, Zustand) | `grep -n "useState\|useReducer"` for local state abuse | Always   |
| **Test Coverage**      | New code has corresponding tests                         | `npm run test:coverage` ≥ threshold                    | Always   |

### P1 Requirements (Non-Blocking)

| P1 Requirement   | What to Verify                                     | Notes               |
| ---------------- | -------------------------------------------------- | ------------------- |
| Error Boundaries | Components have error boundaries where appropriate | Document if skipped |
| Accessibility    | Interactive elements are keyboard accessible       | Document gaps       |

---

## Validation Protocol

**3-Step Validation Process (MANDATORY):**

### Step 1: Run Build/Lint/Type Checks

```bash
# Frontend
cd modules/chariot/ui
npm run build
npm run lint
npx tsc --noEmit

# Backend (if applicable)
cd modules/chariot/backend
go build ./...
go vet ./...
golangci-lint run
```

### Step 2: Run Pattern Checks

```bash
# Check for any types (should be zero or justified)
grep -rn ": any" --include="*.ts" --include="*.tsx" src/

# Check for direct useState where TanStack Query should be used
grep -rn "useState.*fetch\|useState.*api\|useState.*data" --include="*.tsx" src/

# Check test coverage
npm run test:coverage
```

### Step 3: Proceed or Escalate

| Result          | Action                                  | Human Checkpoint? |
| --------------- | --------------------------------------- | ----------------- |
| All checks PASS | Proceed to Phase 11 (Code Quality)      | No                |
| Any check FAILS | Generate compliance report + escalate   | **YES**           |
| Warnings only   | Document warnings + ask user preference | Optional          |

---

## Failure Handling

**When P0 checks fail:**

1. **Generate compliance report** (see Output Format below)
2. **Classify violations**:
   - **CRITICAL**: Build failures, type errors (blocks all progress)
   - **ERROR**: Pattern violations, lint errors (must fix)
   - **WARNING**: Coverage gaps, style issues (document and proceed with approval)
3. **Escalate to user** via AskUserQuestion:

```
P0 Compliance Verification found {count} violations.

**Critical**: Build failed with 3 TypeScript errors
**Error**: Found 5 `any` types without justification
**Warning**: Test coverage at 72% (target: 80%)

Options:
1. Fix violations now (Recommended)
2. Proceed anyway with violations documented
3. Review violations and decide
```

---

## Output Format

````markdown
# P0 Compliance Report: Feature Development - {component-name}

**Status**: COMPLIANT | NON-COMPLIANT
**Violations**: {count} ({critical} CRITICAL, {error} ERROR, {warning} WARNING)
**Date**: {ISO 8601 timestamp}

## Requirements Summary

| Requirement        | Status     | Evidence                                    |
| ------------------ | ---------- | ------------------------------------------- |
| Build Passes       | ✅         | npm run build succeeded                     |
| Lint Passes        | ❌ ERROR   | 3 lint errors in UserProfile.tsx            |
| Type Check         | ✅         | tsc --noEmit passed                         |
| Type Safety        | ⚠️ WARNING | 2 `any` types found (justified in comments) |
| Component Patterns | ✅         | Follows hook patterns                       |
| State Management   | ✅         | Uses TanStack Query for API data            |
| Test Coverage      | ❌ ERROR   | 72% coverage (target: 80%)                  |

## Violations Details

### ERROR: Lint Passes (UserProfile.tsx:45, 67, 89)

**Current:**

```typescript
// Line 45: 'user' is defined but never used
const user = useUser();
```
````

**Fix**: Remove unused variable or use it

### ERROR: Test Coverage (72%)

**Missing coverage:**

- `src/components/UserProfile/hooks.ts` - 0% covered
- `src/components/UserProfile/utils.ts` - 45% covered

**Fix**: Add tests for uncovered functions

```

---

## Rationalization Prevention

| Rationalization | Reality | Counter |
| --------------- | ------- | ------- |
| "Build warnings are fine, only errors matter" | Warnings become errors in strict mode | Fix warnings now |
| "One `any` type won't hurt" | `any` spreads through type inference | Type it properly or use `unknown` |
| "Test coverage is close enough" | 72% vs 80% = 8% of code untested | Add the missing tests |
| "Lint rules are too strict" | Rules exist to prevent bugs | Fix or disable with justification comment |
| "It works in dev, good enough" | Dev mode hides production issues | Build must pass in production mode |

---

## Related References

| Reference | Location | Purpose |
| --------- | -------- | ------- |
| Phase 10 Details | `references/phase-10-domain-compliance.md` | Full domain compliance checklist |
```
