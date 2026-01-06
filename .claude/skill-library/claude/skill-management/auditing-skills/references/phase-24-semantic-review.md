# Phase 24: Semantic Line Number Review

**Classification Categories for Line Number References**

Phase 24 is **Claude-Automated** - it requires semantic understanding without human input. TypeScript flags CANDIDATES (line number patterns), Claude REASONS about their context.

## Overview

Phase 24 detects line number references like `file.go:123` or `file.go:123-127`. However, not all line number patterns indicate genuine problems:

- **Bad practice examples** - Shows what NOT to do
- **Teaching content** - Discusses line numbers as the topic
- **Template patterns** - Shows format users should follow
- **Historical references** - Documents past state
- **Tool output examples** - Grep results, stack traces

This reference explains how to distinguish genuine hardcoded line numbers from false positives.

## Detection Strategy

### TypeScript (Deterministic)

The phase24 TypeScript implementation flags:

1. **Line number patterns** (`file.ext:123` or `file.ext:123-456`) → INFO severity (candidate for review)
2. **Provides rich context** including:
   - Surrounding lines (3 before and after)
   - File name (template files get different treatment)
   - Whether in code block
   - Whether near WRONG/❌ markers

These are **candidates** that require semantic reasoning.

### Claude Reasoning (Semantic)

Claude must classify each flagged reference into one of these categories:

## Classification Categories

### 1. Genuine Line Number Reference (FLAG)

**Definition**: Actual hardcoded line number pointing to code that will become stale.

**Indicators**:

- Direct reference to specific code location without teaching context
- In a "see also" or "reference" section pointing to implementation
- No surrounding explanation that it's an example or anti-pattern
- Used as actual navigation aid to codebase
- Not demonstrating what NOT to do

**Example**:

```markdown
# Implementation Details

The validation logic is implemented in `handlers/validate.go:234-245`.
```

**Verdict**: ❌ FLAG - This is a genuine hardcoded line number that will drift.

**Fix**: Replace with method signature:

```markdown
The validation logic is implemented in `handlers/validate.go` - `func validateInput(data *Request) error`
```

---

### 2. Bad Practice Example (IGNORE)

**Definition**: Shows what NOT to do, teaching about the anti-pattern itself.

**Indicators**:

- Appears after "WRONG:", "Bad:", "❌", or "Anti-pattern:" markers
- In a comparison with "RIGHT:" or "Better:"
- Explicitly labeled as an example of poor practice
- Used to teach by contrast
- Part of the skill's own documentation about avoiding line numbers

**Example**:

````markdown
## Code Reference Patterns

❌ **WRONG**: Using line numbers

```markdown
- Implementation: `file.go:123-127` (becomes outdated)
```
````

✅ **RIGHT**: Using method signatures

```markdown
- Implementation: `file.go` - `func MethodName(...)`
```

````

**Verdict**: ✅ IGNORE - This is teaching about the anti-pattern, not committing it.

---

### 3. Teaching Content (IGNORE)

**Definition**: Discussing line numbers as the subject matter itself.

**Indicators**:
- Surrounded by text explaining why line numbers are problematic
- Part of documentation about line number maintenance issues
- Meta-discussion of documentation practices
- Analyzing or critiquing the use of line numbers
- In a section about reference patterns or best practices

**Example**:
```markdown
# Why Line Numbers Are Problematic

Line numbers like `file.go:45` become stale over time. Every code change
(inserts, deletions, refactors) causes line numbers to drift, requiring
constant maintenance and creating false precision.
````

**Verdict**: ✅ IGNORE - This discusses line numbers as the topic, explaining why they're bad.

---

### 4. Template/Placeholder Pattern (IGNORE)

**Definition**: Shows format pattern users should follow, using placeholders.

**Indicators**:

- Uses placeholder like `:LINE`, `:NNN`, `:XXX` instead of real number
- File named `*-template.md` or `*-example.md` or `*-patterns.md`
- Describes what the template shows
- Provides structure for users to fill in
- Part of "pattern" or "format" documentation

**Example**:

```markdown
# Code Reference Templates

