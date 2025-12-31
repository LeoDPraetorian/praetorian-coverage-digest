---
name: discovering-reusable-code
description: Use when adding features to existing code - forces exhaustive codebase search and reusability analysis to prevent special-casing anti-patterns
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite
---

# Discovering Reusable Code

**Force exhaustive codebase discovery to prevent the #1 implementation failure: creating new code when reusable code exists.**

## The Problem This Solves

Without discovery, developers and agents default to special-casing:

```go
// What happens without discovery
func handleRequest(req Request) {
    if req.IsNewFeature {  // ← Special-case #1
        doNewThing()
    }
    if req.HasNewFilter {  // ← Special-case #2
        applyNewFilter()
    }
    // Original code unchanged but surrounded by conditionals
}
```

**Real failure**: A feature added `if newFeature` branches to 8 functions instead of extending the existing handler chain. Why? The developer didn't know the handler chain existed.

**Root cause**: Can't reuse what you don't know about.

## Core Principle

> **"Prove you looked everywhere before creating anything new."**

## When to Use This Skill

**Use before:**

- Implementing new features in existing codebases
- Modifying core business logic
- Making design decisions that could extend existing patterns
- Analyzing what can be reused for a proposed feature

**Skip for:**

- Pure greenfield projects with no existing patterns

**🚨 MANDATORY: You MUST use TodoWrite before starting to track all steps in the discovery process.** The 5-step methodology involves multiple searches and analysis phases. Without external tracking, steps get skipped under time pressure.

## Quick Reference

| Step                       | What                             | Output                                 |
| -------------------------- | -------------------------------- | -------------------------------------- |
| 1. Requirements extraction | Identify needed functionality    | List of components/patterns            |
| 2. Exhaustive search       | Run grep/find across modules     | Files discovered with functionality    |
| 3. Reusability assessment  | Apply 100%/80%/60%/40%/0% matrix | Categorized implementations            |
| 4. 10-file rule            | Justify any new file creation    | Minimum 10 files analyzed              |
| 5. Discovery report        | Document findings                | Structured report with recommendations |

## Step 1: Requirements Extraction

From the feature description, extract:

- Functional components needed
- Data models involved
- API patterns required
- UI components needed
- Business logic requirements

## Step 2: Exhaustive Search Methodology

**YOU MUST document the actual commands run, not just claim "searched the codebase."**

### Functionality Keyword Search

```bash
# Backend/Go patterns
grep -r "[functionality_keyword]" modules/*/backend/pkg/ --include="*.go" -l

# Frontend/TypeScript patterns
grep -r "[ui_keyword]" modules/*/ui/src/ --include="*.tsx" -l
grep -r "[ui_keyword]" modules/*/ui/src/ --include="*.ts" -l

# Python CLI/Lambda
grep -r "[cli_keyword]" modules/*/backend/lambdas/ --include="*.py" -l
```

### Pattern-Based Searches

```bash
# Go patterns
grep -r "type.*Handler" modules/*/backend/pkg/handler/ -l
grep -r "interface.*Service" modules/*/backend/pkg/service/ -l
grep -r "interface.*Repository" modules/*/backend/pkg/repository/ -l
grep -r "func.*Repository" modules/*/backend/pkg/repository/ -l

# Frontend patterns
grep -r "export.*use" modules/*/ui/src/hooks/ -l
grep -r "const.*Component" modules/*/ui/src/ -l
grep -r "export.*function" modules/*/ui/src/components/ -l
```

### File Name Searches

```bash
# Find by entity name
find modules/ -name "*[entity_name]*" -type f

# Find by feature area
find modules/ -name "*[feature]*" -type f
```

### Documentation Searches

```bash
# Architecture and design docs
find modules/ -path "*/docs/*" -name "*.md" | xargs grep -l "[concept]"
find modules/ -path "*CLAUDE*" -name "*.md" | xargs grep -l "[pattern]"
```

### Coverage Verification

After searching, document:

