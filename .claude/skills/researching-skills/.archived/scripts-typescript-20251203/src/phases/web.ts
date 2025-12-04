// src/sources/web.ts
/**
 * Web Research for Library Documentation
 *
 * Searches and ranks web sources:
 * - GitHub repositories and examples
 * - Official documentation
 * - Quality blogs and articles
 */

import type { WebSource, ScoreModifier } from '../lib/types.js';
import { SOURCE_WEIGHTS, TRUSTED_DOMAINS } from '../lib/types.js';

/**
 * Search for web sources related to a topic
 *
 * This is a stub that returns mock data. In production, this would use:
 * - GitHub API for repository search
 * - WebSearch tool for articles
 * - WebFetch tool for content
 *
 * @param topic - Search query
 * @returns Array of web sources with quality scores
 */
export async function searchWebSources(topic: string): Promise<WebSource[]> {
  // Normalize topic for search
  const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '-');

  // Generate likely sources based on topic
  const sources: WebSource[] = [];

  // Check for known library patterns
  const isReactLibrary = topic.toLowerCase().includes('react');
  const isTanStack = topic.toLowerCase().includes('tanstack');

  // Add GitHub repository (if it likely exists)
  if (isTanStack) {
    sources.push(
      createSource(
        `https://github.com/tanstack/${normalizedTopic.replace('tanstack-', '')}`,
        `TanStack/${normalizedTopic.replace('tanstack-', '')}`,
        'github-repo'
      )
    );
  }

  // Add official docs (construct likely URL)
  const officialDocsUrl = constructOfficialDocsUrl(topic);
  if (officialDocsUrl) {
    sources.push(createSource(officialDocsUrl, `Official ${topic} Documentation`, 'official-docs'));
  }

  // Add maintainer blogs for known maintainers
  const maintainerBlog = getMaintainerBlog(topic);
  if (maintainerBlog) {
    sources.push(maintainerBlog);
  }

  // Score and sort sources
  return sources.map(scoreSource).sort((a, b) => b.score - a.score);
}

/**
 * Create a web source object
 */
function createSource(
  url: string,
  title: string,
  type: WebSource['type']
): WebSource {
  return {
    url,
    title,
    type,
    score: SOURCE_WEIGHTS[type].base,
    modifiers: [],
  };
}

/**
 * Calculate final score with modifiers
 */
function scoreSource(source: WebSource): WebSource {
  const modifiers: ScoreModifier[] = [];
  let score = SOURCE_WEIGHTS[source.type].base;

  // Apply trusted domain boost
  for (const [domain, boost] of Object.entries(TRUSTED_DOMAINS)) {
    if (source.url.includes(domain)) {
      score += boost;
      modifiers.push({ reason: `Trusted domain: ${domain}`, delta: boost });
      break;
    }
  }

  // Apply decay for older content (would need fetch date in real impl)
  // For now, skip decay

  return {
    ...source,
    score,
    modifiers,
  };
}

/**
 * Construct likely official documentation URL
 */
function constructOfficialDocsUrl(topic: string): string | null {
  const lowerTopic = topic.toLowerCase();

  // TanStack libraries
  if (lowerTopic.includes('tanstack')) {
    const lib = lowerTopic.replace('tanstack', '').replace(/\s+/g, '').trim();
    if (lib) {
      return `https://tanstack.com/${lib}/latest`;
    }
  }

  // React Query specifically
  if (lowerTopic.includes('react-query') || lowerTopic.includes('react query')) {
    return 'https://tanstack.com/query/latest';
  }

  // Zustand
  if (lowerTopic.includes('zustand')) {
    return 'https://docs.pmnd.rs/zustand/getting-started/introduction';
  }

  // Jotai
  if (lowerTopic.includes('jotai')) {
    return 'https://jotai.org/docs/introduction';
  }

  // React Hook Form
  if (lowerTopic.includes('react-hook-form') || lowerTopic.includes('react hook form')) {
    return 'https://react-hook-form.com/docs';
  }

  // Zod
  if (lowerTopic.includes('zod')) {
    return 'https://zod.dev/';
  }

  return null;
}

/**
 * Get maintainer blog for known libraries
 */
function getMaintainerBlog(topic: string): WebSource | null {
  const lowerTopic = topic.toLowerCase();

  // TkDodo for TanStack Query
  if (
    lowerTopic.includes('tanstack query') ||
    lowerTopic.includes('react-query') ||
    lowerTopic.includes('react query')
  ) {
    return createSource(
      'https://tkdodo.eu/blog/practical-react-query',
      'Practical React Query by TkDodo (Maintainer)',
      'maintainer-blog'
    );
  }

  // Kent C. Dodds for Testing Library
  if (lowerTopic.includes('testing-library') || lowerTopic.includes('testing library')) {
    return createSource(
      'https://kentcdodds.com/blog/common-mistakes-with-react-testing-library',
      'Testing Library Best Practices by Kent C. Dodds',
      'maintainer-blog'
    );
  }

  return null;
}

/**
 * Format web sources for display
 */
export function formatSourcesForDisplay(sources: WebSource[]): string {
  const grouped: Record<string, WebSource[]> = {
    github: [],
    docs: [],
    blogs: [],
    articles: [],
  };

  for (const source of sources) {
    if (source.type.startsWith('github')) {
      grouped.github.push(source);
    } else if (source.type === 'official-docs') {
      grouped.docs.push(source);
    } else if (source.type.includes('blog')) {
      grouped.blogs.push(source);
    } else {
      grouped.articles.push(source);
    }
  }

  let output = '';
  let index = 1;

  if (grouped.github.length > 0) {
    output += 'GitHub:\n';
    for (const source of grouped.github) {
      output += formatSourceLine(source, index++);
    }
    output += '\n';
  }

  if (grouped.docs.length > 0) {
    output += 'Official Documentation:\n';
    for (const source of grouped.docs) {
      output += formatSourceLine(source, index++);
    }
    output += '\n';
  }

  if (grouped.blogs.length > 0) {
    output += 'Expert Articles:\n';
    for (const source of grouped.blogs) {
      output += formatSourceLine(source, index++);
    }
    output += '\n';
  }

  if (grouped.articles.length > 0) {
    output += 'Other Articles:\n';
    for (const source of grouped.articles) {
      output += formatSourceLine(source, index++);
    }
  }

  return output;
}

/**
 * Format single source line
 */
function formatSourceLine(source: WebSource, index: number): string {
  const statusIcon = source.score >= 90 ? '✅' : source.score >= 70 ? '⭐' : '⚠️';
  return `[${index}] ${statusIcon} ${source.title} - Score: ${source.score}\n    ${source.url}\n`;
}

/**
 * Fetch content from a web source
 *
 * Stub implementation - in production would use WebFetch tool
 */
export async function fetchSourceContent(source: WebSource): Promise<string | null> {
  // This would use WebFetch in real implementation
  // For now, return null (content not fetched)
  return null;
}
