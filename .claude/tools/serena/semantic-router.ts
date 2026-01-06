/**
 * Semantic Router for Serena MCP
 *
 * Analyzes user intent and determines optimal module scope before spawning Serena.
 * Enables intelligent scoping without artificially confining the search space.
 *
 * Architecture validated by:
 * - RepoNavigator (arxiv:2512.20957): Single tool-jumping outperforms multiple tools
 * - LSPRAG (arxiv:2510.22210): LSP-guided retrieval achieves 174-213% improvement
 * - Sourcegraph LSP: On-demand file access enables instant navigation
 *
 * Key insight from Serena GitHub #474: "Not currently, no" for simultaneous multi-project.
 * Therefore, we scope to SINGLE module per call, not multiple.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';

// =============================================================================
// TYPES
// =============================================================================

interface ModuleConfig {
  path: string;
  languages: string[];
  concerns: string[];
  description: string;
  entry_points?: string[];
}

interface SuperRepoConfig {
  name: string;
  type: string;
  version: string;
  languages: string[];
  modules: Record<string, ModuleConfig>;
  routing_hints: Record<string, string[]>;
  default_module: string;
  excluded_paths: string[];
}

interface ModuleScope {
  name: string;
  path: string;
  relevance: number;
  matchedKeywords: string[];
}

// =============================================================================
// CONFIG LOADING
// =============================================================================

let cachedConfig: SuperRepoConfig | null = null;

/**
 * Load super-repo structure from .serena/project.yml
 * Caches the config for subsequent calls
 */
