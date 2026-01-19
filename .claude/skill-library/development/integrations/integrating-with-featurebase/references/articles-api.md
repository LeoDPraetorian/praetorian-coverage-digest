# FeatureBase Articles API Documentation

## Overview

The FeatureBase Articles API provides complete CRUD operations for managing help center articles. Articles are used to create comprehensive documentation, guides, tutorials, and knowledge base content for users. This documentation is extracted from the MCP tool implementations in `.claude/tools/featurebase/`.

**Base URL**: `https://do.featurebase.app`

**Authentication**: API Key authentication via `X-API-Key` header

**API Version**: v2

---

## Authentication Configuration

All articles API requests use the HTTPPort client with the following configuration:

```typescript
import { createFeaturebaseClient } from '.claude/tools/featurebase';

// Create authenticated client
const client = createFeaturebaseClient({
  apiKey: 'your-api-key-here'
});

// Or load from config
const client = createFeaturebaseClient(); // Loads from .claude/tools/config/
```

**HTTP Client Configuration**:
- Base URL: `https://do.featurebase.app`
- Authentication: API key in `X-API-Key` header
- Timeout: 30 seconds
- Retry: 3 attempts on 408, 429, 5xx errors
- Methods: GET, POST, PUT, DELETE

---

## List Articles

**Endpoint**: `GET /v2/help_center/articles`

**Purpose**: Fetch a paginated list of help center articles with optional filtering by category, tags, and search query.

### Request Parameters

```typescript
interface ListArticlesInput {
  limit?: number;          // 1-100, default: 10
  cursor?: string;         // Pagination cursor (optional)
  category?: string;       // Filter by category (optional)
  tags?: string[];         // Filter by tag names (optional)
  q?: string;             // Search query for title/content (optional)
}
```

**Parameter Details**:
- `limit`: Number of articles to return (1-100). Default: 10
- `cursor`: Pagination cursor from previous response (cursor-based pagination)
- `category`: Category name or ID to filter by
- `tags`: Array of tag names to filter by (joined with commas in query string)
- `q`: Search query string (sanitized for control characters)

### Query String Construction

```typescript
// Build query params
const searchParams: Record<string, string | number> = {
  limit: 10,
};

if (cursor) searchParams.cursor = cursor;
if (category) searchParams.category = category;
if (tags) searchParams.tags = tags.join(','); // ['guide', 'setup'] -> 'guide,setup'
if (q) searchParams.q = q;
```

### Response Schema

**Note:** The API returns articles in the `data` field (not `results`). The wrapper handles both formats for backwards compatibility.

```typescript
interface ListArticlesResponse {
  object: "list";
  data: Array<{           // API uses 'data', not 'results'
    id: string;
    slug: string;
    title: string;
    content: string;
    category: string;
    publishedAt: string;      // ISO 8601 date
    updatedAt?: string;       // ISO 8601 date
    tags?: string[];
    author?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  // Note: Pagination fields may vary - wrapper normalizes to consistent format
}
```

### Output (Token Optimized)

```typescript
interface ListArticlesOutput {
  articles: Array<{
    id: string;
    slug: string;
    title: string;
    content: string;          // Truncated to 500 chars for optimization
    category: string;
    publishedAt: string;
    updatedAt?: string;
    tags?: string[];
  }>;
  nextCursor: string | null;  // Pagination cursor for next page
  totalCount: number;
  estimatedTokens: number;
}
```

### Code Example

```typescript
import { listArticles } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

// List first 10 articles
const result = await listArticles.execute(
  {
    limit: 10,
    category: 'getting-started',
    tags: ['tutorial', 'beginner'],
    q: 'authentication'
  },
  client
);

console.log(`Found ${result.totalCount} articles`);
result.articles.forEach(article => {
  console.log(`${article.title} (${article.publishedAt})`);
  console.log(`Category: ${article.category}`);
  console.log(`Tags: ${article.tags?.join(', ')}`);
});
```

### Pagination Example

```typescript
// Fetch first page
let result = await listArticles.execute({ limit: 20 }, client);
console.log(`Page 1: ${result.articles.length} articles`);

// Fetch next page if available
if (result.nextCursor) {
  result = await listArticles.execute({
    limit: 20,
    cursor: result.nextCursor
  }, client);
  console.log(`Page 2: ${result.articles.length} articles`);
}
```

