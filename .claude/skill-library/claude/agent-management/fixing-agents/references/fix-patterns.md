# Fix Patterns (Detailed)

Reference file for fixing-agents - detailed patterns for each fix type.

---

## Auto-Fix 1: Block Scalar to Single-Line

**Detection:** Audit reports "Block scalar pipe/folded detected"

**Pattern:**

```yaml
# BEFORE (BROKEN)
description: |
  Use when developing React applications.
  Handles components and UI bugs.

# AFTER (FIXED)
description: Use when developing React applications - components, UI bugs.
```

**Algorithm:**

1. Find description field in frontmatter
2. Check if it uses `|` or `>`
3. Read the multiline content after the block scalar
4. Convert newlines to single line:
   - Join lines with spaces or dashes
   - Preserve paragraph breaks with `\n\n`
5. Replace with single-line format using Edit tool

**Example conversion:**

```yaml
# Content after |:
  Use when developing React applications.
  Handles components, UI bugs, and performance.

  <example>
  user: "Create dashboard"
  </example>

# Converted to:
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nuser: "Create dashboard"\n</example>
```

**Edge cases:**

- Preserve `<example>` blocks with `\n` escapes
- Preserve intent of paragraph breaks
- Remove excessive whitespace
- Keep content semantically equivalent

### Detailed Conversion Algorithm

**Input:**

```yaml
description: |
  Use when developing React applications.
  Handles components, UI bugs, and performance.

  <example>
  Context: Building dashboard
  user: "Create metrics dashboard"
  assistant: "I'll use react-developer"
  </example>
```

**Steps:**

1. Extract lines after `|`
2. Identify paragraphs (separated by blank lines)
3. Convert:
   - Line breaks within paragraphs → spaces or dashes
   - Paragraph breaks → `\n\n`
   - `<example>` blocks → `\n<example>\n...\n</example>`
4. Create single-line string

**Output:**

```yaml
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: Building dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

**Edge case - Folded scalar (>):**

```yaml
description: >
  Use when developing React applications.
```

Same algorithm - convert to single-line.

---

## Auto-Fix 2: Name Mismatch

**Detection:** Audit reports "Name mismatch: frontmatter has X, filename is Y"

**Pattern:**

```yaml
# File: frontend-developer.md

# BEFORE (BROKEN)
name: frontend-dev

# AFTER (FIXED)
name: frontend-developer
```

**Algorithm:**

1. Extract filename (without `.md` extension)
2. Read frontmatter name field
3. If different, update frontmatter to match filename
4. Use Edit tool to replace

**Why update frontmatter (not rename file):**

- Filename is the source of truth (used by file system)
- Renaming file requires updating all references
- Updating frontmatter is simpler and safer

**Example:**

```typescript
Edit({
  file_path: ".claude/agents/development/frontend-developer.md",
  old_string: "name: frontend-dev",
  new_string: "name: frontend-developer",
});
```

**Why filename is authoritative:**

- File system uses filename
- Git tracks by filename
- References use filename
- Updating frontmatter is safer than renaming

---

## Manual-Fix 1: Missing Description

**Detection:** Audit reports "Missing description field"

**Current state:**

```yaml
---
name: my-agent
tools: Read, Write
# ← No description field at all
---
```

**Workflow:**

1. Analyze agent file to understand purpose
2. Suggest description based on:
   - Agent name
   - Tools used
   - Body content (if any)
3. AskUserQuestion for description:

   ```
   "The agent needs a description. Based on the file, I suggest:

    'Use when [inferred purpose] - [inferred capabilities]'

    Use this description, or provide your own?"
   ```

4. Insert description field in frontmatter
5. Use Edit tool to add

**Example:**

```typescript
// User provides: "Use when analyzing code complexity - metrics, reports, recommendations"

Edit({
  file_path: ".claude/agents/analysis/my-agent.md",
  old_string: "---\nname: my-agent\ntools: Read, Write",
  new_string:
    "---\nname: my-agent\ndescription: Use when analyzing code complexity - metrics, reports, recommendations.\ntools: Read, Write",
});
```

**Insertion point:** After `name:` field, before `tools:` or other fields

**Field order (standard):**

1. name
2. description
3. type (optional)
4. color (optional)
5. permissionMode (optional)
6. tools
7. skills
8. model

---

## Manual-Fix 2: Empty Description

**Detection:** Audit reports "Empty description"

**Current state:**

```yaml
---
name: my-agent
description: # ← Field exists but empty
tools: Read, Write
---
```

**Workflow:** Same as Missing Description

1. Suggest description based on context
2. Get user input
3. Update empty field with content
4. Use Edit tool to replace

**Example:**

```typescript
Edit({
  file_path: ".claude/agents/development/my-agent.md",
  old_string: "description:",
  new_string: "description: Use when developing backend APIs - Go, REST, DynamoDB.",
});
```

**Simpler than missing:** Just replace empty value, field already exists.
