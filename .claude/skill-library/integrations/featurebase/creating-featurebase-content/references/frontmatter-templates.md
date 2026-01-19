# Frontmatter Templates

**Complete YAML frontmatter templates for all FeatureBase content types.**

---

## Post Template

```yaml
---
title: "{user-provided-title}"
boardId: "{user-provided-boardId}"
status: "{user-provided-status or 'open'}"
tags:
  - "{user-provided-tag-1}"
  - "{user-provided-tag-2}"
createdAt: "{current-iso8601-timestamp}"
updatedAt: "{current-iso8601-timestamp}"
---
```

**Required fields:**
- `title` - Post title
- `boardId` - Board identifier

**Optional fields:**
- `status` - Status label (defaults to "open")
- `tags` - Category tags (array)
- `upvotes` - Vote count (set by API)
- `commentCount` - Comment count (set by API)

**Note:** `featurebaseId` is NOT included initially. Added after API creation.

---

## Changelog Template

```yaml
---
title: "{user-provided-title}"
publishedAt: "{user-provided-date or current-iso8601-timestamp}"
tags:
  - "{user-provided-tag-1}"
createdAt: "{current-iso8601-timestamp}"
updatedAt: "{current-iso8601-timestamp}"
---
```

**Required fields:**
- `title` - Changelog entry title

**Optional fields:**
- `publishedAt` - Publication date (defaults to current)
- `tags` - Category tags

---

## Article Template

```yaml
---
title: "{user-provided-title}"
category: "{user-provided-category}"
slug: "{slugified-title}"
publishedAt: "{user-provided-date or current-iso8601-timestamp}"
createdAt: "{current-iso8601-timestamp}"
updatedAt: "{current-iso8601-timestamp}"
---
```

**Required fields:**
- `title` - Article title
- `category` - Article category

**Optional fields:**
- `slug` - URL slug (defaults to slugified title)
- `publishedAt` - Publication date

---

## Slug Generation Rules

**Pattern:** `^[a-z0-9-]+$`

**Algorithm:**
1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove special characters (keep hyphens and alphanumeric)
4. Remove leading/trailing hyphens
5. Collapse multiple hyphens to single hyphen
6. Truncate to 80 characters maximum

**Examples:**

| Title | Slug |
| --- | --- |
| "Improve Asset Discovery Speed" | `improve-asset-discovery-speed` |
| "v2.5 Release - New Features" | `v2-5-release-new-features` |
| "Getting Started with API" | `getting-started-with-api` |
| "Support for OAuth 2.0 Authentication" | `support-for-oauth-2-0-authentication` |

---

## File Path Patterns

### Post Path

```
modules/chariot/docs/featurebase/posts/{slug}.md
```

**Example:**
- Title: "Improve Scan Speed"
- Slug: `improve-scan-speed`
- Path: `modules/chariot/docs/featurebase/posts/improve-scan-speed.md`

### Changelog Path

```
modules/chariot/docs/featurebase/changelog/{YYYY-MM-DD}-{slug}.md
```

**Example:**
- Title: "v2.5 Release"
- Date: 2026-01-14
- Slug: `v2-5-release`
- Path: `modules/chariot/docs/featurebase/changelog/2026-01-14-v2-5-release.md`

### Article Path

```
modules/chariot/docs/featurebase/help-center/{category}/{slug}.md
```

**Example:**
- Title: "Setting Up Integrations"
- Category: "getting-started"
- Slug: `setting-up-integrations`
- Path: `modules/chariot/docs/featurebase/help-center/getting-started/setting-up-integrations.md`

---

## Content Placeholders

### Post Content Template

```markdown
## Problem

Describe the problem or feature request...

## Proposed Solution

Explain how this should work...

## Benefits

- Benefit 1
- Benefit 2

## Additional Context

Any additional information...
```

### Changelog Content Template

```markdown
## What's New

- Feature 1: Brief description
- Feature 2: Brief description

## Improvements

- Enhancement 1: What improved
- Enhancement 2: What improved

## Bug Fixes

- Fix 1: What was fixed
- Fix 2: What was fixed

## Breaking Changes

- Change 1: Migration steps
```

### Article Content Template

```markdown
## Overview

Brief introduction to the topic...

## Prerequisites

- Requirement 1
- Requirement 2

## Step-by-Step Guide

### Step 1: [Action]

Instructions...

### Step 2: [Action]

Instructions...

## Troubleshooting

### Issue: [Problem]

**Solution:** ...

## Related Articles

- [Article 1](#)
- [Article 2](#)
```
