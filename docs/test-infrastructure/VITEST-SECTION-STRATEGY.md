# Vitest Section Strategy: Decision Criteria & Rationale

## Document Purpose

This document explains the **systematic approach** to organizing Vitest test scripts by section, the **decision criteria** used, and why certain sections are grouped the way they are.

## Guiding Principle

**"Create a test script for EVERY logical grouping where tests exist, organized by test volume and developer workflow"**

## Test Distribution Analysis

Based on analysis of `modules/chariot/ui/src/sections/`:

```
29 test files - settings
25 test files - insights (queryBuilder + metrics + other)
19 test files - vulnerabilities
14 test files - jobs
 7 test files - asset
 4 test files - seeds
 4 test files - __tests__ (root-level section tests)
 1 test file  - technology
 1 test file  - customerManagement
 1 test file  - customerDrawer
 1 test file  - components
 1 test file  - preseed
 1 test file  - integrations
```

**Total**: ~110 test files across 13 sections

## Organizational Strategy

### Tier 1: Top-Level Sections (ALL sections with tests)

**Script Pattern**: `test:sections:{directoryName}`

**Rationale**: Provide a script for EVERY section, regardless of size
- Consistency across codebase
- Predictable naming convention
- Easy to discover (matches directory structure)
- Scales as sections grow

**Scripts Created**:
```json
"test:sections:asset"              // 7 tests  - Asset management
"test:sections:agents"             // Unknown  - Agent management
"test:sections:customerDrawer"     // 1 test   - Customer drawer
"test:sections:customerManagement" // 1 test   - Customer management
"test:sections:insights"           // 25 tests - All insights features
"test:sections:integrations"       // 1 test   - Integrations
"test:sections:jobs"               // 14 tests - Job management
"test:sections:preseed"            // 1 test   - Preseed
"test:sections:seeds"              // 4 tests  - Seeds/scope
"test:sections:settings"           // 29 tests - Settings (largest!)
"test:sections:technology"         // 1 test   - Technology
"test:sections:vulnerabilities"    // 19 tests - Vulnerabilities
```

### Tier 2: High-Volume Subsections (Convenience Scripts)

**Script Pattern**: `test:{featureName}`

**Rationale**: Large subsections within insights/ deserve dedicated scripts for faster iteration

**Scripts Created**:
```json
"test:querybuilder"  // ~15 tests - Query builder (subset of insights)
"test:metrics"       //  ~6 tests - Metrics dashboard (subset of insights)
```

**Why both `test:sections:insights` AND `test:querybuilder`?**
- `test:sections:insights` - Runs ALL insights tests (25 files, ~8-10 seconds)
- `test:querybuilder` - Runs ONLY query builder (~2-3 seconds for focused work)
- Developer chooses based on scope of changes

### Tier 3: Code Area Groupings

**Script Pattern**: `test:{codeArea}`

**Rationale**: Cross-cutting concerns that span multiple sections

**Scripts Created**:
```json
"test:components"  // All reusable UI components
"test:hooks"       // All custom React hooks
```

### Tier 4: CI/CD Sharding

**Script Pattern**: `test:shard:{n}`

**Rationale**: Parallel execution across multiple CI runners

**Scripts Created**:
```json
"test:shard:1"  // 1/4 of all tests
"test:shard:2"  // 2/4 of all tests
"test:shard:3"  // 3/4 of all tests
"test:shard:4"  // 4/4 of all tests
```

## Decision Criteria Matrix

| Criteria | Rationale | Example |
|----------|-----------|---------|
| **Has tests?** | Only create script if directory contains test files | ✅ jobs (14 tests) → create script |
| **Match directory name** | Use exact directory name for predictability | ✅ `asset` not `assets` |
| **All sections included** | No arbitrary omissions - comprehensive coverage | ✅ Even 1-test sections get scripts |
| **Alphabetical order** | Easy to scan in package.json | ✅ agents → asset → customer... |
| **Subsection shortcuts** | High-traffic subsections get convenience aliases | ✅ `test:querybuilder` for quick iteration |

## Why Include Sections with Only 1 Test?

### Arguments For (Current Approach) ✅

1. **Consistency** - Developers can predict: "If section X exists, `npm run test:sections:X` works"
2. **Future-proofing** - Section with 1 test today may have 10 tests tomorrow
3. **Documentation** - Scripts serve as documentation of what sections exist
4. **Low cost** - Adding script costs nothing, provides discoverability

### Arguments Against (Rejected)

1. ❌ "Clutters package.json" - Alphabetical organization keeps it clean
2. ❌ "Unnecessary for 1 test" - Can just run the full suite... but defeats the purpose of sectioning
3. ❌ "Too many scripts" - npm supports filtering: `npm run test:sections:<tab>` autocomplete