### Token Estimates
- Without custom tool: ~2500 tokens
- With custom tool (when used): ~400 tokens
- Reduction: 84%

### Error Handling

```typescript
try {
  const result = await listArticles.execute(input, client);
} catch (error) {
  // Error messages are sanitized to prevent information leakage
  console.error('FeatureBase API error:', error.message);
}
```

---

## Get Article

**Endpoint**: `GET /v2/help_center/articles/{articleId}`

**Purpose**: Fetch a single article by ID or slug with complete content.

### Request Parameters

```typescript
interface GetArticleInput {
  articleId: string;        // Required, article ID or slug
}
```

**Field Validation**:
- `articleId`: Required, no control characters allowed

### Request URL Pattern

```
GET https://do.featurebase.app/v2/help_center/articles/{articleId}
```

### Response Schema

```typescript
interface GetArticleAPIResponse {
  id: string;
  slug: string;
  title: string;
  content: string;          // Full markdown content (not truncated)
  category: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  author?: {
    id: string;
    name: string;
    email: string;
  };
  views?: number;
  helpful?: number;
  notHelpful?: number;
}
```

### Output

```typescript
interface GetArticleOutput {
  article: {
    id: string;
    slug: string;
    title: string;
    content: string;        // Full content (not truncated)
    category: string;
    publishedAt: string;
    updatedAt?: string;
    tags?: string[];
  };
}
```

### Code Example

```typescript
import { getArticle } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

// Get by ID
const result = await getArticle.execute(
  { articleId: 'article_abc123' },
  client
);

console.log(`Article: ${result.article.title}`);
console.log(`Category: ${result.article.category}`);
console.log(`Content length: ${result.article.content.length} characters`);

// Get by slug
const resultBySlug = await getArticle.execute(
  { articleId: 'getting-started-guide' },
  client
);
```

### Error Handling

```typescript
try {
  const result = await getArticle.execute({ articleId: 'article_abc123' }, client);
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Article does not exist');
  } else {
    console.error('Failed to fetch article:', error.message);
  }
}
```

---

## Create Article

**Endpoint**: `POST /v2/help_center/articles`

**Purpose**: Create a new help center article with title, content, category, and optional tags.

### Request Body

```typescript
interface CreateArticleInput {
  title: string;              // Required, max 255 chars
  content: string;            // Required, markdown supported
  category: string;           // Required, category name or ID
  slug?: string;              // Optional, auto-generated if not provided
  publishedAt?: string;       // Optional, ISO 8601 format, defaults to now
  tags?: string[];            // Optional tags
}
```

**Field Validation**:
- `title`: Required, 1-255 characters, no control characters
- `content`: Required, supports markdown formatting
- `category`: Required, category name or ID
- `slug`: Optional, URL-safe string, auto-generated from title if not provided
- `publishedAt`: Optional, ISO 8601 date string (e.g., "2026-01-17T10:00:00Z")
- `tags`: Optional array of tag strings

### Request JSON

```json
{
  "title": "Getting Started with Our Platform",
  "content": "# Welcome\n\nThis guide will help you get started...",
  "category": "getting-started",
  "slug": "getting-started-guide",
  "publishedAt": "2026-01-17T10:00:00Z",
  "tags": ["tutorial", "beginner"]
}
```

### Response Schema

```typescript
interface CreateArticleAPIResponse {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  publishedAt: string;
  createdAt: string;          // Timestamp when article was created
  updatedAt: string;          // Timestamp of last update
}
```

### Output

```typescript
interface CreateArticleOutput {
  article: {
    id: string;
    slug: string;
    title: string;
    content: string;
    category: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Code Example

```typescript
import { createArticle } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await createArticle.execute(
  {
    title: "Getting Started with Our Platform",
    content: "# Welcome\n\nThis guide will help you get started with our platform.\n\n## Step 1: Sign Up\n...",
    category: "getting-started",
    slug: "getting-started-guide",
    publishedAt: new Date().toISOString(),
    tags: ["tutorial", "beginner"]
  },
  client
);

