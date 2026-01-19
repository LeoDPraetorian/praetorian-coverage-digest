/**
 * Sync from Markdown files to FeatureBase API
 */

import fs from 'fs/promises';
import path from 'path';
import type { HTTPPort } from '../config/lib/http-client.js';
import { createPost } from './create-post.js';
import { updatePost } from './update-post.js';
import { getPost } from './get-post.js';
import { createChangelog } from './create-changelog.js';
import { updateChangelog } from './update-changelog.js';
import { createArticle } from './create-article.js';
import { updateArticle } from './update-article.js';
import { getArticle } from './get-article.js';
import { parseFrontmatter } from './internal/frontmatter.js';
import { serializeFrontmatter } from './internal/frontmatter.js';

/**
 * Frontmatter type for posts
 */
interface PostFrontmatter {
  featurebaseId?: string;
  updatedAt?: string;
  title: string;
  status: string;
  categoryId: string;
}

/**
 * Frontmatter type for changelog entries
 */
interface ChangelogFrontmatter {
  featurebaseId?: string;
  title: string;
  publishedAt: string;
  tags: string[];
}

/**
 * Frontmatter type for articles
 */
interface ArticleFrontmatter {
  featurebaseId?: string;
  updatedAt?: string;
  title: string;
  category: string;
  slug: string;
  publishedAt: string;
}

export interface SyncFromMarkdownOptions {
  inputDir: string;
  types: Array<'posts' | 'changelog' | 'articles'>;
}

export interface SyncFromMarkdownResult {
  filesProcessed: number;
  created: number;
  updated: number;
  conflicts?: Array<{ file: string; reason: string; apiUpdatedAt: string; localUpdatedAt: string }>;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Configuration for syncing a specific content type from markdown to FeatureBase
 */
interface SyncTypeConfig<TFrontmatter, TCreateInput, TUpdateInput, TGetInput = unknown> {
  /** Directory name (e.g., 'posts', 'changelog', 'articles') */
  dirname: string;

  /** Whether to check for conflicts before updating */
  checkConflicts: boolean;

  /** Tool for getting current state (required if checkConflicts is true) */
  getTool?: {
    execute: (input: TGetInput, client: HTTPPort) => Promise<Record<string, unknown>>;
  };

  /** Tool for creating new entries */
  createTool: {
    execute: (input: TCreateInput, client: HTTPPort) => Promise<Record<string, unknown>>;
  };

  /** Tool for updating existing entries */
  updateTool: {
    execute: (input: TUpdateInput, client: HTTPPort) => Promise<unknown>;
  };

  /** Extract relevant fields from frontmatter */
  extractFrontmatter: (data: Record<string, unknown>, body: string) => TFrontmatter & { featurebaseId?: string; updatedAt?: string };

  /** Build input for create operation */
  buildCreateInput: (frontmatter: TFrontmatter, body: string) => TCreateInput;

  /** Build input for update operation */
  buildUpdateInput: (id: string, frontmatter: TFrontmatter, body: string) => TUpdateInput;

  /** Get the ID key name for this type (e.g., 'postId', 'changelogId', 'articleId') */
  idParamKey: string;

  /** Get the result key name for this type (e.g., 'post', 'entry', 'article') */
  resultKey: string;
}

/**
 * Generic helper to sync one content type from markdown files to FeatureBase
 */
async function syncTypeFromMarkdown<TFrontmatter, TCreateInput, TUpdateInput, TGetInput = unknown>(
  config: SyncTypeConfig<TFrontmatter, TCreateInput, TUpdateInput, TGetInput>,
  inputDir: string,
  client: HTTPPort,
  result: SyncFromMarkdownResult
): Promise<void> {
  const typeDir = path.join(inputDir, config.dirname);

  // Check if directory exists
  try {
    await fs.access(typeDir);
  } catch {
    // Directory doesn't exist, skip
    return;
  }

  const files = await fs.readdir(typeDir);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    try {
      const filepath = path.join(typeDir, file);
      const content = await fs.readFile(filepath, 'utf-8');

      const { data, content: body } = parseFrontmatter(content);
      const frontmatter = config.extractFrontmatter(data, body);

      if (frontmatter.featurebaseId) {
        // Check for conflicts if configured
        if (config.checkConflicts && config.getTool) {
          try {
            const getInput = { [config.idParamKey]: frontmatter.featurebaseId } as TGetInput;
            const current = await config.getTool.execute(getInput, client);
            const currentData = current[config.resultKey] as { updatedAt?: string; lastModified?: string };

            // Support both updatedAt and lastModified field names
            const apiUpdatedAtStr = currentData.updatedAt || currentData.lastModified || '';
            const apiUpdatedAt = new Date(apiUpdatedAtStr);
            const localUpdatedAt = new Date(frontmatter.updatedAt || '');

            // Conflict: API has newer changes
            if (apiUpdatedAt > localUpdatedAt) {
              result.conflicts!.push({
                file,
                reason: `API has newer changes (API: ${apiUpdatedAt.toISOString()}, Local: ${localUpdatedAt.toISOString()})`,
                apiUpdatedAt: apiUpdatedAt.toISOString(),
                localUpdatedAt: localUpdatedAt.toISOString(),
              });
              result.filesProcessed++;
              continue; // Skip update
            }
          } catch (error) {
            // If get fails (e.g., 404), proceed with update
          }
        }

        // Update existing entry (no conflict)
        const updateInput = config.buildUpdateInput(frontmatter.featurebaseId, frontmatter, body);
        await config.updateTool.execute(updateInput, client);
        result.updated++;
      } else {
        // Create new entry
        const createInput = config.buildCreateInput(frontmatter, body);
        const created = await config.createTool.execute(createInput, client);
        const createdData = created[config.resultKey] as { id: string };

        // Update file with new ID
        data.featurebaseId = createdData.id;
        const newMarkdown = serializeFrontmatter(data, body);
        await fs.writeFile(filepath, newMarkdown, 'utf-8');

        result.created++;
      }

      result.filesProcessed++;
    } catch (error) {
      result.errors.push({
        file,
        error: String(error),
      });
      result.filesProcessed++;
    }
  }
}

