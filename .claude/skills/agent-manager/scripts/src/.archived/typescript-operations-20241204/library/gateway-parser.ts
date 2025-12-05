/**
 * Gateway Parser
 *
 * Parses gateway skill files to extract routing tables and skill references.
 * Enables intelligent skill reference generation for agent creation and auditing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getRepoRoot } from './agent-finder.js';

export interface GatewayRoute {
  task: string;           // e.g., "React state patterns"
  skillPath: string;      // e.g., ".claude/skill-library/.../SKILL.md"
  keywords: string[];     // Extracted keywords for matching
}

export interface GatewayInfo {
  name: string;           // e.g., "gateway-frontend"
  routes: GatewayRoute[];
  domains: string[];      // e.g., ["react", "typescript", "ui"]
}

/**
 * In-memory cache for parsed gateways to avoid repeated filesystem reads
 */
const gatewayCache: Map<string, GatewayInfo | null> = new Map();

/**
 * Extract keywords from text (task description or skill path)
 */
function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();

  // Convert to lowercase for matching
  const lower = text.toLowerCase();

  // Extract words (alphanumeric + hyphens)
  const words = lower.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];

  // Filter out common stop words
  const stopWords = new Set([
    'the', 'and', 'or', 'for', 'with', 'from', 'to', 'in', 'on', 'at',
    'skill', 'md', 'claude', 'library', 'development', 'patterns'
  ]);

  for (const word of words) {
    if (word.length > 2 && !stopWords.has(word)) {
      keywords.add(word);
    }
  }

  return [...keywords];
}

/**
 * Extract domain keywords from gateway name
 */
function extractDomains(gatewayName: string): string[] {
  // Remove 'gateway-' prefix and split on hyphens
  const nameWithoutPrefix = gatewayName.replace(/^gateway-/, '');
  return nameWithoutPrefix.split('-');
}

/**
 * Parse a gateway skill file to extract routing table
 *
 * @param gatewayName - Gateway skill name (e.g., "gateway-frontend")
 * @returns Parsed gateway info or null if file doesn't exist or parsing fails
 */
export function parseGatewaySkill(gatewayName: string): GatewayInfo | null {
  // Check cache first
  if (gatewayCache.has(gatewayName)) {
    return gatewayCache.get(gatewayName) || null;
  }

  try {
    const repoRoot = getRepoRoot();
    const gatewayPath = path.join(repoRoot, '.claude', 'skills', gatewayName, 'SKILL.md');

    if (!fs.existsSync(gatewayPath)) {
      gatewayCache.set(gatewayName, null);
      return null;
    }

    const content = fs.readFileSync(gatewayPath, 'utf-8');
    const routes: GatewayRoute[] = [];

    // Parse skill references from the markdown
    // Looking for patterns like:
    // **Skill Name**: `.claude/skill-library/path/to/SKILL.md`
    // - Description of the skill

    // Match skill entries (boldface followed by path)
    const skillPattern = /\*\*([^*]+)\*\*:\s*`([^`]+)`\s*\n-\s*([^\n]+)/g;
    let match;

    while ((match = skillPattern.exec(content)) !== null) {
      const task = match[1].trim();           // e.g., "Frontend TanStack"
      const skillPath = match[2].trim();      // e.g., ".claude/skill-library/..."
      const description = match[3].trim();    // e.g., "TanStack Query for server state"

      // Extract keywords from both task name and description
      const taskKeywords = extractKeywords(task);
      const descKeywords = extractKeywords(description);
      const pathKeywords = extractKeywords(skillPath);

      const allKeywords = [...new Set([...taskKeywords, ...descKeywords, ...pathKeywords])];

      routes.push({
        task,
        skillPath,
        keywords: allKeywords,
      });
    }

    const gatewayInfo: GatewayInfo = {
      name: gatewayName,
      routes,
      domains: extractDomains(gatewayName),
    };

    // Cache the result
    gatewayCache.set(gatewayName, gatewayInfo);

    return gatewayInfo;
  } catch (error) {
    console.error(`Error parsing gateway ${gatewayName}:`, error);
    gatewayCache.set(gatewayName, null);
    return null;
  }
}

/**
 * Get all available gateway skills
 *
 * @returns Array of parsed gateway infos
 */
export function getAllGateways(): GatewayInfo[] {
  const gateways: GatewayInfo[] = [];

  try {
    const repoRoot = getRepoRoot();
    const skillsDir = path.join(repoRoot, '.claude', 'skills');

    if (!fs.existsSync(skillsDir)) {
      return [];
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('gateway-')) {
        const gateway = parseGatewaySkill(entry.name);
        if (gateway) {
          gateways.push(gateway);
        }
      }
    }

    return gateways;
  } catch (error) {
    console.error('Error getting all gateways:', error);
    return [];
  }
}

/**
 * Find routes in a gateway that match given keywords
 *
 * @param gateway - Gateway info to search
 * @param keywords - Keywords to match against route keywords
 * @returns Array of matching routes sorted by relevance
 */
export function findRoutesForKeywords(
  gateway: GatewayInfo,
  keywords: string[]
): GatewayRoute[] {
  if (keywords.length === 0) {
    return gateway.routes;
  }

  // Normalize keywords to lowercase
  const normalizedKeywords = keywords.map(k => k.toLowerCase());

  // Score each route based on keyword matches
  const scoredRoutes = gateway.routes.map(route => {
    let score = 0;

    for (const keyword of normalizedKeywords) {
      // Exact match in route keywords
      if (route.keywords.includes(keyword)) {
        score += 10;
      }
      // Partial match in route keywords
      else if (route.keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
        score += 6;
      }
      // Match in task name
      else if (route.task.toLowerCase().includes(keyword)) {
        score += 4;
      }
    }

    return { route, score };
  });

  // Filter to routes with at least some match and sort by score
  return scoredRoutes
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ route }) => route);
}

/**
 * Clear the gateway cache (useful for testing or hot reloading)
 */
export function clearGatewayCache(): void {
  gatewayCache.clear();
}
