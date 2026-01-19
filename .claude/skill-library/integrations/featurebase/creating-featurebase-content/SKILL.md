---
name: creating-featurebase-content
description: Use when creating FeatureBase posts, changelog entries, or articles with proper YAML frontmatter templates and API synchronization
allowed-tools: Read, Write, AskUserQuestion, TodoWrite
---

# Creating FeatureBase Content

**Guided content creation with frontmatter templates and API synchronization.**

> **You MUST use TodoWrite** to track content creation phases.

---

## What This Skill Does

Guides creation of FeatureBase content with:

- **Template Selection**: Choose post/changelog/article with appropriate frontmatter
- **Required Fields**: Prompt for boardId, title, status, tags
- **File Creation**: Generate markdown with correct YAML frontmatter
- **Path Convention**: Follow naming pattern for sync compatibility
- **API Integration**: Optionally sync to FeatureBase immediately

**Why this matters:** Prevents validation errors, ensures sync compatibility, reduces manual frontmatter writing.

---

## When to Use

- User says "create a FeatureBase post"
- User says "add a changelog entry"
- User says "write a help article"
- User wants to create content for FeatureBase platform
- User needs template for markdown frontmatter

---

## Quick Reference

| Content Type | Required Fields | Optional Fields | File Path Pattern |
| --- | --- | --- | --- |
| **Post** | title, boardId | status, tags, upvotes | `posts/{slug}.md` |
| **Changelog** | title | publishedAt, tags | `changelog/{YYYY-MM-DD}-{slug}.md` |
| **Article** | title, category | slug, publishedAt | `help-center/{category}/{slug}.md` |

---

## Phase 1: Determine Content Type

Ask user via AskUserQuestion:

```
Question: What type of FeatureBase content do you want to create?
Header: Content type
Options:
  - Post (Feature request or feedback) - User-facing feedback posts that appear on the public roadmap
  - Changelog (Product update) - Release notes and product announcements
  - Article (Help documentation) - Knowledge base articles and guides
```

**Selection determines template and required fields.**

---

## Phase 2: Gather Required Fields

### For Posts

**Required fields:**
- `title` - Post title (e.g., "Improve asset discovery speed")
- `boardId` - Board identifier (e.g., "board_abc123")

**Optional fields:**
- `status` - Status label (e.g., "in-progress", "planned", "completed")
- `tags` - Category tags (array of strings)

Ask user via AskUserQuestion:

```
Question: What should the post title be?
Header: Title
(Free text input)

Question: Which board should this post belong to?
Header: Board
Options:
  - Feature Requests (board_features) - New feature ideas
  - Bug Reports (board_bugs) - Bug reports and issues
  - Improvements (board_improvements) - Enhancement suggestions
```

### For Changelog

**Required fields:**
- `title` - Changelog entry title

**Optional fields:**
- `publishedAt` - Publication date (defaults to current date)
- `tags` - Category tags

Ask user via AskUserQuestion:

```
Question: What is the changelog entry title?
Header: Title
(Free text input)

Question: When should this be published?
Header: Publish date
Options:
  - Now (today's date) (Recommended)
  - Specific date (you'll provide ISO 8601 format)
```

### For Articles

**Required fields:**
- `title` - Article title
- `category` - Article category (e.g., "getting-started", "troubleshooting")

**Optional fields:**
- `slug` - URL slug (defaults to slugified title)
- `publishedAt` - Publication date

Ask user via AskUserQuestion:

```
Question: What is the article title?
Header: Title
(Free text input)

Question: Which category does this article belong to?
Header: Category
Options:
  - Getting Started - Onboarding and basics
  - Troubleshooting - Problem-solving guides
  - Advanced - In-depth technical guides
  - API Documentation - API reference materials
```

---

## Phase 3: Generate Frontmatter

**See:** [Frontmatter Templates](references/frontmatter-templates.md) for complete template reference.

**Quick reference:**

- **Post**: Requires `title`, `boardId`; optional `status`, `tags`
- **Changelog**: Requires `title`; optional `publishedAt`, `tags`
- **Article**: Requires `title`, `category`; optional `slug`, `publishedAt`

**Note:** `featurebaseId` is NOT included initially. Added after API creation.

---

## Phase 4: Generate File Path

### Post Path

```bash
# Pattern: posts/{slug}.md
# Slug: lowercase, hyphenated, no special characters

# Example title: "Improve Asset Discovery Speed"
# Slug: "improve-asset-discovery-speed"
# Path: modules/chariot/docs/featurebase/posts/improve-asset-discovery-speed.md
```

**Slug generation rules:**
- Lowercase all characters
- Replace spaces with hyphens
- Remove special characters (except hyphens)
- No leading/trailing hyphens
- Maximum 80 characters

### Changelog Path

```bash
# Pattern: changelog/{YYYY-MM-DD}-{slug}.md

# Example title: "v2.5 Release - New Scanning Features"
# Date: 2026-01-14
# Slug: "v2-5-release-new-scanning-features"
# Path: modules/chariot/docs/featurebase/changelog/2026-01-14-v2-5-release-new-scanning-features.md
```

### Article Path

```bash
# Pattern: help-center/{category}/{slug}.md

# Example title: "Getting Started with Asset Discovery"
# Category: "getting-started"
# Slug: "getting-started-with-asset-discovery"
# Path: modules/chariot/docs/featurebase/help-center/getting-started/getting-started-with-asset-discovery.md
```

---

## Phase 5: Create Markdown File

### File Structure

```markdown
---
{frontmatter-from-phase-3}
---

# {title}

{content-placeholder}
```

**See:** [Frontmatter Templates](references/frontmatter-templates.md) for content placeholder examples.

---

## Phase 6: Sync to FeatureBase (Optional)