console.log(`Created article: ${result.article.id}`);
console.log(`Slug: ${result.article.slug}`);
console.log(`Published at: ${result.article.publishedAt}`);
```

### Slug Auto-Generation

```typescript
// Without slug - auto-generated from title
const result = await createArticle.execute(
  {
    title: "Getting Started with Our Platform",
    content: "...",
    category: "getting-started"
  },
  client
);
// result.article.slug will be "getting-started-with-our-platform"
```

### Validation Rules

```typescript
// Title validation
z.string()
  .min(1, 'title is required')
  .max(255, 'title cannot exceed 255 characters')
  .refine(validateNoControlChars, 'Control characters not allowed')

// Content validation
z.string()
  .min(1, 'content is required')

// Category validation
z.string()
  .min(1, 'category is required')

// Slug validation (optional)
z.string()
  .regex(/^[a-z0-9-]+$/, 'slug must be URL-safe (lowercase, numbers, hyphens)')
  .optional()

// PublishedAt validation (optional)
z.string().optional()

// Tags validation
z.array(z.string()).optional()
```

### Error Handling

```typescript
try {
  const result = await createArticle.execute(input, client);
} catch (error) {
  // Sanitized error messages
  if (error.message.includes('title cannot exceed')) {
    console.error('Title too long');
  } else if (error.message.includes('category is required')) {
    console.error('Missing category');
  } else if (error.message.includes('slug must be URL-safe')) {
    console.error('Invalid slug format');
  } else {
    console.error('Failed to create article:', error.message);
  }
}
```

---

## Update Article

**Endpoint**: `POST /v2/help_center/articles/{articleId}`

**Purpose**: Update an existing article. All fields are optional except `articleId`.

### Request Parameters

```typescript
interface UpdateArticleInput {
  articleId: string;          // Required, no control characters
  title?: string;             // Optional, max 255 chars
  content?: string;           // Optional, markdown supported
  category?: string;          // Optional, category name or ID
  slug?: string;              // Optional, URL-safe string
  publishedAt?: string;       // Optional, ISO 8601 format
  tags?: string[];            // Optional tags
}
```

**Field Details**:
- `articleId`: Required identifier for the article to update
- `title`: Optional, 1-255 characters if provided
- `content`: Optional, markdown supported
- `category`: Optional, category name or ID
- `slug`: Optional, URL-safe string
- `publishedAt`: Optional, ISO 8601 date string
- `tags`: Optional array of tags

### Request URL Pattern

```
POST https://do.featurebase.app/v2/help_center/articles/{articleId}
```

### Request Body

```json
{
  "title": "Updated: Getting Started with Our Platform",
  "content": "# Welcome (Updated)\n\nThis updated guide will help you...",
  "category": "getting-started",
  "tags": ["tutorial", "beginner", "updated"]
}
```

### Partial Update Support

The API supports partial updates - only include fields you want to change:

```typescript
// Build update data (only non-undefined fields)
const updateData: UpdateArticleData = {};
if (validated.title) updateData.title = validated.title;
if (validated.content) updateData.content = validated.content;
if (validated.category) updateData.category = validated.category;
if (validated.slug) updateData.slug = validated.slug;
if (validated.publishedAt) updateData.publishedAt = validated.publishedAt;
if (validated.tags) updateData.tags = validated.tags;
```

### Response Schema

```typescript
interface UpdateArticleAPIResponse {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  publishedAt: string;
  updatedAt: string;          // Timestamp of this update
}
```

### Output

```typescript
interface UpdateArticleOutput {
  article: {
    id: string;
    slug: string;
    title: string;
    content: string;
    category: string;
    publishedAt: string;
    updatedAt: string;
  };
}
```

### Code Example - Full Update

```typescript
import { updateArticle } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await updateArticle.execute(
  {
    articleId: 'article_abc123',
    title: 'Updated: Getting Started with Our Platform',
    content: '# Welcome (Updated)\n\nThis updated guide includes new information...',
    category: 'getting-started',
    tags: ['tutorial', 'beginner', 'updated']
  },
  client
);

console.log(`Updated article: ${result.article.id}`);
console.log(`New updated timestamp: ${result.article.updatedAt}`);
```

### Code Example - Partial Update

```typescript
// Only update the title
const result = await updateArticle.execute(
  {
    articleId: 'article_abc123',
    title: 'Revised Title'
  },
  client
);

