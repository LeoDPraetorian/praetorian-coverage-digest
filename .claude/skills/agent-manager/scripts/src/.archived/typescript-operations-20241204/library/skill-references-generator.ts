/**
 * Skill References Generator
 *
 * Generates "Skill References" table content based on agent context.
 * Uses gateway parsing and keyword matching to find relevant skills.
 */

import { AgentInfo } from './types.js';
import { parseGatewaySkill, findRoutesForKeywords, GatewayRoute } from './gateway-parser.js';

export interface SkillReference {
  task: string;
  skillPath: string;
  relevanceScore: number;  // 1-10
  source: 'gateway-match' | 'keyword-match' | 'type-default';
}

/**
 * Parse existing skills from frontmatter
 */
function parseExistingSkills(skills: string | undefined): string[] {
  if (!skills) {
    return [];
  }
  return skills
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Extract keywords from agent for skill matching
 *
 * Sources:
 * - Agent name (e.g., "react-developer" → ["react", "developer"])
 * - Agent type (e.g., "development")
 * - Responsibilities section from body
 */
function extractAgentKeywords(agent: AgentInfo): string[] {
  const keywords: Set<string> = new Set();

  // Extract from name
  const nameParts = agent.frontmatter.name.toLowerCase().split('-');
  for (const part of nameParts) {
    if (part.length > 2) {
      keywords.add(part);
    }
  }

  // Extract from type
  keywords.add(agent.category.toLowerCase());

  // Extract from body - look for ## Core Responsibilities section
  const responsibilitiesMatch = agent.body.match(/##\s*Core\s+Responsibilities\s*([\s\S]*?)(?=##|$)/i);
  if (responsibilitiesMatch) {
    const responsibilitiesText = responsibilitiesMatch[1];
    const words = responsibilitiesText.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
    for (const word of words) {
      if (word.length > 3) {
        keywords.add(word);
      }
    }
  }

  return [...keywords];
}

/**
 * Generate skill references for an agent based on gateway skills
 *
 * Algorithm:
 * 1. Get agent's gateways (from frontmatter.skills)
 * 2. Extract keywords from agent name, type, and body (responsibilities section)
 * 3. For each gateway:
 *    a. Parse gateway with parseGatewaySkill()
 *    b. Find matching routes with findRoutesForKeywords()
 *    c. Score matches (exact keyword = 10, partial = 6, type-default = 4)
 * 4. Deduplicate and sort by relevance
 * 5. Return top 5-8 most relevant skill references
 *
 * @param agent - Agent info to analyze
 * @returns Array of skill references sorted by relevance
 */
export function generateSkillReferences(agent: AgentInfo): SkillReference[] {
  const references: Map<string, SkillReference> = new Map();

  // Get agent's gateways
  const existingSkills = parseExistingSkills(agent.frontmatter.skills);
  const gateways = existingSkills.filter(s => s.startsWith('gateway-'));

  // If no gateways, we can't generate references
  if (gateways.length === 0) {
    return [];
  }

  // Extract keywords from agent
  const keywords = extractAgentKeywords(agent);

  // Process each gateway
  for (const gatewayName of gateways) {
    const gatewayInfo = parseGatewaySkill(gatewayName);
    if (!gatewayInfo) {
      continue;
    }

    // Find matching routes
    const matchingRoutes = findRoutesForKeywords(gatewayInfo, keywords);

    // Convert routes to skill references
    for (const route of matchingRoutes) {
      // Skip if we already have this skill path
      if (references.has(route.skillPath)) {
        continue;
      }

      // Calculate relevance score based on keyword matches
      let score = 4; // Base score for type-default

      // Check if route keywords match agent keywords
      const routeKeywordSet = new Set(route.keywords);
      let exactMatches = 0;
      let partialMatches = 0;

      for (const keyword of keywords) {
        if (routeKeywordSet.has(keyword)) {
          exactMatches++;
        } else if ([...routeKeywordSet].some(k => k.includes(keyword) || keyword.includes(k))) {
          partialMatches++;
        }
      }

      // Scoring:
      // - Exact keyword match: +10 per match (cap at 10)
      // - Partial keyword match: +6 per match (cap at 6)
      // - Type-default: base score of 4
      score = Math.min(10, 4 + (exactMatches * 2) + (partialMatches * 1));

      references.set(route.skillPath, {
        task: route.task,
        skillPath: route.skillPath,
        relevanceScore: score,
        source: exactMatches > 0 ? 'gateway-match' : (partialMatches > 0 ? 'keyword-match' : 'type-default'),
      });
    }
  }

  // Sort by relevance score (descending) and return top 5-8
  const sorted = [...references.values()]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8);

  return sorted;
}

/**
 * Format skill references as a markdown table
 *
 * @param refs - Array of skill references
 * @returns Markdown table string
 */
export function formatSkillReferencesTable(refs: SkillReference[]): string {
  if (refs.length === 0) {
    return `| Task | Skill to Read |
|------|---------------|
| [No relevant skills found] | [Check gateway skills] |`;
  }

  const rows = refs.map(ref => {
    return `| ${ref.task} | \`${ref.skillPath}\` |`;
  });

  return `| Task | Skill to Read |
|------|---------------|
${rows.join('\n')}`;
}

/**
 * Format skill references for template generation (create.ts)
 *
 * This is a simplified version for the lean agent template.
 * It takes the top 5 most relevant skills.
 *
 * @param routes - Array of gateway routes (from findRoutesForKeywords)
 * @returns Markdown table string
 */
export function formatSkillReferencesForTemplate(routes: GatewayRoute[]): string {
  if (routes.length === 0) {
    return `| Task | Skill to Read |
|------|---------------|
| [Task 1] | \`.claude/skill-library/path/to/SKILL.md\` |
| [Task 2] | \`.claude/skill-library/path/to/SKILL.md\` |`;
  }

  const rows = routes.slice(0, 5).map(route => {
    return `| ${route.task} | \`${route.skillPath}\` |`;
  });

  return `| Task | Skill to Read |
|------|---------------|
${rows.join('\n')}`;
}