Ask user via AskUserQuestion:

```
Question: Would you like to sync this content to FeatureBase now?
Header: Sync
Options:
  - Yes, sync to API now (Recommended) - Creates content immediately and updates file with featurebaseId
  - No, save locally only - File will sync on next PR merge
```

### If "Yes, sync to API now":

**For posts:**

```typescript
import { createPost, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const result = await createPost.execute({
  title: frontmatter.title,
  boardId: frontmatter.boardId,
  status: frontmatter.status,
  content: markdownBody,
  tags: frontmatter.tags
}, client);

if (result.ok) {
  // Update file with returned featurebaseId
  const newFrontmatter = {
    ...frontmatter,
    featurebaseId: result.data.id,
    createdAt: result.data.createdAt,
    updatedAt: result.data.updatedAt
  };

  // Write updated file
  writeFileWithFrontmatter(filePath, newFrontmatter, markdownBody);

  console.log(`✅ Post created: ${result.data.id}`);
} else {
  console.error(`❌ Failed to create post: ${result.error.message}`);
}
```

**For changelog/articles:** Similar pattern using `createChangelog` or `createArticle` tools.

### If "No, save locally only":

File will be synced when:
- User creates PR with changes in `modules/chariot/docs/featurebase/`
- PR is merged to main
- `featurebase-push.yml` workflow executes
- `featurebaseId` is written back to file after creation

---

## Validation Rules

**See:** [Validation Rules](references/validation-rules.md) for complete validation logic.

**Quick reference:**

- **Title**: 5-200 characters, descriptive
- **BoardId**: `board_{alphanumeric}` pattern
- **Tags**: Array of lowercase-hyphenated strings, max 10
- **Slug**: `^[a-z0-9-]+$` pattern, 10-80 characters

---

## Error Handling

### Missing Required Fields

**Error**: User skips required field (title, boardId)

**Fix:**
- Re-prompt for missing field
- Don't proceed until all required fields provided
- Explain why field is required

### Invalid BoardId

**Error**: BoardId doesn't exist in FeatureBase

**Fix:**
- List available boards via `list-boards` MCP tool
- Ask user to select from valid options
- Update frontmatter with correct boardId

### API Creation Failure

**Error**: `createPost` returns error (network, validation, auth)

**Fix:**
- File is still created locally (not lost)
- User can fix issue and re-sync later
- Error message explains what went wrong
- File syncs automatically on next PR merge

### File Already Exists

**Error**: File path already exists

**Fix:**
- Append timestamp to filename: `{slug}-{timestamp}.md`
- Or ask user for different title
- Or ask if user wants to overwrite existing file

---

## Success Criteria

Content creation is successful when:

1. ✅ File created with valid YAML frontmatter
2. ✅ All required fields present
3. ✅ File path follows naming convention
4. ✅ Slug is URL-safe
5. ✅ Content synced to FeatureBase (if requested)
6. ✅ `featurebaseId` written back to file (if synced)
7. ✅ File ready for git commit

---

## Common Scenarios

### Scenario 1: Quick Post Creation

**User:** "Create a post about improving scan speed"

**Workflow:**
1. Ask content type → Post
2. Ask title → "Improve Scan Speed"
3. Ask boardId → "board_features"
4. Generate frontmatter with defaults (status: "open", no tags)
5. Create file at `posts/improve-scan-speed.md`
6. Ask sync → Yes
7. Call `createPost` MCP tool
8. Update file with `featurebaseId`
9. ✅ Done

### Scenario 2: Changelog with Specific Date

**User:** "Add changelog entry for v2.5 release on January 20th"

**Workflow:**
1. Ask content type → Changelog
2. Ask title → "v2.5 Release - New Features"
3. Ask publish date → Specific date
4. User provides → "2026-01-20"
5. Generate frontmatter with publishedAt: "2026-01-20T00:00:00Z"
6. Create file at `changelog/2026-01-20-v2-5-release-new-features.md`
7. Ask sync → No (will sync on PR merge)
8. ✅ Done

### Scenario 3: Help Article with Category

**User:** "Create a help article about setting up integrations"

**Workflow:**
1. Ask content type → Article
2. Ask title → "Setting Up Integrations"
3. Ask category → "getting-started"
4. Generate frontmatter with slug: "setting-up-integrations"
5. Create file at `help-center/getting-started/setting-up-integrations.md`
6. Ask sync → Yes
7. Call `createArticle` MCP tool
8. Update file with `featurebaseId`
9. ✅ Done

---

## Integration

### Called By

- User request: "create a FeatureBase post"
- `/featurebase create` command (if created)
- After `syncing-featurebase-content` pull (to create new content based on API data)

### Requires (invoke before starting)

| Skill | When | Purpose |
| --- | --- | --- |
| `using-todowrite` | Start | Track multi-phase creation workflow |

### Calls (during execution)

| Tool/Skill | Phase | Purpose |
| --- | --- | --- |
| create-post (MCP) | 6 | Sync post to API |
| create-changelog (MCP) | 6 | Sync changelog to API |
| create-article (MCP) | 6 | Sync article to API |

### Pairs With (conditional)

| Skill | Trigger | Purpose |
| --- | --- | --- |
| `syncing-featurebase-content` | After creation | Verify sync or handle conflicts |
| `troubleshooting-featurebase-sync` | Sync failure | Debug API errors |

---

## Related Skills

- `syncing-featurebase-content` - Bidirectional sync workflow
- `troubleshooting-featurebase-sync` - Debug sync failures

---

## References

- [Frontmatter Templates](references/frontmatter-templates.md) - Complete template reference
- [Content Examples](references/content-examples.md) - Real-world examples
- [Validation Rules](references/validation-rules.md) - Field validation details
