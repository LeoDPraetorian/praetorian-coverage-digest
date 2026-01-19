---
name: mcp-tools-featurebase
description: Use when accessing featurebase services - provides 25 tools for create-article, create-changelog, create-comment, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Featurebase MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent featurebase access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides featurebase-specific tool catalog.

## Purpose

Enable granular agent access control for featurebase operations.

**Include this skill when:** Agent needs featurebase access
**Exclude this skill when:** Agent should NOT access featurebase

## Available Tools (Auto-discovered: 25 wrappers)

### create-article
- **Purpose:** MCP wrapper for create-article
- **Import:** `import { createArticle } from './.claude/tools/featurebase/create-article.ts'`
- **Token cost:** ~350 tokens

### create-changelog
- **Purpose:** MCP wrapper for create-changelog
- **Import:** `import { createChangelog } from './.claude/tools/featurebase/create-changelog.ts'`
- **Token cost:** ~350 tokens

### create-comment
- **Purpose:** MCP wrapper for create-comment
- **Import:** `import { createComment } from './.claude/tools/featurebase/create-comment.ts'`
- **Token cost:** ~300 tokens

### create-custom-field
- **Purpose:** MCP wrapper for create-custom-field
- **Import:** `import { createCustomField } from './.claude/tools/featurebase/create-custom-field.ts'`
- **Token cost:** ~250 tokens

### create-post
- **Purpose:** MCP wrapper for create-post
- **Import:** `import { createPost } from './.claude/tools/featurebase/create-post.ts'`
- **Token cost:** ~300 tokens

### delete-article
- **Purpose:** MCP wrapper for delete-article
- **Import:** `import { deleteArticle } from './.claude/tools/featurebase/delete-article.ts'`
- **Token cost:** ~150 tokens

### delete-changelog
- **Purpose:** MCP wrapper for delete-changelog
- **Import:** `import { deleteChangelog } from './.claude/tools/featurebase/delete-changelog.ts'`
- **Token cost:** ~150 tokens

### delete-comment
- **Purpose:** MCP wrapper for delete-comment
- **Import:** `import { deleteComment } from './.claude/tools/featurebase/delete-comment.ts'`
- **Token cost:** ~150 tokens

**Parameters:**
```typescript
interface DeleteCommentInput {
  commentId: string;
}
```

### delete-post
- **Purpose:** MCP wrapper for delete-post
- **Import:** `import { deletePost } from './.claude/tools/featurebase/delete-post.ts'`
- **Token cost:** ~150 tokens

### delete-user
- **Purpose:** MCP wrapper for delete-user
- **Import:** `import { deleteUser } from './.claude/tools/featurebase/delete-user.ts'`
- **Token cost:** ~150 tokens

### get-article
- **Purpose:** MCP wrapper for get-article
- **Import:** `import { getArticle } from './.claude/tools/featurebase/get-article.ts'`
- **Token cost:** ~400 tokens

### get-changelog
- **Purpose:** MCP wrapper for get-changelog
- **Import:** `import { getChangelog } from './.claude/tools/featurebase/get-changelog.ts'`
- **Token cost:** ~200 tokens

### get-post
- **Purpose:** MCP wrapper for get-post
- **Import:** `import { getPost } from './.claude/tools/featurebase/get-post.ts'`
- **Token cost:** ~400 tokens

### get-user
- **Purpose:** MCP wrapper for get-user
- **Import:** `import { getUser } from './.claude/tools/featurebase/get-user.ts'`
- **Token cost:** ~350 tokens

### identify-user
- **Purpose:** MCP wrapper for identify-user
- **Import:** `import { identifyUser } from './.claude/tools/featurebase/identify-user.ts'`
- **Token cost:** ~300 tokens

### list-articles
- **Purpose:** MCP wrapper for list-articles
- **Import:** `import { listArticles } from './.claude/tools/featurebase/list-articles.ts'`
- **Token cost:** ~600 tokens

### list-changelog
- **Purpose:** MCP wrapper for list-changelog
- **Import:** `import { listChangelog } from './.claude/tools/featurebase/list-changelog.ts'`
- **Token cost:** ~500 tokens

### list-comments
- **Purpose:** MCP wrapper for list-comments
- **Import:** `import { listComments } from './.claude/tools/featurebase/list-comments.ts'`
- **Token cost:** ~500 tokens

### list-custom-fields
- **Purpose:** MCP wrapper for list-custom-fields
- **Import:** `import { listCustomFields } from './.claude/tools/featurebase/list-custom-fields.ts'`
- **Token cost:** ~300 tokens

### list-posts
- **Purpose:** MCP wrapper for list-posts
- **Import:** `import { listPosts } from './.claude/tools/featurebase/list-posts.ts'`
- **Token cost:** ~400 tokens

### list-users
- **Purpose:** MCP wrapper for list-users
- **Import:** `import { listUsers } from './.claude/tools/featurebase/list-users.ts'`
- **Token cost:** ~500 tokens

### update-article
- **Purpose:** MCP wrapper for update-article
- **Import:** `import { updateArticle } from './.claude/tools/featurebase/update-article.ts'`
- **Token cost:** ~350 tokens

### update-changelog
- **Purpose:** MCP wrapper for update-changelog
- **Import:** `import { updateChangelog } from './.claude/tools/featurebase/update-changelog.ts'`
- **Token cost:** ~350 tokens

### update-comment
- **Purpose:** MCP wrapper for update-comment
- **Import:** `import { updateComment } from './.claude/tools/featurebase/update-comment.ts'`
- **Token cost:** ~300 tokens

**Parameters:**
```typescript
interface UpdateCommentInput {
  commentId: string;
  content: string;
  isPinned?: boolean;
  isPrivate?: boolean;
}
```

### update-post
- **Purpose:** MCP wrapper for update-post
- **Import:** `import { updatePost } from './.claude/tools/featurebase/update-post.ts'`
- **Token cost:** ~300 tokens


## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { createArticle } = await import('./.claude/tools/featurebase/create-article.ts');
  const result = await createArticle.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
