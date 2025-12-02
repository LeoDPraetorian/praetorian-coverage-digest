// src/sources/context7.ts
/**
 * Context7 Integration for Library Research
 *
 * Uses the Context7 MCP wrappers to:
 * 1. Search for library documentation
 * 2. Fetch documentation content
 * 3. Parse into structured sections
 */

import { execSync } from 'child_process';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type {
  Context7Package,
  Context7Documentation,
  DocumentationSection,
  CodeBlock,
} from '../lib/types.js';

// Lazy initialization to support mocking in tests
let _projectRoot: string | null = null;
function getProjectRoot(): string {
  if (_projectRoot === null) {
    _projectRoot = findProjectRoot();
  }
  return _projectRoot;
}

/**
 * Reset project root cache (for testing only)
 */
export function _resetProjectRoot(): void {
  _projectRoot = null;
}

/**
 * Set project root manually (for testing only)
 */
export function _setProjectRoot(path: string): void {
  _projectRoot = path;
}

/**
 * Search Context7 for packages matching a topic
 *
 * @param topic - Search query (e.g., "tanstack query", "zustand")
 * @returns Array of matching packages with metadata
 */
export async function searchContext7(topic: string): Promise<Context7Package[]> {
  try {
    const projectRoot = getProjectRoot();
    // Use the context7 resolve-library-id wrapper
    const wrapperPath = `${projectRoot}/.claude/tools/context7/resolve-library-id.ts`;

    const result = execSync(
      `npx tsx -e "
        import { resolveLibraryId } from '${wrapperPath}';
        (async () => {
          const result = await resolveLibraryId.execute({ libraryName: '${topic.replace(/'/g, "\\'")}' });
          console.log(JSON.stringify(result));
        })();
      "`,
      {
        encoding: 'utf-8',
        timeout: 30000,
        cwd: projectRoot,
      }
    );

    const data = JSON.parse(result.trim());

    // Transform to our format
    if (data.libraries && Array.isArray(data.libraries)) {
      return data.libraries.map((lib: any) => ({
        id: lib.id || lib.libraryId,
        name: lib.name || lib.libraryName,
        version: lib.version || 'latest',
        pageCount: lib.pageCount || 0,
        description: lib.description || '',
        status: determinePackageStatus(lib),
      }));
    }

    return [];
  } catch (error) {
    // Return empty array on error - let caller handle
    console.error('Context7 search failed:', error);
    return [];
  }
}

/**
 * Fetch documentation for a specific package
 *
 * @param packageId - Context7 package ID (e.g., "/npm/@tanstack/react-query")
 * @returns Documentation content with parsed sections
 */
export async function fetchContext7Docs(packageId: string): Promise<Context7Documentation | null> {
  try {
    const projectRoot = getProjectRoot();
    const wrapperPath = `${projectRoot}/.claude/tools/context7/get-library-docs.ts`;

    const result = execSync(
      `npx tsx -e "
        import { getLibraryDocs } from '${wrapperPath}';
        (async () => {
          const result = await getLibraryDocs.execute({ context7CompatibleLibraryID: '${packageId.replace(/'/g, "\\'")}' });
          console.log(JSON.stringify(result));
        })();
      "`,
      {
        encoding: 'utf-8',
        timeout: 60000, // Longer timeout for full docs
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large docs
      }
    );

    const data = JSON.parse(result.trim());

    if (data.content) {
      return {
        packageId,
        packageName: data.libraryName || packageId.split('/').pop() || packageId,
        version: data.version || 'latest',
        fetchedAt: new Date().toISOString(),
        content: data.content,
        sections: parseDocumentationSections(data.content),
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch docs for ${packageId}:`, error);
    return null;
  }
}

/**
 * Determine package status based on metadata
 */
function determinePackageStatus(lib: any): Context7Package['status'] {
  const name = (lib.name || '').toLowerCase();
  const description = (lib.description || '').toLowerCase();

  // Check for deprecated indicators
  if (name.includes('deprecated') || description.includes('deprecated')) {
    return 'deprecated';
  }

  // Check for pre-release/beta indicators
  const version = lib.version || '';
  if (version.includes('alpha') || version.includes('beta') || version.includes('rc')) {
    return 'caution';
  }

  // Check for internal/core packages that most users don't need directly
  if (name.includes('-core') || name.includes('-internal')) {
    return 'caution';
  }

  return 'recommended';
}

/**
 * Parse documentation content into structured sections
 */
function parseDocumentationSections(content: string): DocumentationSection[] {
  const sections: DocumentationSection[] = [];

  // Split by major headings (## or #)
  const headingRegex = /^(#{1,2})\s+(.+)$/gm;
  const parts = content.split(headingRegex);

  let currentTitle = 'Introduction';
  let currentContent = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Check if this is a heading marker
    if (part === '#' || part === '##') {
      // Save previous section if it has content
      if (currentContent.trim()) {
        sections.push({
          title: currentTitle,
          type: determineSectionType(currentTitle),
          content: currentContent.trim(),
          codeBlocks: extractCodeBlocks(currentContent),
        });
      }

      // Next part is the title
      currentTitle = parts[i + 1] || 'Unknown';
      currentContent = '';
      i++; // Skip the title part
    } else {
      currentContent += part;
    }
  }

  // Don't forget the last section
  if (currentContent.trim()) {
    sections.push({
      title: currentTitle,
      type: determineSectionType(currentTitle),
      content: currentContent.trim(),
      codeBlocks: extractCodeBlocks(currentContent),
    });
  }

  return sections;
}

/**
 * Determine section type based on title
 */
function determineSectionType(title: string): DocumentationSection['type'] {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('api') || lowerTitle.includes('reference')) {
    return 'api';
  }
  if (lowerTitle.includes('example') || lowerTitle.includes('usage')) {
    return 'example';
  }
  if (lowerTitle.includes('migrat') || lowerTitle.includes('upgrade')) {
    return 'migration';
  }
  if (
    lowerTitle.includes('guide') ||
    lowerTitle.includes('tutorial') ||
    lowerTitle.includes('getting started') ||
    lowerTitle.includes('quick start')
  ) {
    return 'guide';
  }

  return 'other';
}

/**
 * Extract code blocks from markdown content
 */
function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();

    // Get surrounding context (text before the code block)
    const beforeIndex = match.index;
    const contextStart = Math.max(0, beforeIndex - 200);
    const context = content.slice(contextStart, beforeIndex).trim();

    blocks.push({
      language,
      code,
      context: context.split('\n').slice(-3).join('\n'), // Last 3 lines before code
    });
  }

  return blocks;
}

/**
 * Format packages for display
 */
export function formatPackagesForDisplay(packages: Context7Package[]): string {
  return packages
    .map((pkg, index) => {
      const statusIcon =
        pkg.status === 'recommended'
          ? '✅'
          : pkg.status === 'caution'
            ? '⚠️'
            : '❌';

      const statusNote =
        pkg.status === 'deprecated'
          ? ' - DEPRECATED'
          : pkg.status === 'caution'
            ? ' - Advanced/Internal'
            : '';

      return `[${index + 1}] ${statusIcon} ${pkg.name} (${pkg.version})${statusNote}
    📄 ${pkg.pageCount} documentation pages
    ${pkg.description.substring(0, 100)}${pkg.description.length > 100 ? '...' : ''}`;
    })
    .join('\n\n');
}