// Only update tags
const result = await updateArticle.execute(
  {
    articleId: 'article_abc123',
    tags: ['tutorial', 'advanced', 'updated']
  },
  client
);

// Update slug (useful for SEO)
const result = await updateArticle.execute(
  {
    articleId: 'article_abc123',
    slug: 'new-url-slug'
  },
  client
);
```

### Validation Rules

```typescript
// ArticleId validation
z.string()
  .min(1, 'articleId is required')
  .refine(validateNoControlChars, 'Control characters not allowed')

// Title validation (optional)
z.string()
  .max(255, 'title cannot exceed 255 characters')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .optional()

// Content validation (optional)
z.string().optional()

// Category validation (optional)
z.string().optional()

// Slug validation (optional)
z.string()
  .regex(/^[a-z0-9-]+$/, 'slug must be URL-safe')
  .optional()

// PublishedAt validation (optional)
z.string().optional()

// Tags validation (optional)
z.array(z.string()).optional()
```

---

## Delete Article

**Endpoint**: `DELETE /v2/help_center/articles/{articleId}`

**Purpose**: Permanently delete an article.

### Request Parameters

```typescript
interface DeleteArticleInput {
  articleId: string;        // Required, no control characters
}
```

### Request URL Pattern

```
DELETE https://do.featurebase.app/v2/help_center/articles/{articleId}
```

### Response Schema

```typescript
interface DeleteArticleAPIResponse {
  success?: boolean;
}
```

### Output

```typescript
interface DeleteArticleOutput {
  success: boolean;           // Always true on success
  articleId: string;          // ID of deleted article
}
```

### Code Example

```typescript
import { deleteArticle } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await deleteArticle.execute(
  {
    articleId: 'article_abc123'
  },
  client
);

if (result.success) {
  console.log(`Successfully deleted article: ${result.articleId}`);
}
```

### Error Handling

```typescript
try {
  const result = await deleteArticle.execute(
    { articleId: 'article_abc123' },
    client
  );
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Article does not exist');
  } else {
    console.error('Failed to delete article:', error.message);
  }
}
```

### Validation Rules

```typescript
z.string()
  .min(1, 'articleId is required')
  .refine(validateNoControlChars, 'Control characters not allowed')
```

---

## Complete Workflow Example

### Create, Update, and Delete Lifecycle

```typescript
import {
  createArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  getArticle
} from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

async function manageArticle() {
  const client = createFeaturebaseClient();

  // 1. Create new article
  const created = await createArticle.execute(
    {
      title: "Advanced API Integration Guide",
      content: "# Advanced Integration\n\nThis guide covers advanced API integration techniques...",
      category: "developers",
      tags: ["api", "advanced"]
    },
    client
  );

  console.log(`Created: ${created.article.id}`);
  console.log(`Slug: ${created.article.slug}`);

  // 2. Update the article
  const updated = await updateArticle.execute(
    {
      articleId: created.article.id,
      content: "# Advanced Integration (Updated)\n\nThis updated guide includes new examples...",
      tags: ["api", "advanced", "webhooks"]
    },
    client
  );

  console.log(`Updated: ${updated.article.updatedAt}`);

  // 3. Get full article with complete content
  const fetched = await getArticle.execute(
    { articleId: created.article.id },
    client
  );

  console.log(`Fetched: ${fetched.article.title}`);
  console.log(`Content length: ${fetched.article.content.length} characters`);

  // 4. List all articles in category to verify
  const list = await listArticles.execute(
    { limit: 5, category: "developers" },
    client
  );

  console.log(`Found ${list.totalCount} developer articles`);

  // 5. Delete the article
  const deleted = await deleteArticle.execute(
    { articleId: created.article.id },
    client
  );

  console.log(`Deleted: ${deleted.success}`);
}

manageArticle().catch(console.error);
```

---

## Bidirectional Sync with Markdown

### Sync from FeatureBase to Markdown Files

```typescript
import { syncToMarkdown } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await syncToMarkdown(
  {
    outputDir: './docs/help-center',
    types: ['articles'],
    limit: 100
  },
  client
);