- Number of files searched per module
- Total files matching search criteria
- Modules covered (chariot/backend, chariot/ui, janus, etc.)

## Step 3: Reusability Assessment Matrix

For EVERY relevant existing implementation discovered, assess:

| Reuse Level | Criteria                    | Action                              |
| ----------- | --------------------------- | ----------------------------------- |
| **100%**    | Can be used exactly as-is   | Import and use                      |
| **80%**     | Needs minor extension       | Add method/prop to existing         |
| **60%**     | Needs adaptation            | Refactor to accept new case         |
| **40%**     | Significant refactor needed | Evaluate if worth it                |
| **0%**      | Cannot be reused            | **REQUIRES 10+ FILE JUSTIFICATION** |

### Assessment Criteria

| Level | Example                                                        |
| ----- | -------------------------------------------------------------- |
| 100%  | Handler implements interface, just register it                 |
| 80%   | Hook exists, add optional parameter for new use case           |
| 60%   | Similar service exists, extract shared logic to base class     |
| 40%   | Pattern exists but tightly coupled, needs significant refactor |
| 0%    | No similar implementation exists anywhere                      |

## Step 4: The 10-File Rule

Before proposing ANY new file, you must:

1. Analyze minimum 10 existing files for reuse potential
2. Document why each cannot be extended
3. Provide specific technical justification

**Example justification:**

```markdown
### Proposed: modules/chariot/backend/pkg/handler/asset/filter.go

#### Files Analyzed for Reuse (10 minimum):

1. `modules/chariot/backend/pkg/handler/asset/handler.go`
   - Cannot extend because: Handler pattern doesn't support dynamic filtering

2. `modules/chariot/backend/pkg/handler/risk/handler.go`
   - Cannot adapt because: Risk-specific logic tightly coupled

3. `modules/chariot/backend/pkg/query/builder.go`
   - Cannot extend because: Query builder is for graph queries, not list filtering

[... continue to minimum 10 files ...]

#### Technical Justification:

- Existing handlers use static endpoint registration
- New requirement needs dynamic filter composition
- No existing abstraction handles parameterized list filtering
```

This prevents the "I looked and didn't find anything" shortcut.

## Step 5: Discovery Report Format

Your output MUST include:

````markdown
# Exhaustive Reuse Analysis Report

## Feature: [Feature Name]

## Date: [ISO timestamp]

## Analyst: [Your name or "code-pattern-analyzer"]

---

## COMPLIANCE CONFIRMATION

COMPLIANCE CONFIRMED: Exhaustive analysis performed, reuse prioritized over creation.

---

## SEARCH METHODOLOGY EXECUTED

### Commands Run

```bash
# Actual commands with result counts
grep -r "asset" modules/chariot/backend/pkg/ -l
# Found: 47 files

find modules/ -name "*filter*" -type f
# Found: 23 files
```

### Coverage Verification

- [x] modules/chariot/backend/ searched (347 files)
- [x] modules/chariot/ui/ searched (203 files)
- [x] modules/janus/ searched (89 files)
- [x] Related documentation reviewed

---

## EXISTING IMPLEMENTATIONS DISCOVERED

### 100% Reusable (Use As-Is)

#### [Implementation Name]

- **File:** `modules/chariot/backend/pkg/handler/asset/handler.go`
- **Lines:** Reference method signature, not line numbers
- **Functionality:** CRUD operations for asset entities
- **Evidence:** Implements exact pattern needed for [requirement]
- **Reuse Strategy:** Import existing handler, no changes needed

### 80% Reusable (Extend)

#### [Implementation Name]

- **File:** `modules/chariot/ui/src/hooks/useAssets.ts`
- **Functionality:** Asset data fetching with TanStack Query
- **Gap:** Missing filter parameter support
- **Extension Strategy:** Add optional `filters` parameter to existing hook
- **Estimated Changes:** ~10 lines added to existing file

### 60% Reusable (Adapt)

#### [Implementation Name]

