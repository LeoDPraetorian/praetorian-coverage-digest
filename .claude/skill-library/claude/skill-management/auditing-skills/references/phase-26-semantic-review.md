# Phase 26: Semantic Content Review

**Classification Categories for Reference Files**

Phase 26 is **Claude-Automated** - it requires semantic understanding without human input. TypeScript flags CANDIDATES (empty/small files), Claude REASONS about their nature.

## Overview

Phase 26 detects reference files that may be incomplete stubs. However, not all TODO comments or placeholder text indicate genuine problems:

- **Template code** - Intentional placeholders users copy
- **Bad practice examples** - Shows what NOT to do
- **Conceptual discussions** - Discusses TODOs as a topic

This reference explains how to distinguish genuine stubs from false positives.

## Detection Strategy

### TypeScript (Deterministic)

The phase26 TypeScript implementation flags:

1. **Empty files** (size === 0) → CRITICAL severity
2. **Small files** (size < 100 bytes) → INFO severity (candidate for review)

These are **candidates** that require semantic reasoning.

### Claude Reasoning (Semantic)

Claude must classify each flagged file into one of these categories:

## Classification Categories

### 1. Genuine Stub (FLAG)

**Definition**: Incomplete work that needs content.

**Indicators**:

- Mostly empty file
- Single sentence like "This will be populated later"
- No substantive content
- Header with no body
- Comments like "Coming soon" without context

**Example**:

```markdown
# API Error Handling

This section will be populated with error handling patterns.
```

**Verdict**: ❌ FLAG - This is a genuine stub that needs completion.

---

### 2. Template Code (IGNORE)

**Definition**: Intentional placeholder showing pattern users should copy.

**Indicators**:

- File named `*-template.md` or `*-templates.md`
- Contains `// TODO: Implement actual API call` or similar in code blocks
- Describes what the template shows ("placeholder showing the pattern")
- Provides structure for users to fill in

**Example**:

````markdown
# Integration Templates

## Basic API Call Pattern

```typescript
async function callAPI() {
  // TODO: Implement actual API call
  const response = await fetch(endpoint);
  return response.json();
}
```
````

This template shows the basic pattern. Replace the TODO with your implementation.

````

**Verdict**: ✅ IGNORE - This is intentional template code users should copy.

---

### 3. Bad Practice Example (IGNORE)

**Definition**: Shows what NOT to do, discusses anti-patterns.

**Indicators**:
- Appears after "WRONG:", "Bad:", "Anti-pattern:", or similar
- In a comparison with "RIGHT:" or "Better:"
- Explicitly labeled as an example of poor practice
- Used to teach by contrast

**Example**:
```markdown
## Phase Numbering Anti-Patterns

❌ **WRONG**: Using fractional phase numbers

```markdown
[TODO: Add pattern here]
````

✅ **RIGHT**: Sequential integer phases

```markdown
Phase 1, Phase 2, Phase 3...
```

````

**Verdict**: ✅ IGNORE - This TODO is an example of what NOT to do.

---

### 4. Redirect File (IGNORE)

**Definition**: Points users to another location, no content needed here.

**Indicators**:
- Contains "See X for details"
- References another file or documentation
- Acts as a navigation pointer
- Minimal but complete in purpose

**Example**:
```markdown
# Gateway Management

See [gateway-management.md](gateway-management.md) for complete details.
````

**Verdict**: ✅ IGNORE - This is intentionally minimal, redirects to real content.

---

### 5. Intentionally Minimal (IGNORE)

**Definition**: Complete but brief content, no expansion needed.

**Indicators**:

- Short but substantive point
- Complete thought/instruction
- No indication more is needed
- Self-contained reference

**Example**:

```markdown
# Phase Numbering Rule

Never use fractional phase numbers (e.g., Phase 3.5). Always renumber subsequent phases.
```

**Verdict**: ✅ IGNORE - Brief but complete, no expansion needed.

---

### 6. Conceptual Discussion (IGNORE)

**Definition**: Discusses TODOs, templates, or stubs as the TOPIC itself.

**Indicators**:

- Talks ABOUT placeholder patterns
- Meta-discussion of documentation practices
- Teaching how to recognize stubs
- Analysis of TODO usage

**Example**:

```markdown
# Detecting Incomplete Work

