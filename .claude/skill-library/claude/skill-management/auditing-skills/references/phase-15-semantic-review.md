# Phase 15: Semantic Code Block Review

**Classification Categories for Code Block Quality**

Phase 15 is **Claude-Automated** - it requires semantic understanding without human input. TypeScript flags CANDIDATES (missing/mismatched tags), Claude REASONS about their nature.

## Overview

Phase 15 detects code blocks that may need language tags or have incorrect tags. However, not all missing/mismatched tags indicate genuine problems:

- **Template code** - Intentional placeholders users copy
- **Bad practice examples** - Shows what NOT to do
- **Output/console text** - Command output, not code
- **Pseudo-code** - Algorithm steps, not real code
- **Meta-discussion** - Discussing code blocks as a topic

This reference explains how to distinguish genuine issues from false positives.

## Detection Strategy

### TypeScript (Deterministic)

The phase15 TypeScript implementation flags:

1. **Missing language tags** → INFO severity (candidate for review)
2. **Mismatched tags** (tagged as `bash` but pattern suggests `typescript`) → INFO severity
3. **Unknown language tags** → INFO severity
4. **Long lines** (>120 chars) → WARNING severity (deterministic)

These are **candidates** that require semantic reasoning (except long lines).

### Claude Reasoning (Semantic)

Claude must classify each flagged code block into one of these categories:

## Classification Categories

### 1. Genuine Missing Tag (FLAG)

**Definition**: Code block that should have a language tag for syntax highlighting.

**Indicators**:

- Real code that would benefit from syntax highlighting
- In a "how to" section showing implementation
- No surrounding explanation that it's output/pseudo-code
- Not in a template or example file
- Not demonstrating what NOT to do

**Example**:

```markdown
# API Implementation

Use this pattern for all API calls:
```

async function fetchData() {
const response = await fetch(endpoint);
return response.json();
}

```

```

**Verdict**: ❌ FLAG - This should be tagged as ```typescript for syntax highlighting.

---

### 2. Genuine Mismatch (FLAG)

**Definition**: Language tag doesn't match content and it's not intentional.

**Indicators**:

- Tagged as one language but clearly another
- Not in a comparison or teaching section
- No explanation for the mismatch
- Would confuse readers with wrong syntax highlighting

**Example**:

````markdown
# TypeScript Patterns

```bash
import { useState } from 'react';

function Component() {
  const [state, setState] = useState(0);
}
```
````

**Verdict**: ❌ FLAG - This is TypeScript code, not bash. Tag should be ```typescript.

---

### 3. Output/Console (IGNORE)

**Definition**: Command output, logs, or terminal text that isn't executable code.

**Indicators**:

- Appears after "Output:", "Result:", "Response:"
- Contains timestamps, log levels, or console formatting
- Shows command execution results
- Has prompts like `$`, `>`, or line prefixes
- Mixed text and data, not pure code

**Example**:

````markdown
Run the command:

```bash
npm run audit
```

Output:

```
Auditing 50 skills...
✓ Phase 1: passed
✓ Phase 2: passed
⚠ Phase 15: 3 code blocks need review
Done in 2.3s
```
````

**Verdict**: ✅ IGNORE - This is console output showing results, not code to execute.

---

### 4. Pseudo-code (IGNORE)

**Definition**: Algorithm steps or conceptual flow, not real executable code.

**Indicators**:

- In an "Algorithm:" or "Process:" section
- Uses plain English mixed with code-like syntax
- Steps numbered or bulleted
- Not valid syntax in any language
- Explains logic at high level

**Example**:

````markdown
## Algorithm

```
1. Read file content
2. For each line:
   - Check if matches pattern
   - If match, extract data
3. Return results
```
````

**Verdict**: ✅ IGNORE - This is pseudo-code showing algorithm steps, not real code.

---

### 5. Bad Practice Example (IGNORE)

**Definition**: Shows what NOT to do, used for teaching by contrast.

**Indicators**:

- Appears after "WRONG:", "Bad:", "❌", or "Anti-pattern:"
- In a comparison with "RIGHT:" or "✅"
- Explicitly labeled as poor practice
- Used to teach by showing mistakes
- May be intentionally broken or incorrect

**Example**:

````markdown
## Phase Numbering

❌ **WRONG**: Using fractional phase numbers

```
Phase 3.5: Additional validation
Phase 5.2: Extra checks
```

✅ **RIGHT**: Sequential integer phases

```markdown
Phase 4: Additional validation
Phase 6: Extra checks
```
````

**Verdict**: ✅ IGNORE - The first block is an example of what NOT to do.

---

### 6. Template Placeholder (IGNORE)

**Definition**: Intentional placeholder in template files for users to fill in.

**Indicators**:

- File named `*-template.md` or `*-example.md`
- Contains `// TODO: Implement` or similar in code
- Describes what template shows
- Provides structure for users to customize
- Surrounding text says "template" or "placeholder"

**Example**:

````markdown
# integration-template.md

## Basic Pattern