- **File:** `modules/chariot/backend/pkg/service/asset/service.go`
- **Functionality:** Asset business logic
- **Adaptation Needed:** Extract filtering logic to reusable function
- **Refactor Strategy:** [specific approach]

### 0% Reusable (New Code Required)

#### [Proposed New Implementation]

- **Proposed File:** `modules/chariot/backend/pkg/handler/asset/filter.go`
- **Functionality:** [what it does]

##### EXHAUSTIVE JUSTIFICATION REQUIRED

**Files Analyzed for Reuse (MINIMUM 10):**

1. `file.go` - Cannot extend because: [specific reason]
2. `file2.go` - Cannot adapt because: [specific reason]
   [... continue to minimum 10 files ...]

**Technical Justification:**

- Existing pattern limitation: [specific limitation]
- Extension would break: [what it would break]
- No existing abstraction for: [requirement]

---

## PATTERN INVENTORY

### Patterns Identified in Affected Area

#### Pattern: Handler Chain

- **Location:** `modules/chariot/backend/pkg/handler/`
- **How it works:** Handlers implement interface, registered in chain
- **Extension point:** Implement `Handler` interface, register in `main.go`

#### Pattern: Repository Pattern

- **Location:** `modules/chariot/backend/pkg/repository/`
- **How it works:** Data access abstracted behind interface
- **Extension point:** Add methods to existing repository interface

---

## INTEGRATION RECOMMENDATIONS

### Recommended Approach

[Describe the recommended integration approach based on discovery]

### Files to Modify (Extend)

1. `path/to/file.go` - Add [specific change]
2. `path/to/file.tsx` - Extend [specific component]

### Files to Create (Justified Above)

1. `path/to/new/file.go` - [purpose, justified in 0% section]

### Anti-Patterns to Avoid

Based on existing codebase patterns:

- Do NOT create parallel handler (use existing chain)
- Do NOT duplicate query logic (extend existing builder)
- Do NOT create new hook when existing can be extended

---

## KEY FINDINGS

- **Reuse Percentage:** [X]%
- **Files to Extend:** [N]
- **Files to Create:** [M]
- **Critical Constraints:** [Any discovered constraints]
````

## Validation Criteria

A compliant discovery report must have:

- ✅ COMPLIANCE CONFIRMATION statement present
- ✅ Search methodology documented with actual commands
- ✅ Minimum 5 existing implementations analyzed
- ✅ 10+ files analyzed for any "create new" proposals
- ✅ Reuse percentage calculated
- ✅ Pattern inventory with extension points
- ✅ Integration recommendations

## Anti-Patterns to Detect

Flag these in your report:

| Anti-Pattern                 | What to Look For                               |
| ---------------------------- | ---------------------------------------------- |
| **Special-casing**           | `if newFeature { }` scattered across functions |
| **Parallel implementations** | Similar functions with minor variations        |
| **Copy-modify patterns**     | Duplicated code with tweaks                    |
| **Scattered conditionals**   | Same feature check in multiple locations       |

## Integration with Workflow

This skill is orchestration-agnostic. It can be:

1. **Invoked standalone** - User asks "what can we reuse for X?"
2. **Used by code-pattern-analyzer agent** - Primary consumer of methodology
3. **Part of orchestration** - Discovery phase before architecture
4. **Ad-hoc analysis** - Any time reuse question arises

The output format (Discovery Report) is consumable by any caller.

## Related Skills

- **enforcing-evidence-based-analysis** - Verifies specific APIs before use (complementary)
- **adhering-to-dry** - Core principle for reuse (why this matters)
- **writing-plans** - Consumes discovery output for implementation planning

## Related Agents

- **code-pattern-analyzer** - Primary consumer of this methodology

## Remember

The 5 minutes spent on exhaustive search prevents 5 hours of technical debt from special-casing. If you shortcut the search, developers will create duplicate code because they won't know what exists.

---

**For detailed command examples and troubleshooting, see:** [references/search-commands.md](references/search-commands.md)
