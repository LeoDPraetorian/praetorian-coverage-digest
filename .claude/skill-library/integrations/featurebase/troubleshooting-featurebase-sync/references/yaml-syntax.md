# YAML Syntax Guide

**Common YAML syntax errors and fixes for FeatureBase frontmatter.**

---

## Valid YAML Structure

```yaml
---
# Opening marker (3 hyphens)
title: "Post Title"
boardId: "board_abc123"
status: "open"
tags:
  - tag1
  - tag2
createdAt: "2026-01-14T10:00:00Z"
---
# Closing marker (3 hyphens)
```

**Critical rules:**
- Must start with `---`
- Must end with `---`
- Proper indentation (2 spaces per level)
- Arrays use `- ` prefix with consistent indentation
- Strings with special characters must be quoted

---

## Common Error 1: Missing Closing Marker

**Invalid:**

```yaml
---
title: My Post
```

**Error message:** `unexpected end of stream`

**Fix:**

```yaml
---
title: My Post
---
```

---

## Common Error 2: Invalid Field Types

**Invalid:**

```yaml
---
tags: security  # Should be array
---
```

**Error message:** `tags must be an array`

**Fix:**

```yaml
---
tags:
  - security
---
```

---

## Common Error 3: Unquoted Special Characters

**Characters requiring quotes:** `: ! @ # % & * [ ] { } < > ? |`

**Invalid:**

```yaml
---
title: Post: A Guide  # Colon breaks parsing
---
```

**Error message:** `mapping values are not allowed here`

**Fix:**

```yaml
---
title: "Post: A Guide"
---
```

**Other examples:**

```yaml
# Email addresses
author: "user@example.com"

# URLs
url: "https://example.com"

# Questions
question: "How do I?"

# Punctuation
title: "Feature #123: Enhancement"
```

---

## Common Error 4: Indentation Issues

**Invalid:**

```yaml
---
tags:
- security
  - bug  # Wrong indentation
---
```

**Error message:** `bad indentation`

**Fix:**

```yaml
---
tags:
  - security
  - bug
---
```

**Rule:** All array items at same indentation level (2 spaces per level).

---

## Common Error 5: Tab Characters

**Invalid:**

```yaml
---
title: My Post
→tags:  # Tab character
  - security
---
```

**Error message:** `found a tab character that violates indentation`

**Fix:**

```yaml
---
title: My Post
  tags:  # 2 spaces, not tab
  - security
---
```

**Rule:** Never use tabs, only spaces for indentation.

---

## Common Error 6: Duplicate Keys

**Invalid:**

```yaml
---
title: First Title
status: open
title: Second Title  # Duplicate key
---
```

**Error message:** `duplicated mapping key`

**Fix:**

```yaml
---
title: Second Title
status: open
---
```

---

## Common Error 7: Boolean/Null Values

**YAML interprets certain strings as booleans:**

- `true`, `false`, `yes`, `no`, `on`, `off`
- `null`, `~`

**Invalid (if you want the literal string "yes"):**

```yaml
---
status: yes  # Parsed as boolean true
---
```

**Fix:**

```yaml
---
status: "yes"  # Quoted to preserve string
---
```

---

## Common Error 8: Dates Without Quotes

**YAML may mis-parse dates:**

**Invalid:**

```yaml
---
version: 2.5  # Parsed as number, not string
---
```

**If you need string "2.5":**

```yaml
---
version: "2.5"
---
```

---

## Validation Commands

### Local Validation

```bash
# Run FeatureBase frontmatter validator
npx tsx .github/scripts/validate-frontmatter.ts

# Validates:
# - YAML syntax correctness
# - Required fields present
# - Field types correct
# - No prototype pollution patterns
```

### Generic YAML Validator

```bash
# Install yaml-validator (if needed)
npm install -g yaml-validator

# Validate YAML file
yaml-validator modules/chariot/docs/featurebase/posts/my-post.md
```

### Manual YAML Testing

```bash
# Test YAML parsing with Node.js
npx tsx -e "
import yaml from 'js-yaml';
import fs from 'fs';

const content = fs.readFileSync('path/to/file.md', 'utf-8');
const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);

if (!match) {
  console.error('No frontmatter found');
  process.exit(1);
}

try {
  const parsed = yaml.load(match[1], { schema: yaml.SAFE_SCHEMA });
  console.log('✅ Valid YAML');
  console.log(JSON.stringify(parsed, null, 2));
} catch (err) {
  console.error('❌ Invalid YAML:', err.message);
  process.exit(1);
}
"
```

---

## Reference

- YAML Specification: https://yaml.org/spec/1.2.2/
- js-yaml Documentation: https://github.com/nodeca/js-yaml
