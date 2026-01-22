# Phase 29: Integration Semantic Validation - Fix Procedure

**Parent:** [fixing-skills SKILL.md](../SKILL.md)

**When to use:** Audit reports Phase 29 violations - skill references in wrong Integration sections

**Category:** Claude-Automated (requires semantic reasoning)

---

## What Phase 29 Detects

Integration section skill references that are **structurally correct** (Phase 28 passed) but **semantically misclassified**:

- Skill in "Requires" but current skill is self-contained without it → Should be "Pairs With"
- Skill in "Pairs With" but actually required for basic functionality → Should be "Requires"
- Skill in "Calls" but not actually invoked in workflow → Should be "Pairs With" or remove
- Skill in wrong section based on topic similarity instead of actual dependency analysis

---

## Fix Procedure

### Step 1: Read Audit Finding

Audit will report which skill reference is misclassified:

```
[WARNING] Phase 29: Integration Semantic Validation
Location: Integration section, "Requires" subsection
Issue: `optimizing-large-data-visualization` appears to be Pairs With relationship, not Requires
Reason: Current skill (`working-with-sigma-js`) is self-contained with own LOD/culling patterns
```

### Step 2: Read Referenced Skill (MANDATORY)

You MUST read the skill mentioned in the audit finding:

```
Read("{path-from-audit}/SKILL.md")
```

**Why this matters:** You need to understand the skill's actual content to determine correct relationship, not rely on topic similarity.

### Step 3: Apply Decision Tree

Use the decision tree from updating-skills:

```
Does current skill DEPEND on understanding this skill first?
├─ YES → Is it invoked during workflow execution?
│        ├─ YES → Calls (during execution)
│        └─ NO → Requires (invoke before starting)
└─ NO → Is current skill self-contained without it?
         ├─ YES → Pairs With (conditional enhancement)
         └─ NO → Requires (true dependency)
```

**Questions to answer (based on reading both skills):**

| Question                                                                 | If Yes         | If No          |
| ------------------------------------------------------------------------ | -------------- | -------------- |
| Is this foundational knowledge REQUIRED before ANY use of current skill? | **Requires**   | Not Requires   |
| Does current skill's workflow invoke this at a specific step?            | **Calls**      | Not Calls      |
| Is current skill self-contained but this provides optional enhancement?  | **Pairs With** | Not Pairs With |
| Does this only become relevant under specific trigger conditions?        | **Pairs With** | Not Pairs With |

### Step 4: Determine Correct Section

Based on decision tree answers:

- **Requires** - Skill cannot function without this knowledge
- **Calls** - Skill invokes this at specific workflow step
- **Pairs With** - Skill is self-contained, this enhances for edge cases

### Step 5: Move to Correct Section

Use Edit tool to:

1. Remove skill reference from current (wrong) section
2. Add skill reference to correct section with proper format

**Format requirements:**

```markdown
### Requires (invoke before starting)

- **`skill-name`** (LIBRARY) - When/why condition
  - Purpose: What this skill provides as prerequisite
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

### Calls (during execution)

- **`skill-name`** (LIBRARY) - Step/Phase N
  - Purpose: What this skill does at this step
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

### Pairs With (conditional)

- **`skill-name`** (LIBRARY) - Trigger condition
  - Purpose: Why pairing is beneficial for edge cases
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`
```

---

## Common Misclassification Patterns

### Pattern 1: Topic Similarity Trap

**Violation:**

```markdown
### Requires

- **`skill-about-graphs`** (LIBRARY) - Both about visualization
```

**Fix:** If current skill works without it:

```markdown
### Pairs With

- **`skill-about-graphs`** (LIBRARY) - For advanced graph cases
  - Purpose: General graph patterns beyond domain-specific implementation
```

### Pattern 2: Pattern Duplication Trap

**Violation:**

```markdown
### Requires

- **`general-optimization-skill`** (LIBRARY) - Provides optimization patterns
```

**Fix:** If current skill has own optimization patterns:

```markdown
### Pairs With

- **`general-optimization-skill`** (LIBRARY) - For extreme scale optimization
  - Purpose: General patterns beyond built-in optimizations
```

### Pattern 3: Real-World Example

**Before (incorrect):**

```markdown
### Requires

- **`optimizing-large-data-visualization`** (LIBRARY) - Performance optimization
  - Purpose: Optimization patterns for large datasets
```

**After (correct):**

```markdown
### Pairs With

- **`optimizing-large-data-visualization`** (LIBRARY) - For extreme scale (10000+ nodes)
  - Purpose: General optimization patterns beyond Sigma-specific implementations
  - `Read('.claude/skill-library/.../optimizing-large-data-visualization/SKILL.md')`
```

**Reason:** After reading both skills:

- `working-with-sigma-js` has own LOD, culling, debouncing for typical use (1000-5000 nodes)
- `optimizing-large-data-visualization` provides general patterns for ANY dataset type
- Sigma skill is self-contained, optimization enhances for edge cases

---

## Validation Checklist

Before marking Phase 29 fix complete:

- [ ] Read the skill mentioned in audit finding
- [ ] Applied decision tree based on actual content
- [ ] NOT categorized based on topic similarity alone
- [ ] Moved to semantically correct section
- [ ] Format includes (LIBRARY) annotation and Read() path
- [ ] Re-run audit to verify Phase 29 now passes

---

## Cross-Reference

This procedure implements the validation from:

- `auditing-skills` Phase 29 detection rules
- `updating-skills/references/skill-reference-validation.md` - Decision tree and misclassification examples
