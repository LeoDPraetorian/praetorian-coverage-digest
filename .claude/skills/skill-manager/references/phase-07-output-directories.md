# Phase 7: Output Directory Pattern

## What It Checks

- .local/ directory exists if skill generates runtime artifacts
- .local/.gitignore configured properly
- Runtime outputs not committed to git
- CHANGELOG.md exception if in .local/
- TDD artifacts NOT in references/ (should be in .local/)

## Why It Matters

**Git hygiene**: Runtime artifacts (audit results, test outputs, temp files) should NOT be committed.

**.local/ pattern**: Standardized location for all transitory outputs with CHANGELOG.md as the only git-tracked exception.

## Detection Patterns

### WARNING Issues

**1. Missing .local/ Directory**

Skill generates outputs but no .local/:
```
my-skill/
├── SKILL.md
├── scripts/
│   └── generates-audit-results.ts
└── audit-result-2024.md           # ❌ At root, no .local/
```

**2. Missing .gitignore**

.local/ exists but no .gitignore:
```
my-skill/
├── SKILL.md
└── .local/
    └── results.md  # Will be committed! Need .gitignore
```

**3. Runtime Files at Root**

```
my-skill/
├── test-output.log     # ❌ Should be in .local/
├── temp-data.json      # ❌ Should be in .local/
└── audit-results.md    # ❌ Should be in .local/
```

**4. TDD Artifacts in references/ (Wrong Location)**

TDD validation artifacts document HOW the skill was tested, not HOW to use it.
They cause token bloat when agents load `references/` expecting evergreen documentation.

```
my-skill/
├── SKILL.md
└── references/
    ├── api-guide.md           # ✅ Evergreen - teaches usage
    ├── tdd-validation.md      # ❌ Should be in .local/
    ├── baseline-failures.md   # ❌ Should be in .local/
    ├── pressure-test-*.md     # ❌ Should be in .local/
    ├── green-phase-results.md # ❌ Should be in .local/
    └── quality-checks.md      # ❌ Should be in .local/
```

**Detection patterns for TDD artifacts:**

*Filename patterns (specific result indicators):*
- `tdd-validation-*`, `tdd-results-*`, `tdd-test-*`
- `baseline-failures`, `baseline-test-*`, `baseline-results`
- `pressure-test-results-*`, `pressure-test-[0-9]+`
- `green-phase-results`, `red-phase-results`, `red-phase-failures`
- `quality-check-results`, `test-scenario-results`, `validation-results`

*Content patterns (actual test output, not teaching):*
- "Agent response (verbatim):" - captured agent transcripts
- "Test run: YYYY-MM-DD" - dated test results
- "| Status | PASS |" or "| Result | FAIL |" - tabular results
- "Test Case N: PASS/FAIL" - numbered test results

**Important:** Teaching docs about TDD methodology (like `tdd-methodology.md`) are NOT flagged.
Only actual test output artifacts with verbatim transcripts or dated results are detected.

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can create .local/ structure

**Fix actions:**

1. Create .local/ directory
2. Create .local/.gitignore with proper patterns
3. Move runtime artifacts to .local/
4. Preserve CHANGELOG.md as git-tracked exception

**Standard .gitignore template:**
```gitignore
# Runtime artifacts (git-ignored)
audit-results-*.md
test-output-*.log
temp/
*.tmp

# Exception: CHANGELOG.md is git-tracked
!CHANGELOG.md
```

## Examples

### Example 1: Add .local/ Structure

**Before:**
```
my-skill/
├── SKILL.md
└── scripts/
    └── audit.ts  # Generates outputs
```

**After:**
```
my-skill/
├── SKILL.md
├── .local/
│   ├── .gitignore
│   └── CHANGELOG.md
└── scripts/
    └── audit.ts  # Now writes to .local/
```

### Example 2: Move Runtime Artifacts

**Before:**
```
my-skill/
├── SKILL.md
├── audit-2024-11-01.md
├── audit-2024-11-15.md
└── test-results.log
```

**After:**
```
my-skill/
├── SKILL.md
└── .local/
    ├── .gitignore
    ├── CHANGELOG.md
    ├── audit-2024-11-01.md  # git-ignored
    ├── audit-2024-11-15.md  # git-ignored
    └── test-results.log      # git-ignored
```

## .local/ Directory Contents

**Git-tracked (exception):**
- CHANGELOG.md - Version history

**Git-ignored (standard):**
- audit-results-*.md - Audit outputs
- test-output-*.log - Test results
- baseline-*.txt - Test baselines
- temp/ - Temporary files
- *.tmp - Temporary files

**TDD artifacts (should be here, NOT in references/):**
- tdd-validation.md - RED/GREEN/REFACTOR phase documentation
- baseline-failures.md - Captured baseline failures (RED phase)
- green-phase-results.md - GREEN phase test results
- pressure-test-*.md - Pressure test scenarios and results
- quality-checks.md - Quality validation results

**Why TDD artifacts don't belong in references/:**
- `references/` = Evergreen documentation agents read to LEARN the skill
- `.local/` = Temporal artifacts documenting HOW the skill was VALIDATED
- Putting TDD logs in `references/` causes token bloat and confuses agents

## Edge Cases

**1. CHANGELOG.md Location**

Two valid patterns:
- Root: `SKILL.md` + `CHANGELOG.md` (legacy)
- .local/: `CHANGELOG.md` only (new pattern)

Both OK, prefer .local/ for new skills.

**2. Persistent Test Baselines**

These belong in .local/ and ARE git-tracked if needed for regression testing:
```gitignore
# Runtime outputs
*.log
temp/

# Exception: Baselines for parity testing
!baseline-*.txt
!parity-test-results.md
```

## Manual Remediation

**Setting up .local/:**

```bash
mkdir .local
cat > .local/.gitignore << 'EOF'
# Runtime artifacts
audit-results-*.md
test-output-*.log
temp/
*.tmp
!CHANGELOG.md
EOF

cat > .local/CHANGELOG.md << 'EOF'
# Changelog

## [1.0.0] - 2024-11-29
- Initial release
EOF
```

**Updating scripts to use .local/:**

```typescript
// Before
const outputPath = join(skillDir, 'audit-results.md');

// After
const outputPath = join(skillDir, '.local', 'audit-results.md');
```

## Related Phases

- [Phase 5: File Organization](phase-05-file-organization.md) - Overall structure
- [Phase 6: Script Organization](phase-06-script-organization.md) - Scripts generate outputs

## Quick Reference

| Pattern | Correct Location | Git Status |
|---------|------------------|------------|
| Audit results | .local/ | Ignored |
| Test outputs | .local/ | Ignored |
| Temp files | .local/temp/ | Ignored |
| CHANGELOG.md | .local/ | Tracked |
| Baselines | .local/ | Tracked (if needed) |
| TDD validation logs | .local/ | Ignored |
| Pressure test results | .local/ | Ignored |
| RED/GREEN phase docs | .local/ | Ignored |

**Common mistake:** TDD artifacts in `references/` - move to `.local/`
