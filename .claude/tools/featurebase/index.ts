/**
 * FeatureBase MCP Wrappers
 *
 * Custom tools for FeatureBase API automation with bidirectional sync.
 *
 * Architecture:
 * - Filesystem discovery (0 tokens at session start)
 * - API calls only when imported and used
 * - Token reduction: ~95% vs direct API calls
 *
 * Usage:
 * ```typescript
 * import { listPosts } from '.claude/tools/featurebase';
 * const result = await listPosts.execute({ limit: 10 }, client);
 * ```
 */

// Posts operations
export { listPosts, type ListPostsInput, type ListPostsOutput } from './list-posts.js';
export { getPost, type GetPostInput, type GetPostOutput } from './get-post.js';
export { createPost, type CreatePostInput, type CreatePostOutput } from './create-post.js';
export { updatePost, type UpdatePostInput, type UpdatePostOutput } from './update-post.js';
export { deletePost, type DeletePostInput, type DeletePostOutput } from './delete-post.js';

// Changelog operations
export { listChangelog, type ListChangelogInput, type ListChangelogOutput } from './list-changelog.js';
export { getChangelog, type GetChangelogInput, type GetChangelogOutput } from './get-changelog.js';
export { createChangelog, type CreateChangelogInput, type CreateChangelogOutput } from './create-changelog.js';
export { updateChangelog, type UpdateChangelogInput, type UpdateChangelogOutput } from './update-changelog.js';
export { deleteChangelog, type DeleteChangelogInput, type DeleteChangelogOutput } from './delete-changelog.js';

// Articles operations
export { listArticles, type ListArticlesInput, type ListArticlesOutput } from './list-articles.js';
export { getArticle, type GetArticleInput, type GetArticleOutput } from './get-article.js';
export { createArticle, type CreateArticleInput, type CreateArticleOutput } from './create-article.js';
export { updateArticle, type UpdateArticleInput, type UpdateArticleOutput } from './update-article.js';
export { deleteArticle, type DeleteArticleInput, type DeleteArticleOutput } from './delete-article.js';

// Users operations
export { identifyUser, type IdentifyUserInput, type IdentifyUserOutput } from './identify-user.js';
export { getUser, type GetUserInput, type GetUserOutput } from './get-user.js';
export { listUsers, type ListUsersInput, type ListUsersOutput } from './list-users.js';
export { deleteUser, type DeleteUserInput, type DeleteUserOutput } from './delete-user.js';

// Custom Fields operations
export { listCustomFields, type ListCustomFieldsInput, type ListCustomFieldsOutput } from './list-custom-fields.js';
export { createCustomField, type CreateCustomFieldInput, type CreateCustomFieldOutput } from './create-custom-field.js';

// Comments operations (uses X-API-Key auth, form-urlencoded body)
export { listComments, type ListCommentsInput, type ListCommentsOutput } from './list-comments.js';
export { createComment, type CreateCommentInput, type CreateCommentOutput } from './create-comment.js';
export { updateComment, type UpdateCommentInput, type UpdateCommentOutput } from './update-comment.js';
export { deleteComment, type DeleteCommentInput, type DeleteCommentOutput } from './delete-comment.js';
export { commentsRequest } from './comments-client.js';

// Sync utilities
export { syncToMarkdown } from './sync-to-markdown.js';
export { syncFromMarkdown } from './sync-from-markdown.js';

// Client
export { createFeaturebaseClientAsync, featurebaseConfig } from './client.js';
