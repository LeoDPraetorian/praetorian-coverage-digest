/**
 * Sync from FeatureBase API to Markdown files
 */

import fs from 'fs/promises';
import path from 'path';
import type { HTTPPort } from '../config/lib/http-client.js';
import { listPosts } from './list-posts.js';
import { listChangelog } from './list-changelog.js';
import { listArticles } from './list-articles.js';
import { slugify } from './internal/slug.js';
import { serializeFrontmatter } from './internal/frontmatter.js';

export interface SyncToMarkdownOptions {
  outputDir: string;
  types: Array<'posts' | 'changelog' | 'articles'>;
  limit?: number;
}

export interface SyncToMarkdownResult {
  filesWritten: number;
  errors: Array<{
    type: string;
    id: string;
    error: string;
  }>;
}

export async function syncToMarkdown(
  options: SyncToMarkdownOptions,
  client: HTTPPort
): Promise<SyncToMarkdownResult> {
  let filesWritten = 0;
  const errors: Array<{ type: string; id: string; error: string }> = [];

  for (const type of options.types) {
    if (type === 'posts') {
      try {
        // Ensure directory exists
        const postsDir = path.join(options.outputDir, 'posts');
        await fs.mkdir(postsDir, { recursive: true });

        const result = await listPosts.execute(
          { limit: options.limit || 100, sortBy: 'createdAt' },
          client
        );

        // Defensive check: ensure posts array exists
        if (!result.posts || !Array.isArray(result.posts)) {
          console.warn('[WARN] No posts returned from API');
          continue;
        }

        for (const post of result.posts) {
          try {
            const slug = slugify(post.title);
            const filename = `${post.id}-${slug}.md`;
            const filepath = path.join(postsDir, filename);

            const frontmatter: Record<string, unknown> = {
              featurebaseId: post.id,
              title: post.title,
              status: post.status,
              categoryId: post.categoryId,
              boardId: post.categoryId, // Alias for backward compatibility
              date: post.date,
              createdAt: post.date, // Alias for backward compatibility
              lastModified: post.lastModified,
              updatedAt: post.lastModified, // Alias for backward compatibility
              upvotes: post.upvotes,
              commentCount: post.commentCount,
              tags: post.tags,
              syncedAt: new Date().toISOString(),
            };

            // Only include optional fields if they're defined
            if (post.author !== undefined) frontmatter.author = post.author;
            if (post.authorEmail !== undefined) frontmatter.authorEmail = post.authorEmail;

            // Defensive: Convert null/undefined content to empty string
            const markdown = serializeFrontmatter(frontmatter, post.content || '');
            await fs.writeFile(filepath, markdown, 'utf-8');
            filesWritten++;
          } catch (error) {
            errors.push({
              type: 'posts',
              id: post.id,
              error: String(error),
            });
          }
        }
      } catch (error) {
        errors.push({
          type: 'posts',
          id: 'unknown',
          error: `Failed to sync posts: ${String(error)}`,
        });
      }
    } else if (type === 'changelog') {
      try {
        // Ensure directory exists
        const changelogDir = path.join(options.outputDir, 'changelog');
        await fs.mkdir(changelogDir, { recursive: true });

        const result = await listChangelog.execute(
          { limit: options.limit || 100 },
          client
        );

        // Defensive check: ensure entries array exists
        if (!result.entries || !Array.isArray(result.entries)) {
          console.warn('[WARN] No changelog entries returned from API');
          continue;
        }

        for (const entry of result.entries) {
          try {
            const slug = slugify(entry.title);
            const filename = `${entry.id}-${slug}.md`;
            const filepath = path.join(changelogDir, filename);

            const frontmatter = {
              featurebaseId: entry.id,
              title: entry.title,
              publishedAt: entry.publishedAt,
              updatedAt: entry.updatedAt,
              tags: entry.tags || [],
              syncedAt: new Date().toISOString(),
            };

            // Defensive: Convert null/undefined content to empty string
            const markdown = serializeFrontmatter(frontmatter, entry.content || '');
            await fs.writeFile(filepath, markdown, 'utf-8');
            filesWritten++;
          } catch (error) {
            errors.push({
              type: 'changelog',
              id: entry.id,
              error: String(error),
            });
          }
        }
      } catch (error) {
        errors.push({
          type: 'changelog',
          id: 'unknown',
          error: `Failed to sync changelog: ${String(error)}`,
        });
      }
    } else if (type === 'articles') {
      try {
        // Ensure directory exists
        const articlesDir = path.join(options.outputDir, 'articles');
        await fs.mkdir(articlesDir, { recursive: true });

        const result = await listArticles.execute(
          { limit: options.limit || 100 },
          client
        );

        // Defensive check: ensure articles array exists
        if (!result.articles || !Array.isArray(result.articles)) {
          console.warn('[WARN] No articles returned from API');
          continue;
        }

        for (const article of result.articles) {
          try {
            const slug = slugify(article.title);
            const filename = `${article.id}-${slug}.md`;
            const filepath = path.join(articlesDir, filename);

            const frontmatter: Record<string, unknown> = {
              featurebaseId: article.id,
              title: article.title,
              category: article.category,
              publishedAt: article.publishedAt,
              syncedAt: new Date().toISOString(),
            };

            // Only include optional fields if they're defined
            if (article.slug !== undefined) frontmatter.slug = article.slug;
            if (article.updatedAt !== undefined) frontmatter.updatedAt = article.updatedAt;

            // Defensive: Convert null/undefined content to empty string
            const markdown = serializeFrontmatter(frontmatter, article.content || '');
            await fs.writeFile(filepath, markdown, 'utf-8');
            filesWritten++;
          } catch (error) {
            errors.push({
              type: 'articles',
              id: article.id,
              error: String(error),
            });
          }
        }
      } catch (error) {
        errors.push({
          type: 'articles',
          id: 'unknown',
          error: `Failed to sync articles: ${String(error)}`,
        });
      }
    }
  }

  return { filesWritten, errors };
}