```typescript
async function callAPI() {
  // TODO: Implement actual API call
  const endpoint = "YOUR_ENDPOINT_HERE";
  const response = await fetch(endpoint);
  return response.json();
}
```

Replace the TODO with your implementation.
````

**Verdict**: ✅ IGNORE - This is intentional template code for users to customize.

---

### 7. Multi-language/Mixed (IGNORE)

**Definition**: Intentionally shows multiple languages or mixed content.

**Indicators**:

- Demonstrates shell commands + JSON responses
- Shows request/response pairs
- Compares syntax across languages
- Explains integration between systems
- Context makes clear it's intentionally mixed

**Example**:

````markdown
## API Testing

Send request:

```bash
curl -X POST https://api.example.com/data \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

Response:

```
{
  "status": "success",
  "data": {...}
}
```
````

**Verdict**: ✅ IGNORE - The response block is intentionally untagged to show raw output.

---

### 8. Meta-discussion (IGNORE)

**Definition**: Code blocks used to discuss code block syntax itself.

**Indicators**:

- Talks ABOUT markdown code block syntax
- Teaching how to write code fences
- Meta-discussion of documentation
- Examples showing backtick syntax
- Analyzing documentation practices

**Example**:

````markdown
# Code Block Best Practices

Always tag your code blocks with language:

````
```typescript
function example() {}
````

```

Never use generic code fences:

```

```
function example() {}
```

```

```
````

**Verdict**: ✅ IGNORE - This discusses code block syntax as the subject matter.

---

## Context Clues for Classification

### Genuine Issue Indicators

- No surrounding explanation of purpose
- In a "how to" section that needs syntax highlighting
- Real executable code
- Would benefit from proper language detection
- Not in template/example file
- Not marked as wrong/bad practice

### NOT an Issue Indicators

- Appears after "WRONG:", "Bad:", "❌" markers
- File named `*-template.md` or `*-example.md`
- Surrounded by text explaining it's output/pseudo-code
- Shows console output with timestamps/prompts
- In a comparison showing multiple approaches
- Content is clearly console output (prompts, log format)
- Contains TODO comments in template context
- Discusses code block syntax itself

## Reasoning Process

For each INFO-level candidate (missing/mismatched tag), ask:

1. **What is the block's purpose?**
   - Template for users? → Ignore
   - Real code example? → Flag if missing tag
   - Console output? → Ignore
   - Teaching what NOT to do? → Ignore

2. **What does the content represent?**
   - Executable code? → Should have language tag
   - Algorithm/pseudo-code? → Ignore
   - Command output? → Ignore
   - Placeholder? → Check if template file

3. **Is there context explaining minimal tagging?**
   - "Output:" or "Result:" prefix → Ignore (console)
   - "WRONG:" or "❌" marker → Ignore (bad example)
   - Template file name → Ignore (placeholder)
   - No explanation, just code → Flag (genuine issue)

## Examples in Practice

### False Positive #1: integration-template.md

````markdown
```typescript
// TODO: Implement actual API call
```
````

- **Context**: In a file named "template"
- **Classification**: Template Placeholder
- **Verdict**: ✅ IGNORE

### False Positive #2: command output

````markdown
Output:

```
Auditing skills...
✓ Phase 1: passed
```
````

- **Context**: After "Output:" label
- **Classification**: Output/Console
- **Verdict**: ✅ IGNORE

### False Positive #3: bad practice example

````markdown
❌ WRONG:

```
Phase 3.5: Extra validation
```

✅ RIGHT:

```markdown
Phase 4: Extra validation
```
````

- **Context**: After "WRONG:" marker
- **Classification**: Bad Practice Example
- **Verdict**: ✅ IGNORE for first block

### True Positive #1: missing tag

````markdown
# API Implementation

```
async function fetchData() {
  return await fetch(url);
}
```
````

- **Context**: No indication this is template/output
- **Classification**: Genuine Missing Tag
- **Verdict**: ❌ FLAG - Should be ```typescript

### True Positive #2: mismatched tag

````markdown
# Shell Scripts

```typescript
#!/bin/bash
echo "Hello World"
```
````

- **Context**: Clearly bash code, tagged as typescript
- **Classification**: Genuine Mismatch
- **Verdict**: ❌ FLAG - Should be ```bash

## Summary

Phase 15 requires **semantic reasoning** to distinguish:

| Category             | Flag? | Reason                                 |
| -------------------- | ----- | -------------------------------------- |
| Genuine missing tag  | ❌    | Real code needs syntax highlighting    |
| Genuine mismatch     | ❌    | Wrong tag confuses readers             |
| Output/console       | ✅    | Not executable code                    |
| Pseudo-code          | ✅    | Algorithm steps, not real code         |
| Bad practice example | ✅    | Teaching what NOT to do                |
| Template placeholder | ✅    | Intentional for users to fill in       |
| Multi-language/mixed | ✅    | Intentionally shows multiple languages |
| Meta-discussion      | ✅    | Code blocks are the subject matter     |

**Remember**: TypeScript provides candidates, Claude provides classification. False positives occur when regex is used for semantic tasks.
