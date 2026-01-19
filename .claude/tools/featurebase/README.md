# FeatureBase MCP Tools

MCP wrappers for FeatureBase API with bidirectional sync between GitHub and FeatureBase platform.

## Features

- **Posts Operations:** list, get, create, update, delete
- **Changelog Operations:** list, create, update, delete
- **Articles Operations:** list, get, create, update, delete
- **Markdown Sync:** Convert between FeatureBase API and markdown files with YAML frontmatter
- **Token Optimization:** ~95% reduction vs direct API calls
- **Type Safety:** Full TypeScript with Zod validation

## Installation

Credentials are managed via `.claude/tools/config/credentials.json`:

```json
{
  "featurebase": {
    "apiKey": "${FEATUREBASE_API_KEY}"
  }
}
```

Set environment variable:
```bash
export FEATUREBASE_API_KEY="sk_live_..."
```

## Usage

### List Posts

```typescript
import { listPosts, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const result = await listPosts.execute({
  limit: 10,
  boardId: 'board_abc',
  status: 'in-progress'
}, client);

if (result.ok) {
  console.log(result.data.posts);
} else {
  console.error(result.error.message);
}
```

### Markdown Sync (Bidirectional)

#### Sync from API to Markdown

Convert FeatureBase data to markdown files with YAML frontmatter:

```typescript
import { syncToMarkdown, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const result = await syncToMarkdown({
  outputDir: './docs/featurebase',
  types: ['posts', 'changelog', 'articles'],
  limit: 100  // Optional: items per type
}, client);

console.log(`Wrote ${result.filesWritten} files`);
```

**Output structure:**
```
docs/featurebase/
├── posts/
│   └── post_abc123-my-feature-request.md
├── changelog/
│   └── changelog_xyz789-v2-release.md
└── articles/
    └── article_def456-getting-started.md
```

#### Sync from Markdown to API

Update FeatureBase from local markdown files:

```typescript
import { syncFromMarkdown, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const result = await syncFromMarkdown({
  inputDir: './docs/featurebase',
  types: ['posts', 'changelog', 'articles']
}, client);

console.log(`Processed ${result.filesProcessed} files`);
console.log(`Created ${result.created}, Updated ${result.updated}`);
console.log(`Conflicts: ${result.conflicts?.length || 0}`);
```

**Conflict detection:** If FeatureBase has newer changes (updatedAt > local updatedAt), the update is skipped and logged in `result.conflicts`.

#### File Format

Markdown files use YAML frontmatter + markdown body:

```markdown
---
featurebaseId: post_abc123
title: My Feature Request
status: in-progress
boardId: board_def456
createdAt: 2026-01-12T10:00:00Z
updatedAt: 2026-01-12T11:00:00Z
upvotes: 42
tags:
  - feature
  - ui
syncedAt: 2026-01-13T09:00:00Z
---

# Feature Description

This is the post body content in markdown format.

## Requirements
- Requirement 1
- Requirement 2
```

#### Frontmatter Fields

**Posts:**
- `featurebaseId` (string): Post ID from FeatureBase
- `title` (string): Post title
- `status` (string): Status label (e.g., 'in-progress', 'complete')
- `boardId` (string): Board ID
- `createdAt` (ISO 8601): Creation timestamp
- `updatedAt` (ISO 8601): Last update timestamp
- `upvotes` (number): Upvote count
- `tags` (string[]): Tag list
- `syncedAt` (ISO 8601): Last sync timestamp

**Changelog:**
- `featurebaseId` (string): Changelog entry ID
- `title` (string): Entry title
- `publishedAt` (ISO 8601): Publication timestamp
- `updatedAt` (ISO 8601): Last update timestamp
- `tags` (string[]): Tag list
- `syncedAt` (ISO 8601): Last sync timestamp

**Articles:**
- `featurebaseId` (string): Article ID
- `title` (string): Article title
- `category` (string): Article category
- `slug` (string): URL slug
- `publishedAt` (ISO 8601): Publication timestamp
- `updatedAt` (ISO 8601): Last update timestamp
- `syncedAt` (ISO 8601): Last sync timestamp

## Testing

```bash
npm test -- featurebase                    # Run featurebase tests
npm run test:coverage -- featurebase       # Coverage report (90%+ achieved)
```

**Test suite:**
- 103 tests passing
- 90.18% statement coverage
- 88.88% function coverage
- Unit tests for all operations
- Integration tests for round-trip sync

## Architecture

- **HTTP Client:** Ky-based client with Bearer auth
- **Validation:** Zod schemas for all inputs/outputs
- **Error Handling:** HTTPResult discriminated union
- **Token Optimization:** Response filtering, field selection
- **Testing:** Vitest with MSW mocking

## File Structure

```
featurebase/
├── index.ts                    # Progressive loading exports
├── client.ts                   # HTTP client factory
├── list-posts.ts               # Posts list operation
├── get-post.ts                 # Posts get operation
├── create-post.ts              # Posts create operation
├── update-post.ts              # Posts update operation
├── delete-post.ts              # Posts delete operation
├── list-changelog.ts           # Changelog list operation
├── create-changelog.ts         # Changelog create operation
├── sync-to-markdown.ts         # API → markdown sync
├── sync-from-markdown.ts       # markdown → API sync
├── internal/                   # Internal utilities
│   ├── slug.ts                 # Slug generation (filenames)
│   └── frontmatter.ts          # YAML frontmatter parsing/serialization
├── package.json                # Dependencies
├── vitest.config.ts            # Test configuration
└── __tests__/                  # Test suites
    ├── *.unit.test.ts          # Unit tests (95 tests)
    └── *.integration.test.ts   # Integration tests (8 tests)
```

## Markdown Sync Workflow

1. **Initial Sync:** `syncToMarkdown` fetches from FeatureBase → writes markdown files
2. **Local Editing:** Edit markdown files with your preferred editor
3. **Push Changes:** `syncFromMarkdown` reads markdown → updates FeatureBase
4. **Conflict Detection:** Skips updates if FeatureBase has newer changes
5. **Re-sync:** Run `syncToMarkdown` again to pull latest changes

**Recommended workflow:**
```bash
# 1. Pull latest from FeatureBase
npx tsx -e "import('./sync-to-markdown.js').then(m => m.syncToMarkdown(...))"

# 2. Edit markdown files locally
vim docs/featurebase/posts/post_abc123-feature.md

# 3. Push changes back to FeatureBase
npx tsx -e "import('./sync-from-markdown.js').then(m => m.syncFromMarkdown(...))"
```