Skills often contain TODO markers indicating incomplete sections:

1. `TODO: Add content here` - obvious stub
2. `This will be added later` - placeholder text
3. `[TODO: Example]` - missing example

These patterns require semantic analysis, not regex.
```

**Verdict**: ✅ IGNORE - This discusses TODOs as the subject matter.

---

## Context Clues for Classification

### Genuine Stub Indicators

- Sentence structure: "This **will be** populated", "**Coming soon**", "**To be added**"
- Future tense indicating incomplete work
- No surrounding explanation of WHY minimal
- Random incomplete file in middle of complete content

### NOT a Stub Indicators

- TODO/placeholder appears in code block (likely template or example)
- After "WRONG:", "Bad:", or comparison marker (anti-pattern example)
- File name contains "template", "example", "pattern"
- Surrounded by text DESCRIBING what the TODO represents
- In a "how to recognize stubs" section (meta-discussion)

## Reasoning Process

For each INFO-level candidate (small file), ask:

1. **What is the file's purpose?**
   - Template for users? → Ignore
   - Documentation of real pattern? → Flag if empty

2. **What does the TODO/placeholder represent?**
   - User fills this in? → Ignore (template)
   - We fill this in? → Flag (genuine stub)
   - Example of bad practice? → Ignore (teaching tool)

3. **Is there context explaining the minimal content?**
   - "See X for details" → Ignore (redirect)
   - "This shows the pattern" → Ignore (template description)
   - No explanation, just empty → Flag (genuine stub)

## Examples in Practice

### False Positive #1: integration-templates.md

```typescript
// TODO: Implement actual API call
```

- **Context**: In a file named "templates"
- **Classification**: Template Code
- **Verdict**: ✅ IGNORE

### False Positive #2: integration-templates.md

```markdown
This is a placeholder showing the pattern.
```

- **Context**: Describes what the template IS
- **Classification**: Template Code
- **Verdict**: ✅ IGNORE

### False Positive #3: template-guidance.md

```markdown
❌ WRONG:
[TODO: Add pattern here]
```

- **Context**: After "WRONG:" marker
- **Classification**: Bad Practice Example
- **Verdict**: ✅ IGNORE

### True Positive: empty-file.md

```markdown
# API Patterns

This section will be completed.
```

- **Context**: No indication this is intentional
- **Classification**: Genuine Stub
- **Verdict**: ❌ FLAG

## Summary

Phase 26 requires **semantic reasoning** to distinguish:

| Category              | Flag? | Reason                                |
| --------------------- | ----- | ------------------------------------- |
| Genuine stub          | ❌    | Incomplete work                       |
| Template code         | ✅    | Intentional for users to copy         |
| Bad practice example  | ✅    | Teaching what NOT to do               |
| Redirect file         | ✅    | Points elsewhere, complete in purpose |
| Intentionally minimal | ✅    | Brief but complete                    |
| Conceptual discussion | ✅    | TODOs are the subject matter          |

**Remember**: TypeScript provides candidates, Claude provides classification. False positives occur when regex is used for semantic tasks.

---

## Output Format for Downstream Consumption

When reporting Phase 26 findings, format for fixing-skills consumption:

**Per-File Finding Format:**
```
[{SEVERITY}] Phase 26: {Classification} - {filename}
Location: references/{filename}
Content: {description of why it's a stub}
Classification: {Genuine stub | Near-stub | False positive}
Recommendation: {specific action}
```

**Classification values:**
- `Genuine stub` - Empty or placeholder, needs full population
- `Near-stub` - Has structure but lacks substance, needs expansion
- `False positive` - Template/example/redirect, no action needed (still report for transparency)

**DO NOT aggregate:**
```
# ❌ WRONG
[CRITICAL] Phase 26: 3 stub files need population

# ✅ CORRECT
[CRITICAL] Phase 26: Genuine stub - workflow.md
[CRITICAL] Phase 26: Genuine stub - api-reference.md
[WARNING] Phase 26: Near-stub - patterns.md
```

**Why per-file reporting matters:**
Each finding becomes a separate TodoWrite item in fixing-skills, enabling granular tracking and completion of stub population work.