export async function syncFromMarkdown(
  options: SyncFromMarkdownOptions,
  client: HTTPPort
): Promise<SyncFromMarkdownResult> {
  const result: SyncFromMarkdownResult = {
    filesProcessed: 0,
    created: 0,
    updated: 0,
    conflicts: [],
    errors: [],
  };

  // Define configurations for each content type
  const configs = {
    posts: {
      dirname: 'posts',
      checkConflicts: true,
      getTool: getPost,
      createTool: createPost,
      updateTool: updatePost,
      idParamKey: 'postId',
      resultKey: 'post',
      extractFrontmatter: (data: Record<string, unknown>) => ({
        featurebaseId: data.featurebaseId as string | undefined,
        updatedAt: data.updatedAt as string | undefined,
        title: data.title as string,
        status: data.status as string,
        categoryId: data.categoryId as string,
      }),
      buildCreateInput: (frontmatter: PostFrontmatter, body: string) => ({
        title: frontmatter.title,
        content: body,
        categoryId: frontmatter.categoryId,
      }),
      buildUpdateInput: (id: string, frontmatter: PostFrontmatter, body: string) => ({
        postId: id,
        title: frontmatter.title,
        content: body,
        statusId: frontmatter.status,
      }),
    },
    changelog: {
      dirname: 'changelog',
      checkConflicts: false,
      createTool: createChangelog,
      updateTool: updateChangelog,
      idParamKey: 'changelogId',
      resultKey: 'entry',
      extractFrontmatter: (data: Record<string, unknown>) => {
        const publishedAt = data.publishedAt instanceof Date
          ? data.publishedAt.toISOString()
          : data.publishedAt as string;
        return {
          featurebaseId: data.featurebaseId as string | undefined,
          title: data.title as string,
          publishedAt,
          tags: data.tags as string[],
        };
      },
      buildCreateInput: (frontmatter: ChangelogFrontmatter, body: string) => ({
        title: frontmatter.title,
        content: body,
        publishedAt: frontmatter.publishedAt,
        tags: frontmatter.tags,
      }),
      buildUpdateInput: (id: string, frontmatter: ChangelogFrontmatter, body: string) => ({
        changelogId: id,
        title: frontmatter.title,
        content: body,
        publishedAt: frontmatter.publishedAt,
        tags: frontmatter.tags,
      }),
    },
    articles: {
      dirname: 'articles',
      checkConflicts: true,
      getTool: getArticle,
      createTool: createArticle,
      updateTool: updateArticle,
      idParamKey: 'articleId',
      resultKey: 'article',
      extractFrontmatter: (data: Record<string, unknown>) => {
        const publishedAt = data.publishedAt instanceof Date
          ? data.publishedAt.toISOString()
          : data.publishedAt as string;
        return {
          featurebaseId: data.featurebaseId as string | undefined,
          updatedAt: data.updatedAt as string | undefined,
          title: data.title as string,
          category: data.category as string,
          slug: data.slug as string,
          publishedAt,
        };
      },
      buildCreateInput: (frontmatter: ArticleFrontmatter, body: string) => ({
        title: frontmatter.title,
        content: body,
        category: frontmatter.category,
        slug: frontmatter.slug,
        publishedAt: frontmatter.publishedAt,
      }),
      buildUpdateInput: (id: string, frontmatter: ArticleFrontmatter, body: string) => ({
        articleId: id,
        title: frontmatter.title,
        content: body,
        category: frontmatter.category,
        slug: frontmatter.slug,
      }),
    },
  };

  for (const type of options.types) {
    if (type === 'posts') {
      await syncTypeFromMarkdown(configs.posts, options.inputDir, client, result);
    } else if (type === 'changelog') {
      await syncTypeFromMarkdown(configs.changelog, options.inputDir, client, result);
    } else if (type === 'articles') {
      await syncTypeFromMarkdown(configs.articles, options.inputDir, client, result);
    }
  }

  return result;
}
