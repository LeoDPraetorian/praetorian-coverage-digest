# Code Reference Patterns for Skills

**Best practices for referencing codebase examples in skill documentation.**

## Problem: Static Line Numbers Create Maintenance Debt

Skills that reference code examples with static line numbers (e.g., `file.go:123-127`) suffer from rapid obsolescence:

- **Code evolves constantly** - Insertions, deletions, and refactors shift line numbers
- **Creates false precision** - Line numbers appear authoritative but become inaccurate
- **Maintenance burden** - Every code change requires updating skill documentation
- **Validation difficulty** - Hard to verify if references are still accurate

**Example of the problem:**

```markdown
❌ Reference: `nuclei.go:167-171` (MockCollectors method)

# Problem: After 6 months of development...

# - Method moved to line 154

# - Reference is outdated

# - Developers waste time searching
```

## Solution: Durable Reference Patterns

Use **stable, grep-friendly patterns** that survive code refactoring:

### ✅ Pattern 1: Method Signature References

**Most stable** - Method names rarely change

```markdown
✅ Reference: `nuclei.go` - `func (n *Nuclei) MockCollectors(port *model.Port)`
```

**Grep command to find it:**

```bash
rg "func.*Nuclei.*MockCollectors"
```

**Advantages:**

- Stable across refactors (method name doesn't change)
- Grep-friendly for instant location
- Self-documenting (shows exact signature)

### ✅ Pattern 2: Structural Location Descriptions

**Very stable** - Structural relationships persist

```markdown
✅ Reference: `nuclei.go` - Between `Match()` and `Invoke()` methods
```

**Advantages:**

- Survives line number changes
- Describes logical location
- Matches how developers navigate code

### ✅ Pattern 3: File Path Only

**Stable** - For general file references

```markdown
✅ Reference: `capabilities/nuclei/nuclei.go`
```

**Use when:**

- Pointing to a file for general context
- Multiple examples throughout the file
- Location within file is obvious

### ❌ Anti-Pattern: Static Line Numbers

**Avoid completely**

```markdown
❌ AVOID: `nuclei.go:154-159`
❌ AVOID: `nuclei.go:154`
```

**Why avoid:**

- Becomes outdated immediately
- Requires constant maintenance
- Developers ignore outdated line numbers anyway

## Migration Strategy for Existing Skills

If you find line number references in an existing skill:

### Step 1: Identify Line Number References

```bash
# Find all line number references
rg ':\d+(-\d+)?' .claude/skill-library/your-skill/SKILL.md
```

### Step 2: Replace with Method Signatures

For each reference, convert to method-based pattern:

**Before:**

```markdown
- Nuclei: `capabilities/nuclei/nuclei.go:167-171` (MockCollectors)
```

**After:**

```markdown
- Nuclei: `capabilities/nuclei/nuclei.go` - `func (n *Nuclei) MockCollectors(port *model.Port)`
```

### Step 3: Verify Grep-Friendliness

Test that references are findable:

```bash
# Should return results instantly
rg "func.*Nuclei.*MockCollectors" modules/
```

### Step 4: Add Maintenance Note

Add guidance to the skill to prevent future line number additions:

```markdown
## Maintenance Note: Why No Line Numbers?

This skill uses method signatures instead of static line numbers.

**Rationale:**

- Line numbers drift with code changes
- Method signatures are stable across refactors
- Grep-friendly: `rg "func.*MethodName"` finds instantly

**Pattern for references:**
✅ GOOD: file.go - func (c \*Type) MethodName(...)
❌ AVOID: file.go:123-127
```

## Examples from Real Skills

### Example: mocking-chariot-task Skill

**Before (brittle):**

```markdown
- Nuclei: `capabilities/nuclei/nuclei.go:167-171` (MockCollectors)
- WHOIS: `capabilities/whois/whois.go:74-78`
- EDGAR: `capabilities/edgar/edgar.go:73-77`
```

**After (durable):**

```markdown
- Nuclei: `capabilities/nuclei/nuclei.go` - `func (n *Nuclei) MockCollectors(port *model.Port)`
- WHOIS: `capabilities/whois/whois.go` - `func (task *Whois) MockCollectors(asset *model.Asset)`
- EDGAR: `capabilities/edgar/edgar.go` - `func (task *EDGAR) MockCollectors(preseed *model.Preseed)`
```

**Validation:**

```bash
# All instantly findable
rg "func.*Nuclei.*MockCollectors" modules/
rg "func.*Whois.*MockCollectors" modules/
rg "func.*EDGAR.*MockCollectors" modules/
```

## Special Cases

### When Approximate Line Numbers Are Acceptable

**Only use when:**

1. The method signature is too long/complex to include
2. You add a caveat that numbers may drift
3. You provide structural context as well

**Format:**

```markdown
Reference: `file.go` ~line 154 (between Match() and Invoke())

Note: Line numbers are approximate and may drift with code changes.
```

### Referencing Multiple Locations

**Pattern:**

```markdown
MockCollectors pattern appears in multiple capabilities:

- `capabilities/nuclei/nuclei.go` - `func (n *Nuclei) MockCollectors(...)`
- `capabilities/whois/whois.go` - `func (task *Whois) MockCollectors(...)`
- See all implementations: `rg "func.*MockCollectors" modules/chariot/backend/pkg/tasks/capabilities/`
```

### Referencing Interface Definitions

**Pattern:**

```markdown
Interface: `pkg/base/mockable.go` - `type MockableCapability[T model.Target] interface`

Key method: `MockCollectors(target T) []Option`
```

## Enforcement in Skill Audits

When auditing skills, check for line number references:

### Audit Check

```bash
# Find skills with line number references
rg ':\d+(-\d+)?' .claude/skill-library/ -g '*.md'
```

### Audit Phase

Add to Phase 14 (Content Quality) or create Phase 17 (Code References):

**Validation:**

- ❌ FAIL: Any `:123` or `:123-127` pattern in code references
- ✅ PASS: All code references use method signatures or structural descriptions

**Auto-fix suggestion:**

```
Replace line number references with method signatures:
  OLD: file.go:123-127
  NEW: file.go - func (t *Type) MethodName(...)
```

## Related Patterns

- **visual-style-guidelines.md** - General markdown formatting
- **changelog-format.md** - Documenting skill changes
- **line-count-limits.md** - Skill size constraints

## Summary

**Golden Rule:** Method signatures and structural descriptions are durable; line numbers are ephemeral.

**Quick Reference:**

| Pattern             | Durability | Use When                               |
| ------------------- | ---------- | -------------------------------------- |
| Method signature    | ⭐⭐⭐⭐⭐ | Referencing specific functions/methods |
| Structural location | ⭐⭐⭐⭐⭐ | Describing position in file            |
| File path only      | ⭐⭐⭐⭐   | General file reference                 |
| Line numbers        | ⭐         | **Never use** (maintenance debt)       |

**Pattern Template:**

```markdown
✅ GOOD: `file.go` - `func (t *Type) MethodName(...)`
✅ GOOD: `file.go` (between Match() and Invoke() methods)
❌ AVOID: `file.go:123-127` (will become outdated)
```