When referencing code, use one of these patterns:

- Method signature: `file.go` - `func MethodName(...)`
- Structural: `file.go (between Match() and Invoke() methods)`
- General: `file.go`

Do NOT use: `file.go:LINE` or `file.go:LINE-LINE`
```

**Verdict**: ✅ IGNORE - This shows the pattern format, not a real reference. Uses `:LINE` placeholder.

---

### 5. Historical Reference (IGNORE)

**Definition**: Documenting past state or migration information.

**Indicators**:

- Contains "Previously located at", "was at line", "moved from"
- In a changelog or migration notes
- Describes past state, not current navigation
- Used for historical context, not as current reference
- Part of documentation about refactoring history

**Example**:

```markdown
# Migration Notes

The authentication logic was previously at `auth.go:89` but has been
refactored into the new `AuthService` interface.
```

**Verdict**: ✅ IGNORE - This documents past state, not a current reference to use.

---

### 6. Tool Output Example (IGNORE)

**Definition**: Line numbers in example output from tools like grep, stack traces, or error messages.

**Indicators**:

- Inside a code block showing tool output
- Contains command prompts, line prefixes, or formatting from tools
- Shows grep results, stack traces, compiler errors
- Appears after "Output:", "Result:", "Error:" labels
- Mixed with tool-specific formatting (colors, indentation, line numbers)
- In a "debugging" or "troubleshooting" section showing error messages

**Example**:

````markdown
## Debugging Example

Run grep to find the function:

```bash
$ grep -n "validateInput" handlers/validate.go
234:func validateInput(data *Request) error {
245:}
```

The grep output shows the function at lines 234-245.
````

**Verdict**: ✅ IGNORE - These are line numbers from grep output, not hardcoded references.

**Another Example**:

````markdown
## Stack Trace Analysis

When the error occurs, you'll see:

```
Error at handlers/api.go:156
  Called from main.go:45
  Panic: invalid request
