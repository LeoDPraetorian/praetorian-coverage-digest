# FeatureBase Posts API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Endpoints Reference](#endpoints-reference)
5. [Common Data Types](#common-data-types)
6. [Detailed Endpoint Documentation](#detailed-endpoint-documentation)
   - [List Posts](#list-posts)
   - [Get Post](#get-post)
   - [Create Post](#create-post)
   - [Update Post](#update-post)
   - [Delete Post](#delete-post)
7. [Pagination](#pagination)
8. [Filtering and Sorting](#filtering-and-sorting)
9. [Error Handling](#error-handling)
10. [Input Validation](#input-validation)
11. [Response Optimization](#response-optimization)
12. [TypeScript Examples](#typescript-examples)

---

## Overview

The FeatureBase Posts API provides programmatic access to manage posts (feature requests, feedback, ideas) within FeatureBase. This API supports full CRUD operations with advanced filtering, pagination, and search capabilities.

**API Version**: v2

**Protocol**: REST over HTTPS

**Content Type**: `application/json`

---

## Authentication

All API requests require authentication using an HTTP client configured with API credentials. The authentication is handled by the HTTPPort client implementation.

```typescript
// Authentication is managed by the HTTPPort client
const client: HTTPPort = configureHTTPClient({
  baseUrl: 'https://do.featurebase.app',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});
```

---

## Base URL

```
https://do.featurebase.app/v2
```

All endpoints are relative to this base URL.

---

## Endpoints Reference

| Method | Endpoint | Description | Authentication Required |
|--------|----------|-------------|------------------------|
| GET | `/v2/posts` | List posts with filtering and pagination | Yes |
| GET | `/v2/posts/{postId}` | Get a single post by ID | Yes |
| POST | `/v2/posts` | Create a new post | Yes |
| PATCH | `/v2/posts` | Update an existing post | Yes |
| DELETE | `/v2/posts/{postId}` | Delete a post | Yes |

---

## Common Data Types

### Post Object

The core post entity with all available fields:

```typescript
interface Post {
  // Identity
  id: string;                    // Unique post identifier
  slug?: string;                 // URL-friendly identifier

  // Content
  title: string;                 // Post title (max 255 characters)
  content: string;               // Post body content (markdown supported)

  // Organization
  categoryId: string;            // Category/board identifier
  categoryName?: string;         // Human-readable category name
  status: string;                // Current status (e.g., "in-progress", "planned")
  statusId?: string;             // Status identifier
  tags: string[];                // Array of tag names

  // Timestamps
  date: string;                  // Creation timestamp (ISO 8601)
  lastModified: string;          // Last modification timestamp (ISO 8601)
  publishedAt?: string | null;  // Publication timestamp (ISO 8601)

  // Engagement
  upvotes: number;               // Vote count
  commentCount?: number;         // Number of comments

  // Author
  author?: string;               // Author display name
  authorEmail?: string;          // Author email address
}
```

### Status Enumeration

Valid post status values:

```typescript
type PostStatus =
  | 'in-progress'  // Currently being worked on
  | 'complete'     // Finished implementation
  | 'planned'      // Scheduled for future work
  | 'archived';    // No longer active
```

### Sort Options

Valid sort field values:

```typescript
type SortBy =
  | 'createdAt'    // Sort by creation date (default)
  | 'upvotes'      // Sort by vote count
  | 'trending';    // Sort by trending score
```

---

## Detailed Endpoint Documentation

### List Posts

Retrieve a paginated list of posts with optional filtering, searching, and sorting.

#### Endpoint

```
GET /v2/posts
```

#### Query Parameters

| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `limit` | integer | No | 10 | 1-100 | Number of posts per page |
| `cursor` | string | No | - | - | Pagination cursor from previous response |
| `categoryId` | string | No | - | No control chars, path traversal, or command injection | Filter by specific category |
| `statusId` | string | No | - | No control chars or command injection | Filter by status ID |
| `status` | string | No | - | Must be one of: `in-progress`, `complete`, `planned`, `archived` | Filter by status label |
| `tags` | array[string] | No | - | - | Filter by tag names (comma-separated) |
| `q` | string | No | - | No control chars or command injection | Search query for title/content |
| `sortBy` | string | No | `createdAt` | Must be one of: `createdAt`, `upvotes`, `trending` | Sort order |

#### Request Example

```typescript
import { listPosts, type ListPostsInput } from './list-posts.js';

const params: ListPostsInput = {
  limit: 25,
  status: 'in-progress',
  categoryId: 'cat_abc123',
  tags: ['bug', 'high-priority'],
  q: 'authentication',
  sortBy: 'upvotes'
};

const response = await listPosts.execute(params, client);
```

#### Response Schema

```typescript
interface ListPostsOutput {
  posts: Array<{
    id: string;
    slug?: string;
    title: string;
    content: string;              // Truncated to 500 chars for optimization
    status: string;               // Extracted from postStatus.name
    categoryId: string;
    date: string;                 // ISO 8601 timestamp
    lastModified: string;         // ISO 8601 timestamp
    upvotes: number;
    commentCount?: number;
    tags: string[];
    author?: string;
    authorEmail?: string;
  }>;
  page: number;                   // Current page number (1-indexed)
  totalPages: number;             // Total number of pages
  totalResults: number;           // Total number of matching posts
  estimatedTokens: number;        // Token count estimate for LLM context
}
```

#### Response Example

```json
{
  "posts": [
    {
      "id": "post_xyz789",
      "slug": "implement-sso-authentication",
      "title": "Implement SSO Authentication",
      "content": "We need single sign-on support for enterprise customers...",
      "status": "in-progress",
      "categoryId": "cat_abc123",
      "date": "2025-01-15T10:30:00Z",
      "lastModified": "2025-01-17T14:22:00Z",
      "upvotes": 47,
      "commentCount": 12,
      "tags": ["authentication", "enterprise", "security"],
      "author": "John Doe",
      "authorEmail": "john@example.com"
    }
  ],
  "page": 1,
  "totalPages": 3,
  "totalResults": 67,
  "estimatedTokens": 2458
}
```

#### API Response Mapping

The tool performs field mapping from the raw API response:

```typescript
// Raw API Response Structure
{
  results: [{
    id: string;
    title: string;
    content: string;              // API field name
    categoryId: string;           // API field name
    postStatus: {                 // Nested status object
      name: string;               // Extracted to status
      type: string;
    };
    date: string;                 // API field name
    lastModified: string;         // API field name
    upvotes: number;
    commentCount?: number;
    postTags?: string[];          // Mapped to tags
    author?: string;
    authorEmail?: string;
  }];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
```

#### Token Optimization

- Content is truncated to 500 characters per post for token efficiency
- Estimated token reduction: 84% (from ~2500 to ~400 tokens when used)
- Token estimates are included in response for LLM context management

---

### Get Post

Retrieve a single post by its unique identifier with full content.

#### Endpoint

```
GET /v2/posts/{postId}
```

#### Path Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `postId` | string | Yes | Min length: 1, no control characters | Unique post identifier |

#### Request Example

```typescript
import { getPost, type GetPostInput } from './get-post.js';

const params: GetPostInput = {
  postId: 'post_xyz789'
};

const response = await getPost.execute(params, client);
```

#### Response Schema

```typescript
interface GetPostOutput {
  post: {
    id: string;
    slug?: string;
    title: string;
    content: string;              // Full content (not truncated)
    status: string;               // Extracted from postStatus.name
    statusId?: string;
    categoryId: string;
    categoryName?: string;        // Extracted from postCategory.category
    date: string;                 // ISO 8601 timestamp
    lastModified: string;         // ISO 8601 timestamp
    publishedAt?: string | null;  // ISO 8601 timestamp or null
    upvotes: number;
    commentCount: number;
    tags: string[];
    author?: string;
    authorEmail?: string;
  };
}
```

#### Response Example

```json
{
  "post": {
    "id": "post_xyz789",
    "slug": "implement-sso-authentication",
    "title": "Implement SSO Authentication",
    "content": "## Problem Statement\n\nWe need single sign-on support for enterprise customers...\n\n## Proposed Solution\n\nImplement SAML 2.0 and OAuth 2.0...",
    "status": "in-progress",
    "statusId": "status_abc123",
    "categoryId": "cat_abc123",
    "categoryName": "Features",
    "date": "2025-01-15T10:30:00Z",
    "lastModified": "2025-01-17T14:22:00Z",
    "publishedAt": "2025-01-15T11:00:00Z",
    "upvotes": 47,
    "commentCount": 12,
    "tags": ["authentication", "enterprise", "security"],
    "author": "John Doe",
    "authorEmail": "john@example.com"
  }
}
```

#### Field Fallback Strategy

The implementation uses fallback field names to handle API variations:

```typescript
// Field mapping with fallbacks
{
  content: post.content || post.body || '',
  status: post.postStatus?.name || post.status || 'unknown',
  categoryId: post.categoryId || post.boardId || '',
  categoryName: post.postCategory?.category || post.boardName,
  date: post.date || post.createdAt || new Date().toISOString(),
  lastModified: post.lastModified || post.updatedAt || new Date().toISOString(),
  tags: post.postTags || post.tags || [],
  author: post.author || post.authorName
}
```

#### Error Responses

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 404 | `Post not found: {postId}` | Post does not exist |
| 401 | `Unauthorized` | Invalid or missing authentication |
| 500 | `Failed to get post: {sanitized_error}` | Server error |

---

### Create Post

Create a new post in a specified category.

#### Endpoint

```
POST /v2/posts
```

#### Request Body

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `title` | string | Yes | Min: 1 char, Max: 255 chars, no control characters | Post title |
| `content` | string | Yes | Min: 1 char | Post content (markdown supported) |
| `categoryId` | string | Yes | Min: 1 char, no control characters | Target category ID |
| `statusId` | string | No | No control characters | Optional initial status |
| `tags` | array[string] | No | - | Optional tags |

#### Request Example

```typescript
import { createPost, type CreatePostInput } from './create-post.js';

const params: CreatePostInput = {
  title: 'Add Dark Mode Support',
  content: '## Description\n\nMany users have requested a dark mode option for better viewing at night...',
  categoryId: 'cat_abc123',
  statusId: 'status_planned',
  tags: ['ui', 'enhancement', 'user-request']
};

const response = await createPost.execute(params, client);
```

#### cURL Example

```bash
curl -X POST https://do.featurebase.app/v2/posts \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add Dark Mode Support",
    "content": "## Description\n\nMany users have requested...",
    "categoryId": "cat_abc123",
    "statusId": "status_planned",
    "tags": ["ui", "enhancement", "user-request"]
  }'
```

#### Response Schema

```typescript
interface CreatePostOutput {
  post: {
    id: string;                   // Generated post ID
    slug?: string;                // Generated URL-friendly slug
    title: string;                // Echoed title
    content: string;              // Echoed content
    categoryId: string;           // Echoed category ID
    date: string;                 // Creation timestamp (ISO 8601)
    lastModified: string;         // Initial modification timestamp
  };
}
```

#### Response Example

```json
{
  "post": {
    "id": "post_new123",
    "slug": "add-dark-mode-support",
    "title": "Add Dark Mode Support",
    "content": "## Description\n\nMany users have requested a dark mode option for better viewing at night...",
    "categoryId": "cat_abc123",
    "date": "2025-01-17T16:45:00Z",
    "lastModified": "2025-01-17T16:45:00Z"
  }
}
```

#### Request Body Mapping

```typescript
// Request payload sent to API
{
  title: validated.title,
  content: validated.content,     // Uses "content" field (not "body")
  categoryId: validated.categoryId, // Uses "categoryId" (not "boardId")
  ...(validated.statusId && { statusId: validated.statusId }),
  ...(validated.tags && { tags: validated.tags })
}
```

---

### Update Post

Update an existing post with partial field updates.

#### Endpoint

```
PATCH /v2/posts
```

**Note**: This endpoint performs an update operation with partial field updates (PATCH semantics).

#### Path Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `postId` | string | Yes | Min length: 1, no control characters | Post ID to update |

#### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `title` | string | No | Max: 255 chars, no control characters | Updated post title |
| `content` | string | No | - | Updated post content (markdown supported) |
| `statusId` | string | No | No control characters | Updated status ID |
| `tags` | array[string] | No | - | Updated tags (replaces existing) |

#### Request Example

```typescript
import { updatePost, type UpdatePostInput } from './update-post.js';

const params: UpdatePostInput = {
  postId: 'post_xyz789',
  title: 'Implement SSO Authentication (Updated)',
  statusId: 'status_complete',
  tags: ['authentication', 'enterprise', 'security', 'completed']
};

const response = await updatePost.execute(params, client);
```

#### cURL Example

```bash
curl -X PATCH https://do.featurebase.app/v2/posts \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "post_xyz789",
    "title": "Implement SSO Authentication (Updated)",
    "statusId": "status_complete",
    "tags": ["authentication", "enterprise", "security", "completed"]
  }'
```

#### Response Schema

```typescript
interface UpdatePostOutput {
  post: {
    id: string;                   // Post ID (unchanged)
    slug?: string;                // May be regenerated from new title
    title: string;                // Updated or existing title
    content: string;              // Updated or existing content
    lastModified: string;         // Updated timestamp (ISO 8601)
  };
}
```

#### Response Example

```json
{
  "post": {
    "id": "post_xyz789",
    "slug": "implement-sso-authentication-updated",
    "title": "Implement SSO Authentication (Updated)",
    "content": "## Problem Statement\n\nWe need single sign-on support...",
    "lastModified": "2025-01-17T17:30:00Z"
  }
}
```

#### Partial Update Logic

```typescript
// Only include provided fields in update payload
const updateData: UpdatePostData = {};
if (validated.title) updateData.title = validated.title;
if (validated.content) updateData.content = validated.content;
if (validated.statusId) updateData.statusId = validated.statusId;
if (validated.tags) updateData.tags = validated.tags;

// Empty object {} results in no changes
```

---

### Delete Post

Permanently delete a post and all associated data.

#### Endpoint

```
DELETE /v2/posts/{postId}
```

#### Path Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `postId` | string | Yes | Min length: 1, no control characters | Post ID to delete |

#### Request Example

```typescript
import { deletePost, type DeletePostInput } from './delete-post.js';

const params: DeletePostInput = {
  postId: 'post_xyz789'
};

const response = await deletePost.execute(params, client);
```

#### cURL Example

```bash
curl -X DELETE https://do.featurebase.app/v2/posts/post_xyz789 \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Response Schema

```typescript
interface DeletePostOutput {
  success: boolean;               // Always true on successful deletion
  postId: string;                 // Echo of deleted post ID
}
```

#### Response Example

```json
{
  "success": true,
  "postId": "post_xyz789"
}
```

#### Important Notes

- Deletion is permanent and cannot be undone
- Associated comments, votes, and attachments are also deleted
- Returns 404 if post does not exist
- Returns success:true even if post was already deleted (idempotent)

---

## Pagination

The FeatureBase API uses page-based pagination with cursor support for efficient large dataset traversal.

### Pagination Fields

```typescript
interface PaginationMetadata {
  page: number;           // Current page (1-indexed)
  limit: number;          // Items per page (1-100)
  totalPages: number;     // Total number of pages
  totalResults: number;   // Total number of matching items
  cursor?: string;        // Opaque cursor for next page
}
```

### Pagination Strategies

#### Page-Based Pagination

```typescript
// First page
const page1 = await listPosts.execute({ limit: 25 }, client);
console.log(`Page ${page1.page} of ${page1.totalPages}`);
console.log(`Total results: ${page1.totalResults}`);

// Subsequent pages using cursor
const page2 = await listPosts.execute({
  limit: 25,
  cursor: page1.cursor  // From previous response metadata
}, client);
```

#### Iterating Through All Pages

```typescript
async function getAllPosts(filters: Partial<ListPostsInput>) {
  const allPosts = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await listPosts.execute({
      ...filters,
      limit: 100,
      cursor
    }, client);

    allPosts.push(...response.posts);

    hasMore = response.page < response.totalPages;
    cursor = response.cursor;
  }

  return allPosts;
}
```

### Pagination Best Practices

1. **Use Maximum Limit**: Set `limit: 100` for batch operations to minimize API calls
2. **Cursor-Based Traversal**: Always use cursor for consistent pagination (handles concurrent modifications)
3. **Token Management**: Monitor `estimatedTokens` field to avoid LLM context overflow
4. **Filter Early**: Apply filters to reduce result set size before pagination

---

## Filtering and Sorting

### Filter Combination

Multiple filters are applied with AND logic:

```typescript
const filtered = await listPosts.execute({
  status: 'in-progress',           // AND
  categoryId: 'cat_abc123',        // AND
  tags: ['bug', 'high-priority'],  // AND
  q: 'authentication'              // AND (matches title or content)
}, client);
```

### Tag Filtering

Tags use OR logic within the array:

```typescript
// Returns posts with ANY of these tags
tags: ['bug', 'enhancement']  // Posts tagged "bug" OR "enhancement"
```

### Search Behavior

The `q` parameter performs full-text search across:
- Post title
- Post content

```typescript
const searchResults = await listPosts.execute({
  q: 'authentication SSO SAML',   // Searches title and content
  sortBy: 'trending'               // Relevance-based trending
}, client);
```

### Sort Options

| Sort Value | Description | Use Case |
|------------|-------------|----------|
| `createdAt` | Chronological order (newest first) | Default timeline view |
| `upvotes` | Most voted first | Popular feature requests |
| `trending` | Trending algorithm (votes + recency) | Hot topics |

---

## Error Handling

### Error Response Structure

All errors return a consistent structure:

```typescript
interface ErrorResponse {
  error: {
    status: number;        // HTTP status code
    message: string;       // Sanitized error message
  };
}
```

### Common Error Codes

| Status Code | Error Type | Description | Resolution |
|-------------|------------|-------------|------------|
| 400 | Bad Request | Invalid input parameters | Check validation constraints |
| 401 | Unauthorized | Missing or invalid authentication | Verify API token |
| 403 | Forbidden | Insufficient permissions | Check API key scopes |
| 404 | Not Found | Post does not exist | Verify post ID |
| 422 | Validation Error | Input validation failed | Review field constraints |
| 429 | Rate Limit | Too many requests | Implement backoff |
| 500 | Internal Server Error | Server-side error | Retry with exponential backoff |

### Error Handling Examples

```typescript
try {
  const post = await getPost.execute({ postId: 'invalid_id' }, client);
} catch (error) {
  if (error.message.includes('Post not found')) {
    console.error('Post does not exist');
  } else if (error.message.includes('Unauthorized')) {
    console.error('Authentication failed');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Validation Error Examples

```typescript
// Title too long
{
  error: {
    status: 422,
    message: "title cannot exceed 255 characters"
  }
}

// Missing required field
{
  error: {
    status: 422,
    message: "categoryId is required"
  }
}

// Invalid limit
{
  error: {
    status: 422,
    message: "limit cannot exceed 100"
  }
}
```

### Error Sanitization

All error messages are sanitized to prevent information leakage:

```typescript
import { sanitizeErrorMessage } from './internal/sanitize-error.js';

try {
  const response = await client.request('get', 'v2/posts');
} catch (error) {
  // Strips sensitive data like tokens, credentials, paths
  const safe = sanitizeErrorMessage(error.message);
  throw new Error(`FeatureBase API error: ${safe}`);
}
```

---

## Input Validation

### Validation Rules

All inputs are validated using Zod schemas with security-focused constraints.

#### String Validation

```typescript
// Control character prevention
validateNoControlChars(value)   // Blocks: \x00-\x1F, \x7F

// Path traversal prevention
validateNoPathTraversal(value)  // Blocks: ../, ..\, /../, \..\

// Command injection prevention
validateNoCommandInjection(value)  // Blocks: ; && || ` $ ( ) { }
```

#### Field-Specific Constraints

```typescript
// Title validation
z.string()
  .min(1, 'title is required')
  .max(255, 'title cannot exceed 255 characters')
  .refine(validateNoControlChars, 'Control characters not allowed')

// Content validation
z.string()
  .min(1, 'content is required')
  // No max length - supports long-form content

// Limit validation
z.number()
  .int()
  .min(1, 'limit must be at least 1')
  .max(100, 'limit cannot exceed 100')

// Status enum validation
z.enum(['in-progress', 'complete', 'planned', 'archived'])
```

### Validation Error Messages

```typescript
// Custom error messages for better UX
{
  title: z.string().min(1, 'title is required'),           // Custom message
  limit: z.number().max(100, 'limit cannot exceed 100'),   // Custom message
  status: z.enum(['in-progress', 'complete', 'planned', 'archived'])
           .describe('Filter by status label')            // Documentation
}
```

---

## Response Optimization

### Token Efficiency

The API implements aggressive token optimization for LLM workflows:

#### Content Truncation

```typescript
// List endpoint truncates content to 500 chars
content: (post.content || '').substring(0, 500)

// Get endpoint returns full content
content: post.content || post.body || ''
```

#### Token Estimation

```typescript
import { estimateTokens } from '../config/lib/response-utils.js';

// Included in every list response
{
  estimatedTokens: estimateTokens(response.data)
}
```

#### Performance Metrics

| Operation | Without Tool | With Tool | Reduction |
|-----------|--------------|-----------|-----------|
| List Posts (avg) | 2500 tokens | 400 tokens | 84% |
| Get Post | Variable | Variable | 0% (full content needed) |

### Field Filtering

Only essential fields are returned to minimize payload size:

```typescript
// Minimal list response
posts: [{
  id: string,
  title: string,
  content: string,      // Truncated
  status: string,
  upvotes: number,
  // Non-essential fields omitted
}]

// Full get response
post: {
  // All fields included
}
```

---

## TypeScript Examples

### Complete CRUD Workflow

```typescript
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
} from './featurebase';

async function fullWorkflow(client: HTTPPort) {
  // 1. Create a new post
  const created = await createPost.execute({
    title: 'New Feature Request',
    content: 'Detailed description...',
    categoryId: 'cat_abc123',
    tags: ['enhancement']
  }, client);

  console.log('Created:', created.post.id);

  // 2. Retrieve the post
  const retrieved = await getPost.execute({
    postId: created.post.id
  }, client);

  console.log('Title:', retrieved.post.title);
  console.log('Upvotes:', retrieved.post.upvotes);

  // 3. Update the post
  const updated = await updatePost.execute({
    postId: created.post.id,
    statusId: 'status_in_progress',
    tags: ['enhancement', 'in-progress']
  }, client);

  console.log('Updated:', updated.post.lastModified);

  // 4. List posts with filters
  const filtered = await listPosts.execute({
    status: 'in-progress',
    limit: 10,
    sortBy: 'upvotes'
  }, client);

  console.log(`Found ${filtered.totalResults} in-progress posts`);

  // 5. Delete the post
  const deleted = await deletePost.execute({
    postId: created.post.id
  }, client);

  console.log('Deleted:', deleted.success);
}
```

### Batch Operations

```typescript
async function batchCreatePosts(
  posts: Array<Omit<CreatePostInput, 'categoryId'>>,
  categoryId: string,
  client: HTTPPort
) {
  const results = await Promise.all(
    posts.map(post =>
      createPost.execute({ ...post, categoryId }, client)
        .catch(error => ({ error: error.message }))
    )
  );

  const succeeded = results.filter(r => 'post' in r);
  const failed = results.filter(r => 'error' in r);

  console.log(`Created ${succeeded.length} posts`);
  console.log(`Failed ${failed.length} posts`);

  return { succeeded, failed };
}
```

### Search and Filter

```typescript
async function findHighPriorityBugs(client: HTTPPort) {
  const response = await listPosts.execute({
    tags: ['bug', 'high-priority'],
    status: 'in-progress',
    sortBy: 'upvotes',
    limit: 50
  }, client);

  const criticalBugs = response.posts
    .filter(post => post.upvotes > 10)
    .map(post => ({
      id: post.id,
      title: post.title,
      upvotes: post.upvotes,
      url: `https://featurebase.app/posts/${post.slug}`
    }));

  return criticalBugs;
}
```

### Pagination Iterator

```typescript
async function* iteratePosts(
  filters: Partial<ListPostsInput>,
  client: HTTPPort
): AsyncGenerator<Post[]> {
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const response = await listPosts.execute({
      ...filters,
      limit: 100,
      cursor
    }, client);

    yield response.posts;

    if (page >= response.totalPages) break;

    cursor = response.cursor;
    page++;
  }
}

// Usage
for await (const batch of iteratePosts({ status: 'planned' }, client)) {
  console.log(`Processing ${batch.length} posts`);
  // Process batch
}
```

### Type-Safe Filtering

```typescript
interface PostFilters {
  status?: 'in-progress' | 'complete' | 'planned' | 'archived';
  categoryId?: string;
  tags?: string[];
  minUpvotes?: number;
}

async function getFilteredPosts(
  filters: PostFilters,
  client: HTTPPort
): Promise<Post[]> {
  const { minUpvotes, ...apiFilters } = filters;

  const response = await listPosts.execute(
    { ...apiFilters, limit: 100 },
    client
  );

  let posts = response.posts;

  // Apply client-side filters
  if (minUpvotes !== undefined) {
    posts = posts.filter(post => post.upvotes >= minUpvotes);
  }

  return posts;
}
```

### Error Handling with Retry

```typescript
async function robustGetPost(
  postId: string,
  client: HTTPPort,
  maxRetries: number = 3
): Promise<GetPostOutput> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getPost.execute({ postId }, client);
    } catch (error) {
      if (error.message.includes('Post not found')) {
        throw error; // Don't retry 404s
      }

      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unreachable');
}
```

---

## Summary

The FeatureBase Posts API provides a comprehensive REST interface for managing feature requests and feedback posts. Key highlights:

- **Full CRUD Operations**: Create, read, update, and delete posts
- **Advanced Filtering**: Filter by category, status, tags, and search queries
- **Efficient Pagination**: Page-based and cursor-based pagination support
- **Token Optimization**: 84% reduction in token usage for LLM workflows
- **Type Safety**: Complete TypeScript definitions with Zod validation
- **Security**: Input sanitization and validation to prevent injection attacks
- **Error Handling**: Consistent error responses with sanitized messages

This documentation covers all endpoints, parameters, response schemas, and common usage patterns extracted from the MCP tool implementations.