**Decision**: Include ALL sections (comprehensive > minimal)

## Naming Conventions

### Pattern Hierarchy

```
test:sections:{exact-directory-name}  // Top-level sections
test:{feature-name}                   // Common subsection shortcuts
test:{code-area}                      // Cross-cutting groupings
test:shard:{n}                        // CI/CD parallelization
```

### Examples of Correct Naming

✅ **Correct**:
- `test:sections:asset` (matches `src/sections/asset/`)
- `test:sections:customerDrawer` (matches `src/sections/customerDrawer/`)
- `test:querybuilder` (convenience for `src/sections/insights/queryBuilder/`)

❌ **Wrong** (Initial mistakes):
- `test:sections:assets` (directory is `asset` not `assets`)
- Missing `test:sections:jobs` (arbitrary omission)
- Missing `test:sections:technology` (inconsistent)

## Script Organization in package.json

### Logical Grouping with Blank Lines

```json
{
  "scripts": {
    // Core test commands
    "test": "...",
    "test:run": "...",

    // Sectioned testing
    "test:sections": "...",

    // Code area scripts
    "test:components": "...",
    "test:hooks": "...",

    // All section scripts (alphabetical)
    "test:sections:agents": "...",
    "test:sections:asset": "...",
    "test:sections:customerDrawer": "...",
    // ... (all sections)

    // Feature shortcuts
    "test:querybuilder": "...",
    "test:metrics": "...",

    // CI/CD sharding
    "test:shard:1": "...",
    "test:shard:2": "...",
  }
}
```

**Benefits**:
- Clear visual separation
- Easy to find scripts by category
- Alphabetical within categories
- Scalable as new sections added

## Performance Impact by Section

Based on test counts:

| Section | Test Files | Est. Duration | Recommendation |
|---------|------------|---------------|----------------|
| settings | 29 | ~8-12s | ⚠️ May want to split further |
| insights | 25 | ~8-10s | ✅ Has subsection shortcuts (querybuilder, metrics) |
| vulnerabilities | 19 | ~5-7s | ✅ Good size |
| jobs | 14 | ~4-5s | ✅ Good size |
| asset | 7 | ~2-3s | ✅ Fast |
| seeds | 4 | ~1-2s | ✅ Very fast |
| others | 1 each | <1s | ✅ Instant |

**Insight**: Settings (29 tests) might benefit from further subsection scripts if developers frequently work on specific settings features.

## Evolution Strategy

### Adding New Sections

When a new section is added to `src/sections/`:

1. **Create directory**: `src/sections/newFeature/`
2. **Add tests**: `src/sections/newFeature/__tests__/`
3. **Add script**: `"test:sections:newFeature": "vitest run src/sections/newFeature"`
4. **Insert alphabetically** in package.json

### Splitting Large Sections

If a section grows beyond 30 test files:

1. **Keep section script**: `test:sections:settings`
2. **Add subsection shortcuts**:
   ```json
   "test:settings:scan": "vitest run src/sections/settings/scan",
   "test:settings:notifications": "vitest run src/sections/settings/notifications"
   ```

### Removing Deprecated Sections

When a section is removed:

1. Delete the section directory
2. Remove the corresponding test script
3. Update documentation

## Documentation Updates Required

After this reorganization, update:

1. ✅ **`docs/VITEST-TESTING-GUIDE.md`** - Show ALL section scripts
2. ✅ **`CLAUDE.md`** - Update examples to include jobs, technology, etc.
3. ✅ **`docs/VITEST-BEST-PRACTICES.md`** - Reference comprehensive script list

## Key Learnings

### What I Did Wrong Initially

1. **Arbitrary Selection** - Chose 5 sections randomly instead of systematically including all
2. **Inconsistent Naming** - Used `assets` instead of `asset`
3. **Missing Significant Section** - Omitted `jobs` (14 tests!)
4. **No Clear Criteria** - Didn't document WHY those sections were chosen

### Corrected Approach

1. **Comprehensive Coverage** - Script for EVERY section with tests
2. **Exact Directory Matching** - Script names match directory names precisely
3. **Alphabetical Organization** - Easy to scan and maintain
4. **Clear Hierarchy** - Sections → Subsections → Code Areas → Shards

## Summary

**Previous (Flawed)**:
- 5 section scripts (arbitrary)
- Missing jobs, technology, agents, customerManagement, etc.
- Naming inconsistencies

**Current (Systematic)**:
- 12 section scripts (comprehensive)
- Covers ALL sections with tests
- Alphabetically organized
- Exact directory name matching
- Clear tier system (sections → subsections → areas)

**Principle**: **Be systematic, not selective. Completeness > convenience.**

---

**Last Updated**: December 6, 2024
**Applies To**: modules/chariot/ui test organization
**Maintained By**: Chariot Platform Team