```
````

**Verdict**: ✅ IGNORE - This is a stack trace example showing error output format.

---

## Context Clues for Classification

### Genuine Issue Indicators

- Direct reference to specific code location
- In a "see also", "implementation", or "reference" section
- No explanation that it's an example or anti-pattern
- Used as navigation aid: "The code is at X"
- Not marked as wrong or problematic
- Not discussing line numbers as the topic
- Not in tool output or stack trace

### NOT an Issue Indicators

- Appears after "WRONG:", "Bad:", "❌", "Anti-pattern:" markers
- Surrounded by text explaining why line numbers are problematic
- In a before/after comparison showing the fix
- File named `*-template.md`, `*-example.md`, or `*-patterns.md`
- Inside a code block showing tool output (grep, stack trace, compiler error)
- Uses placeholder like `:LINE`, `:NNN`, `:XXX` instead of real number
- Part of the recommendation text itself (e.g., "use method signatures instead of file.go:123")
- In historical/migration notes ("was at line 89, now refactored")
- After "Output:", "Result:", "Error:", "Stack trace:" labels
- Contains command prompts or tool-specific formatting

## Reasoning Process

For each INFO-level candidate (line number pattern), ask:

1. **What is the reference's purpose?**
   - Navigation to current code? → Flag (genuine issue)
   - Teaching what NOT to do? → Ignore (bad example)
   - Discussing the problem? → Ignore (teaching content)
   - Tool output example? → Ignore (showing format)

2. **What markers are nearby?**
   - "WRONG:" or "❌" before it? → Ignore (bad example)
   - "Output:" or "Error:" before it? → Ignore (tool output)
   - Text explaining why line numbers are bad? → Ignore (teaching)
   - Nothing, just a reference? → Flag (genuine issue)

3. **Is there context explaining the line number?**
   - "This shows what NOT to do" → Ignore (example)
   - "Previously located at..." → Ignore (historical)
   - "The implementation is at..." → Flag (genuine reference)
   - Inside stack trace or grep output → Ignore (tool output)

4. **What file is this in?**
   - File named with "template", "example", "patterns"? → Likely ignore
   - Regular skill documentation? → Likely flag if no other context

## Examples in Practice

### False Positive #1: Bad practice example

```markdown
❌ WRONG: file.go:123-127 (becomes outdated)
```

- **Context**: After "WRONG:" marker
- **Classification**: Bad Practice Example
- **Verdict**: ✅ IGNORE

### False Positive #2: Teaching content

```markdown
Line numbers like file.go:45 become stale over time because every
code change causes drift.
```

- **Context**: Discussing why line numbers are problematic
- **Classification**: Teaching Content
- **Verdict**: ✅ IGNORE

### False Positive #3: Template pattern

```markdown
Replace file.go:LINE with method signature.
```

- **Context**: Uses `:LINE` placeholder, instructional
- **Classification**: Template/Placeholder Pattern
- **Verdict**: ✅ IGNORE

### False Positive #4: Tool output

````markdown
```bash
$ grep -n "func validateInput" handlers/validate.go
234:func validateInput(data *Request) error {
```
````

- **Context**: Grep output in code block
- **Classification**: Tool Output Example
- **Verdict**: ✅ IGNORE

### False Positive #5: Stack trace

```markdown
Error at handlers/api.go:156
Called from main.go:45
```

- **Context**: Error message showing stack trace
- **Classification**: Tool Output Example
- **Verdict**: ✅ IGNORE

### True Positive: Genuine reference

```markdown
# Implementation

The validation logic is in `handlers/validate.go:234-245`.
```

- **Context**: No indication this is teaching or example
- **Classification**: Genuine Line Number Reference
- **Verdict**: ❌ FLAG

**Fix**:

```markdown
# Implementation

The validation logic is in `handlers/validate.go` - `func validateInput(data *Request) error`
```

## Summary

Phase 24 requires **semantic reasoning** to distinguish:

| Category                | Flag? | Reason                                   |
| ----------------------- | ----- | ---------------------------------------- |
| Genuine line number ref | ❌    | Hardcoded navigation that will drift     |
| Bad practice example    | ✅    | Teaching what NOT to do                  |
| Teaching content        | ✅    | Discussing line numbers as the topic     |
| Template/placeholder    | ✅    | Shows format pattern, uses :LINE         |
| Historical reference    | ✅    | Documents past state, not current nav    |
| Tool output example     | ✅    | Grep, stack trace, compiler error output |

**Remember**: TypeScript provides candidates, Claude provides classification. False positives occur when regex is used for semantic tasks.

## Important Edge Cases

### The Skill's Own Documentation

The auditing-skills SKILL.md and phase-details.md THEMSELVES contain examples like:

```markdown
❌ file.go:123-127 (becomes outdated)
✅ file.go - func MethodName(...)
```

These are **teaching about the anti-pattern** and must NOT be flagged. Look for:

- The ❌ or "WRONG:" marker before the line number
- Comparison with ✅ or "RIGHT:" showing the correct pattern
- Context explaining why line numbers are problematic

### Pattern Documentation Files

Files named `*-patterns.md`, `*-templates.md`, `*-examples.md` often show placeholder patterns:

```markdown
file.go:LINE
file.go:NNN
file.go:XXX
```

These use placeholders (`:LINE`, `:NNN`, `:XXX`) instead of real numbers and are teaching the format.

### Tool Output in Debugging Sections

Sections titled "Debugging", "Troubleshooting", or "Error Analysis" often show tool output:

```
grep output: file.go:123
stack trace: handler.go:45
compiler error: main.go:67
```

These are examples of what tools produce, not hardcoded references for navigation.
