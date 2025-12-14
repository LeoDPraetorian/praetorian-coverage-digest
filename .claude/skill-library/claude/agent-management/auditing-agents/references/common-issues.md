# Common Issues & Fixes

Detailed troubleshooting for critical agent discovery issues.

---

## Issue 1: Block Scalar Pipe (`|`)

**Symptom:**
```
Block scalar pipe detected (line 5)
  Description uses | (pipe) - Claude sees literal "|", not content
```

**Cause:**
```yaml
# BROKEN - Claude sees description as literally "|"
description: |
  Use when developing React applications.
```

**Fix:**
```yaml
# WORKING - Claude sees the full description
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

**How to fix:**
1. Read agent file
2. Find description with `|`
3. Convert to single-line with `\n` escapes
4. Use Edit tool to replace
5. Re-audit to verify

## Issue 2: Block Scalar Folded (`>`)

**Symptom:**
```
Block scalar folded detected (line 5)
  Description uses > (folded) - Claude sees literal ">", not content
```

**Cause:**
```yaml
# BROKEN - Claude sees description as literally ">"
description: >
  Use when developing React applications.
```

**Fix:** Same as Issue 1 - convert to single-line format.

## Issue 3: Name Mismatch

**Symptom:**
```
Name mismatch (line 3)
  Frontmatter name: "frontend-dev"
  Filename: "frontend-developer"
```

**Cause:**
```yaml
# File: frontend-developer.md
---
name: frontend-dev  # ← Doesn't match filename
---
```

**Fix options:**
1. **Update frontmatter** (preferred):
   ```yaml
   name: frontend-developer  # ← Now matches
   ```

2. **Rename file** (if frontmatter name is better):
   ```bash
   mv frontend-developer.md frontend-dev.md
   ```

## Issue 4: Missing Description

**Symptom:**
```
Missing description field
  No description field found in frontmatter
```

**Cause:**
```yaml
---
name: my-agent
tools: Read, Write
# ← No description field
---
```

**Fix:**
```yaml
---
name: my-agent
description: Use when [trigger] - [capabilities]
tools: Read, Write
---
```

## Issue 5: Empty Description

**Symptom:**
```
Empty description (line 4)
  Description field exists but is empty
```

**Cause:**
```yaml
---
name: my-agent
description:   # ← Empty value
tools: Read, Write
---
```

**Fix:**
```yaml
---
name: my-agent
description: Use when [specific trigger] - [specific capabilities]
tools: Read, Write
---
```