export function loadSuperRepoConfig(projectRoot: string): SuperRepoConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(projectRoot, '.serena', 'project.yml');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Super-repo config not found at ${configPath}.\n` +
        `Create .serena/project.yml with module definitions for semantic routing.`
    );
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  cachedConfig = jsYaml.load(content) as SuperRepoConfig;

  return cachedConfig;
}

/**
 * Clear cached config (useful for testing or config reload)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

// =============================================================================
// SEMANTIC ANALYSIS
// =============================================================================

/**
 * Analyze user query and determine relevant modules
 *
 * Uses keyword matching + concern overlap to rank modules.
 * Returns modules sorted by relevance score.
 *
 * @param userQuery - The user's question or task description
 * @param config - Super-repo configuration
 * @returns Array of modules sorted by relevance (highest first)
 */
export function analyzeIntent(userQuery: string, config: SuperRepoConfig): ModuleScope[] {
  const queryLower = userQuery.toLowerCase();
  const queryWords = new Set(queryLower.split(/\s+/).filter((w) => w.length > 2));

  const scores = new Map<string, { score: number; keywords: string[] }>();

  // Initialize scores
  for (const name of Object.keys(config.modules)) {
    scores.set(name, { score: 0, keywords: [] });
  }

  // Score by routing hints (highest weight - explicit keyword mapping)
  for (const [keyword, modules] of Object.entries(config.routing_hints)) {
    const keywordLower = keyword.toLowerCase().replace(/_/g, ' ');

    // Check for exact keyword match or word-in-query match
    if (queryLower.includes(keywordLower) || queryWords.has(keywordLower)) {
      for (const moduleName of modules) {
        const current = scores.get(moduleName);
        if (current) {
          current.score += 10;
          current.keywords.push(keyword);
        }
      }
    }
  }

  // Score by concern matching (medium weight)
  for (const [name, module] of Object.entries(config.modules)) {
    for (const concern of module.concerns) {
      const concernLower = concern.toLowerCase().replace(/_/g, ' ');

      if (queryLower.includes(concernLower)) {
        const current = scores.get(name);
        if (current) {
          current.score += 5;
          if (!current.keywords.includes(concern)) {
            current.keywords.push(concern);
          }
        }
      }
    }
  }

  // Score by language mention (lower weight)
  for (const [name, module] of Object.entries(config.modules)) {
    for (const lang of module.languages) {
      if (queryLower.includes(lang.toLowerCase())) {
        const current = scores.get(name);
        if (current) {
          current.score += 3;
          if (!current.keywords.includes(lang)) {
            current.keywords.push(lang);
          }
        }
      }
    }
  }

  // Score by module name mention (high weight - explicit module reference)
  for (const name of Object.keys(config.modules)) {
    const nameLower = name.toLowerCase().replace(/-/g, ' ');
    const nameVariants = [nameLower, name.toLowerCase(), name.replace(/-/g, '')];

    for (const variant of nameVariants) {
      if (queryLower.includes(variant)) {
        const current = scores.get(name);
        if (current) {
          current.score += 20;
          current.keywords.push(`module:${name}`);
        }
        break;
      }
    }
  }

  // Convert to sorted array
  const results: ModuleScope[] = [];
  for (const [name, module] of Object.entries(config.modules)) {
    const scoreData = scores.get(name);
    if (scoreData && scoreData.score > 0) {
      results.push({
        name,
        path: module.path,
        relevance: scoreData.score,
        matchedKeywords: scoreData.keywords,
      });
    }
  }

  // Sort by relevance (descending), prefer longer paths when tied (sub-modules over parent)
  results.sort((a, b) => {
    if (b.relevance !== a.relevance) {
      return b.relevance - a.relevance;
    }
    // When scores tied, prefer longer path (more specific sub-module)
    return b.path.length - a.path.length;
  });

  // If nothing matched, return default module
  if (results.length === 0) {
    const defaultModule = config.modules[config.default_module];
    return [
      {
        name: config.default_module,
        path: defaultModule?.path || `modules/${config.default_module}`,
        relevance: 1,
        matchedKeywords: ['default'],
      },
    ];
  }

  return results;
}

// =============================================================================
// SERENA ARGS GENERATION
// =============================================================================

/**
 * Get Serena command args for scoped project
 *
 * Key insight from research: Serena expects ONE project at a time (GitHub #474).
 * We return args for the single most relevant module.
 *
 * @param modules - Ranked modules from analyzeIntent
 * @param projectRoot - Absolute path to project root
 * @returns Array of CLI args for Serena
 */
export function getSerenaArgs(modules: ModuleScope[], projectRoot: string): string[] {
  if (modules.length === 0) {
    // Fallback to project root (full super-repo scan - slow but complete)
    return ['--project', projectRoot];
  }

  // Use the most relevant module only (Serena is sequential, not simultaneous)
  const primary = modules[0];
  const absolutePath = path.join(projectRoot, primary.path);

  return ['--project', absolutePath];
}

/**
 * Get human-readable scope description for logging
 */
export function getScopeDescription(modules: ModuleScope[]): string {
  if (modules.length === 0) {
    return 'full super-repo (no specific module matched)';
  }

  const primary = modules[0];
  const keywords = primary.matchedKeywords.slice(0, 3).join(', ');

  if (modules.length === 1) {
    return `${primary.name} (matched: ${keywords})`;
  }

  const others = modules
    .slice(1, 3)
    .map((m) => m.name)
    .join(', ');
  return `${primary.name} (matched: ${keywords}), also considered: ${others}`;
}

// =============================================================================
// MAIN ROUTING FUNCTION
// =============================================================================

/**
 * Route a user query to the appropriate Serena scope
 *
 * This is the main entry point for semantic routing.
 *
 * @param userQuery - The user's question or task
 * @param projectRoot - Absolute path to super-repo root
 * @returns Object with Serena args and scope info
 */
export function routeToSerena(
  userQuery: string,
  projectRoot: string
): {
  args: string[];
  scopeDescription: string;
  primaryModule: string;
  allMatches: ModuleScope[];
} {
  const config = loadSuperRepoConfig(projectRoot);
  const matches = analyzeIntent(userQuery, config);
  const args = getSerenaArgs(matches, projectRoot);
  const scopeDescription = getScopeDescription(matches);

  return {
    args,
    scopeDescription,
    primaryModule: matches[0]?.name || config.default_module,
    allMatches: matches,
  };
}

// =============================================================================
// CLI USAGE (for testing)
// =============================================================================

// ESM-compatible main check
const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx semantic-router.ts "your query here"');
    console.log('Example: npx tsx semantic-router.ts "fix the React component in the UI"');
    process.exit(1);
  }

  const query = args.join(' ');
  const projectRoot = process.cwd().replace(/\/.claude.*$/, '');

  console.log(`Query: "${query}"`);
  console.log(`Project root: ${projectRoot}`);
  console.log('');

  try {
    const result = routeToSerena(query, projectRoot);

    console.log('=== Routing Result ===');
    console.log(`Primary module: ${result.primaryModule}`);
    console.log(`Scope: ${result.scopeDescription}`);
    console.log(`Serena args: ${result.args.join(' ')}`);
    console.log('');
    console.log('All matches:');
    for (const match of result.allMatches.slice(0, 5)) {
      console.log(`  - ${match.name}: score=${match.relevance}, keywords=[${match.matchedKeywords.join(', ')}]`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
