// src/lib/skill-searcher.ts
import { SkillInfo } from './skill-finder.js';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

export interface ScoredSkill extends SkillInfo {
  score: number;
  matchReasons: string[];
  stalenessWarning?: string; // e.g., "⚠️ Docs 45d old"
}

export interface SearchOptions {
  location?: 'core' | 'library';
  limit?: number;
}

/**
 * Check if context7 documentation is stale (>30 days old)
 */
function checkContext7Staleness(skillPath: string): string | undefined {
  const skillDir = dirname(skillPath);
  const metadataPath = join(skillDir, '.local/context7-source.json');

  if (!existsSync(metadataPath)) {
    return undefined;
  }

  try {
    const content = readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(content) as { fetchedAt: string };

    const fetchedDate = new Date(metadata.fetchedAt);
    const now = new Date();
    const diffMs = now.getTime() - fetchedDate.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysSince > 30) {
      return `⚠️ Docs ${daysSince}d old`;
    }
  } catch {
    // Ignore errors reading/parsing metadata
  }

  return undefined;
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
    const stalenessWarning = checkContext7Staleness(skill.path);

    if (score > 0) {
      scoredSkills.push({
        ...skill,
        score,
        matchReasons,
        ...(stalenessWarning && { stalenessWarning }),
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
