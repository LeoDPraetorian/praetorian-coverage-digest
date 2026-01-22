# Skill Reference Validation

**Parent**: [update-workflow.md](update-workflow.md)

**When to use**: When update adds skill references to Integration section

**Purpose**: Ensure skill exists, correct format, and semantically correct relationship type

---

## Step 1: Validate Skill Exists

```bash
SKILL_NAME="new-skill-reference"
if [ -f ".claude/skills/$SKILL_NAME/SKILL.md" ]; then
  echo "CORE: $SKILL_NAME - use \`$SKILL_NAME\` or \`$SKILL_NAME\` (CORE)"
elif find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" 2>/dev/null | grep -q .; then
  PATH=$(find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" | head -1)
  echo "LIBRARY: $SKILL_NAME - use \`$SKILL_NAME\` (LIBRARY) with \`Read(\"$PATH\")\` in Purpose column"
else
  echo "NOT FOUND: $SKILL_NAME - do not add"
fi
```

---

## Step 2: READ the Skill (MANDATORY)

**You MUST read the referenced skill's SKILL.md** - not just verify it exists.

```
Read("{path-from-step-1}/SKILL.md")
```

**Why this matters**: Topic similarity ≠ correct relationship type. You need to understand:

- Is the skill self-contained or does it depend on this reference?
- Does the workflow explicitly invoke this skill at a step?
- Is this truly required knowledge vs optional enhancement?

---

## Step 3: Semantic Relationship Verification

For EACH skill being added to Integration, answer these questions based on the skill's actual content:

| Question                                                                 | If Yes         | If No          |
| ------------------------------------------------------------------------ | -------------- | -------------- |
| Is this foundational knowledge REQUIRED before ANY use of current skill? | **Requires**   | Not Requires   |
| Does current skill's workflow invoke this at a specific step?            | **Calls**      | Not Calls      |
| Is current skill self-contained but this provides optional enhancement?  | **Pairs With** | Not Pairs With |
| Does this only become relevant under specific trigger conditions?        | **Pairs With** | Not Pairs With |

---

## Step 4: Decision Tree

```
Does current skill DEPEND on understanding this skill first?
├─ YES → Is it invoked during workflow execution?
│        ├─ YES → Calls (during execution)
│        └─ NO → Requires (invoke before starting)
└─ NO → Is current skill self-contained without it?
         ├─ YES → Pairs With (conditional enhancement)
         └─ NO → Requires (true dependency)
```

---

## Common Misclassification Examples

### Example 1: Topic Similarity Trap

❌ **WRONG**: "Both about visualization" → Requires
✅ **RIGHT**: "Both about visualization but skill is self-contained" → Pairs With

**The trap**: Assuming related topics = prerequisite relationship.

**Reality**: Skills can cover similar domains while being functionally independent.

### Example 2: Pattern Duplication Trap

❌ **WRONG**: "Provides LOD/culling patterns" → Requires
✅ **RIGHT**: "Skill already has LOD/culling, this provides general version" → Pairs With

**The trap**: Assuming pattern overlap = dependency.

**Reality**: Skills can implement their own domain-specific patterns and only reference general skills for edge cases.

### Example 3: Real-World Case

**Skill**: `working-with-sigma-js` (Sigma.js graph visualization patterns)
**Reference**: `optimizing-large-data-visualization` (general data visualization optimization)

**Initial (wrong) classification**: Requires

- Reasoning: "Both about performance, optimization seems prerequisite"

**Correct classification**: Pairs With

- After reading: Sigma skill has its own LOD thresholds, culling logic, debouncing patterns
- Optimization skill provides general patterns for ANY large dataset (tables, charts, graphs)
- Sigma skill is self-contained for typical use (1000-5000 nodes)
- Optimization skill becomes relevant only for extreme cases (10000+ nodes)

**Key insight**: The Sigma skill **duplicates** optimization patterns in domain-specific form. General skill is enhancement, not prerequisite.

---

## Step 5: Integration Bullet List Format

**Requires (invoke before starting):**

```markdown
- **`skill-name`** (LIBRARY) - When condition
  - Purpose: What this skill provides
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`
```

**Calls (during execution):**

```markdown
- **`skill-name`** (LIBRARY) - Step/Phase where invoked
  - Purpose: What this skill does at this step
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`
```

**Pairs With (conditional):**

```markdown
- **`skill-name`** (LIBRARY) - Trigger condition
  - Purpose: Why pairing is beneficial
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`
```

**Library skills in Integration MUST include (LIBRARY) annotation with Read() path on sub-bullet.**

**Note:** Related Skills sections are obsolete. All skill relationships go in Integration.

---

## Verification Checklist

Before proceeding, confirm for EACH skill reference:

- [ ] Skill exists (verified with bash find command)
- [ ] Skill SKILL.md has been READ (not just file existence check)
- [ ] Relationship type determined using decision tree based on actual content
- [ ] NOT classified as Requires based solely on topic similarity
- [ ] NOT classified as Requires when skill is self-contained
- [ ] Correct format: bullet list with (LIBRARY) annotation and Read() path

**Cannot proceed until all checks pass** ✅