console.log(`Synced ${result.filesWritten} articles to markdown`);
```

**Generated File Structure**:
```
docs/help-center/
└── articles/
    ├── article_abc123-getting-started-guide.md
    └── article_def456-advanced-api-integration.md
```

**Markdown File Format**:
```markdown
---
featurebaseId: article_abc123
title: Getting Started Guide
category: getting-started
slug: getting-started-guide
publishedAt: 2026-01-17T10:00:00Z
updatedAt: 2026-01-17T12:00:00Z
tags:
  - tutorial
  - beginner
syncedAt: 2026-01-17T14:00:00Z
---

# Welcome

This guide will help you get started with our platform.

## Step 1: Sign Up

Visit our signup page and create your account...
```

### Sync from Markdown to FeatureBase

```typescript
import { syncFromMarkdown } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await syncFromMarkdown(
  {
    inputDir: './docs/help-center',
    types: ['articles']
  },
  client
);

console.log(`Created: ${result.created}`);
console.log(`Updated: ${result.updated}`);
console.log(`Conflicts: ${result.conflicts?.length || 0}`);
console.log(`Errors: ${result.errors.length}`);
```

**Conflict Detection**: Articles sync checks for conflicts by comparing `updatedAt` timestamps. If the FeatureBase article has been updated more recently than the local markdown file, the sync is skipped and logged in `result.conflicts`.

---

## API Response Patterns

### Pagination

Articles use **cursor-based pagination**:

```typescript
// Response structure
{
  "results": [...],
  "page": 1,
  "totalPages": 5,
  "totalResults": 42,
  "nextCursor": "eyJpZCI6ImFydGljbGVfYWJjMTIzIn0="
}

// Use nextCursor for pagination
{
  articles: [...],
  nextCursor: "eyJpZCI6ImFydGljbGVfYWJjMTIzIn0=",
  totalCount: 42
}
```

### Error Responses

```typescript
// API errors are sanitized before returning to client
if (!response.ok) {
  const sanitized = sanitizeErrorMessage(response.error.message);
  throw new Error(`FeatureBase API error: ${sanitized}`);
}
```

**Common Error Messages**:
- "FeatureBase API error: Invalid API key"
- "Failed to create article: title cannot exceed 255 characters"
- "Failed to update article: articleId is required"
- "Failed to delete article: Article not found"
- "Failed to create article: slug must be URL-safe"

---

## Security & Validation

### Input Sanitization

All user inputs are validated to prevent injection attacks:

```typescript
// Control character validation
z.string().refine(validateNoControlChars, 'Control characters not allowed')

// Path traversal validation
z.string().refine(validateNoPathTraversal, 'Path traversal not allowed')

// Command injection validation
z.string().refine(validateNoCommandInjection, 'Command injection not allowed')

// Applied to:
// - title
// - articleId
// - category
// - slug
// - q (search query)
```

### Token Optimization

Content is truncated in list operations to reduce token usage:

```typescript
// List operations truncate content to 500 chars
content: (article.content || '').substring(0, 500)

// Get operations return full content (not truncated)
content: article.content
```

### Authentication

API Key authentication via HTTP client:

```typescript
// X-API-Key header format
X-API-Key: {apiKey}
```

---

## Summary

The FeatureBase Articles API provides:

1. **List**: Paginated listing with filtering by category, tags, and search
2. **Get**: Fetch single article with complete content
3. **Create**: Create new articles with title, content, category, slug, and tags
4. **Update**: Partial or full updates to existing articles
5. **Delete**: Permanent deletion of articles

**Key Features**:
- Cursor-based pagination
- Category and tag filtering
- Full-text search
- Slug auto-generation from titles
- Markdown content support
- Bidirectional sync with markdown files
- Token-optimized responses (list vs get)
- Comprehensive error handling
- Input sanitization for security
- Conflict detection during sync

**Token Efficiency**:
- List operations: 84% reduction (2500 → 400 tokens)
- Content truncation for preview listings
- Full content available in get operations

**Conflict Resolution**:
- Articles sync compares `updatedAt` timestamps
- Skips updates when FeatureBase has newer changes
- Logs conflicts in `result.conflicts` array
- Re-run `syncToMarkdown` to pull latest changes
