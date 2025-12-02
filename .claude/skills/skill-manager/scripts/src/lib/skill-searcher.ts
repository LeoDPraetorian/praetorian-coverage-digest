// src/lib/skill-searcher.ts
import { SkillInfo } from './skill-finder.js';

export interface ScoredSkill extends SkillInfo {
  score: number;
  matchReasons: string[];
}

export interface SearchOptions {
  location?: 'core' | 'library';
  limit?: number;
}

/**
 * Search skills with scoring algorithm
 */
export function searchSkills(
  query: string,
  skills: SkillInfo[],
  options: SearchOptions = {}
): ScoredSkill[] {
  const queryLower = query.toLowerCase();
  const scoredSkills: ScoredSkill[] = [];

  for (const skill of skills) {
    const score = calculateScore(skill, queryLower);
    const matchReasons = getMatchReasons(skill, queryLower);

    if (score > 0) {
      scoredSkills.push({
        ...skill,
        score,
        matchReasons,
      });
    }
  }

  // Filter by location if specified
  let filtered = scoredSkills;
  if (options.location) {
    filtered = filtered.filter(s => s.location === options.location);
  }

  // Sort by score (descending)
  filtered.sort((a, b) => b.score - a.score);

  // Limit results if specified
  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Calculate relevance score for a skill
 */
function calculateScore(skill: SkillInfo, query: string): number {
  let score = 0;

  // Name exact match (highest priority)
  if (skill.name.toLowerCase() === query) {
    score += 100;
  } else if (skill.name.toLowerCase().includes(query)) {
    score += 50;
  }

  // Description match
  const description = skill.frontmatter.description?.toLowerCase() || '';
  if (description.includes(query)) {
    score += 30;
  }

  // Allowed-tools match (can be string or array)
  const toolsRaw = skill.frontmatter['allowed-tools'];
  const tools = Array.isArray(toolsRaw)
    ? toolsRaw.join(' ').toLowerCase()
    : (toolsRaw?.toLowerCase() || '');
  if (tools.includes(query)) {
    score += 10;
  }

  return score;
}

/**
 * Get human-readable match reasons
 */
function getMatchReasons(skill: SkillInfo, query: string): string[] {
  const reasons: string[] = [];

  if (skill.name.toLowerCase().includes(query)) {
    reasons.push('Name match');
  }

  const description = skill.frontmatter.description?.toLowerCase() || '';
  if (description.includes(query)) {
    reasons.push('Description match');
  }

  const toolsRaw = skill.frontmatter['allowed-tools'];
  const tools = Array.isArray(toolsRaw)
    ? toolsRaw.join(' ').toLowerCase()
    : (toolsRaw?.toLowerCase() || '');
  if (tools.includes(query)) {
    reasons.push('Allowed-tools match');
  }

  return reasons;
}
